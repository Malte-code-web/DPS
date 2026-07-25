import { describe, expect, it } from 'vitest';
import { MASSNAHMEN } from '../domain/massnahmen';
import { SICHTUNGSDAUER_SEK, UNTERSUCHUNGSDAUER_SEK } from '../domain/simulation';
import { ANFANGSZUSTAND, simulationReducer } from './reducer';
import type { SimulationState } from './reducer';

/** Startet den Busunfall und liefert den Zustand direkt nach dem Alarm. */
function imEinsatz(): SimulationState {
  return simulationReducer(ANFANGSZUSTAND, {
    typ: 'szenarioStarten',
    szenarioId: 'busunfall-b31',
  });
}

function patient(state: SimulationState, id: string) {
  const gefunden = state.patienten.find((eintrag) => eintrag.id === id);
  if (!gefunden) throw new Error(`Patient ${id} fehlt im Szenario`);
  return gefunden;
}

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

  it('berechnet die Untersuchung nur beim ersten Mal', () => {
    const start = imEinsatz();
    const untersucht = simulationReducer(start, {
      typ: 'patientUntersuchen',
      patientId: 'B-01',
    });
    expect(untersucht.zeitSek).toBe(start.zeitSek + UNTERSUCHUNGSDAUER_SEK);
    expect(patient(untersucht, 'B-01').untersucht).toBe(true);

    const nochmal = simulationReducer(untersucht, {
      typ: 'patientUntersuchen',
      patientId: 'B-01',
    });
    expect(nochmal).toBe(untersucht);
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
