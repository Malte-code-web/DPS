import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { erzeugeSitzungstransport } from '../net/transportAuswahl';
import type { Sitzungstransport, TransportFabrik } from '../net/sitzungstransport';
import type { FunkSignalDaten, SitzungsNachricht } from '../net/protokoll';
import { erzeugeId } from '../domain/sitzung';
import {
  ladeEigeneSzenarien,
  ladeMassnahmenrechte,
  sichereEigeneSzenarien,
  sichereMassnahmenrechte,
} from '../lib/speicher';
import { SimulationContext } from './context';
import type { FunkSignalNachricht, Zeitkostentimer } from './context';
import { starteTaktgeber } from './taktgeber';
import { ANFANGSZUSTAND, schnappschussAus, simulationReducer } from './reducer';
import type { SchnappschussFelder, SimulationAction } from './reducer';
import { fehltZwischenstueck, naechsteNachricht } from './schnappschussDelta';
import type { Einsatzabschnitt } from '../domain/types';
import { zeitkostenLabel, zeitkostenSek } from './zeitkosten';

/**
 * Taktrate der Simulationsuhr in Millisekunden (Echtzeit).
 * @anker state.uhr Der Taktgeber der laufenden Simulation
 */
const TAKT_MS = 500;

/**
 * Ein Realtime-Broadcast ist reines Fire-and-Forget - anders als bei einem
 * kompletten Verbindungsabbruch (→ `net.supabase`) bleibt ein einzelner
 * verlorener Broadcast dabei unsichtbar: Der Kanal meldet keinen Fehler, die
 * Nachricht kommt einfach nie an. Betroffen sind zwei Nachrichten, die ein
 * Spieler an den Host schickt: die eigene `aktion` (ohne Bestätigung sah
 * eine Maßnahme dann so aus, als hätte sie nichts bewirkt) und der `beitritt`
 * selbst (steckt der Host genau in diesem Moment mitten in einer eigenen
 * Wiederverbindung - z. B. weil sein Browser gerade erst aus dem Hintergrund
 * zurückkam -, verschwand der Beitritt spurlos: der Spieler landete lokal im
 * Wartebereich, aber ohne dass der Host je davon erfuhr). Der Host (er
 * wendet lokal immer direkt an) war von beidem nie betroffen.
 * @anker state.aktionsbestaetigung Bestätigte Nachrichten mit Wiederholung
 */
const AKTION_BESTAETIGUNG_TIMEOUT_MS = 2500;
const AKTION_BESTAETIGUNG_MAX_VERSUCHE = 5;

/**
 * @anker state.puls Rückstand erkennen und ein Vollbild nachfordern
 *
 * Der Host schlägt regelmäßig mit seiner aktuellen Laufnummer an
 * (`schnappschussPuls`, rund 40 Byte). Wer dahinter zurückliegt - weil eine
 * Nachricht verloren ging oder das Gerät im Hintergrund war -, fordert ein
 * Vollbild an und ist danach wieder exakt auf Stand.
 *
 * Vorher wiederholte der Host im selben Takt den **kompletten** Zustand.
 * Dieselbe Reparatur, nur um ein Vielfaches teurer: gemessen 58,6 kB je
 * Wiederholung nach einer halben Stunde Übung, auch in einer pausierten
 * Sitzung, in der sich nichts bewegt (→ `net.delta`).
 *
 * Die Selbstheilung bleibt unbegrenzt oft wiederholt: Geht eine Anfrage
 * verloren, stellt der nächste Puls denselben Rückstand erneut fest. Beide
 * Sperren darunter verhindern nur, dass sich mehrere Beteiligte gegenseitig
 * hochschaukeln - keine von beiden kann die Reparatur dauerhaft blockieren,
 * weil der Puls unbeirrt weiterläuft.
 */
const PULS_MS = 4000;

/** Frühestens so oft fragt ein Client nach - deckt mehrere Pulse in Folge ab. */
const ANFRAGE_SPERRE_MS = 2000;

/**
 * Frühestens so oft beantwortet der Host eine Anfrage. Der Kanal ist ein
 * Rundruf: Ein Vollbild erreicht alle, die gerade zurückliegen, nicht nur den
 * Fragesteller - fünf gleichzeitige Anfragen brauchen also keine fünf
 * Antworten.
 */
