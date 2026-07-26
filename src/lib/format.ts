import type { VitalKey, Vitalwerte } from '../domain/types';

/** Formatiert Sekunden als Einsatzzeit mm:ss (ab einer Stunde h:mm:ss). */
export function zeitFormat(sekunden: number): string {
  const gesamt = Math.max(0, Math.floor(sekunden));
  const s = gesamt % 60;
  const m = Math.floor(gesamt / 60) % 60;
  const h = Math.floor(gesamt / 3600);
  const zweistellig = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${zweistellig(m)}:${zweistellig(s)}` : `${zweistellig(m)}:${zweistellig(s)}`;
}

export type Vitalstufe = 'normal' | 'auffaellig' | 'kritisch';

interface VitalMeta {
  label: string;
  kurz: string;
  einheit: string;
  /** Normbereich [min, max]. */
  norm: [number, number];
  /** Werte ausserhalb dieses Bereichs gelten als kritisch. */
  kritisch: [number, number];
  nachkommastellen: number;
}

/** @anker format.vitalgrenzen Norm- und Kritischbereiche für die Farbgebung der Messwerte */
export const VITAL_META: Record<VitalKey, VitalMeta> = {
  atemfrequenz: {
    label: 'Atemfrequenz',
    kurz: 'AF',
    einheit: '/min',
    norm: [12, 20],
    kritisch: [10, 29],
    nachkommastellen: 0,
  },
  herzfrequenz: {
    label: 'Herzfrequenz',
    kurz: 'HF',
    einheit: '/min',
    norm: [60, 100],
    kritisch: [50, 130],
    nachkommastellen: 0,
  },
  systolischerRR: {
    label: 'Blutdruck systolisch',
    kurz: 'RR sys',
    einheit: 'mmHg',
    norm: [110, 140],
    kritisch: [90, 200],
    nachkommastellen: 0,
  },
  spo2: {
    label: 'Sauerstoffsättigung',
    kurz: 'SpO2',
    einheit: '%',
    norm: [95, 100],
    kritisch: [90, 100],
    nachkommastellen: 0,
  },
  gcs: {
    label: 'Glasgow Coma Scale',
    kurz: 'GCS',
    einheit: '',
    norm: [15, 15],
    kritisch: [9, 15],
    nachkommastellen: 0,
  },
  rekapzeit: {
    label: 'Rekapillarisierungszeit',
    kurz: 'Rekap',
    einheit: 's',
    norm: [0.5, 2],
    kritisch: [0.5, 2],
    nachkommastellen: 1,
  },
  blutzucker: {
    label: 'Blutzucker',
    kurz: 'BZ',
    einheit: 'mg/dl',
    norm: [70, 140],
    kritisch: [50, 250],
    nachkommastellen: 0,
  },
  temperatur: {
    label: 'Körpertemperatur',
    kurz: 'Temp',
    einheit: '°C',
    norm: [36, 37.5],
    kritisch: [35, 39],
    nachkommastellen: 1,
  },
  schmerz: {
    label: 'Schmerz (NRS)',
    kurz: 'NRS',
    einheit: '/10',
    norm: [0, 3],
    kritisch: [0, 7],
    nachkommastellen: 0,
  },
};

export function vitalStufe(key: VitalKey, wert: number): Vitalstufe {
  const meta = VITAL_META[key];
  if (wert < meta.kritisch[0] || wert > meta.kritisch[1]) return 'kritisch';
  if (wert < meta.norm[0] || wert > meta.norm[1]) return 'auffaellig';
  return 'normal';
}

export function vitalFormat(key: VitalKey, vitalwerte: Vitalwerte): string {
  const meta = VITAL_META[key];
  return vitalwerte[key].toFixed(meta.nachkommastellen);
}

export const VITAL_REIHENFOLGE: VitalKey[] = [
  'atemfrequenz',
  'herzfrequenz',
  'systolischerRR',
  'spo2',
  'gcs',
  'rekapzeit',
  'blutzucker',
  'temperatur',
  'schmerz',
];
