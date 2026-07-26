import { describe, expect, it } from 'vitest';
import {
  DIAGNOSTIK,
  DIAGNOSTIK_FUER,
  DIAGNOSTIK_LISTE,
  VOLLSTAENDIGE_DIAGNOSTIK_SEK,
  diagnostikZeitSek,
  istBekannt,
} from './diagnostik';
import { fuehreDiagnostikDurch, patientAusVorlage } from './simulation';
import { SZENARIEN } from './szenarien';
import type { Befundschluessel, Patient } from './types';

const vorlage = SZENARIEN[0]!.patienten[0]!;
const frisch = (): Patient => patientAusVorlage(vorlage);

describe('Diagnostikkatalog', () => {
  it('deckt jeden Vitalwert durch mindestens eine Untersuchung ab', () => {
    const abgedeckt = new Set(DIAGNOSTIK_LISTE.flatMap((eintrag) => eintrag.zeigt));
    const gebraucht: Befundschluessel[] = [
      'atemfrequenz',
      'herzfrequenz',
      'systolischerRR',
      'spo2',
      'gcs',
      'rekapzeit',
      'blutzucker',
      'temperatur',
      'schmerz',
      'pupillen',
      'auskultation',
      'ekg',
      'koerper',
    ];
    for (const schluessel of gebraucht) {
      expect(abgedeckt.has(schluessel), schluessel).toBe(true);
    }
  });

  it('kostet vollständig deutlich mehr als fünf Minuten', () => {
    // Die Kernaussage der Umstellung: Rundumdiagnostik ist teuer.
    expect(VOLLSTAENDIGE_DIAGNOSTIK_SEK).toBeGreaterThan(300);
  });
});

describe('DIAGNOSTIK_FUER', () => {
  it('ordnet jedem Feld der Befundtafel eine Untersuchung zu', () => {
    // Sonst hätte ein Feld keinen Knopf und wäre nicht zu erheben.
    for (const eintrag of DIAGNOSTIK_LISTE) {
      for (const schluessel of eintrag.zeigt) {
        expect(DIAGNOSTIK_FUER[schluessel], schluessel).toBeDefined();
      }
    }
  });

  it('wählt bei mehreren Wegen den günstigsten', () => {
    // Herzfrequenz liefern Puls (10 s), Pulsoxymeter (20 s) und EKG (60 s).
    expect(DIAGNOSTIK_FUER.herzfrequenz).toBe('puls_tasten');
    expect(DIAGNOSTIK_FUER.systolischerRR).toBe('blutdruck_messen');
    expect(DIAGNOSTIK_FUER.koerper).toBe('bodycheck');
  });

  it('deckt mit der zugeordneten Untersuchung wirklich den Wert auf', () => {
    for (const [schluessel, id] of Object.entries(DIAGNOSTIK_FUER)) {
      expect(DIAGNOSTIK[id].zeigt, schluessel).toContain(schluessel);
    }
  });
});

describe('istBekannt', () => {
  it('kennt am Anfang keinen einzigen Wert', () => {
    const patient = frisch();
    expect(istBekannt(patient, 'herzfrequenz')).toBe(false);
    expect(istBekannt(patient, 'koerper')).toBe(false);
  });

  it('deckt genau die Befunde der durchgeführten Untersuchung auf', () => {
    const patient = fuehreDiagnostikDurch(frisch(), 'blutdruck_messen', 0);
    expect(istBekannt(patient, 'systolischerRR')).toBe(true);
    expect(istBekannt(patient, 'herzfrequenz')).toBe(false);
    expect(istBekannt(patient, 'spo2')).toBe(false);
  });

  it('zeigt beim Pulsoxymeter beide Werte, die das Gerät anzeigt', () => {
    const patient = fuehreDiagnostikDurch(frisch(), 'pulsoxymetrie', 0);
    expect(istBekannt(patient, 'spo2')).toBe(true);
    expect(istBekannt(patient, 'herzfrequenz')).toBe(true);
  });

  it('setzt untersucht erst mit dem Bodycheck', () => {
    expect(fuehreDiagnostikDurch(frisch(), 'puls_tasten', 0).untersucht).toBe(false);
    expect(fuehreDiagnostikDurch(frisch(), 'bodycheck', 0).untersucht).toBe(true);
  });

  it('zählt eine wiederholte Untersuchung nicht doppelt', () => {
    const einmal = fuehreDiagnostikDurch(frisch(), 'puls_tasten', 0);
    const nochmal = fuehreDiagnostikDurch(einmal, 'puls_tasten', 10);
    expect(nochmal).toBe(einmal);
    expect(diagnostikZeitSek(nochmal)).toBe(DIAGNOSTIK.puls_tasten.dauerSek);
  });

  it('verändert den Patienten fachlich nicht - Erheben ist kein Behandeln', () => {
    const patient = frisch();
    const untersucht = fuehreDiagnostikDurch(patient, 'bodycheck', 0);
    expect(untersucht.vitalwerte).toEqual(patient.vitalwerte);
    expect(untersucht.behandelteProbleme).toEqual(patient.behandelteProbleme);
  });
});
