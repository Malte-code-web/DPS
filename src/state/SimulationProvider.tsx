import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import { erzeugeSitzungstransport } from '../net/transportAuswahl';
import type { Sitzungstransport, TransportFabrik } from '../net/sitzungstransport';
import { ladeEigeneSzenarien, sichereEigeneSzenarien } from '../lib/speicher';
import { SimulationContext } from './context';
import { starteTaktgeber } from './taktgeber';
import { ANFANGSZUSTAND, simulationReducer } from './reducer';
import type { Schnappschuss, SimulationAction } from './reducer';

/**
 * Taktrate der Simulationsuhr in Millisekunden (Echtzeit).
 * @anker state.uhr Der Taktgeber der laufenden Simulation
 */
const TAKT_MS = 500;

/** Aktionen, die jeder Client für sich behält - Navigation und das Verlassen. */
function istLokaleAktion(action: SimulationAction): boolean {
  return (
    action.typ === 'patientWaehlen' ||
    action.typ === 'abschnittWaehlen' ||
    action.typ === 'sitzungVerlassen'
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
  }));
  const { laufend, geschwindigkeit, phase, sitzung } = state;
  const transportRef = useRef<Sitzungstransport | null>(null);
  const istSpieler = sitzung.aktiv && sitzung.rolle === 'spieler';
  const istHost = sitzung.aktiv && sitzung.rolle === 'uebungsleiter';

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

  // Transport-Lebenszyklus: verbinden, sobald eine Sitzung aktiv ist.
  useEffect(() => {
    if (!sitzung.aktiv || !sitzung.code || !sitzung.rolle) return;
    const rolle = sitzung.rolle;
    const transport = transportFabrik(sitzung.code, (nachricht) => {
      if (rolle === 'uebungsleiter') {
        if (nachricht.typ === 'beitritt') {
          dispatch({ typ: 'spielerHinzugefuegt', spieler: nachricht.spieler });
        } else if (nachricht.typ === 'verlassen') {
          dispatch({ typ: 'spielerEntfernt', spielerId: nachricht.spielerId });
        } else if (nachricht.typ === 'aktion') {
          dispatch(nachricht.aktion);
        }
      } else if (nachricht.typ === 'schnappschuss') {
        dispatch({ typ: 'schnappschussAnwenden', schnappschuss: nachricht.schnappschuss });
      }
    });
    transportRef.current = transport;

    // Der Spieler meldet sich beim Host an; der Host wartet auf Anmeldungen.
    if (rolle === 'spieler' && sitzung.eigeneId && sitzung.eigenerName) {
      transport.senden({
        typ: 'beitritt',
        spieler: { id: sitzung.eigeneId, name: sitzung.eigenerName, rolle: 'spieler' },
      });
    }

    return () => {
      if (rolle === 'spieler' && sitzung.eigeneId) {
        transport.senden({ typ: 'verlassen', spielerId: sitzung.eigeneId });
      }
      transport.schliessen();
      transportRef.current = null;
    };
  }, [sitzung.aktiv, sitzung.code, sitzung.rolle, sitzung.eigeneId, sitzung.eigenerName, transportFabrik]);

  // Nur die geteilten Scheiben bilden den Schnappschuss - lokale Navigation
  // (Patientenwahl, Abschnitt) fließt bewusst nicht ein und löst kein Senden aus.
  const { patienten, zeitSek, szenario } = state;
  const spielerliste = sitzung.spieler;
  const status = sitzung.status;
  const schnappschuss = useMemo<Schnappschuss>(
    () => ({
      phase,
      szenario,
      zeitSek,
      laufend,
      geschwindigkeit,
      patienten,
      spieler: spielerliste,
      status,
    }),
    [phase, szenario, zeitSek, laufend, geschwindigkeit, patienten, spielerliste, status],
  );

  // Der Host verteilt den geteilten Zustand bei jeder Änderung.
  useEffect(() => {
    if (!istHost) return;
    transportRef.current?.senden({ typ: 'schnappschuss', schnappschuss });
  }, [istHost, schnappschuss]);

  // Ein Spieler schickt Sim-Aktionen an den Host, statt sie selbst anzuwenden.
  const dispatchRoutet = useCallback(
    (action: SimulationAction) => {
      if (istSpieler && !istLokaleAktion(action) && transportRef.current) {
        transportRef.current.senden({ typ: 'aktion', aktion: action });
      } else {
        dispatch(action);
      }
    },
    [istSpieler],
  );

  const wert = useMemo(() => ({ state, dispatch: dispatchRoutet }), [state, dispatchRoutet]);

  return <SimulationContext value={wert}>{children}</SimulationContext>;
}
