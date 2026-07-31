import { describe, expect, it } from 'vitest';
import { SZENARIEN } from '../domain/szenarien';
import { ANFANGSZUSTAND, schnappschussAus, simulationReducer } from './reducer';
import type { SimulationState } from './reducer';

const busunfall = SZENARIEN.find((szenario) => szenario.id === 'busunfall-b31')!;

/** Führt eine Liste von Aktionen nacheinander auf dem Anfangszustand aus. */
function spiele(...aktionen: Parameters<typeof simulationReducer>[1][]): SimulationState {
  return aktionen.reduce((state, aktion) => simulationReducer(state, aktion), ANFANGSZUSTAND);
}

describe('Lobby-Fluss der Übungsleitung', () => {
  it('führt von der gemeinsamen Übung über die Rolle zur Anmeldung', () => {
    const nachOeffnen = simulationReducer(ANFANGSZUSTAND, { typ: 'gemeinsamOeffnen' });
    expect(nachOeffnen.phase).toBe('rolle');

    const nachRolle = simulationReducer(nachOeffnen, {
      typ: 'rolleWaehlen',
      rolle: 'uebungsleiter',
    });
    expect(nachRolle.phase).toBe('anmeldung');
    expect(nachRolle.sitzung.rolle).toBe('uebungsleiter');
  });

  it('legt bei der Anmeldung Name und Id an und geht zu den Maßnahmenrechten', () => {
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
    );
    // Die Maßnahmenrechte (Grundeinstellungen) sind der erste Schritt - vor
    // der Szenariowahl, denn sie gelten unabhängig von der Lage.
    expect(state.phase).toBe('massnahmenrechte');
    expect(state.sitzung.eigenerName).toBe('OrgL Müller');
    expect(state.sitzung.eigeneId).toBe('leiter-1');
    expect(state.szenario).toBeNull();
  });

  it('geht von den Maßnahmenrechten weiter zur Szenariowahl', () => {
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
      { typ: 'massnahmenrechteAbgeschlossen' },
    );
    expect(state.phase).toBe('setup');
    // Die Sitzung ist noch nicht eröffnet - kein Code, keine Teilnehmerliste.
    expect(state.sitzung.aktiv).toBe(false);
  });

  it('eröffnet eine Sitzung mit Code und Übungsleiter im Wartebereich', () => {
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
    expect(state.phase).toBe('wartebereich');
    expect(state.sitzung.aktiv).toBe(true);
    expect(state.sitzung.code).toMatch(/^[A-Z0-9]{5}$/);
    expect(state.sitzung.status).toBe('wartet');
    expect(state.szenario?.id).toBe(busunfall.id);
    // Der Übungsleiter steht selbst in der Teilnehmerliste.
    expect(state.sitzung.spieler).toHaveLength(1);
    expect(state.sitzung.spieler[0]).toMatchObject({ id: 'leiter-1', rolle: 'uebungsleiter' });
  });
});

