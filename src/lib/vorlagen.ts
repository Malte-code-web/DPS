import { geschaetztesGewicht } from '../domain/dosierung';
import type { PatientVorlage, Problem, Szenario } from '../domain/types';

/**
 * @anker vorlagen.neu Startpunkte für neue Szenarien, Patienten und Probleme
 *
 * Die Werte sind bewusst so gewählt, dass ein frisch angelegter Patient die
 * Prüfung besteht: unauffällige Vitalwerte, nicht gehfähig, damit mSTaRT
 * SK II ergibt.
 */

export function leeresSzenario(id: string): Szenario {
  return {
    id,
    titel: 'Neues Szenario',
    lagemeldung: 'Beschreibe hier, was die Einsatzkräfte beim Eintreffen erfahren.',
    einsatzhinweis: 'Hinweis für die Übungsleitung: worauf kommt es in dieser Lage an?',
    patienten: [leererPatient(1)],
  };
}

export function leererPatient(nummer: number): PatientVorlage {
  return {
    id: `P-${String(nummer).padStart(2, '0')}`,
    name: 'Unbekannt',
    alter: 40,
    geschlecht: 'd',
    gewicht: geschaetztesGewicht(40, 'd'),
    kurzbefund: 'Was man auf den ersten Blick sieht.',
    untersuchungsbefund: 'Was die körperliche Untersuchung ergibt.',
    gehfaehig: false,
    kritischeBlutung: false,
    spontanatmung: true,
    befolgtAufforderungen: true,
    startVitalwerte: {
      atemfrequenz: 18,
      herzfrequenz: 88,
      systolischerRR: 120,
      spo2: 97,
      gcs: 15,
      rekapzeit: 1.5,
    },
    probleme: [],
    erwarteteSK: 'SK2',
  };
}

export function leeresProblem(nummer: number): Problem {
  return {
    id: `problem-${nummer}`,
    label: 'Neues Problem',
    // Ein Befund, keine Anweisung (→ kiPrompt.ts, Regel 8) - dieselbe
    // Beobachtungs-Perspektive wie kurzbefund/untersuchungsbefund oben.
    beschreibung: 'Was die Einsatzkraft vorfindet.',
    behandeltDurch: ['sauerstoffgabe'],
    verlauf: { spo2: -1 },
  };
}

/** Nächste freie Patienten-ID innerhalb eines Szenarios. */
export function naechstePatientenNummer(szenario: Szenario): number {
  const nummern = szenario.patienten
    .map((patient) => Number.parseInt(patient.id.replace(/\D/g, ''), 10))
    .filter((nummer) => Number.isFinite(nummer));
  return nummern.length === 0 ? 1 : Math.max(...nummern) + 1;
}

/**
 * Nächste freie Problem-ID innerhalb eines Patienten - wie
 * `naechstePatientenNummer`, sonst kollidiert eine neue ID mit einer
 * verbliebenen, wenn zwischendurch ein Problem gelöscht wurde (`length + 1`
 * träfe dann erneut eine bestehende Nummer).
 */
export function naechsteProblemNummer(probleme: Problem[]): number {
  const nummern = probleme
    .map((problem) => Number.parseInt(problem.id.replace(/\D/g, ''), 10))
    .filter((nummer) => Number.isFinite(nummer));
  return nummern.length === 0 ? 1 : Math.max(...nummern) + 1;
}
