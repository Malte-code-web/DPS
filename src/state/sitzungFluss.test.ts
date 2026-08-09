import { describe, expect, it } from 'vitest';
import { SZENARIEN } from '../domain/szenarien';
import { ANFANGSZUSTAND, schnappschussAus, simulationReducer } from './reducer';
import type { SimulationState } from './reducer';
import type { EingeklemmtStatus } from '../domain/types';

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

  it('legt bei der Anmeldung Name und Id an und geht zunächst zum Modus', () => {
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
    );
    // Der Modus (→ `ui.modus`) entscheidet, auf welche Art gespielt wird -
    // noch vor den Maßnahmenrechten, die nur den digitalen Modus betreffen.
    expect(state.phase).toBe('modus');
    expect(state.sitzung.eigenerName).toBe('OrgL Müller');
    expect(state.sitzung.eigeneId).toBe('leiter-1');
    expect(state.szenario).toBeNull();
  });

  it('führt nach digitaler Moduswahl zu den Maßnahmenrechten', () => {
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'digital' },
    );
    expect(state.phase).toBe('massnahmenrechte');
    expect(state.modus).toBe('digital');
  });

  it('bleibt bei einem noch nicht gebauten Modus auf der Modus-Seite', () => {
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'fuehrungskraefte' },
    );
    expect(state.phase).toBe('modus');
    expect(state.modus).toBe('fuehrungskraefte');
  });

  it('geht von den Maßnahmenrechten weiter zur Szenariowahl', () => {
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL Müller', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'digital' },
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
      { typ: 'modusWaehlen', modus: 'digital' },
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
      { typ: 'modusWaehlen', modus: 'digital' },
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
      { typ: 'modusWaehlen', modus: 'digital' },
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
      { typ: 'modusWaehlen', modus: 'digital' },
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
      { typ: 'modusWaehlen', modus: 'digital' },
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
      { typ: 'modusWaehlen', modus: 'digital' },
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
    // Der Reducer selbst lässt die Uhr unverändert - die Zeitkosten laufen
    // jetzt als Echtzeit-Timer bei der Handlung selbst ab (→ `state.zeitkosten`).
    expect(verlegt.zeitSek).toBe(vorbereitet.zeitSek);
  });

  it('lehnt eine nicht erlaubte Verlegung ab (Graph aus abschnitte.ts)', () => {
    const vorbereitet = spiele(
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
      { typ: 'modusWaehlen', modus: 'digital' },
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
      { typ: 'modusWaehlen', modus: 'digital' },
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
      { typ: 'modusWaehlen', modus: 'digital' },
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
      { typ: 'modusWaehlen', modus: 'digital' },
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
      { typ: 'modusWaehlen', modus: 'digital' },
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

  it('erkennt den Beobachter-Code, tritt aber demselben Kanal-Code bei (→ sitzung.beobachter)', () => {
    const state = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'spieler' },
      { typ: 'spielerBeitreten', code: 'K7QP2-BEOB', name: 'Beobachterin', eigeneId: 'b-1' },
    );
    expect(state.sitzung.rolle).toBe('beobachter');
    expect(state.sitzung.code).toBe('K7QP2');
  });
});

