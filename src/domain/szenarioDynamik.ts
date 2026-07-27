import { patientAusVorlage, simuliereZeitraum, wendeMassnahmeAn } from './simulation';
import type { Befund } from './szenarioPruefung';
import type { Patient, PatientVorlage, Sichtungskategorie, Szenario, VitalKey } from './types';

/**
 * @anker szenario.dynamik Spielt ein Szenario durch, bevor es jemand übt
 *
 * Die statische Prüfung (`szenarioPruefung.ts`) sagt nur, ob ein Szenario
 * formal heil ist. Sie sagt nicht, ob es sich lohnt: ob der rote Patient
 * wirklich unter Zeitdruck steht und ob der grüne die Übung übersteht.
 *
 * Deshalb wird jeder Patient hier zweimal simuliert - einmal unbehandelt und
 * einmal mit allen passenden Maßnahmen. Aus den beiden Todeszeitpunkten fällt
 * ab, ob die Lage didaktisch trägt. Die Befunde gehen in die Oberfläche und
 * bei der KI-Erzeugung direkt zurück an das Modell.
 */

/**
 * Zeitraum, über den ein Szenario zur Prüfung durchgespielt wird. Mit dem
 * gedrosselten Tempo (→ `sim.tempo`) reicht das Fenster etwas weiter, damit die
 * langsameren Verläufe darin noch ihren kritischen Punkt erreichen.
 */
export const HORIZONT_MIN = 40;

// Die Zeitgrenzen sind an das gedrosselte Tempo (→ `sim.tempo`) angepasst: alle
// Verläufe dauern rund 25 % länger, also wandern auch diese Schwellen mit.

/** Ab dieser Minute darf ein SK-I-Patient frühestens versterben. */
const FRUEHESTENS_MIN = 5;

/** Bis zu dieser Minute sollte ein unbehandelter SK-I-Patient versterben. */
const SPAETESTENS_MIN = 31;

/** So lange muss ein SK-II-Patient unbehandelt mindestens durchhalten. */
const SK2_MINDESTENS_MIN = 13;

/**
 * Ein gehfähiger Patient, der sich später verschlechtert, ist die klassische
 * Falle für die Nachsichtung und ausdrücklich gewollt. Kippt er aber schon in
 * den ersten Minuten, war er nie ein Leichtverletzter - dann stimmt die
 * Referenzkategorie nicht.
 */
const SK3_NACHSICHTUNG_MIN = 19;

export interface PatientDynamik {
  id: string;
  name: string;
  erwarteteSK: Sichtungskategorie;
  /** Minute, in der der unbehandelte Patient verstirbt - null, wenn er den Horizont übersteht. */
  todUnbehandeltMin: number | null;
  /** Minute, in der der Patient trotz aller Maßnahmen verstirbt. */
  todBehandeltMin: number | null;
  /** true, wenn sich die Vitalwerte unbehandelt überhaupt verändern. */
  veraendertSich: boolean;
}

export interface Dynamikergebnis {
  patienten: PatientDynamik[];
  befunde: Befund[];
}

const VITAL_KEYS: VitalKey[] = [
  'atemfrequenz',
  'herzfrequenz',
  'systolischerRR',
  'spo2',
  'gcs',
  'rekapzeit',
];

/** Simuliert Minute für Minute und meldet, wann der Patient verstirbt. */
function todesminute(start: Patient, horizontMin: number): { minute: number | null; ende: Patient } {
  let patient = start;
  for (let minute = 1; minute <= horizontMin; minute += 1) {
    patient = simuliereZeitraum(patient, (minute - 1) * 60, 60);
    if (patient.status === 'verstorben') return { minute, ende: patient };
  }
  return { minute: null, ende: patient };
}

/**
 * Der bestmöglich versorgte Patient: jedes Problem bekommt sofort die erste
 * Maßnahme, die es löst. Damit zeigt sich, ob der Fall überhaupt lösbar ist.
 */
function bestVersorgt(vorlage: PatientVorlage): Patient {
  let patient = patientAusVorlage(vorlage);
  for (const problem of vorlage.probleme) {
    const massnahme = problem.behandeltDurch[0];
    if (massnahme) patient = wendeMassnahmeAn(patient, massnahme, 0);
  }
  return patient;
}

function unveraendert(start: Patient, ende: Patient): boolean {
  return VITAL_KEYS.every((key) => Math.abs(start.vitalwerte[key] - ende.vitalwerte[key]) < 0.5);
}

