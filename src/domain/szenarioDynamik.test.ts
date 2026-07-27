import { describe, expect, it } from 'vitest';
import { SZENARIEN } from './szenarien';
import { pruefeDynamik, spieleDurch } from './szenarioDynamik';
import type { PatientVorlage, Szenario } from './types';

function patient(teil: Partial<PatientVorlage>): PatientVorlage {
  return {
    id: 'P-01',
    name: 'Testperson',
    alter: 40,
    geschlecht: 'd',
    kurzbefund: 'Kurzbefund',
    untersuchungsbefund: 'Untersuchungsbefund',
    gehfaehig: false,
    kritischeBlutung: false,
    spontanatmung: true,
    befolgtAufforderungen: true,
    startVitalwerte: {
      atemfrequenz: 18,
      herzfrequenz: 90,
      systolischerRR: 120,
      spo2: 97,
      gcs: 15,
      rekapzeit: 1.5,
    },
    probleme: [],
    erwarteteSK: 'SK2',
    ...teil,
  };
}

/** Blutender Patient: 120 mmHg fallen mit 9/min - Tod (30 mmHg) nach 10 Minuten. */
const blutung = patient({
  id: 'P-blutung',
  kritischeBlutung: true,
  erwarteteSK: 'SK1',
  probleme: [
    {
      id: 'oberschenkelblutung',
      label: 'Spritzende Blutung',
      beschreibung: 'Arterielle Blutung am Oberschenkel.',
      behandeltDurch: ['tourniquet'],
      verlauf: { systolischerRR: -9, herzfrequenz: 6 },
    },
  ],
});

const leichtverletzt = patient({ id: 'P-leicht', gehfaehig: true, erwarteteSK: 'SK3' });

describe('spieleDurch', () => {
  it('lässt einen unbehandelten kritischen Patienten versterben', () => {
    const ergebnis = spieleDurch(blutung);
    expect(ergebnis.todUnbehandeltMin).toBe(10);
    expect(ergebnis.veraendertSich).toBe(true);
  });

  it('rettet denselben Patienten, wenn die Maßnahme greift', () => {
    expect(spieleDurch(blutung).todBehandeltMin).toBeNull();
  });

  it('erkennt einen Patienten ohne jede Veränderung', () => {
    const ergebnis = spieleDurch(leichtverletzt);
    expect(ergebnis.todUnbehandeltMin).toBeNull();
    expect(ergebnis.veraendertSich).toBe(false);
  });

  it('berücksichtigt verzögert einsetzende Probleme', () => {
    const spaet = patient({
      id: 'P-spaet',
      erwarteteSK: 'SK1',
      probleme: [
        {
          id: 'spannungspneu',
          label: 'Spannungspneumothorax',
          beschreibung: 'Zunehmende Atemnot.',
          behandeltDurch: ['thoraxentlastung'],
          verlauf: { spo2: -10 },
          startetNachMin: 5,
        },
      ],
    });
    // 97 % fallen ab Minute 5 mit 10 %/min auf 40 % - also gegen Minute 11.
    expect(spieleDurch(spaet).todUnbehandeltMin).toBe(11);
  });
});