describe('Fahrzeugkonfiguration vor der Sitzungseröffnung', () => {
  it('geht nach der Szenariowahl in die Fahrzeugkonfiguration, ohne die Sitzung zu öffnen', () => {
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
    );
    expect(state.phase).toBe('fahrzeugkonfiguration');
    expect(state.szenario?.id).toBe(busunfall.id);
    expect(state.sitzung.aktiv).toBe(false);
    expect(state.sitzung.code).toBeNull();
  });

  it('füllt den Fahrzeugwunsch per MANV-Stufe und lässt ihn manuell nachjustieren', () => {
    const nachStufe = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'manvStufeGewaehlt', stufe: 'manv10' },
    );
    expect(nachStufe.fahrzeugWunsch.filter((f) => f.typ === 'rtw')).toHaveLength(3);

    const hinzugefuegt = simulationReducer(nachStufe, {
      typ: 'fahrzeugHinzugefuegt',
      fahrzeugTyp: 'gw_san',
    });
    expect(hinzugefuegt.fahrzeugWunsch).toHaveLength(nachStufe.fahrzeugWunsch.length + 1);

    const einesEntfernt = simulationReducer(hinzugefuegt, {
      typ: 'fahrzeugEntfernt',
      fahrzeugId: hinzugefuegt.fahrzeugWunsch.at(-1)!.id,
    });
    expect(einesEntfernt.fahrzeugWunsch).toHaveLength(nachStufe.fahrzeugWunsch.length);
  });

  it('materialisiert den Fahrzeugwunsch beim Abschluss und öffnet erst dann die Sitzung', () => {
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'manvStufeGewaehlt', stufe: 'manv10' },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
    expect(state.phase).toBe('wartebereich');
    expect(state.sitzung.aktiv).toBe(true);
    expect(state.sitzung.code).toMatch(/^[A-Z0-9]{5}$/);
    expect(state.fahrzeuge).toHaveLength(7); // 3 RTW + 2 NEF + 1 KTW + 1 GW-Rett
    expect(state.fahrzeuge.every((f) => f.abschnitt === 'schadensstelle' && f.besatzung.length === 0)).toBe(
      true,
    );
  });
});

describe('Führungsrolle und Fahrzeug-Besatzung im Wartebereich', () => {
  function sitzungMitSpieler(): SimulationState {
    const geoeffnet = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'manvStufeGewaehlt', stufe: 'manv10' },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
    return simulationReducer(geoeffnet, {
      typ: 'spielerHinzugefuegt',
      spieler: { id: 'anna', name: 'Anna', rolle: 'spieler', qualifikation: 'notsan' },
    });
  }

  it('teilt eine Führungsrolle zu - anders als die Qualifikation nicht selbst gewählt', () => {
    const state = sitzungMitSpieler();
    expect(state.sitzung.spieler.find((s) => s.id === 'anna')?.fuehrungsrolle).toBeUndefined();

    const zugewiesen = simulationReducer(state, {
      typ: 'spielerFuehrungsrolleSetzen',
      spielerId: 'anna',
      rolle: 'zugfuehrer',
    });
    expect(zugewiesen.sitzung.spieler.find((s) => s.id === 'anna')?.fuehrungsrolle).toBe('zugfuehrer');
  });

  it('weist einem Fahrzeug Besatzung zu', () => {
    const state = sitzungMitSpieler();
    const fahrzeugId = state.fahrzeuge[0]!.id;

    const besetzt = simulationReducer(state, {
      typ: 'fahrzeugBesatzungGesetzt',
      fahrzeugId,
      besatzung: ['anna', 'leiter-1'],
    });
    expect(besetzt.fahrzeuge.find((f) => f.id === fahrzeugId)?.besatzung).toEqual(['anna', 'leiter-1']);
    // Andere Fahrzeuge bleiben unberührt.
    expect(besetzt.fahrzeuge.find((f) => f.id !== fahrzeugId)?.besatzung).toEqual([]);
  });
});

describe('Fahrzeug-Verlegung im Einsatz', () => {
  it('verlegt ein Fahrzeug entlang desselben Abschnitts-Graphen wie Patienten', () => {
    const vorbereitet = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'manvStufeGewaehlt', stufe: 'manv10' },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
      { typ: 'sitzungStarten' },
    );
    const fahrzeugId = vorbereitet.fahrzeuge[0]!.id;
    expect(vorbereitet.fahrzeuge[0]!.abschnitt).toBe('schadensstelle');

    const verlegt = simulationReducer(vorbereitet, {
      typ: 'fahrzeugVerlegen',
      fahrzeugId,
      ziel: 'eingangssichtung',
    });
    expect(verlegt.fahrzeuge.find((f) => f.id === fahrzeugId)?.abschnitt).toBe('eingangssichtung');
    // Wie jede Zeitkosten-Aktion läuft die Uhr für alle mit.
    expect(verlegt.zeitSek).toBeGreaterThan(vorbereitet.zeitSek);
  });

  it('lehnt eine nicht erlaubte Verlegung ab (Graph aus abschnitte.ts)', () => {
    const vorbereitet = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'manvStufeGewaehlt', stufe: 'manv10' },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
      { typ: 'sitzungStarten' },
    );
    const fahrzeugId = vorbereitet.fahrzeuge[0]!.id;
    // Von der Schadensstelle geht es nur zur Eingangssichtung, nicht direkt ins Zelt.
    const abgelehnt = simulationReducer(vorbereitet, {
      typ: 'fahrzeugVerlegen',
      fahrzeugId,
      ziel: 'zelt_rot',
    });
    expect(abgelehnt.fahrzeuge.find((f) => f.id === fahrzeugId)?.abschnitt).toBe('schadensstelle');
  });
});

