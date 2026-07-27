import { describe, expect, it } from 'vitest';
import { istBekannt } from './diagnostik';
import {
  MONITOR_VITALS,
  istMonitorImAlarm,
  monitorAlarme,
  monitorAngeschlossen,
  monitorPrioritaet,
} from './monitor';
import { patientAusVorlage, wendeMassnahmeAn } from './simulation';
import { SZENARIEN } from './szenarien';
import type { Patient, Vitalwerte } from './types';

const vorlage = SZENARIEN[0]!.patienten[0]!;
const frisch = (): Patient => patientAusVorlage(vorlage);
const mitMonitor = (): Patient => wendeMassnahmeAn(frisch(), 'monitoring', 0);
const mitVitalwerten = (patient: Patient, aenderung: Partial<Vitalwerte>): Patient => ({
  ...patient,
  vitalwerte: { ...patient.vitalwerte, ...aenderung },
});

describe('monitorAngeschlossen', () => {
  it('ist erst nach der Maßnahme angeschlossen', () => {
    expect(monitorAngeschlossen(frisch())).toBe(false);
    expect(monitorAngeschlossen(mitMonitor())).toBe(true);
  });
});

describe('istBekannt mit Monitor', () => {
  it('macht die Monitorwerte ohne Einzeluntersuchung sichtbar', () => {
    const patient = mitMonitor();
    for (const vital of MONITOR_VITALS) {
      expect(istBekannt(patient, vital), vital).toBe(true);
    }
    expect(istBekannt(patient, 'ekg')).toBe(true);
  });

  it('zeigt auch den Blutdruck über die NIBP-Manschette', () => {
    expect(istBekannt(frisch(), 'systolischerRR')).toBe(false);
    expect(istBekannt(mitMonitor(), 'systolischerRR')).toBe(true);
  });

  it('lässt Werte außerhalb des Monitors weiter verborgen', () => {
    const patient = mitMonitor();
    // Blutzucker und Körperbefund gehören nicht auf den Monitor.
    expect(istBekannt(patient, 'blutzucker')).toBe(false);
    expect(istBekannt(patient, 'koerper')).toBe(false);
  });

  it('zeigt ohne Monitor auch die Monitorwerte nicht', () => {
    expect(istBekannt(frisch(), 'spo2')).toBe(false);
  });
});

describe('monitorAlarme', () => {
  it('schweigt ohne Monitor, selbst bei kritischem Wert', () => {
    const kritisch = mitVitalwerten(frisch(), { spo2: 80 });
    expect(monitorAlarme(kritisch)).toEqual([]);
  });

  it('schweigt bei Werten im Grenzbereich', () => {
    const stabil = mitVitalwerten(mitMonitor(), {
      spo2: 98,
      herzfrequenz: 80,
      atemfrequenz: 16,
      systolischerRR: 120,
    });
    expect(monitorAlarme(stabil)).toEqual([]);
    expect(istMonitorImAlarm(stabil)).toBe(false);
  });

  it('schlägt bei zu niedriger Sättigung rot an', () => {
    const hypoxie = mitVitalwerten(mitMonitor(), { spo2: 84 });
    const alarme = monitorAlarme(hypoxie);
    expect(alarme).toContainEqual({ vital: 'spo2', wert: 84, richtung: 'niedrig', stufe: 'hoch' });
    expect(istMonitorImAlarm(hypoxie)).toBe(true);
  });

  it('unterscheidet Tachykardie und Bradykardie', () => {
    const schnell = mitVitalwerten(mitMonitor(), { herzfrequenz: 150 });
    expect(monitorAlarme(schnell)).toContainEqual({
      vital: 'herzfrequenz',
      wert: 150,
      richtung: 'hoch',
      stufe: 'hoch',
    });
    const langsam = mitVitalwerten(mitMonitor(), { herzfrequenz: 38 });
    expect(monitorAlarme(langsam)).toContainEqual({
      vital: 'herzfrequenz',
      wert: 38,
      richtung: 'niedrig',
      stufe: 'hoch',
    });
  });

  it('schlägt bei zu niedrigem Blutdruck an', () => {
    const hypoton = mitVitalwerten(mitMonitor(), { systolischerRR: 70 });
    expect(monitorAlarme(hypoton)).toContainEqual({
      vital: 'systolischerRR',
      wert: 70,
      richtung: 'niedrig',
      stufe: 'hoch',
    });
  });

  it('meldet mehrere Grenzwertverletzungen zugleich', () => {
    const kritisch = mitVitalwerten(mitMonitor(), { spo2: 82, atemfrequenz: 6 });
    const vitals = monitorAlarme(kritisch).map((a) => a.vital);
    expect(vitals).toContain('spo2');
    expect(vitals).toContain('atemfrequenz');
  });

  it('verstummt beim verstorbenen Patienten', () => {
    const tot = { ...mitVitalwerten(mitMonitor(), { spo2: 40 }), status: 'verstorben' as const };
    expect(monitorAlarme(tot)).toEqual([]);
  });
});

describe('Alarmstufen gelb/rot', () => {
  const vorlage = SZENARIEN[0]!.patienten[0]!;
  const mitMonitor = (): Patient => wendeMassnahmeAn(patientAusVorlage(vorlage), 'monitoring', 0);
  const mitVitalwerten = (patient: Patient, aenderung: Partial<Vitalwerte>): Patient => ({
    ...patient,
    vitalwerte: { ...patient.vitalwerte, ...aenderung },
  });

  it('meldet einen auffälligen Wert gelb (mittel)', () => {
    // SpO2 92: unter dem Normbereich (95), aber über der kritischen Grenze (90).
    const grenzwertig = mitVitalwerten(mitMonitor(), { spo2: 92 });
    expect(monitorAlarme(grenzwertig)).toContainEqual({
      vital: 'spo2',
      wert: 92,
      richtung: 'niedrig',
      stufe: 'mittel',
    });
    expect(monitorPrioritaet(grenzwertig)).toBe('mittel');
  });

  it('hebt bei einem kritischen Wert die ganze Priorität auf rot', () => {
    // HF 110 wäre gelb, SpO2 80 ist rot - der Monitor meldet insgesamt hoch.
    const gemischt = mitVitalwerten(mitMonitor(), { herzfrequenz: 110, spo2: 80 });
    expect(monitorPrioritaet(gemischt)).toBe('hoch');
  });

  it('bleibt still, solange alles im Normbereich liegt', () => {
    const stabil = mitVitalwerten(mitMonitor(), {
      herzfrequenz: 80,
      spo2: 98,
      atemfrequenz: 16,
      systolischerRR: 120,
    });
    expect(monitorPrioritaet(stabil)).toBeNull();
  });
});
