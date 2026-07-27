import type { Befundschluessel, MassnahmeId, Patient, VitalKey } from './types';

/**
 * @anker monitor.modell Der Patientenmonitor - kontinuierliche Überwachung mit Alarm
 *
 * Anders als eine einzelne Untersuchung, die einen Wert einmal abgreift, bleibt
 * der Monitor angeschlossen und zeigt seine Werte fortlaufend. Er ist keine
 * eigene Zustandsgröße am Patienten, sondern ergibt sich daraus, ob die
 * Maßnahme "Monitoring anschließen" durchgeführt wurde - so bleibt der Zustand
 * an einer Stelle und lässt sich nicht widersprüchlich setzen.
 *
 * Solange er läuft, gelten seine Werte als bekannt (→ `diagnostik.bekannt`), und
 * er alarmiert, sobald einer davon seinen Grenzbereich verlässt. Der Ton dazu
 * ist bewusst an den Aufenthaltsort gebunden: zu hören nur, wer im selben
 * Einsatzabschnitt steht (→ `ui.monitoralarm`).
 */
export const MONITORING_ID: MassnahmeId = 'monitoring';

/** Die Werte, die der Monitor fortlaufend abbildet - EKG-Frequenz, Sättigung, Atmung. */
export const MONITOR_VITALS: VitalKey[] = ['herzfrequenz', 'spo2', 'atemfrequenz'];

/**
 * Was mit angeschlossenem Monitor als bekannt gilt. Neben den drei Zahlenwerten
 * zeigt der Monitor auch den Rhythmus (EKG). Der Blutdruck fehlt bewusst: die
 * Manschette misst nicht Schlag für Schlag, er bleibt eine eigene Messung.
 */
export const MONITOR_BEFUNDE: Befundschluessel[] = [...MONITOR_VITALS, 'ekg'];

/**
 * Alarmgrenzen des Monitors. Sie sind bewusst deckungsgleich mit dem Bereich,
 * ab dem die Oberfläche einen Wert rot färbt (`kritisch` in `VITAL_META`): Was
 * rot leuchtet, alarmiert auch - das erspart eine zweite Erklärung.
 */
export const MONITOR_GRENZEN: Partial<Record<VitalKey, { min?: number; max?: number }>> = {
  herzfrequenz: { min: 50, max: 130 },
  spo2: { min: 90 },
  atemfrequenz: { min: 10, max: 29 },
};

export interface MonitorAlarm {
  vital: VitalKey;
  wert: number;
  richtung: 'niedrig' | 'hoch';
}

/** Läuft am Patienten ein Monitor? Abgeleitet aus der durchgeführten Maßnahme. */
export function monitorAngeschlossen(patient: Patient): boolean {
  return patient.durchgefuehrteMassnahmen.includes(MONITORING_ID);
}

/**
 * @anker monitor.alarme Welche Grenzwerte gerade verletzt sind
 *
 * Nur bei angeschlossenem Monitor und nur bei einem Patienten, der noch versorgt
 * wird. Ein Verstorbener und ein Übergebener lösen keinen Ton mehr aus - der
 * Monitor ist ab dann kein Thema der Übung mehr.
 */
export function monitorAlarme(patient: Patient): MonitorAlarm[] {
  if (!monitorAngeschlossen(patient)) return [];
  if (patient.status === 'verstorben' || patient.status === 'transportiert') return [];

  const alarme: MonitorAlarm[] = [];
  for (const vital of MONITOR_VITALS) {
    const grenze = MONITOR_GRENZEN[vital];
    if (!grenze) continue;
    const wert = patient.vitalwerte[vital];
    if (grenze.min !== undefined && wert < grenze.min) {
      alarme.push({ vital, wert, richtung: 'niedrig' });
    } else if (grenze.max !== undefined && wert > grenze.max) {
      alarme.push({ vital, wert, richtung: 'hoch' });
    }
  }
  return alarme;
}

/** Kurzform: schlägt der Monitor gerade an? */
export function istMonitorImAlarm(patient: Patient): boolean {
  return monitorAlarme(patient).length > 0;
}