describe('Materialverbrauch im Einsatz', () => {
  const patientId = busunfall.patienten[0]!.id;

  it('zieht beim Ausführen einer materialgebundenen Maßnahme Bestand vom Fahrzeug im selben Abschnitt ab', () => {
    const vorbereitet = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'manvStufeGewaehlt', stufe: 'manv10' },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
      { typ: 'sitzungStarten' },
    );
    const vorher = vorbereitet.fahrzeuge[0]!.material.tourniquet!;
    expect(vorbereitet.patienten.find((p) => p.id === patientId)?.abschnitt).toBe('schadensstelle');

    const nachher = simulationReducer(vorbereitet, {
      typ: 'massnahmeDurchfuehren',
      patientId,
      massnahmeId: 'tourniquet',
    });
    expect(nachher.fahrzeuge[0]!.material.tourniquet).toBe(vorher - 1);
  });

  it('sperrt nichts im Reducer, sinkt aber nie unter 0', () => {
    let state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'manvStufeGewaehlt', stufe: 'manv10' },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
      { typ: 'sitzungStarten' },
    );
    const gesamtbestand = state.fahrzeuge.reduce(
      (summe, fahrzeug) => summe + (fahrzeug.material.tourniquet ?? 0),
      0,
    );
    for (let i = 0; i < gesamtbestand + 3; i += 1) {
      state = simulationReducer(state, {
        typ: 'massnahmeDurchfuehren',
        patientId,
        massnahmeId: 'tourniquet',
      });
    }
    const gesamtRestbestand = state.fahrzeuge.reduce(
      (summe, fahrzeug) => summe + (fahrzeug.material.tourniquet ?? 0),
      0,
    );
    expect(gesamtRestbestand).toBe(0);
  });

  it('bleibt im Solo-Modus ohne Fahrzeuge unberührt', () => {
    const solo = simulationReducer(ANFANGSZUSTAND, {
      typ: 'szenarioStarten',
      szenario: busunfall,
      alleine: true,
    });
    expect(solo.fahrzeuge).toEqual([]);
    const nachher = simulationReducer(solo, {
      typ: 'massnahmeDurchfuehren',
      patientId,
      massnahmeId: 'tourniquet',
    });
    expect(nachher.fahrzeuge).toEqual([]);
  });
});

describe('Maßnahmenrechte vor der Sitzungseröffnung', () => {
  it('startet mit dem Katalog-Standard, delegierbar an alle (basis)', () => {
    expect(ANFANGSZUSTAND.massnahmenrechte.tourniquet).toEqual({
      qualifikation: 'notsan',
      delegationsziel: 'basis',
    });
  });

  it('übernimmt eine Anpassung der Übungsleitung', () => {
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      {
        typ: 'massnahmenrechteSetzen',
        rechte: {
          ...ANFANGSZUSTAND.massnahmenrechte,
          tourniquet: { qualifikation: 'basis', delegationsziel: null },
        },
      },
    );
    expect(state.massnahmenrechte.tourniquet).toEqual({
      qualifikation: 'basis',
      delegationsziel: null,
    });
    // Andere Maßnahmen bleiben beim Katalog-Standard.
    expect(state.massnahmenrechte.blutstillung).toEqual(ANFANGSZUSTAND.massnahmenrechte.blutstillung);
  });

  it('bleibt über die Szenariowahl und die Sitzungseröffnung hinweg erhalten', () => {
    const angepasst = {
      ...ANFANGSZUSTAND.massnahmenrechte,
      tourniquet: { qualifikation: 'basis' as const, delegationsziel: 'notarzt' as const },
    };
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'massnahmenrechteSetzen', rechte: angepasst },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
    expect(state.massnahmenrechte.tourniquet).toEqual({
      qualifikation: 'basis',
      delegationsziel: 'notarzt',
    });
  });
});

