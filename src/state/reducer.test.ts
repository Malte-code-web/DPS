import { describe, expect, it } from 'vitest';
import { MASSNAHMEN } from '../domain/massnahmen';
import { istBekannt } from '../domain/diagnostik';
import { SOLO_VERSCHLECHTERUNG_FAKTOR, sichtungAn } from '../domain/simulation';
import { EINZELFAELLE } from '../domain/einzelfaelle';
import { SZENARIEN } from '../domain/szenarien';
import { ANFANGSZUSTAND, simulationReducer } from './reducer';
import type { SimulationState } from './reducer';
import type { Einsatzabschnitt, Sichtungskategorie } from '../domain/types';

/** Startet den Busunfall und liefert den Zustand direkt nach dem Alarm. */
function imEinsatz(): SimulationState {
  const busunfall = SZENARIEN.find((szenario) => szenario.id === 'busunfall-b31')!;
  return simulationReducer(ANFANGSZUSTAND, { typ: 'szenarioStarten', szenario: busunfall });
}

function patient(state: SimulationState, id: string) {
  const gefunden = state.patienten.find((eintrag) => eintrag.id === id);
  if (!gefunden) throw new Error(`Patient ${id} fehlt im Szenario`);
  return gefunden;
}

describe('Alleinspiel und Einzelfall', () => {
  const busunfall = SZENARIEN.find((szenario) => szenario.id === 'busunfall-b31')!;

  it('drosselt die Verschlechterung nur im Alleinspiel', () => {
    const team = simulationReducer(ANFANGSZUSTAND, {
      typ: 'szenarioStarten',
      szenario: busunfall,
    });
    const solo = simulationReducer(ANFANGSZUSTAND, {
      typ: 'szenarioStarten',
      szenario: busunfall,
      alleine: true,
    });
    expect(team.alleine).toBe(false);
    expect(solo.alleine).toBe(true);

    const teamPat = team.patienten.find((p) => Object.keys(p.probleme[0]?.verlauf ?? {}).length > 0)!;
    const soloPat = solo.patienten.find((p) => p.id === teamPat.id)!;
    const [key, teamRate] = Object.entries(teamPat.probleme[0]!.verlauf)[0] as [string, number];
    const soloRate = (soloPat.probleme[0]!.verlauf as Record<string, number>)[key]!;
    expect(soloRate).toBeCloseTo(teamRate * SOLO_VERSCHLECHTERUNG_FAKTOR, 5);
  });

  it('wählt bei einem Einzelfall (eine Person) den Patienten direkt aus', () => {
    const fall = EINZELFAELLE[0]!;
    const state = simulationReducer(ANFANGSZUSTAND, { typ: 'szenarioStarten', szenario: fall });
    expect(state.phase).toBe('einsatz');
    expect(state.ausgewaehlterPatientId).toBe(fall.patienten[0]!.id);
  });

  it('lässt bei einer MANV-Lage die Übersicht offen', () => {
    expect(imEinsatz().ausgewaehlterPatientId).toBeNull();
  });
});

/**
 * @anker test.zeitkosten Belegt, dass der Reducer selbst keine Zeit mehr vorspringen lässt
 *
 * Zeitkosten laufen inzwischen als echter Timer bei der Handlung selbst ab
 * (→ `state.zeitkosten`, `state.provider`), nicht mehr als sofortiger Sprung
 * der Einsatzuhr im Reducer. Wie lange eine Handlung dauert, prüft
 * `zeitkosten.test.ts` gegen die reine `zeitkostenSek`-Funktion; hier geht es
 * nur noch darum, dass der Reducer für dieselben Aktionen `zeitSek`
 * unangetastet lässt und die eigentliche Wirkung trotzdem sofort anwendet.
 * Dass währenddessen alle Patienten altern, übernimmt ausschließlich der
 * Simulationstakt (`case 'tick'`), der real vergangene Zeit einrechnet.
 */
