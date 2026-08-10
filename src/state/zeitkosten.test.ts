import { describe, expect, it } from 'vitest';
import { DIAGNOSTIK, DIAGNOSTIK_LISTE, VOLLSTAENDIGE_DIAGNOSTIK_SEK } from '../domain/diagnostik';
import { verlegungsdauerSek } from '../domain/geodaten';
import { MASSNAHMEN } from '../domain/massnahmen';
import { SZENARIEN } from '../domain/szenarien';
import { ZELTTYPEN } from '../domain/flaechen';
import { ANFANGSZUSTAND, simulationReducer } from './reducer';
import {
  istDiagnostikAktion,
  istFahrzeugVerlegenAktion,
  istMassnahmeAktion,
  istMassnahmeAusSammlung,
  istPatientAbtransportierenAktion,
  istPatientVerlegenAktion,
  istZeltPlatzierenAktion,
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
    expect(zeitkostenSek(gesichtet, aktion)).toBe(
      verlegungsdauerSek(gesichtet.routen, 'schadensstelle', 'eingangssichtung'),
    );

    // Ein nicht erlaubter Sprung im Graphen kostet ebenfalls nichts.
    expect(
      zeitkostenSek(gesichtet, { typ: 'patientVerlegen', patientId: 'B-01', ziel: 'ausgangssichtung' }),
    ).toBe(0);
  });

  it('kostet eine Fahrzeugverlegung nur bei erlaubtem Ziel', () => {
    const start = imEinsatz();
    const fahrzeugId = start.fahrzeuge[0]?.id;
    if (!fahrzeugId) return; // Szenario ohne konfigurierte Fahrzeuge - Bypass.
    const abschnitt = start.fahrzeuge.find((f) => f.id === fahrzeugId)!.abschnitt;
    expect(
      zeitkostenSek(start, { typ: 'fahrzeugVerlegen', fahrzeugId, ziel: 'eingangssichtung' }),
    ).toBe(verlegungsdauerSek(start.routen, abschnitt, 'eingangssichtung'));
    expect(
      zeitkostenSek(start, { typ: 'fahrzeugVerlegen', fahrzeugId, ziel: 'zelt_rot' }),
    ).toBe(0);
  });

  it('kostet eine Fahrzeugverlegung zum Rettungsmittelhalteplatz - nur im Fahrzeug-Overlay erlaubt', () => {
    const start = imEinsatz();
    const fahrzeugId = start.fahrzeuge[0]?.id;
    if (!fahrzeugId) return; // Szenario ohne konfigurierte Fahrzeuge - Bypass.
    const abschnitt = start.fahrzeuge.find((f) => f.id === fahrzeugId)!.abschnitt;
    expect(
      zeitkostenSek(start, {
        typ: 'fahrzeugVerlegen',
        fahrzeugId,
        ziel: 'rettungsmittelhalteplatz',
      }),
    ).toBe(verlegungsdauerSek(start.routen, abschnitt, 'rettungsmittelhalteplatz'));
  });

  it('kostet den Zeltaufbau je nach Größe - größere Zelte dauern länger', () => {
    const state = imEinsatz();
    const sg20 = zeitkostenSek(state, {
      typ: 'zeltPlatzieren',
      id: 'zelt-1',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_rot',
      xM: 0,
      yM: 0,
    });
    const sg50 = zeitkostenSek(state, {
      typ: 'zeltPlatzieren',
      id: 'zelt-2',
      flaechenTyp: 'SG50',
      abschnitt: 'zelt_gelb',
      xM: 20,
      yM: 20,
    });
    expect(sg20).toBe(ZELTTYPEN.SG20.aufbauSek);
    expect(sg50).toBe(ZELTTYPEN.SG50.aufbauSek);
    expect(sg50).toBeGreaterThan(sg20);
  });

  it('kostet eine reine Fläche (kein Zeltprodukt) keine Aufbauzeit - steht sofort', () => {
    const state = imEinsatz();
    const flS = zeitkostenSek(state, {
      typ: 'zeltPlatzieren',
      id: 'flaeche-1',
      flaechenTyp: 'FL_S',
      abschnitt: 'ablage',
      xM: 0,
      yM: 0,
    });
    const flL = zeitkostenSek(state, {
      typ: 'zeltPlatzieren',
      id: 'flaeche-2',
      flaechenTyp: 'FL_L',
      abschnitt: 'bereitstellungsraum',
      xM: 20,
      yM: 20,
    });
    expect(flS).toBe(0);
    expect(flL).toBe(0);
  });

  it('kostet nichts bei einer ungültigen Zeltplatzierung (Überlappung)', () => {
    const start = imEinsatz();
    const mitRot = simulationReducer(start, {
      typ: 'zeltPlatzieren',
      id: 'zelt-1',
      flaechenTyp: 'SG20',
      abschnitt: 'zelt_rot',
      xM: 0,
      yM: 0,
    });
    expect(
      zeitkostenSek(mitRot, {
        typ: 'zeltPlatzieren',
        id: 'zelt-2',
        flaechenTyp: 'SG20',
        abschnitt: 'zelt_gelb',
        xM: 1,
        yM: 1,
      }),
    ).toBe(0);
  });

  it('kostet für alle anderen Aktionen nichts, z. B. reine Navigation', () => {
    const state = imEinsatz();
    expect(zeitkostenSek(state, { typ: 'patientWaehlen', patientId: 'B-01' })).toBe(0);
    expect(zeitkostenSek(state, { typ: 'abschnittWaehlen', abschnitt: 'zelt_rot' })).toBe(0);
  });

  it('kostet für einen Führungsauftrag das Maximum aller Einzelverlegungen, nicht die Summe', () => {
    const start = imEinsatz();
    if (start.fahrzeuge.length < 2) return; // Szenario ohne genug Fahrzeuge - Bypass.
    const [erstes, zweites] = start.fahrzeuge;
    const mitGruppe = simulationReducer(
      simulationReducer(start, {
        typ: 'fahrzeugGruppeZuweisen',
        fahrzeugId: erstes!.id,
        gruppenfuehrerId: 'gruppe-1',
      }),
      { typ: 'fahrzeugGruppeZuweisen', fahrzeugId: zweites!.id, gruppenfuehrerId: 'gruppe-1' },
    );
    const befohlen = simulationReducer(mitGruppe, {
      typ: 'abschnittFuehrenBefehlErteilen',
      id: 'auftrag-1',
      ziel: 'eingangssichtung',
      zugfuehrerId: 'leiter-1',
      gruppenfuehrerId: 'gruppe-1',
    });
    const erwartet = Math.max(
      verlegungsdauerSek(start.routen, erstes!.abschnitt, 'eingangssichtung'),
      verlegungsdauerSek(start.routen, zweites!.abschnitt, 'eingangssichtung'),
    );
    expect(
      zeitkostenSek(befohlen, { typ: 'abschnittFuehrenBefehlAusfuehren', id: 'auftrag-1' }),
    ).toBe(erwartet);
  });

  it('kostet nichts, wenn kein Fahrzeug der Gruppe umziehen muss oder kann', () => {
    const state = imEinsatz();
    expect(
      zeitkostenSek(state, { typ: 'abschnittFuehrenBefehlAusfuehren', id: 'unbekannt' }),
    ).toBe(0);
  });

  it('kostet die Transport-Freigabe nur bei sichtungsfertigem Patient und freiem RTW/KTW an der Ausgangssichtung', () => {
    const start = imEinsatz();
    const fahrzeugId = start.fahrzeuge.find((f) => f.typ === 'rtw' || f.typ === 'ktw')?.id;
    if (!fahrzeugId) return; // Szenario ohne Transportfahrzeug - Bypass.
    const aktion = {
      typ: 'patientAbtransportieren' as const,
      patientId: 'B-01',
      fahrzeugId,
    };
    // Weder Fahrzeug an der Ausgangssichtung noch Patient sichtungsfertig.
    expect(zeitkostenSek(start, aktion)).toBe(0);

    const fahrzeugBereit = simulationReducer(
      simulationReducer(start, { typ: 'fahrzeugVerlegen', fahrzeugId, ziel: 'rettungsmittelhalteplatz' }),
      { typ: 'fahrzeugVerlegen', fahrzeugId, ziel: 'ausgangssichtung' },
    );
    // Fahrzeug ist da, Patient aber noch an der Schadensstelle.
    expect(zeitkostenSek(fahrzeugBereit, aktion)).toBe(0);

    let mitPatient = simulationReducer(fahrzeugBereit, {
      typ: 'patientSichten',
      patientId: 'B-01',
      kategorie: 'SK1',
    });
    mitPatient = simulationReducer(mitPatient, {
      typ: 'patientVerlegen',
      patientId: 'B-01',
      ziel: 'eingangssichtung',
    });
    mitPatient = simulationReducer(mitPatient, {
      typ: 'patientSichten',
      patientId: 'B-01',
      kategorie: 'SK1',
    });
    mitPatient = simulationReducer(mitPatient, {
      typ: 'patientVerlegen',
      patientId: 'B-01',
      ziel: 'zelt_rot',
    });
    mitPatient = simulationReducer(mitPatient, {
      typ: 'patientSichten',
      patientId: 'B-01',
      kategorie: 'SK1',
    });
    mitPatient = simulationReducer(mitPatient, {
      typ: 'patientVerlegen',
      patientId: 'B-01',
      ziel: 'ausgangssichtung',
    });
    // Am Ziel, aber noch nicht final gesichtet.
    expect(zeitkostenSek(mitPatient, aktion)).toBe(0);

    const gesichtet = simulationReducer(mitPatient, {
      typ: 'patientSichten',
      patientId: 'B-01',
      kategorie: 'SK1',
      final: true,
    });
    expect(zeitkostenSek(gesichtet, aktion)).toBe(
      verlegungsdauerSek(gesichtet.routen, 'ausgangssichtung', 'transport'),
    );
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
    expect(
      zeitkostenLabel({
        typ: 'zeltPlatzieren',
        id: 'zelt-1',
        flaechenTyp: 'SG30',
        abschnitt: 'zelt_rot',
        xM: 0,
        yM: 0,
      }),
    ).toBe(`${ZELTTYPEN.SG30.bezeichnung} aufbauen`);
    expect(
      zeitkostenLabel({ typ: 'patientAbtransportieren', patientId: 'B-01', fahrzeugId: 'f-1' }),
    ).toBe('Transport organisieren');
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

  it('istPatientAbtransportierenAktion erkennt nur exakt Patient und Fahrzeug', () => {
    const aktion = {
      typ: 'patientAbtransportieren' as const,
      patientId: 'B-01',
      fahrzeugId: 'f-1',
    };
    expect(istPatientAbtransportierenAktion(aktion, 'B-01', 'f-1')).toBe(true);
    expect(istPatientAbtransportierenAktion(aktion, 'B-01', 'f-2')).toBe(false);
    expect(istPatientAbtransportierenAktion(aktion, 'B-02', 'f-1')).toBe(false);
  });

  it('istZeltPlatzierenAktion erkennt nur exakt den Zelttyp', () => {
    const aktion = {
      typ: 'zeltPlatzieren' as const,
      id: 'zelt-1',
      flaechenTyp: 'SG40' as const,
      abschnitt: 'zelt_rot' as const,
      xM: 0,
      yM: 0,
    };
    expect(istZeltPlatzierenAktion(aktion, 'SG40')).toBe(true);
    expect(istZeltPlatzierenAktion(aktion, 'SG20')).toBe(false);
    expect(istZeltPlatzierenAktion({ typ: 'patientWaehlen', patientId: 'B-01' }, 'SG40')).toBe(false);
  });
});