describe('Teilnehmerverwaltung im Wartebereich', () => {
  function eroeffnet(): SimulationState {
    return spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
  }

  it('nimmt beigetretene Spieler auf und entfernt sie wieder', () => {
    let state = eroeffnet();
    state = simulationReducer(state, {
      typ: 'spielerHinzugefuegt',
      spieler: { id: 's-1', name: 'Anna', rolle: 'spieler', qualifikation: 'basis' },
    });
    expect(state.sitzung.spieler).toHaveLength(2);

    // Doppelte Anmeldung derselben Id ersetzt statt zu doppeln.
    state = simulationReducer(state, {
      typ: 'spielerHinzugefuegt',
      spieler: { id: 's-1', name: 'Anna B.', rolle: 'spieler', qualifikation: 'basis' },
    });
    expect(state.sitzung.spieler).toHaveLength(2);

    state = simulationReducer(state, { typ: 'spielerEntfernt', spielerId: 's-1' });
    expect(state.sitzung.spieler.map((s) => s.id)).toEqual(['leiter-1']);
  });

  it('startet die Übung erst mit Szenario und geht in den Einsatz', () => {
    const state = simulationReducer(eroeffnet(), { typ: 'sitzungStarten' });
    expect(state.phase).toBe('einsatz');
    expect(state.laufend).toBe(true);
    expect(state.sitzung.status).toBe('laeuft');
    expect(state.patienten).toHaveLength(busunfall.patienten.length);
    // Teamspiel läuft ohne Solo-Drosselung (voller Faktor).
    expect(state.alleine).toBe(false);
  });
});

describe('Spielerbeitritt', () => {
  it('bringt den Spieler als Gast in den Wartebereich', () => {
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'spieler' },
      { typ: 'spielerBeitreten', code: 'K7QP2', name: 'Anna', eigeneId: 's-1' },
    );
    expect(state.phase).toBe('wartebereich');
    expect(state.sitzung.rolle).toBe('spieler');
    expect(state.sitzung.code).toBe('K7QP2');
    expect(state.sitzung.eigenerName).toBe('Anna');
    expect(state.sitzung.aktiv).toBe(true);
  });
});