/** Spielt einen einzelnen Patienten durch - ohne Bewertung. */
export function spieleDurch(vorlage: PatientVorlage, horizontMin = HORIZONT_MIN): PatientDynamik {
  const roh = patientAusVorlage(vorlage);
  const ohne = todesminute(roh, horizontMin);
  const mit = todesminute(bestVersorgt(vorlage), horizontMin);

  return {
    id: vorlage.id,
    name: vorlage.name,
    erwarteteSK: vorlage.erwarteteSK,
    todUnbehandeltMin: ohne.minute,
    todBehandeltMin: mit.minute,
    veraendertSich: ohne.minute !== null || !unveraendert(roh, ohne.ende),
  };
}

function bewertePatient(dynamik: PatientDynamik, horizontMin: number): Befund[] {
  const befunde: Befund[] = [];
  const ort = `Patient ${dynamik.id}`;
  const tod = dynamik.todUnbehandeltMin;

  if (dynamik.erwarteteSK === 'SK1') {
    if (!dynamik.veraendertSich) {
      befunde.push({
        schwere: 'warnung',
        ort,
        text: 'SK I, aber unbehandelt verändert sich nichts - der Patient erzeugt keinen Zeitdruck.',
      });
    } else if (tod === null) {
      befunde.push({
        schwere: 'warnung',
        ort,
        text: `SK I, überlebt aber ${horizontMin} Minuten ohne jede Behandlung - Verlaufswerte deutlicher setzen.`,
      });
    } else if (tod < FRUEHESTENS_MIN) {
      befunde.push({
        schwere: 'warnung',
        ort,
        text: `Verstirbt unbehandelt schon nach ${tod} Minuten - so früh ist der Patient praktisch nicht zu retten.`,
      });
    } else if (tod > SPAETESTENS_MIN) {
      befunde.push({
        schwere: 'warnung',
        ort,
        text: `Verstirbt unbehandelt erst nach ${tod} Minuten - für SK I zu spät, um in der Übung zu wirken.`,
      });
    }
  }

  if (dynamik.erwarteteSK === 'SK2' && tod !== null && tod < SK2_MINDESTENS_MIN) {
    befunde.push({
      schwere: 'warnung',
      ort,
      text: `SK II, verstirbt unbehandelt aber schon nach ${tod} Minuten - das ist ein SK-I-Verlauf.`,
    });
  }

  if (dynamik.erwarteteSK === 'SK3' && tod !== null && tod < SK3_NACHSICHTUNG_MIN) {
    befunde.push({
      schwere: 'warnung',
      ort,
      text: `SK III, verstirbt unbehandelt aber schon nach ${tod} Minuten - für eine Nachsichtung bleibt keine Zeit, die Kategorie stimmt nicht.`,
    });
  }

  if (dynamik.erwarteteSK === 'SK4' && tod === null) {
    befunde.push({
      schwere: 'warnung',
      ort,
      text: `SK IV, übersteht aber ${horizontMin} Minuten unbehandelt - das passt nicht zu "ohne Überlebenschance".`,
    });
  }

  if (dynamik.erwarteteSK !== 'SK4' && dynamik.todBehandeltMin !== null) {
    befunde.push({
      schwere: 'warnung',
      ort,
      text: `Verstirbt auch bei sofortiger Vollversorgung nach ${dynamik.todBehandeltMin} Minuten - der Fall ist nicht lösbar.`,
    });
  }

  return befunde;
}

function bewerteLage(patienten: PatientDynamik[]): Befund[] {
  const befunde: Befund[] = [];
  const zaehle = (sk: Sichtungskategorie) =>
    patienten.filter((patient) => patient.erwarteteSK === sk).length;

  if (zaehle('SK1') === 0) {
    befunde.push({
      schwere: 'warnung',
      ort: 'Lage',
      text: 'Kein SK-I-Patient - ohne akute vitale Bedrohung fehlt der Kern der Übung.',
    });
  }
  if (zaehle('SK3') === 0 && patienten.length > 3) {
    befunde.push({
      schwere: 'warnung',
      ort: 'Lage',
      text: 'Keine Leichtverletzten - im MANV binden gerade sie Kräfte und Aufmerksamkeit.',
    });
  }
  if (zaehle('SK1') > patienten.length / 2) {
    befunde.push({
      schwere: 'warnung',
      ort: 'Lage',
      text: 'Mehr als die Hälfte SK I - realistisch ist ein deutlich kleinerer Anteil.',
    });
  }
  return befunde;
}

/**
 * Prüft die Dynamik eines vollständigen Szenarios.
 * Setzt eine bestandene `pruefeSzenario` voraus - die Werte werden hier
 * gerechnet, nicht mehr auf Typen geprüft.
 */
export function pruefeDynamik(szenario: Szenario, horizontMin = HORIZONT_MIN): Dynamikergebnis {
  const patienten = szenario.patienten.map((vorlage) => spieleDurch(vorlage, horizontMin));
  const befunde = [
    ...patienten.flatMap((dynamik) => bewertePatient(dynamik, horizontMin)),
    ...bewerteLage(patienten),
  ];
  return { patienten, befunde };
}