const VOLLBILD_SPERRE_MS = 1000;

/**
 * So oft darf ein Client vergeblich nachfragen, bevor der Rückstand als
 * Verbindungsproblem angezeigt wird. Der Fall dahinter ist real und war
 * bisher unsichtbar: Wer empfangen, aber nicht senden kann, sah eine still
 * eingefrorene Lage ohne jeden Hinweis.
 */
const ANFRAGEN_BIS_WARNUNG = 3;

/** Aktionen, die jeder Client für sich behält - Navigation und das Verlassen. */
function istLokaleAktion(action: SimulationAction): boolean {
  return (
    action.typ === 'patientWaehlen' ||
    action.typ === 'abschnittWaehlen' ||
    action.typ === 'sitzungVerlassen'
  );
}

/**
 * Aktionen, die ein Spieler zusätzlich zum Versand an den Host sofort selbst
 * anwendet, statt auf den vollen Netzwerk-Umlauf (Host wendet an -> Host
 * verteilt Schnappschuss -> hier ankommen) zu warten. Das `<select>` der
 * eigenen Qualifikation (→ `ui.wartebereich`) hängt direkt an
 * `spieler.qualifikation` aus dem synchronisierten Zustand - ohne diese
 * sofortige lokale Anwendung wirkte eine Auswahl bei jeder Verzögerung oder
 * verlorenen Nachricht wie "nicht übernommen". Bewusst nur für diese eine,
 * auf die eigene Person begrenzte Einstellung: Der nächste Schnappschuss vom
 * Host überschreibt die Spielerliste ohnehin vollständig, sodass eine
 * abweichende lokale Vermutung sich selbst korrigiert - anders als bei
 * simulationsrelevanten Aktionen (z. B. `massnahmeDurchfuehren`), wo nur der
 * Host rechnen darf. `spielerAbschnittGesetzt` (→ `sitzung.modell`,
 * `aktuellerAbschnitt`) läuft aus demselben Grund mit: nur die eigene,
 * synchron mitgeführte Position - kein Sim-Zustand, den nur der Host
 * berechnen dürfte.
 */
function istOptimistischeAktion(action: SimulationAction): boolean {
  return (
    action.typ === 'spielerQualifikationSetzen' ||
    action.typ === 'spielerAbschnittGesetzt' ||
    // Sofortiges Feedback für den Rundenplan (→ `ui.zeltminispielbenachrichtigung`)
    // bzw. einen Treffer, statt auf den nächsten Host-Schnappschuss zu warten
    // - ein abweichender Rateversuch korrigiert sich mit dem nächsten
    // Schnappschuss von selbst, wie bei den beiden Aktionen oben.
    action.typ === 'zeltMinispielStarten' ||
    action.typ === 'zeltMinispielRundeGetroffen'
  );
}

/**
 * @anker state.provider Rollen-bewusster Zustandsverteiler
 *
 * Einzelspiel läuft wie bisher rein lokal. In einer Sitzung ist der Übungsleiter
 * die Autorität: Er rechnet die Simulation und verteilt Schnappschüsse; Spieler
 * rendern den empfangenen Zustand und schicken ihre Aktionen an ihn
 * (→ `net.protokoll`). Die Komponenten merken davon nichts - sie rufen weiter
 * `dispatch(action)`, der Provider entscheidet lokal oder übers Netz.
 */
