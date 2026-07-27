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

  it('legt bei der Anmeldung Name und Id an und geht ins Setup', () => {
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
    );
    expect(state.phase).toBe('setup');
    expect(state.sitzung.eigenerName).toBe('OrgL Müller');
    expect(state.sitzung.eigeneId).toBe('leiter-1');
  });

  it('eröffnet eine Sitzung mit Code und Übungsleiter im Wartebereich', () => {
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
      { typ: 'sitzungEroeffnen', szenario: busunfall },
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

describe('Teilnehmerverwaltung im Wartebereich', () => {
  function eroeffnet(): SimulationState {
    return spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'sitzungEroeffnen', szenario: busunfall },
    );
  }

  it('nimmt beigetretene Spieler auf und entfernt sie wieder', () => {
    let state = eroeffnet();
    state = simulationReducer(state, {
      typ: 'spielerHinzugefuegt',
      spieler: { id: 's-1', name: 'Anna', rolle: 'spieler' },
    });
    expect(state.sitzung.spieler).toHaveLength(2);

    // Doppelte Anmeldung derselben Id ersetzt statt zu doppeln.
    state = simulationReducer(state, {
      typ: 'spielerHinzugefuegt',
      spieler: { id: 's-1', name: 'Anna B.', rolle: 'spieler' },
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
        { typ: 'sitzungEroeffnen', szenario: busunfall },
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

    // Ein Spieler-Client: eigene Auswahl und eigene Identität gesetzt.
    const spielerClient: SimulationState = {
      ...ANFANGSZUSTAND,
      phase: 'wartebereich',
      ausgewaehlterPatientId: 'lokal-gewaehlt',
      ausgewaehlterAbschnitt: 'eingangssichtung',
      sitzung: {
        aktiv: true,
        rolle: 'spieler',
        code: schnappschuss.szenario ? 'K7QP2' : null,
        eigeneId: 's-9',
        eigenerName: 'Anna',
        spieler: [],
        status: 'wartet',
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
  });
});

describe('schnappschussAus enthält nur geteilte Scheiben', () => {
  it('spiegelt Szenario, Zeit, Patienten, Spieler und Status', () => {
    const host = simulationReducer(
      spiele(
        { typ: 'gemeinsamOeffnen' },
        { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
        { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
        { typ: 'sitzungEroeffnen', szenario: busunfall },
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
    // Navigation ist bewusst nicht Teil des geteilten Schnappschusses.
    expect(schnappschuss).not.toHaveProperty('ausgewaehlterPatientId');
  });
});
