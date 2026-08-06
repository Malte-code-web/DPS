import { describe, expect, it } from 'vitest';
import { VERLEGUNGSDAUER_SEK } from '../domain/abschnitte';
import { DIAGNOSTIK, DIAGNOSTIK_LISTE, VOLLSTAENDIGE_DIAGNOSTIK_SEK } from '../domain/diagnostik';
import { MASSNAHMEN } from '../domain/massnahmen';
import { SZENARIEN } from '../domain/szenarien';
import { ANFANGSZUSTAND, simulationReducer } from './reducer';
import {
  istDiagnostikAktion,
  istFahrzeugVerlegenAktion,
  istMassnahmeAktion,
  istMassnahmeAusSammlung,
  istPatientVerlegenAktion,
  zeitkostenLabel,
  zeitkostenSek,
} from './zeitkosten';
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

  it('kostet die Sichtung selbst nie Zeit - nur Einschätzen und Ankreuzen', () => {
    const start = imEinsatz();
    expect(
      zeitkostenSek(start, { typ: 'patientSichten', patientId: 'B-01', kategorie: 'SK1' }),
    ).toBe(0);

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

  it('kostet die Sichtung an jeder Station nichts, auch nicht nach einer Verlegung', () => {
    let state = imEinsatz();
    const anSchadensstelle = { typ: 'patientSichten' as const, patientId: 'B-01', kategorie: 'SK1' as const };
    expect(zeitkostenSek(state, anSchadensstelle)).toBe(0);
    state = simulationReducer(state, anSchadensstelle);

    state = simulationReducer(state, { typ: 'patientVerlegen', patientId: 'B-01', ziel: 'eingangssichtung' });

    // Auch die Sichtung an der nächsten Station kostet nichts.
    expect(
      zeitkostenSek(state, { typ: 'patientSichten', patientId: 'B-01', kategorie: 'SK2' }),
    ).toBe(0);
  });

  it('kostet das Vorsichten aller Patienten insgesamt keine Zeit', () => {
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
    expect(summe).toBe(0);
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
  });
});

/**
 * @anker test.zeitkostenabgleich Ein Knopf erkennt, ob genau er gerade läuft
 *
 * Diese Wächter entscheiden, ob der Countdown auf einem bestimmten Knopf
 * erscheint (→ `state.zeitkostenabgleich`) - nicht nur, ob irgendetwas läuft.
 */
describe('Zeitkosten-Abgleich', () => {
  it('istMassnahmeAktion erkennt nur exakt Patient und Maßnahme', () => {
    const aktion = { typ: 'massnahmeDurchfuehren' as const, patientId: 'B-01', massnahmeId: 'intubation' as const };
    expect(istMassnahmeAktion(aktion, 'B-01', 'intubation')).toBe(true);
    expect(istMassnahmeAktion(aktion, 'B-02', 'intubation')).toBe(false);
    expect(istMassnahmeAktion(aktion, 'B-01', 'tourniquet')).toBe(false);
    expect(istMassnahmeAktion({ typ: 'patientWaehlen', patientId: 'B-01' }, 'B-01', 'intubation')).toBe(
      false,
    );
  });

  it('istMassnahmeAusSammlung erkennt jedes Mittel der Sammlung, sonst nicht', () => {
    const aktion = { typ: 'massnahmeDurchfuehren' as const, patientId: 'B-01', massnahmeId: 'morphin' as const };
    expect(istMassnahmeAusSammlung(aktion, 'B-01', ['morphin', 'fentanyl'])).toBe(true);
    expect(istMassnahmeAusSammlung(aktion, 'B-01', ['fentanyl'])).toBe(false);
    expect(istMassnahmeAusSammlung(aktion, 'B-02', ['morphin'])).toBe(false);
  });

  it('istDiagnostikAktion erkennt nur exakt Patient und Untersuchung', () => {
    const aktion = { typ: 'diagnostikDurchfuehren' as const, patientId: 'B-01', diagnostikId: 'bodycheck' as const };
    expect(istDiagnostikAktion(aktion, 'B-01', 'bodycheck')).toBe(true);
    expect(istDiagnostikAktion(aktion, 'B-01', 'puls_tasten')).toBe(false);
    expect(istDiagnostikAktion(aktion, 'B-02', 'bodycheck')).toBe(false);
  });

  it('istPatientVerlegenAktion erkennt nur exakt Patient und Ziel', () => {
    const aktion = { typ: 'patientVerlegen' as const, patientId: 'B-01', ziel: 'zelt_rot' as const };
    expect(istPatientVerlegenAktion(aktion, 'B-01', 'zelt_rot')).toBe(true);
    expect(istPatientVerlegenAktion(aktion, 'B-01', 'zelt_gruen')).toBe(false);
    expect(istPatientVerlegenAktion(aktion, 'B-02', 'zelt_rot')).toBe(false);
  });

  it('istFahrzeugVerlegenAktion erkennt nur exakt Fahrzeug und Ziel', () => {
    const aktion = { typ: 'fahrzeugVerlegen' as const, fahrzeugId: 'f-1', ziel: 'zelt_rot' as const };
    expect(istFahrzeugVerlegenAktion(aktion, 'f-1', 'zelt_rot')).toBe(true);
    expect(istFahrzeugVerlegenAktion(aktion, 'f-1', 'zelt_gruen')).toBe(false);
    expect(istFahrzeugVerlegenAktion(aktion, 'f-2', 'zelt_rot')).toBe(false);
  });
});
