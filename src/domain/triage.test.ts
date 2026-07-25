import { describe, expect, it } from 'vitest';
import { patientAusVorlage } from './simulation';
import { bewerteSichtung, radialispulsTastbar, sichtungNachMstart } from './triage';
import type { Patient, PatientVorlage, Vitalwerte } from './types';

const NORMWERTE: Vitalwerte = {
  atemfrequenz: 16,
  herzfrequenz: 80,
  systolischerRR: 120,
  spo2: 98,
  gcs: 15,
  rekapzeit: 1.5,
};

const BASIS: PatientVorlage = {
  id: 'T-01',
  name: 'Testpatient',
  alter: 40,
  geschlecht: 'd',
  kurzbefund: '',
  untersuchungsbefund: '',
  gehfaehig: false,
  kritischeBlutung: false,
  spontanatmung: true,
  befolgtAufforderungen: true,
  startVitalwerte: NORMWERTE,
  probleme: [],
  erwarteteSK: 'SK2',
};

function patient(ueberschreibungen: Partial<Patient> = {}): Patient {
  return { ...patientAusVorlage(BASIS), ...ueberschreibungen };
}

function mitVitalwerten(teil: Partial<Vitalwerte>): Patient {
  return patient({ vitalwerte: { ...NORMWERTE, ...teil } });
}

/** @anker test.mstart Jeder Zweig des Sichtungsalgorithmus inklusive Grenzwerte */
describe('mSTaRT', () => {
  it('sichtet gehfähige Patienten als SK III', () => {
    expect(sichtungNachMstart(patient({ gehfaehig: true })).kategorie).toBe('SK3');
  });

  it('priorisiert die kritische Blutung vor allen weiteren Kriterien', () => {
    expect(sichtungNachMstart(patient({ kritischeBlutung: true })).kategorie).toBe('SK1');
  });

  it('sichtet fehlende Spontanatmung als SK IV', () => {
    expect(sichtungNachMstart(patient({ spontanatmung: false })).kategorie).toBe('SK4');
  });

  it('sichtet Verstorbene als EX, unabhängig von den Messwerten', () => {
    expect(sichtungNachMstart(patient({ status: 'verstorben' })).kategorie).toBe('EX');
  });

  it.each([
    ['Atemfrequenz zu hoch', { atemfrequenz: 30 }],
    ['Atemfrequenz zu niedrig', { atemfrequenz: 9 }],
    ['kein Radialispuls', { systolischerRR: 85 }],
    ['Rekapzeit verlängert', { rekapzeit: 2.5 }],
    ['Bewusstsein eingetrübt', { gcs: 8 }],
  ])('sichtet bei %s als SK I', (_bezeichnung, abweichung) => {
    expect(sichtungNachMstart(mitVitalwerten(abweichung)).kategorie).toBe('SK1');
  });

  it.each([
    ['Atemfrequenz am oberen Grenzwert', { atemfrequenz: 29 }],
    ['Atemfrequenz am unteren Grenzwert', { atemfrequenz: 10 }],
    ['Blutdruck am Grenzwert', { systolischerRR: 90 }],
    ['Rekapzeit am Grenzwert', { rekapzeit: 2 }],
    ['GCS am Grenzwert', { gcs: 9 }],
  ])('sichtet bei %s noch als SK II', (_bezeichnung, grenzwert) => {
    expect(sichtungNachMstart(mitVitalwerten(grenzwert)).kategorie).toBe('SK2');
  });

  it('sichtet Patienten, die keinen Aufforderungen folgen, als SK I', () => {
    expect(sichtungNachMstart(patient({ befolgtAufforderungen: false })).kategorie).toBe('SK1');
  });

  it('dokumentiert genau einen entscheidenden Schritt', () => {
    const ergebnis = sichtungNachMstart(patient({ gehfaehig: true }));
    expect(ergebnis.schritte.filter((schritt) => schritt.entscheidend)).toHaveLength(1);
  });

  it('erkennt den tastbaren Radialispuls am systolischen Druck', () => {
    expect(radialispulsTastbar({ ...NORMWERTE, systolischerRR: 90 })).toBe(true);
    expect(radialispulsTastbar({ ...NORMWERTE, systolischerRR: 89 })).toBe(false);
  });
});

describe('Bewertung der Sichtung', () => {
  it('erkennt korrekte, über- und unterschätzte Kategorien', () => {
    expect(bewerteSichtung('SK1', 'SK1')).toBe('korrekt');
    expect(bewerteSichtung('SK1', 'SK3')).toBe('ueberschaetzt');
    expect(bewerteSichtung('SK3', 'SK1')).toBe('unterschaetzt');
    expect(bewerteSichtung(null, 'SK1')).toBe('offen');
  });
});