describe('Einsatzzeit als Ressource', () => {
  it('lässt die Uhr im Reducer unverändert - nur die Wirkung wird sofort angewendet', () => {
    const start = imEinsatz();
    const nachher = simulationReducer(start, {
      typ: 'massnahmeDurchfuehren',
      patientId: 'B-01',
      massnahmeId: 'intubation',
    });
    expect(nachher.zeitSek).toBe(start.zeitSek);
    expect(patient(nachher, 'B-01').durchgefuehrteMassnahmen).toContain('intubation');
  });

  it('verschlechtert die übrigen Patienten nur über den Simulationstakt, nicht durch die Handlung selbst', () => {
    const start = imEinsatz();
    // B-04 blutet unbehandelt weiter, waehrend nebenan intubiert wird.
    const vorher = patient(start, 'B-04').vitalwerte.systolischerRR;

    // Die Handlung allein (ohne verstrichene Echtzeit) verändert B-04 nicht.
    const nachHandlung = simulationReducer(start, {
      typ: 'massnahmeDurchfuehren',
      patientId: 'B-01',
      massnahmeId: 'intubation',
    });
    expect(patient(nachHandlung, 'B-04').vitalwerte.systolischerRR).toBe(vorher);

    // Erst der Takt über die Dauer der Maßnahme (→ Echtzeit-Timer der
    // Provider-Schicht, hier durch einen entsprechend großen Tick simuliert)
    // lässt B-04 tatsächlich altern.
    const nachTakt = simulationReducer(start, {
      typ: 'tick',
      dtSek: MASSNAHMEN.intubation.dauerSek,
    });
    expect(patient(nachTakt, 'B-04').vitalwerte.systolischerRR).toBeLessThan(vorher);
  });
});

describe('Zeitkosten der einzelnen Handlungen', () => {
  it('berechnet jede Untersuchung nur beim ersten Mal', () => {
    const start = imEinsatz();
    const untersucht = simulationReducer(start, {
      typ: 'diagnostikDurchfuehren',
      patientId: 'B-01',
      diagnostikId: 'bodycheck',
    });
    expect(patient(untersucht, 'B-01').untersucht).toBe(true);

    const nochmal = simulationReducer(untersucht, {
      typ: 'diagnostikDurchfuehren',
      patientId: 'B-01',
      diagnostikId: 'bodycheck',
    });
    expect(nochmal).toBe(untersucht);
  });

  it('deckt mit jeder Untersuchung nur ihren eigenen Befund auf', () => {
    // Der Kern der Umstellung: kein Rundumschlag mehr.
    const start = imEinsatz();
    const nachPuls = simulationReducer(start, {
      typ: 'diagnostikDurchfuehren',
      patientId: 'B-01',
      diagnostikId: 'puls_tasten',
    });

    expect(istBekannt(patient(nachPuls, 'B-01'), 'herzfrequenz')).toBe(true);
    expect(istBekannt(patient(nachPuls, 'B-01'), 'systolischerRR')).toBe(false);
  });

  it('hält den Sichtungszeitpunkt fest, auch wenn Zeit vergeht', () => {
    const start = imEinsatz();
    const gesichtet = simulationReducer(start, {
      typ: 'patientSichten',
      patientId: 'B-01',
      kategorie: 'SK1',
    });
    // Vergeben wird zum Zeitpunkt des Hinschauens, nicht nach Ablauf der Dauer.
    expect(patient(gesichtet, 'B-01').gesichtetUmSek).toBe(start.zeitSek);
  });
});

describe('Ablauf einer Vorsichtung', () => {
  it('sichtet alle Patienten vor, ohne dass der Reducer dafür Zeit vergehen lässt', () => {
    let vorsichtung = imEinsatz();
    for (const eintrag of vorsichtung.patienten) {
      vorsichtung = simulationReducer(vorsichtung, {
        typ: 'patientSichten',
        patientId: eintrag.id,
        kategorie: eintrag.erwarteteSK,
      });
    }
    // Zehn Patienten vorgesichtet ...
    expect(vorsichtung.patienten.every((eintrag) => eintrag.gesichtetAls !== null)).toBe(true);
    // ... der Zeitbedarf dafür steht in `zeitkosten.test.ts`.
    expect(vorsichtung.zeitSek).toBe(0);
  });
});