describe('pruefeDynamik', () => {
  const baue = (patienten: PatientVorlage[]): Szenario => ({
    id: 'test',
    titel: 'Test',
    lagemeldung: 'Lagemeldung',
    einsatzhinweis: 'Hinweis',
    patienten,
  });

  it('meldet einen SK-I-Patienten, der sich gar nicht verschlechtert', () => {
    const ergebnis = pruefeDynamik(baue([patient({ erwarteteSK: 'SK1' }), leichtverletzt]));
    expect(ergebnis.befunde.some((befund) => befund.text.includes('keinen Zeitdruck'))).toBe(true);
  });

  it('meldet einen zu schnell sterbenden Leichtverletzten', () => {
    // Verstirbt nach 10 Minuten - dafür ist keine Nachsichtung schnell genug.
    const ergebnis = pruefeDynamik(
      baue([blutung, { ...blutung, id: 'P-falsch', gehfaehig: true, erwarteteSK: 'SK3' }]),
    );
    expect(
      ergebnis.befunde.some(
        (befund) => befund.ort === 'Patient P-falsch' && befund.text.includes('Nachsichtung'),
      ),
    ).toBe(true);
  });

  it('lässt die Falle für die Nachsichtung stehen', () => {
    // Gehfähig, kippt erst spät: genau der Fall, den die Übung treffen soll.
    const spaeteVerschlechterung = patient({
      id: 'P-nachsichtung',
      gehfaehig: true,
      erwarteteSK: 'SK3',
      probleme: [
        {
          id: 'innere-blutung',
          label: 'Intraabdominelle Blutung',
          beschreibung: 'Präklinisch nicht stillbar.',
          behandeltDurch: ['volumengabe'],
          verlauf: { systolischerRR: -5 },
          startetNachMin: 2,
        },
      ],
    });
    const ergebnis = pruefeDynamik(baue([blutung, spaeteVerschlechterung, leichtverletzt]));
    expect(ergebnis.befunde.filter((befund) => befund.ort === 'Patient P-nachsichtung')).toEqual([]);
  });

  it('meldet einen Fall, der auch versorgt nicht zu retten ist', () => {
    const aussichtslos = patient({
      id: 'P-aussichtslos',
      erwarteteSK: 'SK1',
      kritischeBlutung: true,
      probleme: [
        {
          id: 'innere-blutung',
          label: 'Innere Blutung',
          beschreibung: 'Nicht stillbar.',
          behandeltDurch: ['volumengabe'],
          verlauf: { systolischerRR: -9 },
        },
        {
          id: 'zweite-blutung',
          label: 'Zweite Blutungsquelle',
          beschreibung: 'Bleibt bestehen.',
          behandeltDurch: ['betreuung'],
          verlauf: { systolischerRR: -9 },
        },
      ],
    });
    // Beide Probleme werden gelöst - der Patient ist rettbar, also kein Befund.
    expect(
      pruefeDynamik(baue([aussichtslos])).befunde.some((befund) =>
        befund.text.includes('nicht lösbar'),
      ),
    ).toBe(false);

    // Ohne lösende Maßnahme für das zweite Problem bleibt der Verlauf tödlich.
    const ohneLoesung = {
      ...aussichtslos,
      probleme: [
        aussichtslos.probleme[0]!,
        { ...aussichtslos.probleme[1]!, behandeltDurch: [] },
      ],
    };
    expect(
      pruefeDynamik(baue([ohneLoesung])).befunde.some((befund) =>
        befund.text.includes('nicht lösbar'),
      ),
    ).toBe(true);
  });

  it('lässt die mitgelieferten Szenarien ohne Befund durch', () => {
    // Pinnt die Kalibrierung: was die App ausliefert, muss sie selbst bestehen.
    for (const szenario of SZENARIEN) {
      expect(pruefeDynamik(szenario).befunde, szenario.titel).toEqual([]);
    }
  });

  it('bemängelt eine Lage ohne SK I', () => {
    const ergebnis = pruefeDynamik(baue([leichtverletzt]));
    expect(ergebnis.befunde.some((befund) => befund.ort === 'Lage')).toBe(true);
  });

  it('lässt ein stimmiges Szenario ohne Befund durch', () => {
    const stabil = patient({
      id: 'P-stabil',
      erwarteteSK: 'SK2',
      probleme: [
        {
          id: 'unterarmfraktur',
          label: 'Unterarmfraktur',
          beschreibung: 'Schmerzhafte Fehlstellung.',
          behandeltDurch: ['immobilisation'],
          verlauf: { herzfrequenz: 1 },
        },
      ],
    });
    const ergebnis = pruefeDynamik(
      baue([
        blutung,
        stabil,
        leichtverletzt,
        { ...leichtverletzt, id: 'P-leicht-2' },
      ]),
    );
    expect(ergebnis.befunde).toEqual([]);
  });
});
