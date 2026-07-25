import { abschnittInfo, sichtungsstelleIn } from './abschnitte';
import { MASSNAHMEN } from './massnahmen';
import type {
  Einsatzabschnitt,
  MassnahmeId,
  Patient,
  PatientVorlage,
  Problem,
  Sichtungskategorie,
  Sichtungsstelle,
  VitalKey,
  VitalVerlauf,
  Vitalwerte,
} from './types';

/** Physiologisch sinnvolle Ober- und Untergrenzen je Vitalparameter. */
const GRENZEN: Record<VitalKey, { min: number; max: number }> = {
  atemfrequenz: { min: 0, max: 60 },
  herzfrequenz: { min: 0, max: 220 },
  systolischerRR: { min: 0, max: 220 },
  spo2: { min: 0, max: 100 },
  gcs: { min: 3, max: 15 },
  rekapzeit: { min: 0.5, max: 10 },
};

function begrenze(key: VitalKey, wert: number): number {
  const { min, max } = GRENZEN[key];
  return Math.min(max, Math.max(min, wert));
}

/**
 * Wendet eine Vitalwert-Veränderung an und hält die Grenzen ein.
 *
 * Intern wird bewusst mit Gleitkommawerten gerechnet: ein Tick umfasst nur
 * Sekundenbruchteile einer Minute, gerundete Zwischenwerte würden die
 * Veränderung komplett verschlucken. Gerundet wird erst bei der Anzeige.
 */
export function veraendereVitalwerte(basis: Vitalwerte, delta: VitalVerlauf): Vitalwerte {
  const naechste: Vitalwerte = { ...basis };
  for (const [key, wert] of Object.entries(delta) as [VitalKey, number][]) {
    naechste[key] = begrenze(key, naechste[key] + wert);
  }
  return naechste;
}

/** Erzeugt den Laufzeit-Patienten aus der statischen Szenario-Vorlage. */
export function patientAusVorlage(vorlage: PatientVorlage): Patient {
  return {
    ...vorlage,
    vitalwerte: { ...vorlage.startVitalwerte },
    status: 'unbehandelt',
    abschnitt: 'schadensstelle',
    gesichtetAls: null,
    gesichtetUmSek: null,
    sichtungsverlauf: [],
    behandelteProbleme: [],
    durchgefuehrteMassnahmen: [],
    untersucht: false,
    verlauf: [],
  };
}

/** Alle Probleme, die aktuell unbehandelt sind und bereits wirken. */
export function aktiveProbleme(patient: Patient, zeitSek: number): Problem[] {
  return patient.probleme.filter(
    (problem) =>
      !patient.behandelteProbleme.includes(problem.id) &&
      zeitSek / 60 >= (problem.startetNachMin ?? 0),
  );
}

/** Offene, aber noch nicht wirksame Probleme (z. B. verzögerter Spannungspneu). */
export function latenteProbleme(patient: Patient, zeitSek: number): Problem[] {
  return patient.probleme.filter(
    (problem) =>
      !patient.behandelteProbleme.includes(problem.id) &&
      zeitSek / 60 < (problem.startetNachMin ?? 0),
  );
}

function istVerstorben(v: Vitalwerte): boolean {
  return v.spo2 <= 40 || v.systolischerRR <= 30 || v.herzfrequenz >= 220 || v.herzfrequenz <= 20;
}

function protokolliere(patient: Patient, zeitSek: number, text: string): Patient {
  return { ...patient, verlauf: [...patient.verlauf, { zeitSek, text }] };
}

/**
 * Rechnet den Zustand eines Patienten um `dtSek` Sekunden weiter.
 * Reine Funktion - der Aufrufer ersetzt den alten Patienten durch das Ergebnis.
 */
export function simuliereSchritt(patient: Patient, dtSek: number, zeitSek: number): Patient {
  if (patient.status === 'verstorben' || patient.status === 'transportiert') {
    return patient;
  }

  const dtMin = dtSek / 60;
  const wirksam = aktiveProbleme(patient, zeitSek);

  const delta: VitalVerlauf = {};
  for (const problem of wirksam) {
    for (const [key, proMinute] of Object.entries(problem.verlauf) as [VitalKey, number][]) {
      delta[key] = (delta[key] ?? 0) + proMinute * dtMin;
    }
  }

  let naechster: Patient = {
    ...patient,
    vitalwerte: veraendereVitalwerte(patient.vitalwerte, delta),
  };

  const v = naechster.vitalwerte;

  // Abgeleitete Befunde: der Zustand des Patienten folgt seinen Vitalwerten.
  const spontanatmung = v.atemfrequenz >= 1;
  const befolgtAufforderungen = v.gcs >= 9 && (patient.befolgtAufforderungen || v.gcs >= 13);
  const gehfaehig = patient.gehfaehig && v.gcs >= 13 && v.systolischerRR >= 90;

  naechster = { ...naechster, spontanatmung, befolgtAufforderungen, gehfaehig };

  if (patient.gehfaehig && !gehfaehig) {
    naechster = protokolliere(
      naechster,
      zeitSek,
      'Patient sackt zusammen und ist nicht mehr gehfähig - Nachsichtung erforderlich.',
    );
  }

  if (istVerstorben(v)) {
    naechster = protokolliere(naechster, zeitSek, 'Keine Vitalfunktionen mehr feststellbar.');
    naechster = { ...naechster, status: 'verstorben' };
  }

  return naechster;
}

/** Zeitbedarf einer Vorsichtung nach mSTaRT (Anschauen, Prüfen, Kategorie vergeben). */
export const SICHTUNGSDAUER_SEK = 20;