describe('Freigabemodus und Patientenfreigabe (→ modell.freigabemodus)', () => {
  function eroeffnet(): SimulationState {
    return spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'digital' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
  }

  it('startet standardmäßig im Modus "sofort" - Patienten sofort an der Schadensstelle', () => {
    const state = simulationReducer(eroeffnet(), { typ: 'sitzungStarten' });
    expect(state.freigabemodus).toBe('sofort');
    expect(state.patienten.every((p) => p.abschnitt === 'schadensstelle')).toBe(true);
    expect(state.ausgewaehlterAbschnitt).toBe('schadensstelle');
  });

  it('lässt im Modus "gestaffelt" alle Patienten zunächst verdeckt', () => {
    const state = simulationReducer(
      simulationReducer(eroeffnet(), { typ: 'freigabemodusSetzen', modus: 'gestaffelt' }),
      { typ: 'sitzungStarten' },
    );
    expect(state.patienten.every((p) => p.abschnitt === 'verdeckt')).toBe(true);
    expect(state.ausgewaehlterAbschnitt).toBe('ablage');
  });

  it('gibt einen verdeckten Patienten im gestaffelten Modus manuell in die Ablage frei', () => {
    const gestartet = simulationReducer(
      simulationReducer(eroeffnet(), { typ: 'freigabemodusSetzen', modus: 'gestaffelt' }),
      { typ: 'sitzungStarten' },
    );
    const ersterPatientId = gestartet.patienten[0]!.id;
    const state = simulationReducer(gestartet, {
      typ: 'patientFreigeben',
      patientId: ersterPatientId,
    });
    expect(state.patienten.find((p) => p.id === ersterPatientId)?.abschnitt).toBe('ablage');
    // Alle übrigen bleiben verdeckt.
    expect(
      state.patienten.filter((p) => p.id !== ersterPatientId).every((p) => p.abschnitt === 'verdeckt'),
    ).toBe(true);
  });

  it('gibt mit alleVerdecktenFreigeben den gesamten verdeckten Pool auf einmal frei', () => {
    const gestartet = simulationReducer(
      simulationReducer(eroeffnet(), { typ: 'freigabemodusSetzen', modus: 'gestaffelt' }),
      { typ: 'sitzungStarten' },
    );
    expect(gestartet.patienten.every((p) => p.abschnitt === 'verdeckt')).toBe(true);

    const state = simulationReducer(gestartet, { typ: 'alleVerdecktenFreigeben' });
    expect(state.patienten.every((p) => p.abschnitt === 'ablage')).toBe(true);
  });

  it('gibt Patienten zeitgesteuert über den tick-Takt frei, sobald freigabeMinuten erreicht ist', () => {
    const szenarioMitFreigabe = {
      ...busunfall,
      patienten: busunfall.patienten.map((vorlage, index) =>
        index === 0 ? { ...vorlage, freigabeMinuten: 2 } : vorlage,
      ),
    };
    const gestartet = simulationReducer(
      simulationReducer(
        spiele(
          { typ: 'gemeinsamOeffnen' },
          { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
          { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
          { typ: 'modusWaehlen', modus: 'digital' },
          { typ: 'massnahmenrechteAbgeschlossen' },
          { typ: 'szenarioFuerSitzungWaehlen', szenario: szenarioMitFreigabe },
          { typ: 'fahrzeugkonfigurationAbgeschlossen' },
        ),
        { typ: 'freigabemodusSetzen', modus: 'gestaffelt' },
      ),
      { typ: 'sitzungStarten' },
    );
    const markierteId = szenarioMitFreigabe.patienten[0]!.id;

    // Vor Ablauf der 2 Minuten bleibt der Patient verdeckt.
    const vorAblauf = simulationReducer(gestartet, { typ: 'tick', dtSek: 90 });
    expect(vorAblauf.patienten.find((p) => p.id === markierteId)?.abschnitt).toBe('verdeckt');

    // Nach Ablauf ist er automatisch in der Ablage.
    const nachAblauf = simulationReducer(vorAblauf, { typ: 'tick', dtSek: 30 });
    expect(nachAblauf.patienten.find((p) => p.id === markierteId)?.abschnitt).toBe('ablage');
    // Unmarkierte Patienten bleiben ohne manuelle Freigabe weiter verdeckt.
    expect(
      nachAblauf.patienten.filter((p) => p.id !== markierteId).every((p) => p.abschnitt === 'verdeckt'),
    ).toBe(true);
  });
});

describe('Geodaten und Verlegungsdauer (→ domain.geodaten)', () => {
  function eroeffnet(): SimulationState {
    return spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'digital' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
  }

  it('materialisiert die Routen aus dem Szenario bei sitzungStarten, gesperrtBeimStart als Status "gesperrt"', () => {
    const state = simulationReducer(eroeffnet(), { typ: 'sitzungStarten' });
    expect(state.routen.length).toBe(busunfall.geodaten!.routen.length);
    const zufahrt = state.routen.find(
      (route) => route.von === 'bereitstellungsraum' && route.nach === 'schadensstelle',
    );
    expect(zufahrt?.status).toBe('gesperrt');
    const frei = state.routen.find(
      (route) => route.von === 'schadensstelle' && route.nach === 'eingangssichtung',
    );
    expect(frei?.status).toBe('frei');
  });

  it('nimmt die Routen in den Schnappschuss auf, damit Spieler dieselbe Verlegungsdauer sehen', () => {
    const state = simulationReducer(eroeffnet(), { typ: 'sitzungStarten' });
    const schnappschuss = schnappschussAus(state);
    expect(schnappschuss.routen).toEqual(state.routen);
  });
});

describe('Host-autoritative Synchronisation', () => {
  function imEinsatz(): SimulationState {
    return simulationReducer(
      spiele(
        { typ: 'gemeinsamOeffnen' },
        { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
        { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
        { typ: 'modusWaehlen', modus: 'digital' },
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
        { typ: 'modusWaehlen', modus: 'digital' },
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
        { typ: 'modusWaehlen', modus: 'digital' },
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
      { typ: 'modusWaehlen', modus: 'digital' },
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

describe('Delegationsanfrage (delegationAnfragen/delegationBeantworten)', () => {
  function imEinsatz(): SimulationState {
    return simulationReducer(
      spiele(
        { typ: 'gemeinsamOeffnen' },
        { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
        { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
        { typ: 'modusWaehlen', modus: 'digital' },
        { typ: 'massnahmenrechteAbgeschlossen' },
        { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
        { typ: 'fahrzeugkonfigurationAbgeschlossen' },
      ),
      { typ: 'sitzungStarten' },
    );
  }

  it('trägt eine Anfrage ein', () => {
    const state = imEinsatz();
    const patientId = state.patienten[0]!.id;
    const nachher = simulationReducer(state, {
      typ: 'delegationAnfragen',
      id: 'anfrage-1',
      patientId,
      massnahmeId: 'tourniquet',
      anfragendeId: 's-1',
      angefragteId: 'leiter-1',
    });
    expect(nachher.delegationsanfragen).toEqual([
      {
        id: 'anfrage-1',
        patientId,
        massnahmeId: 'tourniquet',
        anfragendeId: 's-1',
        angefragteId: 'leiter-1',
      },
    ]);
  });

  it('trägt dieselbe Anfrage-Id nicht doppelt ein', () => {
    const state = imEinsatz();
    const patientId = state.patienten[0]!.id;
    const aktion = {
      typ: 'delegationAnfragen' as const,
      id: 'anfrage-1',
      patientId,
      massnahmeId: 'tourniquet' as const,
      anfragendeId: 's-1',
      angefragteId: 'leiter-1',
    };
    const zweimal = simulationReducer(simulationReducer(state, aktion), aktion);
    expect(zweimal.delegationsanfragen).toHaveLength(1);
  });

  it('gibt die Maßnahme bei Annahme gezielt nur für die anfragende Person frei', () => {
    const state = imEinsatz();
    const patientId = state.patienten[0]!.id;
    const angefragt = simulationReducer(state, {
      typ: 'delegationAnfragen',
      id: 'anfrage-1',
      patientId,
      massnahmeId: 'tourniquet',
      anfragendeId: 's-1',
      angefragteId: 'leiter-1',
    });
    const nachher = simulationReducer(angefragt, {
      typ: 'delegationBeantworten',
      id: 'anfrage-1',
      angenommen: true,
    });
    expect(nachher.delegationsanfragen).toEqual([]);
    const patient = nachher.patienten.find((p) => p.id === patientId)!;
    expect(patient.delegierteMassnahmen).toEqual([{ massnahmeId: 'tourniquet', spielerId: 's-1' }]);
  });

  it('gibt bei Ablehnung nichts frei, entfernt aber die Anfrage', () => {
    const state = imEinsatz();
    const patientId = state.patienten[0]!.id;
    const angefragt = simulationReducer(state, {
      typ: 'delegationAnfragen',
      id: 'anfrage-1',
      patientId,
      massnahmeId: 'tourniquet',
      anfragendeId: 's-1',
      angefragteId: 'leiter-1',
    });
    const nachher = simulationReducer(angefragt, {
      typ: 'delegationBeantworten',
      id: 'anfrage-1',
      angenommen: false,
    });
    expect(nachher.delegationsanfragen).toEqual([]);
    expect(nachher.patienten.find((p) => p.id === patientId)?.delegierteMassnahmen).toEqual([]);
  });

  it('ignoriert eine unbekannte Anfrage-Id bei der Antwort', () => {
    const state = imEinsatz();
    const nachher = simulationReducer(state, {
      typ: 'delegationBeantworten',
      id: 'unbekannt',
      angenommen: true,
    });
    expect(nachher).toEqual(state);
  });

  it('trägt eine angenommene Freigabe nicht doppelt ein', () => {
    const state = imEinsatz();
    const patientId = state.patienten[0]!.id;
    const vorherFreigegeben = simulationReducer(
      simulationReducer(state, {
        typ: 'delegationAnfragen',
        id: 'anfrage-1',
        patientId,
        massnahmeId: 'tourniquet',
        anfragendeId: 's-1',
        angefragteId: 'leiter-1',
      }),
      { typ: 'delegationBeantworten', id: 'anfrage-1', angenommen: true },
    );
    const zweiteAnfrage = simulationReducer(
      simulationReducer(vorherFreigegeben, {
        typ: 'delegationAnfragen',
        id: 'anfrage-2',
        patientId,
        massnahmeId: 'tourniquet',
        anfragendeId: 's-1',
        angefragteId: 'leiter-1',
      }),
      { typ: 'delegationBeantworten', id: 'anfrage-2', angenommen: true },
    );
    expect(
      zweiteAnfrage.patienten.find((p) => p.id === patientId)?.delegierteMassnahmen,
    ).toEqual([{ massnahmeId: 'tourniquet', spielerId: 's-1' }]);
  });

  it('kostet keine Einsatzzeit', () => {
    const state = imEinsatz();
    const patientId = state.patienten[0]!.id;
    const angefragt = simulationReducer(state, {
      typ: 'delegationAnfragen',
      id: 'anfrage-1',
      patientId,
      massnahmeId: 'tourniquet',
      anfragendeId: 's-1',
      angefragteId: 'leiter-1',
    });
    const nachher = simulationReducer(angefragt, {
      typ: 'delegationBeantworten',
      id: 'anfrage-1',
      angenommen: true,
    });
    expect(nachher.zeitSek).toBe(state.zeitSek);
  });
});

describe('Bindende Maßnahmen: Narkose (massnahmeMitTeamStarten/kollegenanfrageAnnehmen)', () => {
  function imEinsatzMitTeam(): SimulationState {
    const gestartet = simulationReducer(
      spiele(
        { typ: 'gemeinsamOeffnen' },
        { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
        { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
        { typ: 'modusWaehlen', modus: 'digital' },
        { typ: 'massnahmenrechteAbgeschlossen' },
        { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
        { typ: 'fahrzeugkonfigurationAbgeschlossen' },
      ),
      { typ: 'sitzungStarten' },
    );
    return [
      { id: 'na-1', name: 'Dr. Voss', rolle: 'spieler' as const, qualifikation: 'notarzt' as const },
      { id: 'ns-1', name: 'Krüger', rolle: 'spieler' as const, qualifikation: 'notsan' as const },
      { id: 'rs-1', name: 'Thoms', rolle: 'spieler' as const, qualifikation: 'rettungssanitaeter' as const },
    ].reduce(
      (zustand, spieler) => simulationReducer(zustand, { typ: 'spielerHinzugefuegt', spieler }),
      gestartet,
    );
  }

  it('legt beim Starten zwei Kollegenanfragen an (NotSan + RS) und bindet die anfragende Person vorläufig', () => {
    const state = imEinsatzMitTeam();
    const patientId = state.patienten[0]!.id;
    const nachher = simulationReducer(state, {
      typ: 'massnahmeMitTeamStarten',
      patientId,
      massnahmeId: 'propofol',
      anfragendeId: 'na-1',
      dosisMg: 150,
    });
    expect(nachher.kollegenanfragen).toHaveLength(2);
    expect(nachher.kollegenanfragen.map((a) => a.benoetigteQualifikation).sort()).toEqual([
      'notsan',
      'rettungssanitaeter',
    ]);
    expect(nachher.kollegenanfragen.every((a) => a.grund === 'narkose')).toBe(true);
    const notArzt = nachher.sitzung.spieler.find((s) => s.id === 'na-1')!;
    expect(notArzt.gebundenBis).toBeGreaterThan(nachher.zeitSek);
    // Die Maßnahme wirkt noch nicht - das Team ist erst zwei von drei.
    expect(nachher.patienten.find((p) => p.id === patientId)?.durchgefuehrteMassnahmen).not.toContain(
      'propofol',
    );
  });

  it('tut nichts, wenn die Maßnahme kein Team benötigt', () => {
    const state = imEinsatzMitTeam();
    const patientId = state.patienten[0]!.id;
    const nachher = simulationReducer(state, {
      typ: 'massnahmeMitTeamStarten',
      patientId,
      massnahmeId: 'tourniquet',
      anfragendeId: 'na-1',
    });
    expect(nachher).toBe(state);
  });

  it('bindet die erste annehmende Person, wendet die Maßnahme aber erst mit vollständigem Team an', () => {
    const state = imEinsatzMitTeam();
    const patientId = state.patienten[0]!.id;
    const gestartet = simulationReducer(state, {
      typ: 'massnahmeMitTeamStarten',
      patientId,
      massnahmeId: 'propofol',
      anfragendeId: 'na-1',
      dosisMg: 150,
    });
    const notSanAnfrage = gestartet.kollegenanfragen.find((a) => a.benoetigteQualifikation === 'notsan')!;
    const nachErsterAnnahme = simulationReducer(gestartet, {
      typ: 'kollegenanfrageAnnehmen',
      anfrageId: notSanAnfrage.id,
      spielerId: 'ns-1',
    });
    expect(nachErsterAnnahme.kollegenanfragen).toHaveLength(2);
    expect(
      nachErsterAnnahme.kollegenanfragen.find((a) => a.id === notSanAnfrage.id)?.angenommenVon,
    ).toEqual(['ns-1']);
    const notSan = nachErsterAnnahme.sitzung.spieler.find((s) => s.id === 'ns-1')!;
    expect(notSan.gebundenBis).toBeGreaterThan(nachErsterAnnahme.zeitSek);
    expect(
      nachErsterAnnahme.patienten.find((p) => p.id === patientId)?.durchgefuehrteMassnahmen,
    ).not.toContain('propofol');
  });

  it('wendet die Maßnahme an, sobald das Team vollständig ist, und bindet alle drei für Dauer + Intubationszeit', () => {
    const state = imEinsatzMitTeam();
    const patientId = state.patienten[0]!.id;
    const gestartet = simulationReducer(state, {
      typ: 'massnahmeMitTeamStarten',
      patientId,
      massnahmeId: 'propofol',
      anfragendeId: 'na-1',
      dosisMg: 150,
    });
    const notSanAnfrage = gestartet.kollegenanfragen.find((a) => a.benoetigteQualifikation === 'notsan')!;
    const rsAnfrage = gestartet.kollegenanfragen.find(
      (a) => a.benoetigteQualifikation === 'rettungssanitaeter',
    )!;
    const nachBeiden = simulationReducer(
      simulationReducer(gestartet, {
        typ: 'kollegenanfrageAnnehmen',
        anfrageId: notSanAnfrage.id,
        spielerId: 'ns-1',
      }),
      { typ: 'kollegenanfrageAnnehmen', anfrageId: rsAnfrage.id, spielerId: 'rs-1' },
    );
    expect(nachBeiden.kollegenanfragen).toEqual([]);
    expect(nachBeiden.patienten.find((p) => p.id === patientId)?.durchgefuehrteMassnahmen).toContain(
      'propofol',
    );
    // dauerSek (60) + bindetZusaetzlichSek (180, deckt die Intubation ab) = 240.
    for (const id of ['na-1', 'ns-1', 'rs-1']) {
      const spieler = nachBeiden.sitzung.spieler.find((s) => s.id === id)!;
      expect(spieler.gebundenBis).toBe(nachBeiden.zeitSek + 240);
      expect(spieler.gebundenGrund).toContain('Propofol');
    }
  });

  it('ignoriert eine doppelte Annahme derselben Person', () => {
    const state = imEinsatzMitTeam();
    const patientId = state.patienten[0]!.id;
    const gestartet = simulationReducer(state, {
      typ: 'massnahmeMitTeamStarten',
      patientId,
      massnahmeId: 'propofol',
      anfragendeId: 'na-1',
    });
    const notSanAnfrage = gestartet.kollegenanfragen.find((a) => a.benoetigteQualifikation === 'notsan')!;
    const einmal = simulationReducer(gestartet, {
      typ: 'kollegenanfrageAnnehmen',
      anfrageId: notSanAnfrage.id,
      spielerId: 'ns-1',
    });
    const zweimal = simulationReducer(einmal, {
      typ: 'kollegenanfrageAnnehmen',
      anfrageId: notSanAnfrage.id,
      spielerId: 'ns-1',
    });
    expect(zweimal).toBe(einmal);
  });

  it('räumt Kollegenanfragen der verlassenden Person auf und gibt bereits angenommene Rollen frei', () => {
    const state = imEinsatzMitTeam();
    const patientId = state.patienten[0]!.id;
    const gestartet = simulationReducer(state, {
      typ: 'massnahmeMitTeamStarten',
      patientId,
      massnahmeId: 'propofol',
      anfragendeId: 'na-1',
    });
    const notSanAnfrage = gestartet.kollegenanfragen.find((a) => a.benoetigteQualifikation === 'notsan')!;
    const angenommen = simulationReducer(gestartet, {
      typ: 'kollegenanfrageAnnehmen',
      anfrageId: notSanAnfrage.id,
      spielerId: 'ns-1',
    });

    // Die annehmende Person verlässt die Sitzung - ihre Rolle wird wieder frei.
    const nachAustritt = simulationReducer(angenommen, { typ: 'spielerEntfernt', spielerId: 'ns-1' });
    expect(nachAustritt.kollegenanfragen).toHaveLength(2);
    expect(
      nachAustritt.kollegenanfragen.find((a) => a.id === notSanAnfrage.id)?.angenommenVon,
    ).toEqual([]);

    // Die anfragende Person selbst verlässt die Sitzung - der ganze Vorgang entfällt.
    const nachAnfragendemAustritt = simulationReducer(nachAustritt, {
      typ: 'spielerEntfernt',
      spielerId: 'na-1',
    });
    expect(nachAnfragendemAustritt.kollegenanfragen).toEqual([]);
  });
});

describe('Rettung eingeklemmter Personen (rettungUnterstuetzungAnfragen/rettungsmaterialBereitstellen/rettungDurchfuehren)', () => {
  // B-04 ("Im Bus eingeklemmt...") trägt `eingeklemmtBeimStart` im Szenario.
  const patientId = 'B-04';

  function eroeffnet(): SimulationState {
    return spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'digital' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'manvStufeGewaehlt', stufe: 'manv10' },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
  }

  function imEinsatzMitTeam(): SimulationState {
    const gestartet = simulationReducer(eroeffnet(), { typ: 'sitzungStarten' });
    return [
      { id: 'ns-1', name: 'Krüger', rolle: 'spieler' as const, qualifikation: 'notsan' as const },
      { id: 'rs-1', name: 'Thoms', rolle: 'spieler' as const, qualifikation: 'rettungssanitaeter' as const },
    ].reduce(
      (zustand, spieler) => simulationReducer(zustand, { typ: 'spielerHinzugefuegt', spieler }),
      gestartet,
    );
  }

  /** Ersetzt den ausgewürfelten Bedarf durch feste Werte - unabhängig vom Zufall testbar. */
  function mitBedarf(state: SimulationState, bedarf: Partial<EingeklemmtStatus>): SimulationState {
    return {
      ...state,
      patienten: state.patienten.map((patient) =>
        patient.id === patientId && patient.eingeklemmt
          ? { ...patient, eingeklemmt: { ...patient.eingeklemmt, ...bedarf } }
          : patient,
      ),
    };
  }

  it('würfelt beim Start einen Rettungsbedarf für die eingeklemmte Person aus, andere Patienten bleiben unberührt', () => {
    const state = simulationReducer(eroeffnet(), { typ: 'sitzungStarten' });
    const eingeklemmter = state.patienten.find((p) => p.id === patientId)!;
    expect(eingeklemmter.eingeklemmt).toBeDefined();
    expect(eingeklemmter.eingeklemmt?.gerettet).toBe(false);
    expect(eingeklemmter.eingeklemmt?.anfragendeId).toBeNull();
    expect(eingeklemmter.eingeklemmt?.helfendeIds).toEqual([]);
    expect(eingeklemmter.eingeklemmt?.materialBereitgestellt).toBe(false);
    expect([null, 'kedsystem']).toContain(eingeklemmter.eingeklemmt?.benoetigtesMaterial);
    expect(eingeklemmter.eingeklemmt?.benoetigteKollegenAnzahl).toBeGreaterThanOrEqual(0);
    expect(eingeklemmter.eingeklemmt?.benoetigteKollegenAnzahl).toBeLessThanOrEqual(2);
    // Ein Patient ohne `eingeklemmtBeimStart` bekommt keinen Rettungsbedarf.
    expect(state.patienten.find((p) => p.id === 'B-01')?.eingeklemmt).toBeUndefined();
  });

  it('bleibt im gestaffelten Modus verdeckt ohne Rettungsbedarf, bis die Person freigegeben wird', () => {
    const gestartet = simulationReducer(
      simulationReducer(eroeffnet(), { typ: 'freigabemodusSetzen', modus: 'gestaffelt' }),
      { typ: 'sitzungStarten' },
    );
    const nochVerdeckt = gestartet.patienten.find((p) => p.id === patientId)!;
    expect(nochVerdeckt.abschnitt).toBe('verdeckt');
    expect(nochVerdeckt.eingeklemmt).toBeUndefined();

    const nachTakt = simulationReducer(gestartet, { typ: 'tick', dtSek: 300 });
    const freigegeben = simulationReducer(nachTakt, { typ: 'patientFreigeben', patientId });
    const eingeklemmter = freigegeben.patienten.find((p) => p.id === patientId)!;
    expect(eingeklemmter.abschnitt).toBe('ablage');
    expect(eingeklemmter.eingeklemmt).toBeDefined();
    expect(eingeklemmter.eingeklemmt?.entdecktUmSek).toBe(300);
  });

  it('rettungUnterstuetzungAnfragen bindet die anfragende Person und legt bei Bedarf eine Kollegenanfrage an', () => {
    const state = mitBedarf(imEinsatzMitTeam(), { benoetigtesMaterial: null, benoetigteKollegenAnzahl: 2 });
    const nachher = simulationReducer(state, {
      typ: 'rettungUnterstuetzungAnfragen',
      patientId,
      anfragendeId: 'ns-1',
    });
    expect(nachher.patienten.find((p) => p.id === patientId)?.eingeklemmt?.anfragendeId).toBe('ns-1');
    expect(nachher.kollegenanfragen).toHaveLength(1);
    expect(nachher.kollegenanfragen[0]).toMatchObject({
      grund: 'rettung',
      patientId,
      anfragendeId: 'ns-1',
    });
    const notSan = nachher.sitzung.spieler.find((s) => s.id === 'ns-1')!;
    expect(notSan.gebundenBis).toBeGreaterThan(nachher.zeitSek);
    expect(notSan.gebundenGrund).toContain(patientId);
  });

  it('legt keine Kollegenanfrage an, wenn niemand zusätzlich nötig ist', () => {
    const state = mitBedarf(imEinsatzMitTeam(), { benoetigtesMaterial: null, benoetigteKollegenAnzahl: 0 });
    const nachher = simulationReducer(state, {
      typ: 'rettungUnterstuetzungAnfragen',
      patientId,
      anfragendeId: 'ns-1',
    });
    expect(nachher.kollegenanfragen).toEqual([]);
    expect(nachher.patienten.find((p) => p.id === patientId)?.eingeklemmt?.anfragendeId).toBe('ns-1');
  });

  it('lässt keine zweite Person die Koordination übernehmen', () => {
    const state = simulationReducer(
      mitBedarf(imEinsatzMitTeam(), { benoetigtesMaterial: null, benoetigteKollegenAnzahl: 1 }),
      { typ: 'rettungUnterstuetzungAnfragen', patientId, anfragendeId: 'ns-1' },
    );
    const nachher = simulationReducer(state, {
      typ: 'rettungUnterstuetzungAnfragen',
      patientId,
      anfragendeId: 'rs-1',
    });
    expect(nachher).toBe(state);
  });

  it('kollegenanfrageAnnehmen (grund rettung) trägt die annehmende Person ein und entfernt die Anfrage, sobald genug Kolleg:innen da sind', () => {
    // `benoetigteKollegenAnzahl` zählt nur zusätzliche Kolleg:innen neben der
    // anfragenden Person - bei 1 reicht eine einzige Annahme.
    const angefragt = simulationReducer(
      mitBedarf(imEinsatzMitTeam(), { benoetigtesMaterial: null, benoetigteKollegenAnzahl: 1 }),
      { typ: 'rettungUnterstuetzungAnfragen', patientId, anfragendeId: 'ns-1' },
    );
    const anfrage = angefragt.kollegenanfragen[0]!;
    const nachher = simulationReducer(angefragt, {
      typ: 'kollegenanfrageAnnehmen',
      anfrageId: anfrage.id,
      spielerId: 'rs-1',
    });
    expect(nachher.kollegenanfragen).toEqual([]);
    expect(nachher.patienten.find((p) => p.id === patientId)?.eingeklemmt?.helfendeIds).toEqual(['rs-1']);
    const rs = nachher.sitzung.spieler.find((s) => s.id === 'rs-1')!;
    expect(rs.gebundenBis).toBeGreaterThan(nachher.zeitSek);
  });

  it('rettungsmaterialBereitstellen zieht das benötigte Material am Fahrzeug im Abschnitt ab und markiert bereitgestellt', () => {
    const state = mitBedarf(imEinsatzMitTeam(), {
      benoetigtesMaterial: 'kedsystem',
      materialBereitgestellt: false,
    });
    const abschnitt = state.patienten.find((p) => p.id === patientId)!.abschnitt;
    const vorher = state.fahrzeuge
      .filter((f) => f.abschnitt === abschnitt)
      .reduce((summe, f) => summe + (f.material.kedsystem ?? 0), 0);
    expect(vorher).toBeGreaterThan(0);

    const nachher = simulationReducer(state, {
      typ: 'rettungsmaterialBereitstellen',
      patientId,
      fahrzeugId: '',
    });
    expect(
      nachher.patienten.find((p) => p.id === patientId)?.eingeklemmt?.materialBereitgestellt,
    ).toBe(true);
    const nachherBestand = nachher.fahrzeuge
      .filter((f) => f.abschnitt === abschnitt)
      .reduce((summe, f) => summe + (f.material.kedsystem ?? 0), 0);
    expect(nachherBestand).toBe(vorher - 1);
  });

  it('rettungDurchfuehren wirkt erst, wenn Material und Team bereitstehen, und gibt danach alle Beteiligten frei', () => {
    const bereitFuerAnfrage = mitBedarf(imEinsatzMitTeam(), {
      benoetigtesMaterial: 'kedsystem',
      benoetigteKollegenAnzahl: 1,
    });
    const angefragt = simulationReducer(bereitFuerAnfrage, {
      typ: 'rettungUnterstuetzungAnfragen',
      patientId,
      anfragendeId: 'ns-1',
    });
    const anfrage = angefragt.kollegenanfragen[0]!;
    const mitHelfer = simulationReducer(angefragt, {
      typ: 'kollegenanfrageAnnehmen',
      anfrageId: anfrage.id,
      spielerId: 'rs-1',
    });

    // Ohne Material noch nicht möglich, obwohl das Team vollständig ist.
    const ohneMaterial = simulationReducer(mitHelfer, { typ: 'rettungDurchfuehren', patientId });
    expect(ohneMaterial.patienten.find((p) => p.id === patientId)?.eingeklemmt?.gerettet).toBe(false);

    const mitMaterial = simulationReducer(mitHelfer, {
      typ: 'rettungsmaterialBereitstellen',
      patientId,
      fahrzeugId: '',
    });
    const nachTakt = simulationReducer(mitMaterial, { typ: 'tick', dtSek: 120 });
    const gerettet = simulationReducer(nachTakt, { typ: 'rettungDurchfuehren', patientId });
    const eingeklemmter = gerettet.patienten.find((p) => p.id === patientId)!;
    expect(eingeklemmter.eingeklemmt?.gerettet).toBe(true);
    expect(eingeklemmter.eingeklemmt?.rettungsdauerSek).toBe(120);

    // Anfragende Person und Helfer:in sind wieder frei.
    for (const id of ['ns-1', 'rs-1']) {
      const spieler = gerettet.sitzung.spieler.find((s) => s.id === id)!;
      expect(spieler.gebundenBis).toBe(gerettet.zeitSek);
      expect(spieler.gebundenGrund).toBeUndefined();
    }
  });

  it('erlaubt die Verlegung erst nach der Rettung', () => {
    const state = mitBedarf(imEinsatzMitTeam(), { benoetigtesMaterial: null, benoetigteKollegenAnzahl: 0 });
    const nochEingeklemmt = simulationReducer(state, {
      typ: 'patientSichten',
      patientId,
      kategorie: 'SK1',
      final: true,
    });
    const verlegungsversuch = simulationReducer(nochEingeklemmt, {
      typ: 'patientVerlegen',
      patientId,
      ziel: 'eingangssichtung',
    });
    expect(verlegungsversuch).toBe(nochEingeklemmt);

    const gerettet = simulationReducer(nochEingeklemmt, { typ: 'rettungDurchfuehren', patientId });
    const nachVerlegung = simulationReducer(gerettet, {
      typ: 'patientVerlegen',
      patientId,
      ziel: 'eingangssichtung',
    });
    expect(nachVerlegung.patienten.find((p) => p.id === patientId)?.abschnitt).toBe('eingangssichtung');
  });

  it('räumt anfragendeId/helfendeIds auf, wenn eine beteiligte Person die Sitzung verlässt', () => {
    const angefragt = simulationReducer(
      mitBedarf(imEinsatzMitTeam(), { benoetigtesMaterial: null, benoetigteKollegenAnzahl: 2 }),
      { typ: 'rettungUnterstuetzungAnfragen', patientId, anfragendeId: 'ns-1' },
    );
    const anfrage = angefragt.kollegenanfragen[0]!;
    const mitHelfer = simulationReducer(angefragt, {
      typ: 'kollegenanfrageAnnehmen',
      anfrageId: anfrage.id,
      spielerId: 'rs-1',
    });
    expect(mitHelfer.patienten.find((p) => p.id === patientId)?.eingeklemmt?.helfendeIds).toEqual(['rs-1']);

    const nachAustrittHelfer = simulationReducer(mitHelfer, { typ: 'spielerEntfernt', spielerId: 'rs-1' });
    expect(
      nachAustrittHelfer.patienten.find((p) => p.id === patientId)?.eingeklemmt?.helfendeIds,
    ).toEqual([]);
    expect(
      nachAustrittHelfer.patienten.find((p) => p.id === patientId)?.eingeklemmt?.anfragendeId,
    ).toBe('ns-1');

    const nachAustrittAnfragend = simulationReducer(nachAustrittHelfer, {
      typ: 'spielerEntfernt',
      spielerId: 'ns-1',
    });
    expect(
      nachAustrittAnfragend.patienten.find((p) => p.id === patientId)?.eingeklemmt?.anfragendeId,
    ).toBeNull();
  });
});

describe('Sprechfunk-Kanalwahl (rufgruppeWaehlen)', () => {
  function imEinsatz(): SimulationState {
    return simulationReducer(
      spiele(
        { typ: 'gemeinsamOeffnen' },
        { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
        { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
        { typ: 'modusWaehlen', modus: 'digital' },
        { typ: 'massnahmenrechteAbgeschlossen' },
        { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
        { typ: 'fahrzeugkonfigurationAbgeschlossen' },
      ),
      { typ: 'sitzungStarten' },
    );
  }

  it('trägt die Kanalwahl ein', () => {
    const nachher = simulationReducer(imEinsatz(), {
      typ: 'rufgruppeWaehlen',
      teilnehmerId: 's-1',
      teilnehmerName: 'Anna',
      kanal: 'kanal-1',
    });
    expect(nachher.rufgruppen).toEqual([{ teilnehmerId: 's-1', teilnehmerName: 'Anna', kanal: 'kanal-1' }]);
  });

  it('ersetzt den eigenen Eintrag bei einem Kanalwechsel, statt einen zweiten anzulegen', () => {
    const aufKanal1 = simulationReducer(imEinsatz(), {
      typ: 'rufgruppeWaehlen',
      teilnehmerId: 's-1',
      teilnehmerName: 'Anna',
      kanal: 'kanal-1',
    });
    const aufKanal2 = simulationReducer(aufKanal1, {
      typ: 'rufgruppeWaehlen',
      teilnehmerId: 's-1',
      teilnehmerName: 'Anna',
      kanal: 'kanal-2',
    });
    expect(aufKanal2.rufgruppen).toEqual([{ teilnehmerId: 's-1', teilnehmerName: 'Anna', kanal: 'kanal-2' }]);
  });

  it('entfernt den eigenen Eintrag beim Verlassen (kanal: null)', () => {
    const aufKanal1 = simulationReducer(imEinsatz(), {
      typ: 'rufgruppeWaehlen',
      teilnehmerId: 's-1',
      teilnehmerName: 'Anna',
      kanal: 'kanal-1',
    });
    const verlassen = simulationReducer(aufKanal1, {
      typ: 'rufgruppeWaehlen',
      teilnehmerId: 's-1',
      teilnehmerName: 'Anna',
      kanal: null,
    });
    expect(verlassen.rufgruppen).toEqual([]);
  });

  it('lässt andere Mitgliedschaften beim eigenen Wechsel unangetastet', () => {
    const beide = simulationReducer(
      simulationReducer(imEinsatz(), {
        typ: 'rufgruppeWaehlen',
        teilnehmerId: 's-1',
        teilnehmerName: 'Anna',
        kanal: 'kanal-1',
      }),
      { typ: 'rufgruppeWaehlen', teilnehmerId: 's-2', teilnehmerName: 'Ben', kanal: 'kanal-1' },
    );
    const annaWechselt = simulationReducer(beide, {
      typ: 'rufgruppeWaehlen',
      teilnehmerId: 's-1',
      teilnehmerName: 'Anna',
      kanal: 'kanal-2',
    });
    expect(annaWechselt.rufgruppen).toEqual(
      expect.arrayContaining([{ teilnehmerId: 's-2', teilnehmerName: 'Ben', kanal: 'kanal-1' }]),
    );
  });

  it('räumt die Kanalmitgliedschaft auf, wenn jemand die Sitzung verlässt', () => {
    const aufKanal = simulationReducer(imEinsatz(), {
      typ: 'rufgruppeWaehlen',
      teilnehmerId: 's-1',
      teilnehmerName: 'Anna',
      kanal: 'kanal-1',
    });
    const entfernt = simulationReducer(aufKanal, { typ: 'spielerEntfernt', spielerId: 's-1' });
    expect(entfernt.rufgruppen).toEqual([]);
  });

  it('ist Teil des Schnappschusses', () => {
    const state = simulationReducer(imEinsatz(), {
      typ: 'rufgruppeWaehlen',
      teilnehmerId: 's-1',
      teilnehmerName: 'Anna',
      kanal: 'kanal-1',
    });
    expect(schnappschussAus(state).rufgruppen).toEqual(state.rufgruppen);
  });
});

describe('spielerAbschnittGesetzt', () => {
  function eroeffnetMitSpieler(): SimulationState {
    const host = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'digital' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
    return simulationReducer(host, {
      typ: 'spielerHinzugefuegt',
      spieler: { id: 's-1', name: 'Anna', rolle: 'spieler', qualifikation: 'basis' },
    });
  }

  it('setzt den aktuellen Abschnitt eines Spielers, ohne andere zu ändern', () => {
    const state = simulationReducer(eroeffnetMitSpieler(), {
      typ: 'spielerAbschnittGesetzt',
      spielerId: 's-1',
      abschnitt: 'zelt_rot',
    });
    expect(state.sitzung.spieler.find((s) => s.id === 's-1')?.aktuellerAbschnitt).toBe('zelt_rot');
    expect(state.sitzung.spieler.find((s) => s.id === 'leiter-1')?.aktuellerAbschnitt).toBeUndefined();
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

describe('Ereignis-Injektion (→ modell.ereignis)', () => {
  function eroeffnetMitFahrzeug(): SimulationState {
    return spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'digital' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'fahrzeugHinzugefuegt', fahrzeugTyp: 'rtw' },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
  }

  it('markiert ein Fahrzeug als ausgefallen und wieder als einsatzbereit', () => {
    const imEinsatz = simulationReducer(eroeffnetMitFahrzeug(), { typ: 'sitzungStarten' });
    const fahrzeugId = imEinsatz.fahrzeuge[0]!.id;

    const ausgefallen = simulationReducer(imEinsatz, {
      typ: 'fahrzeugAusfallSetzen',
      fahrzeugId,
      ausgefallen: true,
    });
    expect(ausgefallen.fahrzeuge[0]!.ausgefallen).toBe(true);
    // Besatzung/Material bleiben unverändert zugeordnet, nur die Nutzbarkeit
    // ändert sich (→ domain.material).
    expect(ausgefallen.fahrzeuge[0]!.material).toEqual(imEinsatz.fahrzeuge[0]!.material);

    const wiederEinsatzbereit = simulationReducer(ausgefallen, {
      typ: 'fahrzeugAusfallSetzen',
      fahrzeugId,
      ausgefallen: false,
    });
    expect(wiederEinsatzbereit.fahrzeuge[0]!.ausgefallen).toBe(false);
  });

  it('fügt bei Nachforderung ein neues Fahrzeug im Bereitstellungsraum mit vollem Material hinzu', () => {
    const imEinsatz = simulationReducer(eroeffnetMitFahrzeug(), { typ: 'sitzungStarten' });
    const vorAnzahl = imEinsatz.fahrzeuge.length;

    const nachfordert = simulationReducer(imEinsatz, {
      typ: 'fahrzeugNachfordern',
      fahrzeugTyp: 'ktw',
    });
    expect(nachfordert.fahrzeuge.length).toBe(vorAnzahl + 1);
    const neues = nachfordert.fahrzeuge.at(-1)!;
    expect(neues.typ).toBe('ktw');
    expect(neues.abschnitt).toBe('bereitstellungsraum');
    expect(neues.besatzung).toEqual([]);
    expect(Object.values(neues.material).some((menge) => (menge ?? 0) > 0)).toBe(true);
  });

  it('löst eine Lageänderung aus, fügt die vordefinierten Patienten an der Schadensstelle hinzu (Freigabemodus sofort)', () => {
    const imEinsatz = simulationReducer(eroeffnetMitFahrzeug(), { typ: 'sitzungStarten' });
    const vorAnzahl = imEinsatz.patienten.length;
    const ereignis = busunfall.ereignisse![0]!;

    const ausgeloest = simulationReducer(imEinsatz, {
      typ: 'ereignisAusloesen',
      ereignisId: ereignis.id,
    });
    expect(ausgeloest.patienten.length).toBe(vorAnzahl + ereignis.patienten.length);
    const neuePatienten = ausgeloest.patienten.slice(vorAnzahl);
    expect(neuePatienten.map((patient) => patient.id)).toEqual(
      ereignis.patienten.map((vorlage) => vorlage.id),
    );
    expect(neuePatienten.every((patient) => patient.abschnitt === 'schadensstelle')).toBe(true);
    expect(ausgeloest.ausgeloesteEreignisse).toEqual([ereignis.id]);
  });

  it('landet in der Ablage statt an der Schadensstelle, wenn gestaffelt gewählt wurde', () => {
    const gestaffelt = simulationReducer(eroeffnetMitFahrzeug(), {
      typ: 'freigabemodusSetzen',
      modus: 'gestaffelt',
    });
    const imEinsatz = simulationReducer(gestaffelt, { typ: 'sitzungStarten' });
    const vorAnzahl = imEinsatz.patienten.length;
    const ereignis = busunfall.ereignisse![0]!;

    const ausgeloest = simulationReducer(imEinsatz, {
      typ: 'ereignisAusloesen',
      ereignisId: ereignis.id,
    });
    const neuePatienten = ausgeloest.patienten.slice(vorAnzahl);
    expect(neuePatienten.every((patient) => patient.abschnitt === 'ablage')).toBe(true);
  });

  it('lässt sich nicht doppelt auslösen', () => {
    const imEinsatz = simulationReducer(eroeffnetMitFahrzeug(), { typ: 'sitzungStarten' });
    const ereignis = busunfall.ereignisse![0]!;

    const einmal = simulationReducer(imEinsatz, { typ: 'ereignisAusloesen', ereignisId: ereignis.id });
    const zweimal = simulationReducer(einmal, { typ: 'ereignisAusloesen', ereignisId: ereignis.id });
    expect(zweimal.patienten.length).toBe(einmal.patienten.length);
    expect(zweimal.ausgeloesteEreignisse).toEqual([ereignis.id]);
  });

  it('nimmt ausgeloesteEreignisse in den Schnappschuss auf', () => {
    const imEinsatz = simulationReducer(eroeffnetMitFahrzeug(), { typ: 'sitzungStarten' });
    const ereignis = busunfall.ereignisse![0]!;
    const ausgeloest = simulationReducer(imEinsatz, {
      typ: 'ereignisAusloesen',
      ereignisId: ereignis.id,
    });
    const schnappschuss = schnappschussAus(ausgeloest);
    expect(schnappschuss.ausgeloesteEreignisse).toEqual([ereignis.id]);
  });
});

describe('Führungsentscheidungs-Protokoll (→ state.regieprotokoll)', () => {
  function eroeffnetMitFahrzeug(): SimulationState {
    return spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'digital' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'fahrzeugHinzugefuegt', fahrzeugTyp: 'rtw' },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
  }

  it('schreibt beim Start und beim Beenden der Übung je eine Zeile', () => {
    const imEinsatz = simulationReducer(eroeffnetMitFahrzeug(), { typ: 'sitzungStarten' });
    expect(imEinsatz.regieProtokoll).toEqual([{ zeitSek: 0, text: 'Übung gestartet.' }]);

    const beendet = simulationReducer(imEinsatz, { typ: 'einsatzBeenden' });
    expect(beendet.regieProtokoll.map((eintrag) => eintrag.text)).toEqual([
      'Übung gestartet.',
      'Übung beendet.',
    ]);
  });

  it('protokolliert Pause/Weiter und eine Tempoänderung', () => {
    const imEinsatz = simulationReducer(eroeffnetMitFahrzeug(), { typ: 'sitzungStarten' });
    const pausiert = simulationReducer(imEinsatz, { typ: 'pauseUmschalten' });
    const fortgesetzt = simulationReducer(pausiert, { typ: 'pauseUmschalten' });
    const schneller = simulationReducer(fortgesetzt, { typ: 'geschwindigkeitSetzen', wert: 4 });

    expect(schneller.regieProtokoll.slice(1).map((eintrag) => eintrag.text)).toEqual([
      'Übung pausiert.',
      'Übung fortgesetzt.',
      'Tempo auf ×4 gesetzt.',
    ]);
  });

  it('protokolliert Einzel- und Sammelfreigabe im gestaffelten Modus', () => {
    const gestaffelt = simulationReducer(eroeffnetMitFahrzeug(), {
      typ: 'freigabemodusSetzen',
      modus: 'gestaffelt',
    });
    const imEinsatz = simulationReducer(gestaffelt, { typ: 'sitzungStarten' });
    const erstePatientId = imEinsatz.patienten[0]!.id;

    const einzelnFreigegeben = simulationReducer(imEinsatz, {
      typ: 'patientFreigeben',
      patientId: erstePatientId,
    });
    const alleFreigegeben = simulationReducer(einzelnFreigegeben, { typ: 'alleVerdecktenFreigeben' });

    expect(alleFreigegeben.regieProtokoll.slice(1).map((eintrag) => eintrag.text)).toEqual([
      `Patient ${erstePatientId} freigegeben.`,
      'Alle verdeckten Patienten auf einmal freigegeben.',
    ]);
  });

  it('protokolliert Fahrzeugausfall, Nachforderung und Lageänderung mit sprechendem Text', () => {
    const imEinsatz = simulationReducer(eroeffnetMitFahrzeug(), { typ: 'sitzungStarten' });
    const fahrzeugId = imEinsatz.fahrzeuge[0]!.id;
    const ereignis = busunfall.ereignisse![0]!;

    const ausgefallen = simulationReducer(imEinsatz, {
      typ: 'fahrzeugAusfallSetzen',
      fahrzeugId,
      ausgefallen: true,
    });
    const nachgefordert = simulationReducer(ausgefallen, {
      typ: 'fahrzeugNachfordern',
      fahrzeugTyp: 'ktw',
    });
    const ausgeloest = simulationReducer(nachgefordert, {
      typ: 'ereignisAusloesen',
      ereignisId: ereignis.id,
    });

    const texte = ausgeloest.regieProtokoll.slice(1).map((eintrag) => eintrag.text);
    expect(texte[0]).toContain('als ausgefallen gemeldet.');
    expect(texte[1]).toBe('Nachforderung: KTW angefordert.');
    expect(texte[2]).toContain(ereignis.titel);
  });

  it('ist Teil des Schnappschusses und wächst nur an', () => {
    const imEinsatz = simulationReducer(eroeffnetMitFahrzeug(), { typ: 'sitzungStarten' });
    const pausiert = simulationReducer(imEinsatz, { typ: 'pauseUmschalten' });

    expect(schnappschussAus(pausiert).regieProtokoll).toEqual(pausiert.regieProtokoll);
    expect(pausiert.regieProtokoll.length).toBe(imEinsatz.regieProtokoll.length + 1);
  });
});

describe('Private Statusansicht: spielerProtokoll (→ modell.spielerprotokoll)', () => {
  function eroeffnetMitFahrzeug(): SimulationState {
    return spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'digital' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'fahrzeugHinzugefuegt', fahrzeugTyp: 'rtw' },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
  }

  it('übernimmt bei einer Diagnostik denselben Verlaufstext, mit Spieler- und Patientzuordnung', () => {
    const imEinsatz = simulationReducer(eroeffnetMitFahrzeug(), { typ: 'sitzungStarten' });
    const patientId = imEinsatz.patienten[0]!.id;
    const nachher = simulationReducer(imEinsatz, {
      typ: 'diagnostikDurchfuehren',
      patientId,
      diagnostikId: 'bodycheck',
      spielerId: 'leiter-1',
    });
    const letzterVerlauf = nachher.patienten.find((p) => p.id === patientId)!.verlauf.at(-1)!;
    expect(nachher.spielerProtokoll).toEqual([
      { spielerId: 'leiter-1', patientId, zeitSek: letzterVerlauf.zeitSek, text: letzterVerlauf.text },
    ]);
  });

  it('protokolliert nichts ohne spielerId (Einzelspiel)', () => {
    const imEinsatz = simulationReducer(eroeffnetMitFahrzeug(), { typ: 'sitzungStarten' });
    const patientId = imEinsatz.patienten[0]!.id;
    const nachher = simulationReducer(imEinsatz, {
      typ: 'diagnostikDurchfuehren',
      patientId,
      diagnostikId: 'bodycheck',
    });
    expect(nachher.spielerProtokoll).toEqual([]);
  });

  it('protokolliert nichts, wenn die Domänenfunktion nichts bewirkt (Diagnostik bereits durchgeführt)', () => {
    const imEinsatz = simulationReducer(eroeffnetMitFahrzeug(), { typ: 'sitzungStarten' });
    const patientId = imEinsatz.patienten[0]!.id;
    const einmal = simulationReducer(imEinsatz, {
      typ: 'diagnostikDurchfuehren',
      patientId,
      diagnostikId: 'bodycheck',
      spielerId: 'leiter-1',
    });
    const zweimal = simulationReducer(einmal, {
      typ: 'diagnostikDurchfuehren',
      patientId,
      diagnostikId: 'bodycheck',
      spielerId: 'leiter-1',
    });
    expect(zweimal.spielerProtokoll).toEqual(einmal.spielerProtokoll);
  });

  it('protokolliert Maßnahme, Sichtung und Verlegung je mit eigener Verlaufszeile', () => {
    const imEinsatz = simulationReducer(eroeffnetMitFahrzeug(), { typ: 'sitzungStarten' });
    const patientId = imEinsatz.patienten[0]!.id;
    const gesichtet = simulationReducer(imEinsatz, {
      typ: 'patientSichten',
      patientId,
      kategorie: 'SK1',
      final: true,
      spielerId: 'leiter-1',
    });
    const behandelt = simulationReducer(gesichtet, {
      typ: 'massnahmeDurchfuehren',
      patientId,
      massnahmeId: 'tourniquet',
      spielerId: 'leiter-1',
    });
    const verlegt = simulationReducer(behandelt, {
      typ: 'patientVerlegen',
      patientId,
      ziel: 'eingangssichtung',
      spielerId: 'leiter-1',
    });
    expect(verlegt.spielerProtokoll).toHaveLength(3);
    expect(
      verlegt.spielerProtokoll.every(
        (eintrag) => eintrag.spielerId === 'leiter-1' && eintrag.patientId === patientId,
      ),
    ).toBe(true);
  });

  it('ist Teil des Schnappschusses', () => {
    const imEinsatz = simulationReducer(eroeffnetMitFahrzeug(), { typ: 'sitzungStarten' });
    const patientId = imEinsatz.patienten[0]!.id;
    const nachher = simulationReducer(imEinsatz, {
      typ: 'diagnostikDurchfuehren',
      patientId,
      diagnostikId: 'bodycheck',
      spielerId: 'leiter-1',
    });
    expect(schnappschussAus(nachher).spielerProtokoll).toEqual(nachher.spielerProtokoll);
  });

  it('kreditiert bei einer abgeschlossenen Team-Maßnahme (Narkose) alle Beteiligten mit derselben Zeile', () => {
    const gestartet = simulationReducer(
      spiele(
        { typ: 'gemeinsamOeffnen' },
        { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
        { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
        { typ: 'modusWaehlen', modus: 'digital' },
        { typ: 'massnahmenrechteAbgeschlossen' },
        { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
        { typ: 'fahrzeugkonfigurationAbgeschlossen' },
      ),
      { typ: 'sitzungStarten' },
    );
    const imEinsatz = [
      { id: 'na-1', name: 'Dr. Voss', rolle: 'spieler' as const, qualifikation: 'notarzt' as const },
      { id: 'ns-1', name: 'Krüger', rolle: 'spieler' as const, qualifikation: 'notsan' as const },
      { id: 'rs-1', name: 'Thoms', rolle: 'spieler' as const, qualifikation: 'rettungssanitaeter' as const },
    ].reduce(
      (zustand, spieler) => simulationReducer(zustand, { typ: 'spielerHinzugefuegt', spieler }),
      gestartet,
    );
    const patientId = imEinsatz.patienten[0]!.id;
    const angefordert = simulationReducer(imEinsatz, {
      typ: 'massnahmeMitTeamStarten',
      patientId,
      massnahmeId: 'propofol',
      anfragendeId: 'na-1',
      dosisMg: 150,
    });
    // Vor Team-Vollständigkeit wird noch nichts protokolliert.
    expect(angefordert.spielerProtokoll).toEqual([]);

    const notSanAnfrage = angefordert.kollegenanfragen.find((a) => a.benoetigteQualifikation === 'notsan')!;
    const rsAnfrage = angefordert.kollegenanfragen.find(
      (a) => a.benoetigteQualifikation === 'rettungssanitaeter',
    )!;
    const komplett = simulationReducer(
      simulationReducer(angefordert, {
        typ: 'kollegenanfrageAnnehmen',
        anfrageId: notSanAnfrage.id,
        spielerId: 'ns-1',
      }),
      { typ: 'kollegenanfrageAnnehmen', anfrageId: rsAnfrage.id, spielerId: 'rs-1' },
    );
    expect(komplett.spielerProtokoll).toHaveLength(3);
    const beteiligte = komplett.spielerProtokoll.map((eintrag) => eintrag.spielerId).sort();
    expect(beteiligte).toEqual(['na-1', 'ns-1', 'rs-1']);
    const texte = new Set(komplett.spielerProtokoll.map((eintrag) => eintrag.text));
    expect(texte.size).toBe(1);
    expect(komplett.spielerProtokoll.every((eintrag) => eintrag.patientId === patientId)).toBe(true);
  });

  it('protokolliert die Rettungskette (Anfrage, Helfer-Beitritt, Material, Abschluss) für alle Beteiligten', () => {
    const patientId = 'B-04';
    const gestartet = simulationReducer(
      spiele(
        { typ: 'gemeinsamOeffnen' },
        { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
        { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
        { typ: 'modusWaehlen', modus: 'digital' },
        { typ: 'massnahmenrechteAbgeschlossen' },
        { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
        { typ: 'manvStufeGewaehlt', stufe: 'manv10' },
        { typ: 'fahrzeugkonfigurationAbgeschlossen' },
      ),
      { typ: 'sitzungStarten' },
    );
    const imEinsatz = [
      { id: 'ns-1', name: 'Krüger', rolle: 'spieler' as const, qualifikation: 'notsan' as const },
      { id: 'rs-1', name: 'Thoms', rolle: 'spieler' as const, qualifikation: 'rettungssanitaeter' as const },
    ].reduce(
      (zustand, spieler) => simulationReducer(zustand, { typ: 'spielerHinzugefuegt', spieler }),
      gestartet,
    );
    // Ausgewürfelten Bedarf durch feste Werte ersetzen - unabhängig vom Zufall testbar.
    const mitBedarf: SimulationState = {
      ...imEinsatz,
      patienten: imEinsatz.patienten.map((patient) =>
        patient.id === patientId && patient.eingeklemmt
          ? {
              ...patient,
              eingeklemmt: {
                ...patient.eingeklemmt,
                benoetigtesMaterial: 'kedsystem',
                benoetigteKollegenAnzahl: 1,
              },
            }
          : patient,
      ),
    };

    const angefragt = simulationReducer(mitBedarf, {
      typ: 'rettungUnterstuetzungAnfragen',
      patientId,
      anfragendeId: 'ns-1',
    });
    expect(angefragt.spielerProtokoll).toEqual([
      {
        spielerId: 'ns-1',
        patientId,
        zeitSek: angefragt.zeitSek,
        text: `Unterstützung bei der Rettung von ${patientId} angefordert.`,
      },
    ]);

    const anfrage = angefragt.kollegenanfragen[0]!;
    const mitHelfer = simulationReducer(angefragt, {
      typ: 'kollegenanfrageAnnehmen',
      anfrageId: anfrage.id,
      spielerId: 'rs-1',
    });
    expect(mitHelfer.spielerProtokoll).toContainEqual({
      spielerId: 'rs-1',
      patientId,
      zeitSek: mitHelfer.zeitSek,
      text: `Bei der Rettung von ${patientId} unterstützt.`,
    });

    const mitMaterial = simulationReducer(mitHelfer, {
      typ: 'rettungsmaterialBereitstellen',
      patientId,
      fahrzeugId: '',
      spielerId: 'rs-1',
    });
    expect(mitMaterial.spielerProtokoll).toContainEqual({
      spielerId: 'rs-1',
      patientId,
      zeitSek: mitMaterial.zeitSek,
      text: 'Rettungsmaterial (Spineboard/KED-System) bereitgestellt.',
    });

    const gerettet = simulationReducer(mitMaterial, { typ: 'rettungDurchfuehren', patientId });
    const abschlussZeilen = gerettet.spielerProtokoll.filter(
      (eintrag) => eintrag.text === `Rettung von ${patientId} abgeschlossen.`,
    );
    expect(abschlussZeilen.map((eintrag) => eintrag.spielerId).sort()).toEqual(['ns-1', 'rs-1']);
  });
});

describe('Meldebuch: per Funk erfragte Meldungen des Zugführers (→ ui.meldebuch)', () => {
  it('trägt eine Meldung mit Bereich, Zeit und Spieler ein', () => {
    const zustand = { ...ANFANGSZUSTAND, zeitSek: 120 };
    const nachher = simulationReducer(zustand, {
      typ: 'meldebuchEintragen',
      id: 'meldung-1',
      bereich: 'fahrzeuge',
      text: 'RTW 1 an der Ablage.',
      spielerId: 'zf-1',
    });
    expect(nachher.meldebuch).toEqual([
      { id: 'meldung-1', bereich: 'fahrzeuge', text: 'RTW 1 an der Ablage.', zeitSek: 120, spielerId: 'zf-1' },
    ]);
  });

  it('ignoriert eine leere oder nur aus Leerzeichen bestehende Meldung', () => {
    const nachher = simulationReducer(ANFANGSZUSTAND, {
      typ: 'meldebuchEintragen',
      id: 'meldung-1',
      bereich: 'kraefte',
      text: '   ',
      spielerId: 'zf-1',
    });
    expect(nachher.meldebuch).toEqual([]);
  });

  it('trimmt umgebende Leerzeichen im eingetragenen Text', () => {
    const nachher = simulationReducer(ANFANGSZUSTAND, {
      typ: 'meldebuchEintragen',
      id: 'meldung-1',
      bereich: 'kennzahlen',
      text: '  12 Patienten gesichtet  ',
      spielerId: 'zf-1',
    });
    expect(nachher.meldebuch[0]?.text).toBe('12 Patienten gesichtet');
  });

  it('hängt mehrere Meldungen nur an, ohne bestehende zu verändern', () => {
    const erste = simulationReducer(ANFANGSZUSTAND, {
      typ: 'meldebuchEintragen',
      id: 'meldung-1',
      bereich: 'fahrzeuge',
      text: 'Erste Meldung.',
      spielerId: 'zf-1',
    });
    const zweite = simulationReducer(erste, {
      typ: 'meldebuchEintragen',
      id: 'meldung-2',
      bereich: 'kraefte',
      text: 'Zweite Meldung.',
      spielerId: 'zf-1',
    });
    expect(zweite.meldebuch).toHaveLength(2);
    expect(zweite.meldebuch[0]).toEqual(erste.meldebuch[0]);
  });

  it('überträgt meldebuch unverändert in den Schnappschuss', () => {
    const nachher = simulationReducer(ANFANGSZUSTAND, {
      typ: 'meldebuchEintragen',
      id: 'meldung-1',
      bereich: 'fahrzeuge',
      text: 'RTW 1 an der Ablage.',
      spielerId: 'zf-1',
    });
    expect(schnappschussAus(nachher).meldebuch).toEqual(nachher.meldebuch);

    const spielerClient = simulationReducer(ANFANGSZUSTAND, {
      typ: 'schnappschussAnwenden',
      schnappschuss: schnappschussAus(nachher),
    });
    expect(spielerClient.meldebuch).toEqual(nachher.meldebuch);
  });
});

describe('Baufeld: Zelt-/Flächenplatzierung (→ ui.baufeld)', () => {
  function eroeffnet(): SimulationState {
    return spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'digital' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
  }

  it('platziert ein Zelt, wenn die Fläche gültig ist', () => {
    const state = eroeffnet();
    const platziert = simulationReducer(state, {
      typ: 'zeltPlatzieren',
      id: 'zelt-1',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_rot',
      xM: 0,
      yM: 0,
      spielerId: 'leiter-1',
    });
    expect(platziert.flaechen).toEqual([
      { id: 'zelt-1', typ: 'SG20', abschnitt: 'zelt_rot', xM: 0, yM: 0, platziertVonSpielerId: 'leiter-1' },
    ]);
    // Führungsentscheidung, taucht im Regie-Protokoll auf (→ state.regieprotokoll).
    expect(platziert.regieProtokoll.at(-1)?.text).toContain('SG20-Fläche');
  });

  it('lehnt eine überlappende Platzierung ab, ohne den State zu ändern', () => {
    const mitRot = simulationReducer(eroeffnet(), {
      typ: 'zeltPlatzieren',
      id: 'zelt-rot',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_rot',
      xM: 0,
      yM: 0,
    });
    const versuch = simulationReducer(mitRot, {
      typ: 'zeltPlatzieren',
      id: 'zelt-gelb',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_gelb',
      xM: 1,
      yM: 1,
    });
    expect(versuch).toBe(mitRot);
  });

  it('ersetzt ein bestehendes Zelt desselben Abschnitts statt es zu addieren', () => {
    const mitSg20 = simulationReducer(eroeffnet(), {
      typ: 'zeltPlatzieren',
      id: 'zelt-1',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_rot',
      xM: 0,
      yM: 0,
    });
    const mitSg50 = simulationReducer(mitSg20, {
      typ: 'zeltPlatzieren',
      id: 'zelt-2',
      flaechenTyp: 'SG50',
      abschnitt: 'zelt_rot',
      xM: 20,
      yM: 20,
    });
    expect(mitSg50.flaechen).toHaveLength(1);
    expect(mitSg50.flaechen[0]?.id).toBe('zelt-2');
  });

  it('entfernt ein platziertes Zelt', () => {
    const mitZelt = simulationReducer(eroeffnet(), {
      typ: 'zeltPlatzieren',
      id: 'zelt-1',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_rot',
      xM: 0,
      yM: 0,
    });
    const entfernt = simulationReducer(mitZelt, { typ: 'zeltEntfernen', id: 'zelt-1' });
    expect(entfernt.flaechen).toEqual([]);
  });

  it('platziert eine reine Fläche (kein Zeltprodukt) auf einem der fünf erweiterten Abschnitte', () => {
    const state = eroeffnet();
    const platziert = simulationReducer(state, {
      typ: 'zeltPlatzieren',
      id: 'flaeche-1',
      flaechenTyp: 'FL_M',
      abschnitt: 'ablage',
      xM: 0,
      yM: 0,
      spielerId: 'leiter-1',
    });
    expect(platziert.flaechen).toEqual([
      { id: 'flaeche-1', typ: 'FL_M', abschnitt: 'ablage', xM: 0, yM: 0, platziertVonSpielerId: 'leiter-1' },
    ]);
  });

  it('prüft die Baufeld-Grenze nicht für die fünf erweiterten Abschnitte', () => {
    const state = eroeffnet();
    const platziert = simulationReducer(state, {
      typ: 'zeltPlatzieren',
      id: 'flaeche-weit-weg',
      flaechenTyp: 'FL_S',
      abschnitt: 'transport',
      xM: 500,
      yM: 500,
    });
    expect(platziert.flaechen).toHaveLength(1);
  });

  it('überträgt flaechen in den Schnappschuss', () => {
    const mitZelt = simulationReducer(eroeffnet(), {
      typ: 'zeltPlatzieren',
      id: 'zelt-1',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_rot',
      xM: 0,
      yM: 0,
    });
    const schnappschuss = schnappschussAus(mitZelt);
    expect(schnappschuss.flaechen).toEqual(mitZelt.flaechen);
  });
});

describe('Gruppen-Zuweisung: Fahrzeuge einem Gruppenführer zuordnen (→ modell.gruppe)', () => {
  function eroeffnetMitFahrzeugenUndGruppenfuehrer(): SimulationState {
    const basis = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'digital' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'manvStufeGewaehlt', stufe: 'manv10' },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
    return simulationReducer(basis, {
      typ: 'spielerHinzugefuegt',
      spieler: {
        id: 'gruppe-1',
        name: 'Gruppenführer Gruber',
        rolle: 'spieler',
        qualifikation: 'notsan',
        fuehrungsrolle: 'gruppenfuehrer',
      },
    });
  }

  it('weist ein Fahrzeug einem Gruppenführer zu und protokolliert es', () => {
    const state = eroeffnetMitFahrzeugenUndGruppenfuehrer();
    const fahrzeugId = state.fahrzeuge[0]!.id;
    const zugewiesen = simulationReducer(state, {
      typ: 'fahrzeugGruppeZuweisen',
      fahrzeugId,
      gruppenfuehrerId: 'gruppe-1',
    });
    expect(zugewiesen.fahrzeuge.find((f) => f.id === fahrzeugId)?.gruppenfuehrerId).toBe('gruppe-1');
    expect(zugewiesen.regieProtokoll.at(-1)?.text).toContain('Gruppenführer Gruber');
  });

  it('weist ein Fahrzeug einer anderen Gruppe zu, statt zu addieren', () => {
    const state = eroeffnetMitFahrzeugenUndGruppenfuehrer();
    const fahrzeugId = state.fahrzeuge[0]!.id;
    const erst = simulationReducer(state, {
      typ: 'fahrzeugGruppeZuweisen',
      fahrzeugId,
      gruppenfuehrerId: 'gruppe-1',
    });
    const umgewiesen = simulationReducer(erst, {
      typ: 'fahrzeugGruppeZuweisen',
      fahrzeugId,
      gruppenfuehrerId: 'gruppe-2',
    });
    expect(umgewiesen.fahrzeuge.find((f) => f.id === fahrzeugId)?.gruppenfuehrerId).toBe('gruppe-2');
  });

  it('entfernt die Zuweisung wieder mit gruppenfuehrerId: null', () => {
    const state = eroeffnetMitFahrzeugenUndGruppenfuehrer();
    const fahrzeugId = state.fahrzeuge[0]!.id;
    const zugewiesen = simulationReducer(state, {
      typ: 'fahrzeugGruppeZuweisen',
      fahrzeugId,
      gruppenfuehrerId: 'gruppe-1',
    });
    const entfernt = simulationReducer(zugewiesen, {
      typ: 'fahrzeugGruppeZuweisen',
      fahrzeugId,
      gruppenfuehrerId: null,
    });
    expect(entfernt.fahrzeuge.find((f) => f.id === fahrzeugId)?.gruppenfuehrerId).toBeUndefined();
    expect(entfernt.regieProtokoll.at(-1)?.text).toContain('keiner Gruppe mehr');
  });

  it('bleibt bei einer unbekannten fahrzeugId unverändert', () => {
    const state = eroeffnetMitFahrzeugenUndGruppenfuehrer();
    const unveraendert = simulationReducer(state, {
      typ: 'fahrzeugGruppeZuweisen',
      fahrzeugId: 'unbekannt',
      gruppenfuehrerId: 'gruppe-1',
    });
    expect(unveraendert).toBe(state);
  });
});

describe('Zeltbefehl: Zugführer befiehlt, Gruppenführer führt aus (→ modell.flaechenbefehl)', () => {
  function eroeffnetMitGruppenfuehrer(): SimulationState {
    const basis = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'digital' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
    return simulationReducer(basis, {
      typ: 'spielerHinzugefuegt',
      spieler: {
        id: 'gruppe-1',
        name: 'Gruppenführer Gruber',
        rolle: 'spieler',
        qualifikation: 'notsan',
        fuehrungsrolle: 'gruppenfuehrer',
      },
    });
  }

  it('erteilt einen Befehl bei gültiger Fläche und protokolliert ihn', () => {
    const state = eroeffnetMitGruppenfuehrer();
    const befohlen = simulationReducer(state, {
      typ: 'zeltBefehlErteilen',
      id: 'befehl-1',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_rot',
      xM: 0,
      yM: 0,
      zugfuehrerId: 'leiter-1',
      gruppenfuehrerId: 'gruppe-1',
    });
    expect(befohlen.flaechenBefehle).toEqual([
      {
        id: 'befehl-1',
        typ: 'SG20',
        abschnitt: 'zelt_rot',
        xM: 0,
        yM: 0,
        zugfuehrerId: 'leiter-1',
        gruppenfuehrerId: 'gruppe-1',
      },
    ]);
    expect(befohlen.regieProtokoll.at(-1)?.text).toContain('Gruppenführer Gruber');
    // Noch kein echtes Zelt, nur der Auftrag.
    expect(befohlen.flaechen).toEqual([]);
  });

  it('lehnt einen Befehl mit ungültiger Fläche ab, ohne den State zu ändern', () => {
    const mitRot = simulationReducer(eroeffnetMitGruppenfuehrer(), {
      typ: 'zeltPlatzieren',
      id: 'zelt-rot',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_rot',
      xM: 0,
      yM: 0,
    });
    const versuch = simulationReducer(mitRot, {
      typ: 'zeltBefehlErteilen',
      id: 'befehl-1',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_gelb',
      xM: 1,
      yM: 1,
      zugfuehrerId: 'leiter-1',
      gruppenfuehrerId: 'gruppe-1',
    });
    expect(versuch).toBe(mitRot);
  });

  it('ersetzt einen offenen Befehl desselben Abschnitts statt ihn zu addieren', () => {
    const einBefehl = simulationReducer(eroeffnetMitGruppenfuehrer(), {
      typ: 'zeltBefehlErteilen',
      id: 'befehl-1',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_rot',
      xM: 0,
      yM: 0,
      zugfuehrerId: 'leiter-1',
      gruppenfuehrerId: 'gruppe-1',
    });
    const zweiterBefehl = simulationReducer(einBefehl, {
      typ: 'zeltBefehlErteilen',
      id: 'befehl-2',
      flaechenTyp: 'SG50',
      abschnitt: 'zelt_rot',
      xM: 20,
      yM: 20,
      zugfuehrerId: 'leiter-1',
      gruppenfuehrerId: 'gruppe-1',
    });
    expect(zweiterBefehl.flaechenBefehle).toHaveLength(1);
    expect(zweiterBefehl.flaechenBefehle[0]?.id).toBe('befehl-2');
  });

  it('lehnt einen Befehl ab, ohne ein Zelt zu errichten', () => {
    const befohlen = simulationReducer(eroeffnetMitGruppenfuehrer(), {
      typ: 'zeltBefehlErteilen',
      id: 'befehl-1',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_rot',
      xM: 0,
      yM: 0,
      zugfuehrerId: 'leiter-1',
      gruppenfuehrerId: 'gruppe-1',
    });
    const abgelehnt = simulationReducer(befohlen, { typ: 'zeltBefehlAblehnen', id: 'befehl-1' });
    expect(abgelehnt.flaechenBefehle).toEqual([]);
    expect(abgelehnt.flaechen).toEqual([]);
  });

  it('führt einen Befehl aus: zeltPlatzieren mit befehlId errichtet das Zelt und räumt den Befehl ab', () => {
    const befohlen = simulationReducer(eroeffnetMitGruppenfuehrer(), {
      typ: 'zeltBefehlErteilen',
      id: 'befehl-1',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_rot',
      xM: 0,
      yM: 0,
      zugfuehrerId: 'leiter-1',
      gruppenfuehrerId: 'gruppe-1',
    });
    const ausgefuehrt = simulationReducer(befohlen, {
      typ: 'zeltPlatzieren',
      id: 'befehl-1',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_rot',
      xM: 0,
      yM: 0,
      spielerId: 'gruppe-1',
      befehlId: 'befehl-1',
    });
    expect(ausgefuehrt.flaechenBefehle).toEqual([]);
    expect(ausgefuehrt.flaechen).toEqual([
      { id: 'befehl-1', typ: 'SG20', abschnitt: 'zelt_rot', xM: 0, yM: 0, platziertVonSpielerId: 'gruppe-1' },
    ]);
  });

  it('überträgt flaechenBefehle in den Schnappschuss', () => {
    const befohlen = simulationReducer(eroeffnetMitGruppenfuehrer(), {
      typ: 'zeltBefehlErteilen',
      id: 'befehl-1',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_rot',
      xM: 0,
      yM: 0,
      zugfuehrerId: 'leiter-1',
      gruppenfuehrerId: 'gruppe-1',
    });
    const schnappschuss = schnappschussAus(befohlen);
    expect(schnappschuss.flaechenBefehle).toEqual(befohlen.flaechenBefehle);
  });
});

describe('Führungsbefehl: Zugführer befiehlt, Gruppenführer führt einen Abschnitt (→ modell.abschnittfuehrenbefehl)', () => {
  function eroeffnetMitGruppe(): SimulationState {
    const basis = spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'digital' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'manvStufeGewaehlt', stufe: 'manv10' },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    );
    const mitGruppenfuehrer = simulationReducer(basis, {
      typ: 'spielerHinzugefuegt',
      spieler: {
        id: 'gruppe-1',
        name: 'Gruppenführer Gruber',
        rolle: 'spieler',
        qualifikation: 'notsan',
        fuehrungsrolle: 'gruppenfuehrer',
      },
    });
    // Erste beide Fahrzeuge der Gruppe zuweisen, ein drittes bleibt frei.
    const [erstes, zweites] = mitGruppenfuehrer.fahrzeuge;
    const mitErstem = simulationReducer(mitGruppenfuehrer, {
      typ: 'fahrzeugGruppeZuweisen',
      fahrzeugId: erstes!.id,
      gruppenfuehrerId: 'gruppe-1',
    });
    return simulationReducer(mitErstem, {
      typ: 'fahrzeugGruppeZuweisen',
      fahrzeugId: zweites!.id,
      gruppenfuehrerId: 'gruppe-1',
    });
  }

  it('erteilt einen Befehl und protokolliert ihn', () => {
    const state = eroeffnetMitGruppe();
    const befohlen = simulationReducer(state, {
      typ: 'abschnittFuehrenBefehlErteilen',
      id: 'auftrag-1',
      ziel: 'eingangssichtung',
      zugfuehrerId: 'leiter-1',
      gruppenfuehrerId: 'gruppe-1',
    });
    expect(befohlen.abschnittFuehrenBefehle).toEqual([
      { id: 'auftrag-1', ziel: 'eingangssichtung', zugfuehrerId: 'leiter-1', gruppenfuehrerId: 'gruppe-1' },
    ]);
    expect(befohlen.regieProtokoll.at(-1)?.text).toContain('Gruppenführer Gruber');
    // Noch keine Verlegung, nur der Auftrag.
    expect(befohlen.fahrzeuge.every((f) => f.abschnitt === 'schadensstelle')).toBe(true);
  });

  it('ersetzt einen offenen Befehl desselben Gruppenführers statt ihn zu addieren', () => {
    const einBefehl = simulationReducer(eroeffnetMitGruppe(), {
      typ: 'abschnittFuehrenBefehlErteilen',
      id: 'auftrag-1',
      ziel: 'eingangssichtung',
      zugfuehrerId: 'leiter-1',
      gruppenfuehrerId: 'gruppe-1',
    });
    const zweiterBefehl = simulationReducer(einBefehl, {
      typ: 'abschnittFuehrenBefehlErteilen',
      id: 'auftrag-2',
      ziel: 'ablage',
      zugfuehrerId: 'leiter-1',
      gruppenfuehrerId: 'gruppe-1',
    });
    expect(zweiterBefehl.abschnittFuehrenBefehle).toHaveLength(1);
    expect(zweiterBefehl.abschnittFuehrenBefehle[0]?.id).toBe('auftrag-2');
  });

  it('lehnt einen Befehl ab, ohne ein Fahrzeug zu verlegen', () => {
    const befohlen = simulationReducer(eroeffnetMitGruppe(), {
      typ: 'abschnittFuehrenBefehlErteilen',
      id: 'auftrag-1',
      ziel: 'eingangssichtung',
      zugfuehrerId: 'leiter-1',
      gruppenfuehrerId: 'gruppe-1',
    });
    const abgelehnt = simulationReducer(befohlen, {
      typ: 'abschnittFuehrenBefehlAblehnen',
      id: 'auftrag-1',
    });
    expect(abgelehnt.abschnittFuehrenBefehle).toEqual([]);
    expect(abgelehnt.fahrzeuge.every((f) => f.abschnitt === 'schadensstelle')).toBe(true);
  });

  it('führt einen Befehl aus: verlegt jedes erreichbare Gruppen-Fahrzeug, lässt Rest unberührt', () => {
    const state = eroeffnetMitGruppe();
    const [erstes, zweites, drittes] = state.fahrzeuge;
    const befohlen = simulationReducer(state, {
      typ: 'abschnittFuehrenBefehlErteilen',
      id: 'auftrag-1',
      ziel: 'eingangssichtung',
      zugfuehrerId: 'leiter-1',
      gruppenfuehrerId: 'gruppe-1',
    });
    const ausgefuehrt = simulationReducer(befohlen, {
      typ: 'abschnittFuehrenBefehlAusfuehren',
      id: 'auftrag-1',
    });
    expect(ausgefuehrt.fahrzeuge.find((f) => f.id === erstes!.id)?.abschnitt).toBe('eingangssichtung');
    expect(ausgefuehrt.fahrzeuge.find((f) => f.id === zweites!.id)?.abschnitt).toBe('eingangssichtung');
    // Nicht der Gruppe zugewiesenes drittes Fahrzeug bleibt unberührt.
    expect(ausgefuehrt.fahrzeuge.find((f) => f.id === drittes!.id)?.abschnitt).toBe('schadensstelle');
    // Der Befehl ist damit erledigt.
    expect(ausgefuehrt.abschnittFuehrenBefehle).toEqual([]);
    expect(ausgefuehrt.regieProtokoll.at(-1)?.text).toContain('Gruppenführer Gruber');
    expect(ausgefuehrt.regieProtokoll.at(-1)?.text).toContain('2 von 2');
  });

  it('führt bei unbekannter Befehl-id nichts aus', () => {
    const state = eroeffnetMitGruppe();
    const unveraendert = simulationReducer(state, {
      typ: 'abschnittFuehrenBefehlAusfuehren',
      id: 'unbekannt',
    });
    expect(unveraendert).toBe(state);
  });

  it('überträgt abschnittFuehrenBefehle in den Schnappschuss', () => {
    const befohlen = simulationReducer(eroeffnetMitGruppe(), {
      typ: 'abschnittFuehrenBefehlErteilen',
      id: 'auftrag-1',
      ziel: 'eingangssichtung',
      zugfuehrerId: 'leiter-1',
      gruppenfuehrerId: 'gruppe-1',
    });
    const schnappschuss = schnappschussAus(befohlen);
    expect(schnappschuss.abschnittFuehrenBefehle).toEqual(befohlen.abschnittFuehrenBefehle);
  });
});

describe('Transport-Freigabe: Rettungsmittelhalteplatz + Fahrzeug-Zuweisung (→ modell.transport)', () => {
  function eroeffnetMitFahrzeugen(): SimulationState {
    return spiele(
      { typ: 'gemeinsamOeffnen' },
      { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
      { typ: 'anmeldungAbschliessen', name: 'OrgL', eigeneId: 'leiter-1' },
      { typ: 'modusWaehlen', modus: 'digital' },
      { typ: 'massnahmenrechteAbgeschlossen' },
      { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
      { typ: 'manvStufeGewaehlt', stufe: 'manv10' },
      { typ: 'fahrzeugkonfigurationAbgeschlossen' },
      { typ: 'sitzungStarten' },
    );
  }

  /** Fährt ein Fahrzeug über den Fahrzeug-Overlay zur Ausgangssichtung vor. */
  function fahrzeugAnAusgangssichtung(state: SimulationState, fahrzeugId: string): SimulationState {
    const amHalteplatz = simulationReducer(state, {
      typ: 'fahrzeugVerlegen',
      fahrzeugId,
      ziel: 'rettungsmittelhalteplatz',
    });
    return simulationReducer(amHalteplatz, {
      typ: 'fahrzeugVerlegen',
      fahrzeugId,
      ziel: 'ausgangssichtung',
    });
  }

  /** Sichtet und verlegt einen Patienten durch die volle Kette bis zur Ausgangssichtung, final gesichtet. */
  function patientAnAusgangssichtung(
    state: SimulationState,
    patientId = 'B-01',
  ): SimulationState {
    let naechster = simulationReducer(state, {
      typ: 'patientSichten',
      patientId,
      kategorie: 'SK3',
    });
    naechster = simulationReducer(naechster, {
      typ: 'patientVerlegen',
      patientId,
      ziel: 'eingangssichtung',
    });
    naechster = simulationReducer(naechster, {
      typ: 'patientSichten',
      patientId,
      kategorie: 'SK3',
    });
    naechster = simulationReducer(naechster, {
      typ: 'patientVerlegen',
      patientId,
      ziel: 'zelt_gruen',
    });
    naechster = simulationReducer(naechster, {
      typ: 'patientSichten',
      patientId,
      kategorie: 'SK3',
    });
    naechster = simulationReducer(naechster, {
      typ: 'patientVerlegen',
      patientId,
      ziel: 'ausgangssichtung',
    });
    return simulationReducer(naechster, {
      typ: 'patientSichten',
      patientId,
      kategorie: 'SK3',
      final: true,
    });
  }

  it('fährt ein Fahrzeug über den Rettungsmittelhalteplatz zur Ausgangssichtung vor', () => {
    const state = eroeffnetMitFahrzeugen();
    const fahrzeugId = state.fahrzeuge[0]!.id;
    expect(state.fahrzeuge[0]!.typ).toBe('rtw');
    const vorgefahren = fahrzeugAnAusgangssichtung(state, fahrzeugId);
    expect(vorgefahren.fahrzeuge.find((f) => f.id === fahrzeugId)?.abschnitt).toBe(
      'ausgangssichtung',
    );
  });

  it('weist ein Transportfahrzeug zu und gibt damit zugleich den Abtransport frei', () => {
    const state = eroeffnetMitFahrzeugen();
    const fahrzeugId = state.fahrzeuge[0]!.id;
    const bereit = patientAnAusgangssichtung(fahrzeugAnAusgangssichtung(state, fahrzeugId));

    const zugewiesen = simulationReducer(bereit, {
      typ: 'patientAbtransportieren',
      patientId: 'B-01',
      fahrzeugId,
      spielerId: 'leiter-1',
    });

    const patient = zugewiesen.patienten.find((p) => p.id === 'B-01');
    const fahrzeug = zugewiesen.fahrzeuge.find((f) => f.id === fahrzeugId);
    expect(patient?.abschnitt).toBe('transport');
    expect(patient?.transportFahrzeugId).toBe(fahrzeugId);
    expect(fahrzeug?.abschnitt).toBe('transport');
    expect(fahrzeug?.transportierterPatientId).toBe('B-01');
    expect(zugewiesen.regieProtokoll.at(-1)?.text).toContain('Abtransport freigegeben');
  });

  it('lehnt die Zuweisung ab, wenn das Fahrzeug schon einen anderen Patienten transportiert', () => {
    const state = eroeffnetMitFahrzeugen();
    const fahrzeugId = state.fahrzeuge[0]!.id;
    let bereit = fahrzeugAnAusgangssichtung(state, fahrzeugId);
    bereit = patientAnAusgangssichtung(bereit, 'B-01');
    bereit = patientAnAusgangssichtung(bereit, 'B-02');
    const belegt = simulationReducer(bereit, {
      typ: 'patientAbtransportieren',
      patientId: 'B-01',
      fahrzeugId,
    });

    const zweiterVersuch = simulationReducer(belegt, {
      typ: 'patientAbtransportieren',
      patientId: 'B-02',
      fahrzeugId,
    });
    expect(zweiterVersuch.fahrzeuge.find((f) => f.id === fahrzeugId)?.transportierterPatientId).toBe(
      'B-01',
    );
    expect(zweiterVersuch.patienten.find((p) => p.id === 'B-02')?.abschnitt).toBe('ausgangssichtung');
  });

  it('lehnt die Zuweisung ab, wenn das Fahrzeug nicht an der Ausgangssichtung steht', () => {
    const state = eroeffnetMitFahrzeugen();
    const fahrzeugId = state.fahrzeuge[0]!.id;
    const bereit = patientAnAusgangssichtung(state);
    const unveraendert = simulationReducer(bereit, {
      typ: 'patientAbtransportieren',
      patientId: 'B-01',
      fahrzeugId,
    });
    expect(unveraendert).toBe(bereit);
  });

  it('lehnt die Zuweisung ab, wenn der Patient noch nicht an der Ausgangssichtung sichtungsfertig ist', () => {
    const state = eroeffnetMitFahrzeugen();
    const fahrzeugId = state.fahrzeuge[0]!.id;
    const vorgefahren = fahrzeugAnAusgangssichtung(state, fahrzeugId);
    const unveraendert = simulationReducer(vorgefahren, {
      typ: 'patientAbtransportieren',
      patientId: 'B-01',
      fahrzeugId,
    });
    expect(unveraendert).toBe(vorgefahren);
  });

  it('lehnt die Zuweisung mit einem Nicht-Transportfahrzeug ab (z. B. NEF)', () => {
    const state = eroeffnetMitFahrzeugen();
    const nefId = state.fahrzeuge.find((f) => f.typ === 'nef')!.id;
    const nefVorgefahren = fahrzeugAnAusgangssichtung(state, nefId);
    const bereit = patientAnAusgangssichtung(nefVorgefahren);
    const unveraendert = simulationReducer(bereit, {
      typ: 'patientAbtransportieren',
      patientId: 'B-01',
      fahrzeugId: nefId,
    });
    expect(unveraendert).toBe(bereit);
  });

  it('behält die alte Direktverlegung ohne Fahrzeugbezug bei (Solo/Einzelfälle ohne Zugführer)', () => {
    const state = eroeffnetMitFahrzeugen();
    const bereit = patientAnAusgangssichtung(state);
    const direkt = simulationReducer(bereit, {
      typ: 'patientVerlegen',
      patientId: 'B-01',
      ziel: 'transport',
    });
    const patient = direkt.patienten.find((p) => p.id === 'B-01');
    expect(patient?.abschnitt).toBe('transport');
    expect(patient?.transportFahrzeugId).toBeUndefined();
  });
});
