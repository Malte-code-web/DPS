import { MASSNAHMEN } from './massnahmen';
import { patientAusVorlage } from './simulation';
import { sichtungNachMstart } from './triage';
import { SICHTUNGSKATEGORIEN } from './types';
import type {
  MassnahmeId,
  PatientVorlage,
  Sichtungskategorie,
  Szenario,
  VitalKey,
  Vitalwerte,
} from './types';

/**
 * @anker szenario.pruefung Prüft ein Szenario auf Vollständigkeit und Stimmigkeit
 *
 * Wird an zwei Stellen gebraucht: beim Import fremder oder KI-erzeugter
 * Szenarien und laufend im Editor. Fehler verhindern das Speichern, Warnungen
 * nicht - eine abweichende Referenzkategorie kann didaktisch gewollt sein.
 */

export type Schwere = 'fehler' | 'warnung';

export interface Befund {
  schwere: Schwere;
  /** Wo der Befund auftrat, z. B. "Patient B-03". */
  ort: string;
  text: string;
}

export interface Pruefergebnis {
  befunde: Befund[];
  /** true, wenn kein Befund der Schwere "fehler" vorliegt. */
  gueltig: boolean;
}

const VITAL_GRENZEN: Record<VitalKey, [number, number]> = {
  atemfrequenz: [0, 60],
  herzfrequenz: [0, 220],
  systolischerRR: [0, 220],
  spo2: [0, 100],
  gcs: [3, 15],
  rekapzeit: [0.5, 10],
};

const VITAL_KEYS = Object.keys(VITAL_GRENZEN) as VitalKey[];
const KATEGORIEN = Object.keys(SICHTUNGSKATEGORIEN) as Sichtungskategorie[];

function istText(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.trim().length > 0;
}

function istZahl(wert: unknown): wert is number {
  return typeof wert === 'number' && Number.isFinite(wert);
}

function pruefeVitalwerte(werte: unknown, ort: string, befunde: Befund[]): void {
  if (typeof werte !== 'object' || werte === null) {
    befunde.push({ schwere: 'fehler', ort, text: 'startVitalwerte fehlen.' });
    return;
  }
  const vitalwerte = werte as Partial<Vitalwerte>;
  for (const key of VITAL_KEYS) {
    const wert = vitalwerte[key];
    if (!istZahl(wert)) {
      befunde.push({ schwere: 'fehler', ort, text: `Vitalwert ${key} fehlt oder ist keine Zahl.` });
      continue;
    }
    const [min, max] = VITAL_GRENZEN[key];
    if (wert < min || wert > max) {
      befunde.push({
        schwere: 'fehler',
        ort,
        text: `Vitalwert ${key} = ${wert} liegt ausserhalb von ${min} bis ${max}.`,
      });
    }
  }
}