/** Zeitbedarf einer körperlichen Untersuchung mit Messung der Vitalwerte. */
export const UNTERSUCHUNGSDAUER_SEK = 30;

/**
 * Rechnet einen Patienten über einen längeren Zeitraum weiter - etwa während
 * eine Maßnahme durchgeführt wird. Der Zeitraum wird in kleine Schritte
 * zerlegt, damit verzögert einsetzende Probleme (`startetNachMin`) nicht
 * übersprungen werden.
 */
export function simuliereZeitraum(
  patient: Patient,
  startSek: number,
  dauerSek: number,
  maxSchrittSek = 5,
): Patient {
  let aktuell = patient;
  let vergangen = 0;
  while (vergangen < dauerSek) {
    const schritt = Math.min(maxSchrittSek, dauerSek - vergangen);
    vergangen += schritt;
    aktuell = simuliereSchritt(aktuell, schritt, startSek + vergangen);
  }
  return aktuell;
}

/** Führt eine Maßnahme durch: löst passende Probleme und wirkt sofort auf die Vitalwerte. */
export function wendeMassnahmeAn(
  patient: Patient,
  massnahmeId: MassnahmeId,
  zeitSek: number,
): Patient {
  if (patient.status === 'verstorben') return patient;

  const massnahme = MASSNAHMEN[massnahmeId];
  const geloest = patient.probleme
    .filter(
      (problem) =>
        !patient.behandelteProbleme.includes(problem.id) &&
        problem.behandeltDurch.includes(massnahmeId),
    )
    .map((problem) => problem.id);

  let naechster: Patient = {
    ...patient,
    vitalwerte: massnahme.sofortEffekt
      ? veraendereVitalwerte(patient.vitalwerte, massnahme.sofortEffekt)
      : patient.vitalwerte,
    behandelteProbleme: [...patient.behandelteProbleme, ...geloest],
    durchgefuehrteMassnahmen: [...patient.durchgefuehrteMassnahmen, massnahmeId],
    status: patient.status === 'transportiert' ? patient.status : 'in_behandlung',
  };

  // Blutstillung und Atemwegsmanagement verändern auch die Sichtungsbefunde.
  if (geloest.length > 0) {
    // x ist im xABCDE-Schema die kritische Blutung.
    if (massnahme.kategorie === 'x') {
      naechster = { ...naechster, kritischeBlutung: false };
    }
    if (massnahme.kategorie === 'A' || massnahme.kategorie === 'B') {
      naechster = { ...naechster, spontanatmung: naechster.vitalwerte.atemfrequenz >= 1 };
    }
  }

  const text =
    geloest.length > 0
      ? `${massnahme.label} - Problem behoben (${geloest.join(', ')}).`
      : `${massnahme.label} - ohne Effekt auf ein bestehendes Problem.`;

  return protokolliere(naechster, zeitSek, text);
}

export function untersuchePatient(patient: Patient, zeitSek: number): Patient {
  if (patient.untersucht) return patient;
  return protokolliere({ ...patient, untersucht: true }, zeitSek, 'Körperliche Untersuchung durchgeführt.');
}

export function sichtePatient(
  patient: Patient,
  kategorie: Sichtungskategorie,
  zeitSek: number,
): Patient {
  const stelle = sichtungsstelleIn(patient.abschnitt);
  const naechster: Patient = {
    ...patient,
    gesichtetAls: kategorie,
    gesichtetUmSek: patient.gesichtetUmSek ?? zeitSek,
    sichtungsverlauf: [...patient.sichtungsverlauf, { stelle, kategorie, zeitSek }],
    status: patient.status === 'unbehandelt' ? 'gesichtet' : patient.status,
  };
  return protokolliere(naechster, zeitSek, `Sichtung (${stelle}): ${kategorie}.`);
}

/** Die Kategorie, die an einer bestimmten Stelle vergeben wurde. */
export function sichtungAn(
  patient: Patient,
  stelle: Sichtungsstelle,
): Sichtungskategorie | null {
  const eintraege = patient.sichtungsverlauf.filter((eintrag) => eintrag.stelle === stelle);
  return eintraege.length > 0 ? eintraege[eintraege.length - 1]!.kategorie : null;
}

/**
 * Verlegt einen Patienten in einen anderen Einsatzabschnitt. Der Abtransport
 * ist die letzte Station - danach verändert sich der Zustand nicht mehr.
 */
export function verlegePatient(
  patient: Patient,
  ziel: Einsatzabschnitt,
  zeitSek: number,
): Patient {
  if (patient.status === 'verstorben' || patient.abschnitt === ziel) return patient;

  const naechster: Patient = {
    ...patient,
    abschnitt: ziel,
    status: ziel === 'transport' ? 'transportiert' : patient.status,
  };
  return protokolliere(naechster, zeitSek, `Verlegung: ${abschnittInfo(ziel).name}.`);
}

/** Summierter Zeitbedarf aller durchgeführten Maßnahmen in Sekunden. */
export function gebundeneZeitSek(patient: Patient): number {
  return patient.durchgefuehrteMassnahmen.reduce(
    (summe, id) => summe + MASSNAHMEN[id].dauerSek,
    0,
  );
}

/**
 * Zeit, die über die lebensrettenden Sofortmaßnahmen hinaus in diesen einen
 * Patienten geflossen ist - das Maß für Individualmedizin im MANV.
 */
export function individualmedizinZeitSek(patient: Patient): number {
  return patient.durchgefuehrteMassnahmen
    .filter((id) => !MASSNAHMEN[id].sofortmassnahme)
    .reduce((summe, id) => summe + MASSNAHMEN[id].dauerSek, 0);
}
