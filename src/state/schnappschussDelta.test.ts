import { describe, expect, it } from 'vitest';
import { SZENARIEN } from '../domain/szenarien';
import { erzeugeStoerbus, erzeugeZufall } from '../net/stoerTransport';
import type { SitzungsNachricht } from '../net/protokoll';
import type { Sitzungstransport } from '../net/sitzungstransport';
import { ANFANGSZUSTAND, schnappschussAus, simulationReducer, vollbildAus } from './reducer';
import type { SchnappschussFelder, SimulationAction, SimulationState } from './reducer';
import { deltaBilden, fehltZwischenstueck, naechsteNachricht } from './schnappschussDelta';

const busunfall = SZENARIEN.find((szenario) => szenario.id === 'busunfall-b31')!;

function spiele(...aktionen: SimulationAction[]): SimulationState {
  return aktionen.reduce((state, aktion) => simulationReducer(state, aktion), ANFANGSZUSTAND);
}

function imEinsatz(): SimulationState {
  return spiele(
    { typ: 'gemeinsamOeffnen' },
    { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
    { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
    { typ: 'modusWaehlen', modus: 'digital' },
    { typ: 'massnahmenrechteAbgeschlossen' },
    { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
    { typ: 'manvStufeGewaehlt', stufe: 'manv10' },
    { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    { typ: 'sitzungStarten' },
  );
}

/**
 * Ein Einsatz, der schon eine Weile läuft: Erst dann sind manche Patienten
 * versorgt, verstorben oder abtransportiert und damit über einen Takt hinweg
 * unverändert - am Einsatzbeginn altern noch alle gleichzeitig.
 */
function nachEinerWeile(): SimulationState {
  return simulationReducer(imEinsatz(), { typ: 'tick', dtSek: 1800 });
}

/** Ein frischer Spieler-Client - kennt nichts, steht bei Folge 0. */
function frischerClient(id: string): SimulationState {
  return {
    ...ANFANGSZUSTAND,
    sitzung: {
      aktiv: true,
      rolle: 'spieler',
      code: 'K7QP2',
      eigeneId: id,
      eigenerName: id,
      spieler: [],
      status: 'wartet',
      verbindungsfehler: null,
    },
  };
}

describe('deltaBilden (→ net.delta)', () => {
  it('nimmt ohne Vorgänger alle Felder auf', () => {
    const felder = schnappschussAus(imEinsatz());
    expect(Object.keys(deltaBilden(null, felder)).sort()).toEqual(Object.keys(felder).sort());
  });

  it('lässt unveränderte Felder weg', () => {
    const vorher = imEinsatz();
    const nachher = simulationReducer(vorher, { typ: 'tick', dtSek: 30 });
    const delta = deltaBilden(schnappschussAus(vorher), schnappschussAus(nachher));

    expect(Object.keys(delta)).toContain('zeitSek');
    // Genau die beiden großen Dauerposten, die vorher zweihundertmal pro Minute
    // unverändert mitfuhren.
    expect(Object.keys(delta)).not.toContain('szenario');
    expect(Object.keys(delta)).not.toContain('massnahmenrechte');
  });

  it('ist bei unverändertem Zustand leer', () => {
    const state = imEinsatz();
    expect(deltaBilden(schnappschussAus(state), schnappschussAus(state))).toEqual({});
  });

  it('überträgt auch ein Feld, das ausdrücklich auf null fällt', () => {
    const mitSzenario = schnappschussAus(imEinsatz());
    const ohne: SchnappschussFelder = { ...mitSzenario, szenario: null };
    const delta = deltaBilden(mitSzenario, ohne);
    expect('szenario' in delta).toBe(true);
    expect(delta.szenario).toBeNull();

    // ... und die Anwendung darf das nicht in "unverändert" verdrehen.
    const client = simulationReducer(frischerClient('s-1'), {
      typ: 'schnappschussAnwenden',
      schnappschuss: vollbildAus(imEinsatz(), 1),
    });
    const danach = simulationReducer(client, {
      typ: 'schnappschussAnwenden',
      schnappschuss: { folge: 2, basis: 1, felder: delta },
    });
    expect(danach.szenario).toBeNull();
  });
});

describe('naechsteNachricht (→ net.delta)', () => {
  it('ist ohne Vorgänger ein Vollbild', () => {
    const nachricht = naechsteNachricht(null, schnappschussAus(imEinsatz()), 0)!;
    expect(nachricht.basis).toBe(0);
    expect(nachricht.folge).toBe(1);
  });

  it('kettet danach über basis an die vorige Folge', () => {
    const vorher = schnappschussAus(imEinsatz());
    const nachher = schnappschussAus(simulationReducer(imEinsatz(), { typ: 'tick', dtSek: 5 }));
    const nachricht = naechsteNachricht(vorher, nachher, 7)!;
    expect(nachricht.basis).toBe(7);
    expect(nachricht.folge).toBe(8);
  });

  it('sendet nichts, wenn sich kein geteiltes Feld geändert hat', () => {
    const state = imEinsatz();
    const felder = schnappschussAus(state);
    expect(naechsteNachricht(felder, felder, 3)).toBeNull();
  });

  it('sendet nichts bei reiner Navigation - die bleibt lokal', () => {
    const state = imEinsatz();
    const navigiert = simulationReducer(state, { typ: 'abschnittWaehlen', abschnitt: 'ablage' });
    expect(naechsteNachricht(schnappschussAus(state), schnappschussAus(navigiert), 1)).toBeNull();
  });
});

describe('Stückweise Patientenliste (→ net.delta.patienten)', () => {
  it('schickt nur die Patienten mit, die sich geändert haben', () => {
    const vorher = nachEinerWeile();
    const nachher = simulationReducer(vorher, { typ: 'tick', dtSek: 0.5 });
    const nachricht = naechsteNachricht(schnappschussAus(vorher), schnappschussAus(nachher), 1)!;

    expect(nachricht.patientenTeil).toBeDefined();
    expect('patienten' in nachricht.felder).toBe(false);
    expect(nachricht.patientenTeil!.reihenfolge).toEqual(nachher.patienten.map((p) => p.id));
    expect(nachricht.patientenTeil!.geaendert.length).toBeLessThan(nachher.patienten.length);
    expect(nachricht.patientenTeil!.geaendert.length).toBeGreaterThan(0);
  });

  it('setzt die Liste beim Empfänger vollständig und in der richtigen Reihenfolge zusammen', () => {
    const vorher = nachEinerWeile();
    const client = simulationReducer(frischerClient('s-1'), {
      typ: 'schnappschussAnwenden',
      schnappschuss: vollbildAus(vorher, 1),
    });
    const nachher = simulationReducer(vorher, { typ: 'tick', dtSek: 30 });
    const nachricht = naechsteNachricht(schnappschussAus(vorher), schnappschussAus(nachher), 1)!;

    const danach = simulationReducer(client, {
      typ: 'schnappschussAnwenden',
      schnappschuss: nachricht,
    });
    expect(danach.patienten).toEqual(nachher.patienten);
  });

  it('nimmt einen neu freigegebenen Patienten auf und einen entfernten heraus', () => {
    const vorher = imEinsatz();
    const ohneErsten = { ...vorher, patienten: vorher.patienten.slice(1) };
    const nachricht = naechsteNachricht(
      schnappschussAus(vorher),
      schnappschussAus(ohneErsten),
      1,
    )!;
    const client = simulationReducer(frischerClient('s-1'), {
      typ: 'schnappschussAnwenden',
      schnappschuss: vollbildAus(vorher, 1),
    });
    const danach = simulationReducer(client, {
      typ: 'schnappschussAnwenden',
      schnappschuss: nachricht,
    });
    expect(danach.patienten.map((p) => p.id)).toEqual(ohneErsten.patienten.map((p) => p.id));
  });

  it('wendet nichts an, wenn ein vorausgesetzter Patient fehlt', () => {
    const host = nachEinerWeile();
    const client = simulationReducer(frischerClient('s-1'), {
      typ: 'schnappschussAnwenden',
      schnappschuss: vollbildAus(host, 1),
    });
    // Ein Client, dem ein Patient fehlt, den der Absender als unverändert
    // voraussetzt - die Liste ließe sich nur lückenhaft bauen.
    const lueckenhaft = { ...client, patienten: client.patienten.slice(2) };
    const nachher = simulationReducer(host, { typ: 'tick', dtSek: 0.5 });
    const nachricht = naechsteNachricht(schnappschussAus(host), schnappschussAus(nachher), 1)!;

    expect(
      simulationReducer(lueckenhaft, { typ: 'schnappschussAnwenden', schnappschuss: nachricht }),
    ).toBe(lueckenhaft);
  });

  it('lässt eine unveränderte Patientenliste ganz aus der Nachricht heraus', () => {
    // Ohne stabile Referenzen (→ `mitStabilerReferenz`) stünde die Liste auch
    // dann im Delta, wenn sich kein einziger Wert bewegt hat.
    const pausiert = simulationReducer(imEinsatz(), { typ: 'pauseUmschalten' });
    const nachTakt = simulationReducer(pausiert, { typ: 'tick', dtSek: 0.5 });
    expect(nachTakt.patienten).toBe(pausiert.patienten);
  });
});

describe('Größe des Dauerverkehrs (→ net.delta)', () => {
  function bytes(wert: unknown): number {
    return new TextEncoder().encode(JSON.stringify(wert)).length;
  }

  it('kostet ein reiner Takt nur einen Bruchteil des vollen Zustands', () => {
    // Die Schwelle ist die eigentliche Aussage dieses Umbaus: Wer künftig ein
    // Feld hinzufügt, das sich bei jedem Takt ändert, macht den Dauerverkehr
    // wieder groß - und dieser Test schlägt an, bevor es jemandem im Betrieb
    // auffällt. Gemessen lag der Anteil bei rund einem Sechstel.
    const vorher = nachEinerWeile();
    const nachher = simulationReducer(vorher, { typ: 'tick', dtSek: 0.5 });
    const nachricht = naechsteNachricht(schnappschussAus(vorher), schnappschussAus(nachher), 1)!;

    const voll = bytes(schnappschussAus(nachher));
    const takt = bytes(nachricht);
    expect(takt).toBeLessThan(voll / 3);
  });

  it('hält auch nach einer langen Übung Abstand zur 256-kB-Grenze eines Broadcasts', () => {
    // Supabase Realtime kappt eine Broadcast-Nachricht im Free-Tarif bei
    // 256 kB. Wächst der volle Zustand darüber hinaus, scheitert nicht eine
    // Nachricht, sondern jede - die Sitzung synchronisiert gar nicht mehr.
    let lang = imEinsatz();
    for (let minute = 0; minute < 180; minute += 1) {
      lang = simulationReducer(lang, { typ: 'tick', dtSek: 60 });
      lang = simulationReducer(lang, {
        typ: 'meldebuchEintragen',
        id: `m-${minute}`,
        bereich: 'kraefte',
        text: 'Rückmeldung vom Abschnitt zur Lage',
        spielerId: 'leiter-1',
      });
    }
    expect(bytes(vollbildAus(lang, 1))).toBeLessThan(128 * 1024);
  });
});

describe('Anwenden eines Schnappschusses (→ state.schnappschuss.nachricht)', () => {
  it('nimmt ein Vollbild aus jedem Zustand heraus an', () => {
    const host = simulationReducer(imEinsatz(), { typ: 'tick', dtSek: 120 });
    // Frischer Client (Folge 0) ...
    const frisch = simulationReducer(frischerClient('s-1'), {
      typ: 'schnappschussAnwenden',
      schnappschuss: vollbildAus(host, 99),
    });
    expect(frisch.zeitSek).toBe(host.zeitSek);
    expect(frisch.schnappschussFolge).toBe(99);
  });

  it('wendet ein Delta mit passender basis an', () => {
    const host = imEinsatz();
    const client = simulationReducer(frischerClient('s-1'), {
      typ: 'schnappschussAnwenden',
      schnappschuss: vollbildAus(host, 1),
    });
    const weiter = simulationReducer(host, { typ: 'tick', dtSek: 42 });
    const delta = naechsteNachricht(schnappschussAus(host), schnappschussAus(weiter), 1)!;

    const danach = simulationReducer(client, { typ: 'schnappschussAnwenden', schnappschuss: delta });
    expect(danach.zeitSek).toBe(weiter.zeitSek);
  });

  it('verwirft ein Delta, dessen basis nicht zum eigenen Stand passt', () => {
    const host = imEinsatz();
    const client = simulationReducer(frischerClient('s-1'), {
      typ: 'schnappschussAnwenden',
      schnappschuss: vollbildAus(host, 1),
    });
    const weiter = simulationReducer(host, { typ: 'tick', dtSek: 42 });
    // Als wäre Folge 2 verloren gegangen: Dieses Delta baut auf 2 auf.
    const luecke = naechsteNachricht(schnappschussAus(host), schnappschussAus(weiter), 2)!;

    expect(fehltZwischenstueck(luecke, client.schnappschussFolge)).toBe(true);
    const danach = simulationReducer(client, {
      typ: 'schnappschussAnwenden',
      schnappschuss: luecke,
    });
    expect(danach).toBe(client);
  });

  it('behandelt eine ältere Nachricht als veraltet, nicht als Lücke', () => {
    const host = imEinsatz();
    const client = simulationReducer(frischerClient('s-1'), {
      typ: 'schnappschussAnwenden',
      schnappschuss: vollbildAus(host, 5),
    });
    const alt = { folge: 3, basis: 2, felder: { zeitSek: 0 } };
    expect(fehltZwischenstueck(alt, client.schnappschussFolge)).toBe(false);
    expect(simulationReducer(client, { typ: 'schnappschussAnwenden', schnappschuss: alt })).toBe(
      client,
    );
  });

  it('wendet dieselbe Nachricht auch bei doppelter Zustellung nur einmal an', () => {
    const host = imEinsatz();
    const client = simulationReducer(frischerClient('s-1'), {
      typ: 'schnappschussAnwenden',
      schnappschuss: vollbildAus(host, 1),
    });
    const weiter = simulationReducer(host, { typ: 'tick', dtSek: 42 });
    const delta = naechsteNachricht(schnappschussAus(host), schnappschussAus(weiter), 1)!;

    const einmal = simulationReducer(client, { typ: 'schnappschussAnwenden', schnappschuss: delta });
    const zweimal = simulationReducer(einmal, {
      typ: 'schnappschussAnwenden',
      schnappschuss: delta,
    });
    expect(zweimal).toBe(einmal);
  });
});

/**
 * Der eigentliche Sicherheitsnachweis (→ `net.stoertransport`).
 *
 * Host und zwei Spieler hängen an einem Kanal, der Nachrichten verliert,
 * verdoppelt und vertauscht. Entschieden wird dabei ausschließlich mit den
 * Funktionen aus dem Betrieb - `schnappschussAus`, `naechsteNachricht`,
 * `fehltZwischenstueck` und dem Reducer. Nur die Verdrahtung darum herum
 * (die im Betrieb der Provider übernimmt) steht hier im Test.
 *
 * Nicht abgedeckt und bewusst weggelassen: die beiden Zeitsperren des
 * Providers. Sie begrenzen nur die Häufigkeit von Anfragen und Antworten; für
 * die Frage, ob am Ende alle denselben Zustand haben, sind sie ohne Belang.
 */
function fuehreLaufDurch(keim: number, verlust: number): { host: SimulationState; clients: SimulationState[] } {
  const bus = erzeugeStoerbus(
    { verlust, verdopplung: 0.15, vertauschung: 0.15 },
    keim,
  );
  const zufall = erzeugeZufall(keim + 7777);

  let hostState = imEinsatz();
  let hostFolge = 0;
  let letzteFelder: SchnappschussFelder | null = null;
  let hostTransport: Sitzungstransport;

  const sendeVollbild = () => {
    const felder = schnappschussAus(hostState);
    hostFolge += 1;
    letzteFelder = felder;
    hostTransport.senden({
      typ: 'schnappschuss',
      schnappschuss: { folge: hostFolge, basis: 0, felder },
    });
  };

  hostTransport = bus.fabrik('K7QP2', (nachricht: SitzungsNachricht) => {
    if (nachricht.typ === 'vollbildAnfordern') sendeVollbild();
  });

  const clients: { state: SimulationState; transport: Sitzungstransport }[] = [];
  for (const id of ['s-1', 's-2']) {
    const eintrag: { state: SimulationState; transport: Sitzungstransport } = {
      state: frischerClient(id),
      transport: undefined as unknown as Sitzungstransport,
    };
    eintrag.transport = bus.fabrik('K7QP2', (nachricht: SitzungsNachricht) => {
      if (nachricht.typ === 'schnappschuss') {
        if (fehltZwischenstueck(nachricht.schnappschuss, eintrag.state.schnappschussFolge)) {
          eintrag.transport.senden({ typ: 'vollbildAnfordern', spielerId: id });
          return;
        }
        eintrag.state = simulationReducer(eintrag.state, {
          typ: 'schnappschussAnwenden',
          schnappschuss: nachricht.schnappschuss,
        });
      } else if (nachricht.typ === 'schnappschussPuls') {
        if (nachricht.folge > eintrag.state.schnappschussFolge) {
          eintrag.transport.senden({ typ: 'vollbildAnfordern', spielerId: id });
        }
      }
    });
    clients.push(eintrag);
  }

  const verteile = () => {
    const felder = schnappschussAus(hostState);
    const nachricht = naechsteNachricht(letzteFelder, felder, hostFolge);
    if (!nachricht) return;
    hostFolge = nachricht.folge;
    letzteFelder = felder;
    hostTransport.senden({ typ: 'schnappschuss', schnappschuss: nachricht });
  };

  verteile();

  const aktionen: (() => SimulationAction)[] = [
    () => ({ typ: 'tick', dtSek: 0.5 }),
    () => ({ typ: 'tick', dtSek: 5 }),
    () => ({ typ: 'pauseUmschalten' }),
    () => ({ typ: 'geschwindigkeitSetzen', wert: 1 + Math.floor(zufall() * 3) }),
    () => ({
      typ: 'meldebuchEintragen',
      id: `m-${Math.floor(zufall() * 1e9)}`,
      bereich: 'kraefte',
      text: 'Rückmeldung vom Abschnitt',
      spielerId: 'leiter-1',
    }),
    () => ({
      typ: 'spielerHinzugefuegt',
      spieler: {
        id: `s-${Math.floor(zufall() * 1e6)}`,
        name: 'Zusatz',
        rolle: 'spieler',
        qualifikation: 'basis',
      },
    }),
    () => ({
      typ: 'diagnostikDurchfuehren',
      patientId: hostState.patienten[Math.floor(zufall() * hostState.patienten.length)]!.id,
      diagnostikId: 'puls_tasten',
      spielerId: 's-1',
    }),
  ];

  for (let schritt = 0; schritt < 120; schritt += 1) {
    hostState = simulationReducer(hostState, aktionen[Math.floor(zufall() * aktionen.length)]!());
    verteile();
    // Der Puls läuft im Betrieb unabhängig vom Zustand mit; hier gelegentlich.
    if (schritt % 9 === 0) {
      hostTransport.senden({ typ: 'schnappschussPuls', folge: hostFolge });
    }
  }

  // Beruhigen: zurückgehaltene Nachrichten zustellen und weiter pulsen, bis
  // alle aufgeschlossen haben. Genau das tut der Puls im Betrieb auch - er
  // hört nie auf, deshalb heilt eine verlorene Anfrage von selbst.
  for (let runde = 0; runde < 60; runde += 1) {
    bus.beruhige();
    hostTransport.senden({ typ: 'schnappschussPuls', folge: hostFolge });
    if (clients.every((client) => client.state.schnappschussFolge === hostFolge)) break;
  }

  return { host: hostState, clients: clients.map((client) => client.state) };
}

describe('Konvergenz auf einem gestörten Kanal (→ net.stoertransport)', () => {
  // Verdopplung und Vertauschung laufen in jedem Profil mit (je 15 %); der
  // Verlust kommt gestaffelt dazu. Schon Vertauschung allein reicht aus, um
  // Deltas auf einen falschen Stand treffen zu lassen.
  for (const verlust of [0, 0.2, 0.5]) {
    it(`landet bei ${Math.round(verlust * 100)} % Verlust bei allen auf demselben Stand`, () => {
      for (let keim = 1; keim <= 40; keim += 1) {
        const { host, clients } = fuehreLaufDurch(keim, verlust);
        const erwartet = schnappschussAus(host);
        for (const client of clients) {
          expect(schnappschussAus(client), `Keim ${keim}`).toEqual(erwartet);
        }
      }
    });
  }

  // Gegenprobe zum Test selbst: Ohne die basis-Prüfung würde ein Delta auf
  // einen fremden Stand gelegt und der Client bliebe dauerhaft und unbemerkt
  // falsch - der Folgezähler stimmte ja. Nachgewiesen, indem beide Prüfungen
  // (Client-Vorprüfung und Reducer) versuchsweise ausgehängt wurden: dann
  // scheitert dieser Lauf bei allen drei Profilen. Ohne diese Gegenprobe wäre
  // nicht zu sehen, ob der Lauf überhaupt etwas prüft oder nur die Reparatur
  // am Ende alles glattzieht.
  it('erkennt eine Lücke, statt sie stillschweigend zu verschmelzen', () => {
    const host = imEinsatz();
    const client = simulationReducer(frischerClient('s-1'), {
      typ: 'schnappschussAnwenden',
      schnappschuss: vollbildAus(host, 1),
    });
    const zwischen = simulationReducer(host, {
      typ: 'meldebuchEintragen',
      id: 'm-1',
      bereich: 'kraefte',
      text: 'Diese Meldung geht verloren',
      spielerId: 'leiter-1',
    });
    const danach = simulationReducer(zwischen, { typ: 'tick', dtSek: 10 });

    // Folge 2 (die Meldung) geht verloren, Folge 3 kommt an.
    naechsteNachricht(schnappschussAus(host), schnappschussAus(zwischen), 1);
    const nachTick = naechsteNachricht(schnappschussAus(zwischen), schnappschussAus(danach), 2)!;

    expect(fehltZwischenstueck(nachTick, client.schnappschussFolge)).toBe(true);
    const stehengeblieben = simulationReducer(client, {
      typ: 'schnappschussAnwenden',
      schnappschuss: nachTick,
    });
    // Nichts angewendet - insbesondere ist der Folgezähler nicht vorgerückt.
    // Sonst hielte sich der Client für aktuell und die fehlende Meldung käme
    // nie mehr nach.
    expect(stehengeblieben).toBe(client);
    expect(stehengeblieben.schnappschussFolge).toBe(1);
  });
});