function pruefePatient(vorlage: unknown, ort: string, befunde: Befund[]): void {
  if (typeof vorlage !== 'object' || vorlage === null) {
    befunde.push({ schwere: 'fehler', ort, text: 'Patient ist kein Objekt.' });
    return;
  }
  const patient = vorlage as Partial<PatientVorlage>;

  for (const feld of ['id', 'name', 'kurzbefund', 'untersuchungsbefund'] as const) {
    if (!istText(patient[feld])) {
      befunde.push({ schwere: 'fehler', ort, text: `Feld ${feld} fehlt oder ist leer.` });
    }
  }
  if (!istZahl(patient.alter) || patient.alter < 0 || patient.alter > 120) {
    befunde.push({ schwere: 'fehler', ort, text: 'Alter fehlt oder ist unplausibel.' });
  }
  if (!['w', 'm', 'd'].includes(patient.geschlecht as string)) {
    befunde.push({ schwere: 'fehler', ort, text: 'Geschlecht muss w, m oder d sein.' });
  }
  for (const feld of [
    'gehfaehig',
    'kritischeBlutung',
    'spontanatmung',
    'befolgtAufforderungen',
  ] as const) {
    if (typeof patient[feld] !== 'boolean') {
      befunde.push({ schwere: 'fehler', ort, text: `Feld ${feld} muss true oder false sein.` });
    }
  }
  if (!KATEGORIEN.includes(patient.erwarteteSK as Sichtungskategorie)) {
    befunde.push({
      schwere: 'fehler',
      ort,
      text: `erwarteteSK muss eine von ${KATEGORIEN.join(', ')} sein.`,
    });
  }

  pruefeVitalwerte(patient.startVitalwerte, ort, befunde);

  if (!Array.isArray(patient.probleme)) {
    befunde.push({ schwere: 'fehler', ort, text: 'probleme muss eine Liste sein.' });
  } else {
    // Bei Leichtverletzten ist genau das der Normalfall - sie sollen stabil bleiben.
    if (patient.probleme.length === 0 && patient.erwarteteSK !== 'SK3') {
      befunde.push({
        schwere: 'warnung',
        ort,
        text: 'Ohne Problem verändert sich der Patient im Verlauf nicht.',
      });
    }
    patient.probleme.forEach((problem, index) => {
      const problemOrt = `${ort}, Problem ${index + 1}`;
      for (const feld of ['id', 'label', 'beschreibung'] as const) {
        if (!istText(problem?.[feld])) {
          befunde.push({ schwere: 'fehler', ort: problemOrt, text: `Feld ${feld} fehlt.` });
        }
      }
      if (!Array.isArray(problem?.behandeltDurch) || problem.behandeltDurch.length === 0) {
        befunde.push({
          schwere: 'fehler',
          ort: problemOrt,
          text: 'behandeltDurch muss mindestens eine Maßnahme nennen.',
        });
      } else {
        for (const id of problem.behandeltDurch) {
          if (!MASSNAHMEN[id as MassnahmeId]) {
            befunde.push({
              schwere: 'fehler',
              ort: problemOrt,
              text: `Unbekannte Maßnahme "${id}".`,
            });
          }
        }
      }
      if (typeof problem?.verlauf !== 'object' || problem.verlauf === null) {
        befunde.push({ schwere: 'fehler', ort: problemOrt, text: 'verlauf fehlt.' });
      } else {
        for (const [key, wert] of Object.entries(problem.verlauf)) {
          if (!VITAL_KEYS.includes(key as VitalKey)) {
            befunde.push({
              schwere: 'fehler',
              ort: problemOrt,
              text: `verlauf kennt den Vitalwert "${key}" nicht.`,
            });
          } else if (!istZahl(wert)) {
            befunde.push({
              schwere: 'fehler',
              ort: problemOrt,
              text: `verlauf.${key} ist keine Zahl.`,
            });
          }
        }
        if (Object.keys(problem.verlauf).length === 0) {
          befunde.push({
            schwere: 'warnung',
            ort: problemOrt,
            text: 'Leerer Verlauf - das Problem hat keine Wirkung.',
          });
        }
      }
      if (problem?.startetNachMin !== undefined && !istZahl(problem.startetNachMin)) {
        befunde.push({
          schwere: 'fehler',
          ort: problemOrt,
          text: 'startetNachMin muss eine Zahl sein.',
        });
      }
    });
  }
}

/** Vergleicht die hinterlegte Referenzkategorie mit dem mSTaRT-Ergebnis. */
export function mstartAbweichung(vorlage: PatientVorlage): Sichtungskategorie | null {
  const berechnet = sichtungNachMstart(patientAusVorlage(vorlage)).kategorie;
  return berechnet === vorlage.erwarteteSK ? null : berechnet;
}

export function pruefeSzenario(wert: unknown): Pruefergebnis {
  const befunde: Befund[] = [];

  if (typeof wert !== 'object' || wert === null) {
    return { befunde: [{ schwere: 'fehler', ort: 'Szenario', text: 'Kein Objekt.' }], gueltig: false };
  }
  const szenario = wert as Partial<Szenario>;

  for (const feld of ['id', 'titel', 'lagemeldung', 'einsatzhinweis'] as const) {
    if (!istText(szenario[feld])) {
      befunde.push({ schwere: 'fehler', ort: 'Szenario', text: `Feld ${feld} fehlt oder ist leer.` });
    }
  }

  if (!Array.isArray(szenario.patienten) || szenario.patienten.length === 0) {
    befunde.push({ schwere: 'fehler', ort: 'Szenario', text: 'Mindestens ein Patient nötig.' });
    return { befunde, gueltig: false };
  }

  const ids = new Set<string>();
  szenario.patienten.forEach((patient, index) => {
    const ort = `Patient ${patient?.id ?? index + 1}`;
    pruefePatient(patient, ort, befunde);
    if (istText(patient?.id)) {
      if (ids.has(patient.id)) {
        befunde.push({ schwere: 'fehler', ort, text: 'Patienten-ID kommt doppelt vor.' });
      }
      ids.add(patient.id);
    }
  });

  // Die mSTaRT-Prüfung setzt eine strukturell heile Vorlage voraus.
  if (befunde.every((befund) => befund.schwere !== 'fehler')) {
    for (const patient of szenario.patienten) {
      const abweichung = mstartAbweichung(patient);
      if (abweichung) {
        befunde.push({
          schwere: 'warnung',
          ort: `Patient ${patient.id}`,
          text: `erwarteteSK ist ${patient.erwarteteSK}, mSTaRT ergibt aus den Startwerten ${abweichung}.`,
        });
      }
    }
  }

  return { befunde, gueltig: befunde.every((befund) => befund.schwere !== 'fehler') };
}