export function SimulationProvider({
  children,
  transportFabrik = erzeugeSitzungstransport,
}: {
  children: ReactNode;
  transportFabrik?: TransportFabrik;
}) {
  const [state, dispatch] = useReducer(simulationReducer, ANFANGSZUSTAND, (basis) => ({
    ...basis,
    eigeneSzenarien: ladeEigeneSzenarien(),
    massnahmenrechte: ladeMassnahmenrechte(),
  }));
  const { laufend, geschwindigkeit, phase, sitzung } = state;
  const transportRef = useRef<Sitzungstransport | null>(null);
  const istSpieler = sitzung.aktiv && sitzung.rolle === 'spieler';
  const istHost = sitzung.aktiv && sitzung.rolle === 'uebungsleiter';

  // Spieler-Seite (→ `state.aktionsbestaetigung`): je gesendeter, noch nicht
  // bestätigter Nachricht (Beitritt oder Aktion) ein Wiederholungs-Timer.
  // Host-Seite: bereits angewendete Nachrichten-IDs, damit eine Wiederholung
  // nicht doppelt wirkt (z. B. doppelt verbrauchtes Material bei zweifach
  // angewendeter Maßnahme - ein doppelter Beitritt wäre zwar für sich
  // harmlos, dieselbe Absicherung gilt hier trotzdem einheitlich mit).
  const ausstehendeBestaetigungenRef = useRef<
    Map<string, { versuch: number; timer: ReturnType<typeof setTimeout> }>
  >(new Map());
  const verarbeiteteNachrichtenRef = useRef<Set<string>>(new Set());

  // WebRTC-Signalisierung (→ `net.funksignal`) läuft nie durch den Reducer -
  // flüchtige Verbindungsaushandlung, kein Spielzustand. Ein `useSprechfunk`-
  // Hook meldet sich hier direkt an, statt über `dispatch` zu gehen.
  const signalHoererRef = useRef<Set<(nachricht: FunkSignalNachricht) => void>>(new Set());

  // Synchronisationsstand (→ `net.delta`, `state.puls`). Host: `folgeRef` ist
  // die Laufnummer der zuletzt gesendeten Nachricht, `letzteFelderRef` ihr
  // Inhalt - die Bezugsgröße für das nächste Delta. Client: `folgeStandRef`
  // spiegelt `state.schnappschussFolge`, weil der Nachrichten-Rückruf weiter
  // unten sonst auf einem eingefrorenen `state` säße.
  const folgeRef = useRef(0);
  const letzteFelderRef = useRef<SchnappschussFelder | null>(null);
  const aktuelleFelderRef = useRef<SchnappschussFelder | null>(null);
  const letztesVollbildMsRef = useRef(0);
  const folgeStandRef = useRef(0);
  const letzteAnfrageMsRef = useRef(0);
  const vergebllicheAnfragenRef = useRef(0);
  useEffect(() => {
    folgeStandRef.current = state.schnappschussFolge;
  }, [state.schnappschussFolge]);

  /**
   * Host: den kompletten Zustand verschicken, aus jedem Empfängerzustand
   * heraus anwendbar (`basis: 0`). Zwei Anlässe - ein Beitritt und eine
   * Nachforderung.
   */
  const sendeVollbild = useCallback(() => {
    const felder = aktuelleFelderRef.current;
    if (!felder) return;
    const jetzt = Date.now();
    if (jetzt - letztesVollbildMsRef.current < VOLLBILD_SPERRE_MS) return;
    letztesVollbildMsRef.current = jetzt;
    folgeRef.current += 1;
    letzteFelderRef.current = felder;
    transportRef.current?.senden({
      typ: 'schnappschuss',
      schnappschuss: { folge: folgeRef.current, basis: 0, felder },
    });
  }, []);

  /** Client: ein Vollbild nachfordern, weil der eigene Stand zurückliegt. */
  const fordereVollbildAn = useCallback((eigeneId: string) => {
    const jetzt = Date.now();
    if (jetzt - letzteAnfrageMsRef.current < ANFRAGE_SPERRE_MS) return;
    letzteAnfrageMsRef.current = jetzt;
    vergebllicheAnfragenRef.current += 1;
    transportRef.current?.senden({ typ: 'vollbildAnfordern', spielerId: eigeneId });
    if (vergebllicheAnfragenRef.current === ANFRAGEN_BIS_WARNUNG) {
      dispatch({
        typ: 'verbindungsfehlerSetzen',
        meldung: 'Die Lage hängt zurück - die Übungsleitung erreicht dich gerade nicht.',
      });
    }
  }, []);

  const sendeMitBestaetigung = useCallback(
    (erzeugeNachricht: (nachrichtId: string) => SitzungsNachricht, nachrichtId = erzeugeId()) => {
      const transport = transportRef.current;
      if (!transport) return;
      transport.senden(erzeugeNachricht(nachrichtId));
      const bisheriger = ausstehendeBestaetigungenRef.current.get(nachrichtId);
      const versuch = (bisheriger?.versuch ?? 0) + 1;
      if (bisheriger) clearTimeout(bisheriger.timer);
      const timer = setTimeout(() => {
        if (versuch >= AKTION_BESTAETIGUNG_MAX_VERSUCHE) {
          ausstehendeBestaetigungenRef.current.delete(nachrichtId);
          return;
        }
        sendeMitBestaetigung(erzeugeNachricht, nachrichtId);
      }, AKTION_BESTAETIGUNG_TIMEOUT_MS);
      ausstehendeBestaetigungenRef.current.set(nachrichtId, { versuch, timer });
    },
    [],
  );

  // Die Uhr läuft beim Solo-Spieler und beim Host; ein Spieler bekommt die Zeit
  // aus den Schnappschüssen des Hosts.
  //
  // Zeitstempel-basiert statt fixem Schritt pro Takt: Jeder Takt rechnet die
  // tatsächlich vergangene Echtzeit ein. So bleibt die Uhr korrekt, selbst wenn
  // der Browser den Takt drosselt - und ein hintergrundfester Taktgeber
  // (→ `state.taktgeber`) hält sie am Laufen, wenn der Host-Tab nicht im
  // Vordergrund ist. Ein `visibilitychange` holt beim Zurückwechseln sofort auf.
  const letzterTaktRef = useRef(0);
  useEffect(() => {
    if (!laufend || phase !== 'einsatz' || istSpieler) return;
    letzterTaktRef.current = performance.now();
    const takt = () => {
      const jetzt = performance.now();
      const dtRealSek = (jetzt - letzterTaktRef.current) / 1000;
      letzterTaktRef.current = jetzt;
      if (dtRealSek > 0) dispatch({ typ: 'tick', dtSek: dtRealSek * geschwindigkeit });
    };
    const beiSichtbarkeit = () => {
      if (document.visibilityState === 'visible') takt();
    };
    document.addEventListener('visibilitychange', beiSichtbarkeit);
    const stoppeTakt = starteTaktgeber(TAKT_MS, takt);
    return () => {
      stoppeTakt();
      document.removeEventListener('visibilitychange', beiSichtbarkeit);
    };
  }, [laufend, geschwindigkeit, phase, istSpieler]);

  useEffect(() => {
    sichereEigeneSzenarien(state.eigeneSzenarien);
  }, [state.eigeneSzenarien]);

  // Nur die eigene (Übungsleitungs- oder Solo-)Einstellung sichern - ein
  // Spieler bekommt die Rechte per Schnappschuss vom Host und soll damit nicht
  // seine eigene, lokale Vorbelegung überschreiben.
  useEffect(() => {
    if (istSpieler) return;
    sichereMassnahmenrechte(state.massnahmenrechte);
  }, [state.massnahmenrechte, istSpieler]);

  // Transport-Lebenszyklus: verbinden, sobald eine Sitzung aktiv ist.
  useEffect(() => {
    if (!sitzung.aktiv || !sitzung.code || !sitzung.rolle) return;
    const rolle = sitzung.rolle;
    // Stabile Map-Instanz (nie neu zugewiesen) - hier einmal eingefangen,
    // damit die Aufräumfunktion nicht erneut über `.current` gehen muss.
    const ausstehendeBestaetigungen = ausstehendeBestaetigungenRef.current;
    const transport = transportFabrik(
      sitzung.code,
      (nachricht) => {
        // Rollenunabhängig, vor der Host/Spieler-Verzweigung: geht direkt an
        // die angemeldeten Hörer, nie an `dispatch`.
        if (nachricht.typ === 'funkSignal') {
          for (const hoerer of signalHoererRef.current) hoerer(nachricht);
          return;
        }
        if (rolle === 'uebungsleiter') {
          if (nachricht.typ === 'beitritt' || nachricht.typ === 'aktion') {
            // Dedupliziert: eine Wiederholung nach verlorener Bestätigung
            // (→ `state.aktionsbestaetigung`) wendet dieselbe Nachricht nicht
            // zweimal an, bestätigt aber trotzdem erneut - falls gerade die
            // erste Bestätigung selbst verloren ging.
            if (!verarbeiteteNachrichtenRef.current.has(nachricht.nachrichtId)) {
              verarbeiteteNachrichtenRef.current.add(nachricht.nachrichtId);
              if (nachricht.typ === 'beitritt') {
                dispatch({ typ: 'spielerHinzugefuegt', spieler: nachricht.spieler });
                // Wer neu dazukommt, steht bei Folge 0 und kann mit keinem
                // Delta etwas anfangen. Statt ihn den Rückstand erst selbst
                // bemerken zu lassen (→ `state.puls`), bekommt er sofort ein
                // Vollbild; die Aufnahme in die Spielerliste folgt gleich
                // darauf als Delta darauf auf.
                sendeVollbild();
              } else {
                dispatch(nachricht.aktion);
              }
            }
            transportRef.current?.senden({
              typ: 'nachrichtBestaetigt',
              nachrichtId: nachricht.nachrichtId,
            });
          } else if (nachricht.typ === 'verlassen') {
            dispatch({ typ: 'spielerEntfernt', spielerId: nachricht.spielerId });
          } else if (nachricht.typ === 'vollbildAnfordern') {
            sendeVollbild();
          }
        } else if (nachricht.typ === 'schnappschuss') {
          const teil = nachricht.schnappschuss;
          // Eine Lücke erkennt der Reducer zwar auch (und verwirft dann still),
          // nur kann er von dort aus nichts nachfordern. Deshalb hier vorab
          // dieselbe Prüfung - sie ist die einzige Stelle, an der ein
          // fehlendes Zwischenstück überhaupt auffällt.
          if (fehltZwischenstueck(teil, folgeStandRef.current) && sitzung.eigeneId) {
            fordereVollbildAn(sitzung.eigeneId);
            return;
          }
          if (teil.folge > folgeStandRef.current) {
            vergebllicheAnfragenRef.current = 0;
          }
          dispatch({ typ: 'schnappschussAnwenden', schnappschuss: teil });
        } else if (nachricht.typ === 'schnappschussPuls') {
          if (nachricht.folge > folgeStandRef.current && sitzung.eigeneId) {
            fordereVollbildAn(sitzung.eigeneId);
          } else {
            vergebllicheAnfragenRef.current = 0;
          }
        } else if (nachricht.typ === 'nachrichtBestaetigt') {
          const eintrag = ausstehendeBestaetigungenRef.current.get(nachricht.nachrichtId);
          if (eintrag) {
            clearTimeout(eintrag.timer);
            ausstehendeBestaetigungenRef.current.delete(nachricht.nachrichtId);
          }
        }
      },
      (status, meldung) => {
        dispatch({
          typ: 'verbindungsfehlerSetzen',
          meldung: status === 'fehler' ? (meldung ?? 'Verbindung fehlgeschlagen.') : null,
        });
      },
    );
    transportRef.current = transport;

    // Der Spieler meldet sich beim Host an; der Host wartet auf Anmeldungen.
    // Mit Bestätigung und Wiederholung (→ `state.aktionsbestaetigung`): ohne
    // sie blieb ein Beitritt spurlos verschwunden, wenn der Host ihn genau in
    // dem Moment verpasste (z. B. eigene Wiederverbindung nach Hintergrund).
    if (rolle === 'spieler' && sitzung.eigeneId && sitzung.eigenerName) {
      const eigeneId = sitzung.eigeneId;
      const eigenerName = sitzung.eigenerName;
      sendeMitBestaetigung((nachrichtId) => ({
        typ: 'beitritt',
        spieler: { id: eigeneId, name: eigenerName, rolle: 'spieler', qualifikation: 'basis' },
        nachrichtId,
      }));
    }

    return () => {
      if (rolle === 'spieler' && sitzung.eigeneId) {
        transport.senden({ typ: 'verlassen', spielerId: sitzung.eigeneId });
      }
      for (const { timer } of ausstehendeBestaetigungen.values()) clearTimeout(timer);
      ausstehendeBestaetigungen.clear();
      transport.schliessen();
      transportRef.current = null;
      // Laufnummern und Bezugsstand gehören zu genau dieser Verbindung. Wer
      // eine Sitzung verlässt und eine neue betritt, fängt sonst mit einer
      // fremden Bezugsgröße an - das erste Delta wäre gegen einen Zustand
      // gebildet, den niemand mehr hat.
      folgeRef.current = 0;
      letzteFelderRef.current = null;
      letztesVollbildMsRef.current = 0;
      letzteAnfrageMsRef.current = 0;
      vergebllicheAnfragenRef.current = 0;
    };
  }, [
    sitzung.aktiv,
    sitzung.code,
    sitzung.rolle,
    sitzung.eigeneId,
    sitzung.eigenerName,
    transportFabrik,
    sendeMitBestaetigung,
    sendeVollbild,
    fordereVollbildAn,
  ]);

  // Der Host verteilt den geteilten Zustand bei jeder Änderung, mit einer
  // fortlaufenden Laufnummer - damit ein Spieler eine verspätet über das Netz
  // eintreffende ältere Nachricht erkennen und verwerfen kann
  // (→ `state.schnappschuss`, `schnappschussAnwenden`).
  //
  // Übertragen wird nur, was sich seit dem letzten Versand tatsächlich
  // geändert hat (→ `net.delta`). `schnappschussAus` ist dabei die **einzige**
  // Stelle, die weiß, welche Felder geteilt werden - vorher stand dieselbe
  // Liste hier nochmal als Memo samt Abhängigkeitsliste, also dreimal im
  // Projekt. Ein hier vergessenes Feld war damit ein stiller Fehler; jetzt
  // fordert `tsc` es an einer Stelle ein.
  //
  // Der Effekt hängt an `state` statt an einzelnen Scheiben, weil eine reine
  // Navigationsänderung (Patientenwahl, Abschnitt) zwar den Zustand ändert,
  // aber kein geteiltes Feld - das Delta ist dann leer und es geht nichts
  // raus.
  useEffect(() => {
    if (!istHost) return;
    const felder = schnappschussAus(state);
    aktuelleFelderRef.current = felder;
    const nachricht = naechsteNachricht(letzteFelderRef.current, felder, folgeRef.current);
    if (!nachricht) return;
    folgeRef.current = nachricht.folge;
    letzteFelderRef.current = felder;
    if (nachricht.basis === 0) letztesVollbildMsRef.current = Date.now();
    transportRef.current?.senden({ typ: 'schnappschuss', schnappschuss: nachricht });
  }, [istHost, state]);

  // Der Puls (→ `state.puls`) läuft unabhängig vom Zustand - anders als der
  // frühere Herzschlag, der bei jedem Takt neu aufgesetzt wurde und deshalb
  // in einer laufenden Übung praktisch nie zum Zug kam.
  useEffect(() => {
    if (!istHost) return;
    const intervall = setInterval(() => {
      if (folgeRef.current > 0) {
        transportRef.current?.senden({ typ: 'schnappschussPuls', folge: folgeRef.current });
      }
    }, PULS_MS);
    return () => clearInterval(intervall);
  }, [istHost]);

  // Ein Spieler schickt Sim-Aktionen an den Host, statt sie selbst anzuwenden.
  const dispatchRoutet = useCallback(
    (action: SimulationAction) => {
      if (istSpieler && !istLokaleAktion(action) && transportRef.current) {
        sendeMitBestaetigung((nachrichtId) => ({ typ: 'aktion', aktion: action, nachrichtId }));
        if (istOptimistischeAktion(action)) dispatch(action);
      } else {
        dispatch(action);
      }
    },
    [istSpieler, sendeMitBestaetigung],
  );

  // Zeitkosten laufen als echter Timer bei der Handlung selbst ab
  // (→ `state.zeitkosten`), statt die Einsatzuhr sofort im Reducer
  // vorspringen zu lassen: Wer eine Maßnahme beginnt, ist für deren Dauer
  // ausgelastet und kann in dieser Zeit nichts anderes anstoßen - der
  // bereits bestehende Simulationstakt (`case 'tick'`) lässt währenddessen
  // ganz von selbst alle Patienten altern, genau wie zuvor der sofortige
  // Sprung, nur eben in Echtzeit statt künstlich vorgezogen.
  const zeitkostenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zeitkostentimer, setZeitkostentimer] = useState<Zeitkostentimer | null>(null);

  const dispatchMitZeitkosten = useCallback(
    (action: SimulationAction) => {
      const kosten = zeitkostenSek(state, action);
      if (kosten <= 0) {
        dispatchRoutet(action);
        return;
      }
      // Schon beschäftigt: eine weitere zeitkostende Handlung wird verworfen,
      // statt sich hinten anzustellen - wie im echten Einsatz kann dieselbe
      // Person nicht zwei Dinge gleichzeitig tun.
      if (zeitkostenTimerRef.current) return;
      const wartezeitMs = (kosten * 1000) / state.geschwindigkeit;
      const startMs = Date.now();
      zeitkostenTimerRef.current = setTimeout(() => {
        zeitkostenTimerRef.current = null;
        setZeitkostentimer(null);
        dispatchRoutet(action);
      }, wartezeitMs);
      setZeitkostentimer({
        aktion: action,
        label: zeitkostenLabel(action),
        startMs,
        endeMs: startMs + wartezeitMs,
      });
    },
    [state, dispatchRoutet],
  );

  // Ein Einsatzende oder das Verlassen der Sitzung räumt einen noch
  // laufenden Zeitkosten-Timer ab - dessen Aktion darf nicht nach dem
  // Wechsel der Phase verspätet doch noch ankommen.
  useEffect(() => {
    if (state.phase === 'einsatz') return;
    if (zeitkostenTimerRef.current) {
      clearTimeout(zeitkostenTimerRef.current);
      zeitkostenTimerRef.current = null;
      setZeitkostentimer(null);
    }
  }, [state.phase]);

  useEffect(
    () => () => {
      if (zeitkostenTimerRef.current) clearTimeout(zeitkostenTimerRef.current);
    },
    [],
  );

  // Hält `sitzung.spieler[eigene].aktuellerAbschnitt` (→ `sitzung.modell`) mit
  // der eigenen, sonst rein lokalen Navigation synchron - läuft bei jeder
  // Änderung von `ausgewaehlterAbschnitt`, also auch beim allerersten Aufruf
  // der Einsatzseite, nicht erst bei einem manuellen Tab-Klick. Grundlage für
  // die Kandidatenwahl einer Delegationsanfrage (→ `ui.delegationsanfrage`).
  const { ausgewaehlterAbschnitt } = state;
  useEffect(() => {
    if (!sitzung.aktiv || !sitzung.eigeneId) return;
    dispatchRoutet({
      typ: 'spielerAbschnittGesetzt',
      spielerId: sitzung.eigeneId,
      abschnitt: ausgewaehlterAbschnitt,
    });
  }, [ausgewaehlterAbschnitt, sitzung.aktiv, sitzung.eigeneId, dispatchRoutet]);

  // Gegenrichtung: ein Einsatzauftrag an die Gruppe (→ `modell.einsatzabschnitt`)
  // zieht die eigene Ansicht einmalig auf den befohlenen Abschnitt nach. Nur
  // bei einer echten *Änderung* des Auftrags, nicht dauerhaft - sonst könnte
  // niemand mehr woanders hinschauen. Ein eigenes Feld statt
  // `aktuellerAbschnitt`, damit sich die beiden Richtungen nicht gegenseitig
  // überschreiben.
  const eigenerEinsatzabschnitt = sitzung.spieler.find(
    (spieler) => spieler.id === sitzung.eigeneId,
  )?.einsatzabschnitt;
  const letzterEinsatzabschnittRef = useRef<Einsatzabschnitt | undefined>(undefined);
  useEffect(() => {
    if (!sitzung.aktiv || !eigenerEinsatzabschnitt) return;
    if (letzterEinsatzabschnittRef.current === eigenerEinsatzabschnitt) return;
    letzterEinsatzabschnittRef.current = eigenerEinsatzabschnitt;
    dispatch({ typ: 'abschnittWaehlen', abschnitt: eigenerEinsatzabschnitt });
  }, [eigenerEinsatzabschnitt, sitzung.aktiv]);

  const aufFunkSignal = useCallback((hoerer: (nachricht: FunkSignalNachricht) => void) => {
    signalHoererRef.current.add(hoerer);
    return () => {
      signalHoererRef.current.delete(hoerer);
    };
  }, []);

  const eigeneId = sitzung.eigeneId;
  const sendeFunkSignal = useCallback(
    (anId: string, daten: FunkSignalDaten) => {
      if (!eigeneId) return;
      transportRef.current?.senden({ typ: 'funkSignal', vonId: eigeneId, anId, daten });
    },
    [eigeneId],
  );

  const wert = useMemo(
    () => ({
      state,
      dispatch: dispatchMitZeitkosten,
      zeitkostentimer,
      aufFunkSignal,
      sendeFunkSignal,
    }),
    [state, dispatchMitZeitkosten, zeitkostentimer, aufFunkSignal, sendeFunkSignal],
  );

  return <SimulationContext value={wert}>{children}</SimulationContext>;
}
