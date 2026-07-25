import { MASSNAHMEN } from './massnahmen';
import type {
  MassnahmeId,
  Patient,
  PatientVorlage,
  Problem,
  Sichtungskategorie,
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
    gesichtetAls: null,
    gesichtetUmSek: null,
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
    if (massnahme.kategorie === 'C') {
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
  const naechster: Patient = {
    ...patient,
    gesichtetAls: kategorie,
    gesichtetUmSek: patient.gesichtetUmSek ?? zeitSek,
    status: patient.status === 'unbehandelt' ? 'gesichtet' : patient.status,
  };
  return protokolliere(naechster, zeitSek, `Sichtung: ${kategorie}.`);
}

export function transportierePatient(patient: Patient, zeitSek: number): Patient {
  if (patient.status === 'verstorben') return patient;
  return protokolliere(
    { ...patient, status: 'transportiert' },
    zeitSek,
    'Patient an Transport übergeben.',
  );
}

/** Summierter Zeitbedarf aller durchgeführten Maßnahmen in Sekunden. */
export function gebundeneZeitSek(patient: Patient): number {
  return patient.durchgefuehrteMassnahmen.reduce(
    (summe, id) => summe + MASSNAHMEN[id].dauerSek,
    0,
  );
}
