import { describe, expect, it } from 'vitest';
import { VERLEGUNGSDAUER_SEK } from '../domain/abschnitte';
import { DIAGNOSTIK, DIAGNOSTIK_LISTE, VOLLSTAENDIGE_DIAGNOSTIK_SEK } from '../domain/diagnostik';
import { MASSNAHMEN } from '../domain/massnahmen';
import { SICHTUNGSDAUER_SEK } from '../domain/simulation';
import { SZENARIEN } from '../domain/szenarien';
import { ANFANGSZUSTAND, simulationReducer } from './reducer';
import { zeitkostenLabel, zeitkostenSek } from './zeitkosten';
import type { SimulationState } from './reducer';

/** Startet den Busunfall und liefert den Zustand direkt nach dem Alarm. */
function imEinsatz(): SimulationState {
  const busunfall = SZENARIEN.find((szenario) => szenario.id === 'busunfall-b31')!;
  return simulationReducer(ANFANGSZUSTAND, { typ: 'szenarioStarten', szenario: busunfall });
}

describe('zeitkostenSek', () => {
  it('kostet die Dauer der Maßnahme', () => {
    const state = imEinsatz();
    expect(
      zeitkostenSek(state, { typ: 'massnahmeDurchfuehren', patientId: 'B-01', massnahmeId: 'intubation' }),
    ).toBe(MASSNAHMEN.intubation.dauerSek);
  });

  it('kostet für eine Sofortmaßnahme deutlich weniger als Individualmedizin', () => {
    const state = imEinsatz();
    const sofort = zeitkostenSek(state, {
      typ: 'massnahmeDurchfuehren',
      patientId: 'B-01',
      massnahmeId: 'tourniquet',
    });
    const individual = zeitkostenSek(state, {
      typ: 'massnahmeDurchfuehren',
      patientId: 'B-01',
      massnahmeId: 'intubation',
    });
    expect(sofort).toBeLessThan(individual / 2);
  });

  it('kostet nichts, wenn der Patient nicht existiert', () => {
    const state = imEinsatz();
    expect(
      zeitkostenSek(state, { typ: 'massnahmeDurchfuehren', patientId: 'unbekannt', massnahmeId: 'intubation' }),
    ).toBe(0);
  });

  it('kostet die erste Sichtung, eine Korrektur an derselben Stelle aber nicht', () => {
    const start = imEinsatz();
    expect(
      zeitkostenSek(start, { typ: 'patientSichten', patientId: 'B-01', kategorie: 'SK1' }),
    ).toBe(SICHTUNGSDAUER_SEK);

    const gesichtet = simulationReducer(start, {
      typ: 'patientSichten',
      patientId: 'B-01',
      kategorie: 'SK1',
    });
    expect(
      zeitkostenSek(gesichtet, { typ: 'patientSichten', patientId: 'B-01', kategorie: 'SK2' }),
    ).toBe(0);
  });

  it('kostet jede Untersuchung nur beim ersten Mal', () => {
    const start = imEinsatz();
    const aktion = { typ: 'diagnostikDurchfuehren' as const, patientId: 'B-01', diagnostikId: 'bodycheck' as const };
    expect(zeitkostenSek(start, aktion)).toBe(DIAGNOSTIK.bodycheck.dauerSek);

    const untersucht = simulationReducer(start, aktion);
    expect(zeitkostenSek(untersucht, aktion)).toBe(0);
  });

  it('kostet eine Verlegung nur mit bestätigter Sichtung und erlaubtem Ziel', () => {
    const start = imEinsatz();
    const aktion = {
      typ: 'patientVerlegen' as const,
      patientId: 'B-01',
      ziel: 'eingangssichtung' as const,
    };
    // Ohne Sichtung kostet die Verlegung nichts - der Reducer weist sie ohnehin ab.
    expect(zeitkostenSek(start, aktion)).toBe(0);

    const gesichtet = simulationReducer(start, {
      typ: 'patientSichten',
      patientId: 'B-01',
      kategorie: 'SK1',
    });
    expect(zeitkostenSek(gesichtet, aktion)).toBe(VERLEGUNGSDAUER_SEK);

    // Ein nicht erlaubter Sprung im Graphen kostet ebenfalls nichts.
    expect(
      zeitkostenSek(gesichtet, { typ: 'patientVerlegen', patientId: 'B-01', ziel: 'ausgangssichtung' }),
    ).toBe(0);
  });

  it('kostet eine Fahrzeugverlegung nur bei erlaubtem Ziel', () => {
    const start = imEinsatz();
    const fahrzeugId = start.fahrzeuge[0]?.id;
    if (!fahrzeugId) return; // Szenario ohne konfigurierte Fahrzeuge - Bypass.
    expect(
      zeitkostenSek(start, { typ: 'fahrzeugVerlegen', fahrzeugId, ziel: 'eingangssichtung' }),
    ).toBe(VERLEGUNGSDAUER_SEK);
    expect(
      zeitkostenSek(start, { typ: 'fahrzeugVerlegen', fahrzeugId, ziel: 'zelt_rot' }),
    ).toBe(0);
  });

  it('kostet für alle anderen Aktionen nichts, z. B. reine Navigation', () => {
    const state = imEinsatz();
    expect(zeitkostenSek(state, { typ: 'patientWaehlen', patientId: 'B-01' })).toBe(0);
    expect(zeitkostenSek(state, { typ: 'abschnittWaehlen', abschnitt: 'zelt_rot' })).toBe(0);
  });

  it('summiert die vollständige Diagnostik über fünf Minuten', () => {
    // Wer an einem Patienten alles erhebt, verliert diese Zeit bei allen
    // anderen (→ `state.zeitkosten`) - jede Untersuchung zählt genau einmal.
    let state = imEinsatz();
    let summe = 0;
    for (const eintrag of DIAGNOSTIK_LISTE) {
      const aktion = { typ: 'diagnostikDurchfuehren' as const, patientId: 'B-01', diagnostikId: eintrag.id };
      summe += zeitkostenSek(state, aktion);
      state = simulationReducer(state, aktion);
    }
    expect(summe).toBe(VOLLSTAENDIGE_DIAGNOSTIK_SEK);
    expect(VOLLSTAENDIGE_DIAGNOSTIK_SEK).toBeGreaterThan(300);
  });

  it('kostet die Sichtung an jeder Station einmal, ein Korrigieren nicht', () => {
    let state = imEinsatz();
    const anSchadensstelle = { typ: 'patientSichten' as const, patientId: 'B-01', kategorie: 'SK1' as const };
    expect(zeitkostenSek(state, anSchadensstelle)).toBe(SICHTUNGSDAUER_SEK);
    state = simulationReducer(state, anSchadensstelle);

    // Korrektur an derselben Stelle kostet nichts mehr.
    expect(
      zeitkostenSek(state, { typ: 'patientSichten', patientId: 'B-01', kategorie: 'SK2' }),
    ).toBe(0);

    state = simulationReducer(state, { typ: 'patientVerlegen', patientId: 'B-01', ziel: 'eingangssichtung' });

    // Die nächste Station sichtet erneut - und das kostet wieder.
    expect(
      zeitkostenSek(state, { typ: 'patientSichten', patientId: 'B-01', kategorie: 'SK2' }),
    ).toBe(SICHTUNGSDAUER_SEK);
  });

  it('bleibt beim lehrbuchgerechten Vorsichten aller Patienten deutlich unter drei Intubationen', () => {
    let state = imEinsatz();
    let summe = 0;
    for (const eintrag of state.patienten) {
      const aktion = {
        typ: 'patientSichten' as const,
        patientId: eintrag.id,
        kategorie: eintrag.erwarteteSK,
      };
      summe += zeitkostenSek(state, aktion);
      state = simulationReducer(state, aktion);
    }
    expect(state.patienten.every((eintrag) => eintrag.gesichtetAls !== null)).toBe(true);
    expect(summe).toBeLessThan(3 * MASSNAHMEN.intubation.dauerSek);
  });
});

describe('zeitkostenLabel', () => {
  it('beschriftet jede zeitkostende Aktion verständlich', () => {
    expect(
      zeitkostenLabel({ typ: 'massnahmeDurchfuehren', patientId: 'B-01', massnahmeId: 'intubation' }),
    ).toBe(MASSNAHMEN.intubation.label);
    expect(
      zeitkostenLabel({ typ: 'diagnostikDurchfuehren', patientId: 'B-01', diagnostikId: 'bodycheck' }),
    ).toBe(DIAGNOSTIK.bodycheck.label);
    expect(zeitkostenLabel({ typ: 'patientSichten', patientId: 'B-01', kategorie: 'SK1' })).toBe(
      'Sichtung',
    );
  });
});