/** @anker test.abschnitte Der Weg eines Patienten und die erlaubten Verlegungen */
describe('Einsatzabschnitte', () => {
  it('startet alle Patienten an der Schadensstelle', () => {
    const start = imEinsatz();
    expect(start.patienten.every((eintrag) => eintrag.abschnitt === 'schadensstelle')).toBe(true);
  });

  /** Jede Station sichtet, dann wird verlegt - so verlangt es die Anhängekarte. */
  function sichtenUndVerlegen(
    state: SimulationState,
    ziel: Einsatzabschnitt,
    kategorie: Sichtungskategorie = 'SK1',
  ): SimulationState {
    const gesichtet = simulationReducer(state, {
      typ: 'patientSichten',
      patientId: 'B-01',
      kategorie,
    });
    return simulationReducer(gesichtet, { typ: 'patientVerlegen', patientId: 'B-01', ziel });
  }

  it('führt einen Patienten über den gesamten Behandlungsplatz', () => {
    let state = imEinsatz();
    const weg: Einsatzabschnitt[] = [
      'eingangssichtung',
      'zelt_rot',
      'ausgangssichtung',
      'transport',
    ];
    for (const ziel of weg) {
      state = sichtenUndVerlegen(state, ziel);
      expect(patient(state, 'B-01').abschnitt).toBe(ziel);
    }
    expect(patient(state, 'B-01').status).toBe('transportiert');
    // Der Reducer selbst lässt die Uhr unverändert - Zeitkosten laufen jetzt
    // separat als Echtzeit-Timer (→ `state.zeitkosten`, `zeitkosten.test.ts`).
    expect(state.zeitSek).toBe(0);
  });

  it('verweigert die Verlegung, solange die Sichtung dieser Station fehlt', () => {
    const start = imEinsatz();
    const ohneSichtung = simulationReducer(start, {
      typ: 'patientVerlegen',
      patientId: 'B-01',
      ziel: 'eingangssichtung',
    });
    expect(ohneSichtung).toBe(start);

    const nachSichtung = sichtenUndVerlegen(start, 'eingangssichtung');
    expect(patient(nachSichtung, 'B-01').abschnitt).toBe('eingangssichtung');
  });

  it('lässt eine endgültig gesichtete Patientin ohne erneute Sichtung durch', () => {
    let state = imEinsatz();
    state = simulationReducer(state, {
      typ: 'patientSichten',
      patientId: 'B-01',
      kategorie: 'SK1',
      final: true,
    });
    expect(patient(state, 'B-01').sichtungFinal).toBe(true);

    state = simulationReducer(state, {
      typ: 'patientVerlegen',
      patientId: 'B-01',
      ziel: 'eingangssichtung',
    });
    state = simulationReducer(state, {
      typ: 'patientVerlegen',
      patientId: 'B-01',
      ziel: 'zelt_rot',
    });
    expect(patient(state, 'B-01').abschnitt).toBe('zelt_rot');
  });

  it('lässt keine Sprünge im Ablauf zu', () => {
    const start = imEinsatz();
    const versuch = simulationReducer(start, {
      typ: 'patientVerlegen',
      patientId: 'B-01',
      ziel: 'ausgangssichtung',
    });
    expect(versuch).toBe(start);
  });

  it('erlaubt die Verlegung zwischen den Zelten nach einer Nachsichtung', () => {
    let state = imEinsatz();
    state = sichtenUndVerlegen(state, 'eingangssichtung');
    state = sichtenUndVerlegen(state, 'zelt_gruen', 'SK3');
    state = sichtenUndVerlegen(state, 'zelt_rot', 'SK1');
    expect(patient(state, 'B-01').abschnitt).toBe('zelt_rot');
  });

  it('hält fest, an welcher Stelle jede Sichtung fiel', () => {
    let state = imEinsatz();
    state = simulationReducer(state, {
      typ: 'patientSichten',
      patientId: 'B-01',
      kategorie: 'SK2',
    });
    state = simulationReducer(state, {
      typ: 'patientVerlegen',
      patientId: 'B-01',
      ziel: 'eingangssichtung',
    });
    state = simulationReducer(state, {
      typ: 'patientSichten',
      patientId: 'B-01',
      kategorie: 'SK1',
    });

    const verlauf = patient(state, 'B-01').sichtungsverlauf;
    expect(verlauf.map((eintrag) => eintrag.stelle)).toEqual(['vorsichtung', 'eingangssichtung']);
    expect(sichtungAn(patient(state, 'B-01'), 'vorsichtung')).toBe('SK2');
    expect(sichtungAn(patient(state, 'B-01'), 'eingangssichtung')).toBe('SK1');
    // Die zuletzt gültige Kategorie ist die der Eingangssichtung.
    expect(patient(state, 'B-01').gesichtetAls).toBe('SK1');
  });

  it('verändert abtransportierte Patienten nicht mehr', () => {
    let state = imEinsatz();
    for (const ziel of ['eingangssichtung', 'zelt_rot', 'ausgangssichtung', 'transport'] as const) {
      state = sichtenUndVerlegen(state, ziel);
    }
    const vitalwerte = patient(state, 'B-01').vitalwerte;
    for (let i = 0; i < 200; i++) {
      state = simulationReducer(state, { typ: 'tick', dtSek: 5 });
    }
    expect(patient(state, 'B-01').vitalwerte).toEqual(vitalwerte);
  });
});