describe('Host-autoritative Synchronisation', () => {
  function imEinsatz(): SimulationState {
    return simulationReducer(
      spiele(
        { typ: 'gemeinsamOeffnen' },
        { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
        { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
        { typ: 'massnahmenrechteAbgeschlossen' },
        { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
        { typ: 'fahrzeugkonfigurationAbgeschlossen' },
      ),
      { typ: 'sitzungStarten' },
    );
  }

  it('überträgt eine weitergereichte Spieleraktion in den Schnappschuss', () => {
    const host = imEinsatz();
    const ziel = host.patienten[0]!;
    // Der Host wendet die vom Spieler gesendete Aktion an ...
    const nachAktion = simulationReducer(host, {
      typ: 'patientSichten',
      patientId: ziel.id,
      kategorie: 'SK1',
    });
    // ... und verteilt den Schnappschuss.
    const schnappschuss = schnappschussAus(nachAktion);
    const uebertragen = schnappschuss.patienten.find((p) => p.id === ziel.id)!;
    expect(uebertragen.gesichtetAls).toBe('SK1');
    expect(schnappschuss.zeitSek).toBeGreaterThan(0);
  });

  it('wendet einen Schnappschuss an, behält aber lokale Navigation und Identität', () => {
    const host = imEinsatz();
    const schnappschuss = schnappschussAus(host);

    // Ein Spieler-Client: eigene Auswahl, eigene Identität - und eine eigene,
    // lokal geladene Vorbelegung der Maßnahmenrechte, die vom Host abweicht.
    const spielerClient: SimulationState = {
      ...ANFANGSZUSTAND,
      phase: 'wartebereich',
      ausgewaehlterPatientId: 'lokal-gewaehlt',
      ausgewaehlterAbschnitt: 'eingangssichtung',
      massnahmenrechte: {
        ...ANFANGSZUSTAND.massnahmenrechte,
        tourniquet: { qualifikation: 'notarzt', delegationsziel: null },
      },
      sitzung: {
        aktiv: true,
        rolle: 'spieler',
        code: schnappschuss.szenario ? 'K7QP2' : null,
        eigeneId: 's-9',
        eigenerName: 'Anna',
        spieler: [],
        status: 'wartet',
        verbindungsfehler: null,
      },
    };

    const nachher = simulationReducer(spielerClient, {
      typ: 'schnappschussAnwenden',
      schnappschuss,
    });

    // Geteilter Zustand kommt an.
    expect(nachher.phase).toBe('einsatz');
    expect(nachher.patienten).toHaveLength(busunfall.patienten.length);
    expect(nachher.sitzung.status).toBe('laeuft');
    // Lokale Navigation und eigene Identität bleiben unangetastet.
    expect(nachher.ausgewaehlterPatientId).toBe('lokal-gewaehlt');
    expect(nachher.ausgewaehlterAbschnitt).toBe('eingangssichtung');
    expect(nachher.sitzung.rolle).toBe('spieler');
    expect(nachher.sitzung.eigeneId).toBe('s-9');
    expect(nachher.sitzung.eigenerName).toBe('Anna');
    // Die Maßnahmenrechte des Hosts überschreiben die eigene, lokale
    // Vorbelegung - alle Clients setzen dieselben Sperren durch.
    expect(nachher.massnahmenrechte).toEqual(host.massnahmenrechte);
  });

  it('verwirft einen verspätet eintreffenden, älteren Schnappschuss', () => {
    const host = imEinsatz();
    const frueh = schnappschussAus(host, 5);
    const spaet = schnappschussAus(simulationReducer(host, { typ: 'tick', dtSek: 30 }), 6);

    const spielerClient: SimulationState = {
      ...ANFANGSZUSTAND,
      sitzung: {
        aktiv: true,
        rolle: 'spieler',
        code: 'K7QP2',
        eigeneId: 's-9',
        eigenerName: 'Anna',
        spieler: [],
        status: 'wartet',
        verbindungsfehler: null,
      },
    };

    // Der neuere Schnappschuss (Netzwerk hat ihn zuerst zugestellt) wird angewendet ...
    const nachSpaet = simulationReducer(spielerClient, { typ: 'schnappschussAnwenden', schnappschuss: spaet });
    expect(nachSpaet.zeitSek).toBe(spaet.zeitSek);

    // ... ein danach eintreffender, aber inhaltlich älterer Schnappschuss darf die Uhr nicht zurückdrehen.
    const nachFrueh = simulationReducer(nachSpaet, { typ: 'schnappschussAnwenden', schnappschuss: frueh });
    expect(nachFrueh).toBe(nachSpaet);
    expect(nachFrueh.zeitSek).toBe(spaet.zeitSek);
  });

  it('verwirft eine doppelt zugestellte Kopie desselben Schnappschusses', () => {
    const host = imEinsatz();
    const schnappschuss = schnappschussAus(host, 3);
    const spielerClient: SimulationState = {
      ...ANFANGSZUSTAND,
      sitzung: {
        aktiv: true,
        rolle: 'spieler',
        code: 'K7QP2',
        eigeneId: 's-9',
        eigenerName: 'Anna',
        spieler: [],
        status: 'wartet',
        verbindungsfehler: null,
      },
    };
    const einmal = simulationReducer(spielerClient, { typ: 'schnappschussAnwenden', schnappschuss });
    const zweimal = simulationReducer(einmal, { typ: 'schnappschussAnwenden', schnappschuss });
    expect(zweimal).toBe(einmal);
  });
});

describe('Nachhol-Takt aus dem Hintergrund', () => {
  function imEinsatz(): SimulationState {
    return simulationReducer(
      spiele(
        { typ: 'gemeinsamOeffnen' },
        { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
        { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
        { typ: 'massnahmenrechteAbgeschlossen' },
        { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
        { typ: 'fahrzeugkonfigurationAbgeschlossen' },
      ),
      { typ: 'sitzungStarten' },
    );
  }

  it('ein großer Nachhol-Takt entspricht mehreren aufeinanderfolgenden', () => {
    const start = imEinsatz();

    // Ein einziger Nachhol-Takt über 120 s (Rückkehr aus dem Hintergrund) ...
    const gross = simulationReducer(start, { typ: 'tick', dtSek: 120 });

    // ... gegen vier Takte à 30 s. Weil beide intern in 5-s-Schritten rechnen
    // (→ `sim.zeitraum`) und die Schrittgrenzen sich decken, ist das Ergebnis
    // identisch: Die Uhr darf im Hintergrund gedrosselt sein, ohne zu driften.
    let stueckweise = start;
    for (let i = 0; i < 4; i += 1) {
      stueckweise = simulationReducer(stueckweise, { typ: 'tick', dtSek: 30 });
    }

    expect(gross.zeitSek).toBe(stueckweise.zeitSek);
    for (const p of gross.patienten) {
      const gegen = stueckweise.patienten.find((q) => q.id === p.id)!;
      expect(p.vitalwerte).toEqual(gegen.vitalwerte);
      expect(p.status).toBe(gegen.status);
    }
  });

  it('ignoriert Takte ohne oder mit negativer Dauer', () => {
    const start = imEinsatz();
    expect(simulationReducer(start, { typ: 'tick', dtSek: 0 })).toBe(start);
    expect(simulationReducer(start, { typ: 'tick', dtSek: -3 })).toBe(start);
  });
});

describe('schnappschussAus enthält nur geteilte Scheiben', () => {
  it('spiegelt Szenario, Zeit, Patienten, Spieler und Status', () => {
    const host = simulationReducer(
      spiele(
        { typ: 'gemeinsamOeffnen' },
        { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
        { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
        { typ: 'massnahmenrechteAbgeschlossen' },
        { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
        { typ: 'fahrzeugkonfigurationAbgeschlossen' },
      ),
      { typ: 'sitzungStarten' },
    );
    const schnappschuss = schnappschussAus(host);
    expect(schnappschuss).toMatchObject({
      phase: 'einsatz',
      laufend: true,
      status: 'laeuft',
    });
    expect(schnappschuss.szenario?.id).toBe(busunfall.id);
    expect(schnappschuss.spieler).toEqual(host.sitzung.spieler);
    // Maßnahmenrechte gehören dazu - sonst würden Clients unterschiedliche
    // Sperren durchsetzen (→ `domain.massnahmenrechte`).
    expect(schnappschuss.massnahmenrechte).toEqual(host.massnahmenrechte);
    // Navigation ist bewusst nicht Teil des geteilten Schnappschusses.
    expect(schnappschuss).not.toHaveProperty('ausgewaehlterPatientId');
  });
});

describe('Fachliche Qualifikation im Mehrspieler', () => {
  function eroeffnetMitSpieler(): SimulationState {
    const host = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
    return simulationReducer(host, {
      typ: 'spielerHinzugefuegt',
      spieler: { id: 's-1', name: 'Anna', rolle: 'spieler', qualifikation: 'basis' },
    });
  }

  it('startet neue Teilnehmende auf der Stufe basis', () => {
    const state = eroeffnetMitSpieler();
    expect(state.sitzung.spieler.find((s) => s.id === 's-1')?.qualifikation).toBe('basis');
    expect(state.sitzung.spieler.find((s) => s.id === 'leiter-1')?.qualifikation).toBe('basis');
  });

  it('hebt die Qualifikation eines Spielers an, ohne die anderen zu ändern', () => {
    const state = simulationReducer(eroeffnetMitSpieler(), {
      typ: 'spielerQualifikationSetzen',
      spielerId: 's-1',
      qualifikation: 'notarzt',
    });
    expect(state.sitzung.spieler.find((s) => s.id === 's-1')?.qualifikation).toBe('notarzt');
    expect(state.sitzung.spieler.find((s) => s.id === 'leiter-1')?.qualifikation).toBe('basis');
  });

  it('ignoriert eine unbekannte Spieler-Id', () => {
    const vorher = eroeffnetMitSpieler();
    const nachher = simulationReducer(vorher, {
      typ: 'spielerQualifikationSetzen',
      spielerId: 'unbekannt',
      qualifikation: 'notarzt',
    });
    expect(nachher.sitzung.spieler).toEqual(vorher.sitzung.spieler);
  });
});

describe('Delegation einer Maßnahme (massnahmeDelegieren)', () => {
  function imEinsatz(): SimulationState {
    return simulationReducer(
      spiele(
        { typ: 'gemeinsamOeffnen' },
        { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
        { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
        { typ: 'massnahmenrechteAbgeschlossen' },
        { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
        { typ: 'fahrzeugkonfigurationAbgeschlossen' },
      ),
      { typ: 'sitzungStarten' },
    );
  }

  it('trägt eine Maßnahme als delegiert für genau diesen Patienten ein', () => {
    const state = imEinsatz();
    const patientId = state.patienten[0]!.id;
    const nachher = simulationReducer(state, {
      typ: 'massnahmeDelegieren',
      patientId,
      massnahmeId: 'tourniquet',
    });
    const patient = nachher.patienten.find((p) => p.id === patientId)!;
    expect(patient.delegierteMassnahmen).toEqual(['tourniquet']);
    // Andere Patienten bleiben unberührt.
    for (const anderer of nachher.patienten.filter((p) => p.id !== patientId)) {
      expect(anderer.delegierteMassnahmen).toEqual([]);
    }
  });

  it('trägt dieselbe Maßnahme nicht doppelt ein', () => {
    const state = imEinsatz();
    const patientId = state.patienten[0]!.id;
    const einmal = simulationReducer(state, {
      typ: 'massnahmeDelegieren',
      patientId,
      massnahmeId: 'tourniquet',
    });
    const zweimal = simulationReducer(einmal, {
      typ: 'massnahmeDelegieren',
      patientId,
      massnahmeId: 'tourniquet',
    });
    expect(zweimal.patienten.find((p) => p.id === patientId)?.delegierteMassnahmen).toEqual([
      'tourniquet',
    ]);
  });

  it('kostet keine Einsatzzeit', () => {
    const state = imEinsatz();
    const patientId = state.patienten[0]!.id;
    const nachher = simulationReducer(state, {
      typ: 'massnahmeDelegieren',
      patientId,
      massnahmeId: 'tourniquet',
    });
    expect(nachher.zeitSek).toBe(state.zeitSek);
  });
});

describe('Verbindungsfehler des Transports', () => {
  it('trägt eine Fehlermeldung in die Sitzung ein und löscht sie bei Wiederverbindung', () => {
    const nachFehler = simulationReducer(ANFANGSZUSTAND, {
      typ: 'verbindungsfehlerSetzen',
      meldung: 'Verbindung fehlgeschlagen.',
    });
    expect(nachFehler.sitzung.verbindungsfehler).toBe('Verbindung fehlgeschlagen.');

    const nachErholung = simulationReducer(nachFehler, {
      typ: 'verbindungsfehlerSetzen',
      meldung: null,
    });
    expect(nachErholung.sitzung.verbindungsfehler).toBeNull();
  });
});
