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

/**
 * Die Werte, die der Monitor fortlaufend abbildet: EKG-Frequenz, Sättigung,
 * Atmung und - über die automatische NIBP-Manschette - der systolische
 * Blutdruck. Der Blutdruck wird real im Intervall gemessen; die Simulation
 * führt einen bekannten Wert ohnehin fortlaufend nach, deshalb steht er hier
 * gleichrangig neben den übrigen.
 */
export const MONITOR_VITALS: VitalKey[] = [
  'herzfrequenz',
  'spo2',
  'atemfrequenz',
  'systolischerRR',
];

/**
 * Was mit angeschlossenem Monitor als bekannt gilt: die vier Zahlenwerte und
 * der Rhythmus (EKG).
 */
export const MONITOR_BEFUNDE: Befundschluessel[] = [...MONITOR_VITALS, 'ekg'];

/**
 * Zwei Alarmstufen wie am corpuls³ und nach IEC 60601-1-8: "gelb" (mittel) für
 * einen auffälligen Wert, "rot" (hoch) für einen kritischen. Sie sind bewusst
 * deckungsgleich mit der Farbgebung der Anzeige (`norm`/`kritisch` in
 * `VITAL_META`): Was gelb leuchtet, alarmiert gelb; was rot leuchtet, rot.
 */
export type Alarmstufe = 'mittel' | 'hoch';

/** Rote Grenze: außerhalb wird der Wert kritisch (hohe Priorität). */
export const MONITOR_GRENZEN: Partial<Record<VitalKey, { min?: number; max?: number }>> = {
  herzfrequenz: { min: 50, max: 130 },
  spo2: { min: 90 },
  atemfrequenz: { min: 10, max: 29 },
  systolischerRR: { min: 90, max: 200 },
};

/** Gelbe Grenze: außerhalb wird der Wert auffällig (mittlere Priorität). */
export const MONITOR_WARN_GRENZEN: Partial<Record<VitalKey, { min?: number; max?: number }>> = {
  herzfrequenz: { min: 60, max: 100 },
  spo2: { min: 95 },
  atemfrequenz: { min: 12, max: 20 },
  systolischerRR: { min: 110, max: 140 },
};

export interface MonitorAlarm {
  vital: VitalKey;
  wert: number;
  richtung: 'niedrig' | 'hoch';
  stufe: Alarmstufe;
}

/** Läuft am Patienten ein Monitor? Abgeleitet aus der durchgeführten Maßnahme. */
export function monitorAngeschlossen(patient: Patient): boolean {
  return patient.durchgefuehrteMassnahmen.includes(MONITORING_ID);
}

/** Prüft einen Wert gegen ein Grenzpaar und gibt die verletzte Richtung zurück. */
function verletzung(
  wert: number,
  grenze: { min?: number; max?: number } | undefined,
): 'niedrig' | 'hoch' | null {
  if (!grenze) return null;
  if (grenze.min !== undefined && wert < grenze.min) return 'niedrig';
  if (grenze.max !== undefined && wert > grenze.max) return 'hoch';
  return null;
}

/**
 * @anker monitor.alarme Welche Grenzwerte gerade verletzt sind - gelb oder rot
 *
 * Nur bei angeschlossenem Monitor und nur bei einem Patienten, der noch versorgt
 * wird. Ein Verstorbener und ein Übergebener lösen keinen Ton mehr aus - der
 * Monitor ist ab dann kein Thema der Übung mehr. Je Wert entscheidet die
 * äußere (rote) Grenze zuerst: Was kritisch ist, meldet sich hoch; was nur
 * auffällig ist, mittel.
 */
export function monitorAlarme(patient: Patient): MonitorAlarm[] {
  if (!monitorAngeschlossen(patient)) return [];
  if (patient.status === 'verstorben' || patient.status === 'transportiert') return [];

  const alarme: MonitorAlarm[] = [];
  for (const vital of MONITOR_VITALS) {
    const wert = patient.vitalwerte[vital];
    const rot = verletzung(wert, MONITOR_GRENZEN[vital]);
    if (rot) {
      alarme.push({ vital, wert, richtung: rot, stufe: 'hoch' });
      continue;
    }
    const gelb = verletzung(wert, MONITOR_WARN_GRENZEN[vital]);
    if (gelb) {
      alarme.push({ vital, wert, richtung: gelb, stufe: 'mittel' });
    }
  }
  return alarme;
}

/**
 * Die höchste anstehende Alarmstufe des Patienten, oder null, wenn alles ruhig
 * ist. Ein einziger kritischer Wert hebt den ganzen Monitor auf Rot.
 */
export function monitorPrioritaet(patient: Patient): Alarmstufe | null {
  const alarme = monitorAlarme(patient);
  if (alarme.some((alarm) => alarm.stufe === 'hoch')) return 'hoch';
  if (alarme.length > 0) return 'mittel';
  return null;
}

/** Kurzform: schlägt der Monitor gerade an? */
export function istMonitorImAlarm(patient: Patient): boolean {
  return monitorPrioritaet(patient) !== null;
}
