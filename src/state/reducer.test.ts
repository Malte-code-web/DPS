import { describe, expect, it } from 'vitest';
import { VERLEGUNGSDAUER_SEK } from '../domain/abschnitte';
import { MASSNAHMEN } from '../domain/massnahmen';
import {
  DIAGNOSTIK,
  DIAGNOSTIK_LISTE,
  VOLLSTAENDIGE_DIAGNOSTIK_SEK,
  istBekannt,
} from '../domain/diagnostik';
import { SICHTUNGSDAUER_SEK, sichtungAn } from '../domain/simulation';
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

/** @anker test.zeitkosten Belegt, dass jede Handlung die Uhr fuer alle weiterlaufen laesst */
describe('Einsatzzeit als Ressource', () => {
  it('lässt die Uhr um die Dauer der Maßnahme vorrücken', () => {
    const start = imEinsatz();
    const nachher = simulationReducer(start, {
      typ: 'massnahmeDurchfuehren',
      patientId: 'B-01',
      massnahmeId: 'intubation',
    });
    expect(nachher.zeitSek).toBe(start.zeitSek + MASSNAHMEN.intubation.dauerSek);
  });

  it('verschlechtert währenddessen die übrigen Patienten', () => {
    const start = imEinsatz();
    // B-04 blutet unbehandelt weiter, waehrend nebenan intubiert wird.
    const vorher = patient(start, 'B-04').vitalwerte.systolischerRR;
    const nachher = simulationReducer(start, {
      typ: 'massnahmeDurchfuehren',
      patientId: 'B-01',
      massnahmeId: 'intubation',
    });
    expect(patient(nachher, 'B-04').vitalwerte.systolischerRR).toBeLessThan(vorher);
  });

  it('kostet eine schnelle Sofortmaßnahme deutlich weniger Zeit als Individualmedizin', () => {
    const start = imEinsatz();
    const sofort = simulationReducer(start, {
      typ: 'massnahmeDurchfuehren',
      patientId: 'B-01',
      massnahmeId: 'tourniquet',
    });
    const individual = simulationReducer(start, {
      typ: 'massnahmeDurchfuehren',
      patientId: 'B-01',
      massnahmeId: 'intubation',
    });
    expect(sofort.zeitSek).toBeLessThan(individual.zeitSek / 2);
  });

  it('berechnet die Zeit unabhängig davon, ob sie am Stück oder in Ticks vergeht', () => {
    const start = imEinsatz();
    const amStueck = simulationReducer(start, {
      typ: 'massnahmeDurchfuehren',
      patientId: 'B-01',
      massnahmeId: 'intubation',
    });

    let inTicks = start;
    for (let i = 0; i < MASSNAHMEN.intubation.dauerSek / 5; i++) {
      inTicks = simulationReducer(inTicks, { typ: 'tick', dtSek: 5 });
    }

    expect(amStueck.zeitSek).toBe(inTicks.zeitSek);
    expect(patient(amStueck, 'B-04').vitalwerte.systolischerRR).toBeCloseTo(
      patient(inTicks, 'B-04').vitalwerte.systolischerRR,
      6,
    );
  });
});

describe('Zeitkosten der einzelnen Handlungen', () => {
  it('berechnet die erste Sichtung, eine Korrektur aber nicht', () => {
    const start = imEinsatz();
    const erste = simulationReducer(start, {
      typ: 'patientSichten',
      patientId: 'B-01',
      kategorie: 'SK1',
    });
    expect(erste.zeitSek).toBe(start.zeitSek + SICHTUNGSDAUER_SEK);

    const korrigiert = simulationReducer(erste, {
      typ: 'patientSichten',
      patientId: 'B-01',
      kategorie: 'SK2',
    });
    expect(korrigiert.zeitSek).toBe(erste.zeitSek);
    expect(patient(korrigiert, 'B-01').gesichtetAls).toBe('SK2');
  });

  it('berechnet jede Untersuchung nur beim ersten Mal', () => {
    const start = imEinsatz();
    const untersucht = simulationReducer(start, {
      typ: 'diagnostikDurchfuehren',
      patientId: 'B-01',
      diagnostikId: 'bodycheck',
    });
    expect(untersucht.zeitSek).toBe(start.zeitSek + DIAGNOSTIK.bodycheck.dauerSek);
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
    expect(nachPuls.zeitSek).toBe(start.zeitSek + DIAGNOSTIK.puls_tasten.dauerSek);
  });

  it('lässt die vollständige Diagnostik über fünf Minuten kosten', () => {
    // Wer an einem Patienten alles erhebt, verliert die Zeit bei allen anderen.
    const start = imEinsatz();
    const alles = DIAGNOSTIK_LISTE.reduce(
      (zustand, eintrag) =>
        simulationReducer(zustand, {
          typ: 'diagnostikDurchfuehren',
          patientId: 'B-01',
          diagnostikId: eintrag.id,
        }),
      start,
    );

    expect(alles.zeitSek - start.zeitSek).toBe(VOLLSTAENDIGE_DIAGNOSTIK_SEK);
    expect(VOLLSTAENDIGE_DIAGNOSTIK_SEK).toBeGreaterThan(300);
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
  it('bleibt beim lehrbuchgerechten Weg deutlich unter dem Zeitbedarf der Individualmedizin', () => {
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

    // ... kostet weniger Zeit, als drei Patienten zu intubieren.
    expect(vorsichtung.zeitSek).toBeLessThan(3 * MASSNAHMEN.intubation.dauerSek);
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
    // Vier Verlegungen und vier Sichtungen - je Station eine.
    expect(state.zeitSek).toBe(weg.length * (VERLEGUNGSDAUER_SEK + SICHTUNGSDAUER_SEK));
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

  it('berechnet je Station eine Sichtung, ein Korrigieren nicht', () => {
    let state = imEinsatz();
    const start = state.zeitSek;
    state = simulationReducer(state, { typ: 'patientSichten', patientId: 'B-01', kategorie: 'SK1' });
    expect(state.zeitSek).toBe(start + SICHTUNGSDAUER_SEK);

    // Korrektur an derselben Stelle kostet nichts.
    state = simulationReducer(state, { typ: 'patientSichten', patientId: 'B-01', kategorie: 'SK2' });
    expect(state.zeitSek).toBe(start + SICHTUNGSDAUER_SEK);

    // Die nächste Station sichtet erneut - und das kostet wieder.
    state = simulationReducer(state, {
      typ: 'patientVerlegen',
      patientId: 'B-01',
      ziel: 'eingangssichtung',
    });
    const vorEingang = state.zeitSek;
    state = simulationReducer(state, { typ: 'patientSichten', patientId: 'B-01', kategorie: 'SK2' });
    expect(state.zeitSek).toBe(vorEingang + SICHTUNGSDAUER_SEK);
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
