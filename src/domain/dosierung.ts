import type { MassnahmeId, PatientVorlage, VitalVerlauf } from './types';

/**
 * @anker domain.dosierung Gewichtsbezogene Dosierung: zu wenig wirkt nicht, zu viel schadet
 *
 * Für die sechs Analgetika (→ `ANALGETIKA`) ist die Wirkung nicht mehr fest im
 * Katalog hinterlegt, sondern hängt von der gewählten Dosis (mg) und dem
 * Körpergewicht des Patienten ab: unterhalb der Mindestdosis passiert nichts,
 * oberhalb der Überdosierungsschwelle kommt zur eigentlichen Wirkung ein
 * Schadeffekt hinzu (bei Nalbuphin und Paracetamol/Ibuprofen bewusst nicht -
 * siehe die Kommentare je Eintrag).
 *
 * Referenzwerte sind recherchiert (SAA/BPR 2025, FDA-Fachinfo, Toxikologie-
 * Literatur), aber wie `dauerSek` und `sofortEffekt` im übrigen Katalog eine
 * Stellschraube der Übung, keine medizinische Dosierungsempfehlung - siehe die
 * Vereinfachungen in DOKUMENTATION.md. Wo die Literatur keinen scharfen
 * Grenzwert liefert (Opioide werden klinisch titriert, nicht nach starrem
 * mg/kg-Wert), ist das im jeweiligen Kommentar offengelegt statt eine
 * Genauigkeit vorzutäuschen, die es nicht gibt.
 */
export interface Dosisreferenz {
  /** Unterhalb dieser Dosis: keine relevante Wirkung. */
  minMgProKg: number;
  /** Übliche Einzeldosis - die Wirkung, die der Katalog als `sofortEffekt` hinterlegt. */
  zielMgProKg: number;
  /** Ab dieser Dosis beginnt die Überdosierung. */
  maxMgProKg: number;
  /** Harter Deckel unabhängig vom Gewicht, falls die Quelle einen kennt. */
  maxEinzeldosisMg?: number;
  /**
   * Zusätzliche Wirkung bei Überdosierung, zur eigentlichen `sofortEffekt`
   * addiert. Fehlt sie, hat eine Überdosierung keine zusätzliche Vitalwirkung
   * (Nalbuphin: Ceiling-Effekt ist selbst der Sicherheitsmechanismus;
   * Paracetamol: Hepatotoxizität ist mit 24-72 h verzögert, im
   * Übungszeitfenster nicht abbildbar).
   */
  toxischerEffekt?: VitalVerlauf;
}

export const DOSISREFERENZ: Partial<Record<MassnahmeId, Dosisreferenz>> = {
  morphin: {
    // Kein publizierter fester mg/kg-Schwellenwert (Opioide werden klinisch
    // titriert) - min/Ziel/max sind die SAA-Einzeldosis (0,05-0,1 mg/kg) samt
    // Sicherheitsabstand nach unten und oben.
    minMgProKg: 0.03,
    zielMgProKg: 0.075,
    maxMgProKg: 0.15,
    maxEinzeldosisMg: 10,
    toxischerEffekt: { atemfrequenz: -6, herzfrequenz: -10, systolischerRR: -10, gcs: -3 },
  },
  fentanyl: {
    // Ziel 1-2 µg/kg (SAA). Die reale Thoraxrigidität setzt laut Literatur
    // erst deutlich höher ein (~12-15 µg/kg) - dieser Schwellenwert ist für
    // die Übung didaktisch verdichtet, damit eine Überdosierung im Spiel
    // überhaupt erreichbar bleibt, nicht weil die Literatur ihn so nennt.
    minMgProKg: 0.0005,
    zielMgProKg: 0.0015,
    maxMgProKg: 0.003,
    toxischerEffekt: { atemfrequenz: -8, herzfrequenz: -8, gcs: -3 },
  },
  nalbuphin: {
    // Ceiling-Effekt bei ca. 0,43-0,45 mg/kg (Romagnoli & Keats 1980): mehr
    // Nalbuphin bringt weder mehr Analgesie noch mehr Atemdepression - der
    // Ceiling-Effekt IST der Sicherheitsmechanismus. Deshalb kein toxischerEffekt.
    minMgProKg: 0.05,
    zielMgProKg: 0.15,
    maxMgProKg: 0.45,
    maxEinzeldosisMg: 20,
  },
  esketamin: {
    // 0,125-0,25 mg/kg i.v. ist der analgetische Bereich; ab ca. 0,5 mg/kg
    // beginnt die dissoziative/anästhetische Wirkung - ungewollt bei reiner
    // Schmerztherapie. Anders als bei den Opioiden steigen HF/RR eher, statt
    // zu fallen - ein lehrreicher Kontrast zur Opioid-Überdosierung.
    minMgProKg: 0.0625,
    zielMgProKg: 0.1875,
    maxMgProKg: 0.5,
    toxischerEffekt: { herzfrequenz: 15, systolischerRR: 20, gcs: -4 },
  },
  paracetamol: {
    // Akute Überdosierung ist im präklinischen Zeitfenster klinisch stumm -
    // die Hepatotoxizität ist mit 24-72 h verzögert (Tandfonline 2023,
    // PMC3269587). Deshalb kein toxischerEffekt; die Übertretung bleibt
    // trotzdem falsch dosiert und wird als solche protokolliert.
    minMgProKg: 7.5,
    zielMgProKg: 15,
    maxMgProKg: 30,
    maxEinzeldosisMg: 1000,
  },
  ibuprofen: {
    // Relevante akute Symptome laut StatPearls/LITFL erst ab ca. 300 mg/kg -
    // ein großer, aber realer Sicherheitsabstand zur Zieldosis (7,5 mg/kg).
    minMgProKg: 3.75,
    zielMgProKg: 7.5,
    maxMgProKg: 300,
    maxEinzeldosisMg: 600,
    toxischerEffekt: { gcs: -2, atemfrequenz: -2, systolischerRR: -8 },
  },
};

/**
 * @anker domain.analgetika Die sechs Mittel der Analgesie-Sammelauswahl
 *
 * Nur echte Schmerzmittel - Butylscopolamin (Spasmolytikum) und Midazolam
 * (Sedativum/Antikonvulsivum) wirken zwar an der Schmerzbehandlung mit, sind
 * aber keine Analgetika im engeren Sinn und bleiben eigene, einzelne
 * Maßnahmen im Katalog.
 */
export const ANALGETIKA: MassnahmeId[] = [
  'morphin',
  'fentanyl',
  'nalbuphin',
  'esketamin',
  'paracetamol',
  'ibuprofen',
];

/**
 * @anker domain.gewicht Körpergewicht - hinterlegt oder geschätzt
 *
 * Kinder bis 14 Jahre nach der APLS-Faustregel `(Alter + 4) × 2`; ab 15 Jahren
 * der Destatis-Mikrozensus-Durchschnitt nach Geschlecht. Dieselbe Idee wie
 * `STANDARD_ZUSATZWERTE`/`startwert()` in `simulation.ts`: eine unauffällige,
 * plausible Vorgabe, keine präzise Schätzung - wer es genauer will, trägt
 * `gewicht` im Szenario ein.
 */
export function geschaetztesGewicht(alter: number, geschlecht: PatientVorlage['geschlecht']): number {
  if (alter <= 14) return (alter + 4) * 2;
  if (geschlecht === 'm') return 86.5;
  if (geschlecht === 'w') return 69.7;
  return 78;
}

export function gewichtVon(
  patient: Pick<PatientVorlage, 'gewicht' | 'alter' | 'geschlecht'>,
): number {
  return patient.gewicht ?? geschaetztesGewicht(patient.alter, patient.geschlecht);
}

/** Zieldosis in mg für dieses Gewicht - Vorbelegung für die Dosis-Eingabe. */
export function empfohleneDosisMg(massnahmeId: MassnahmeId, gewichtKg: number): number {
  const ref = DOSISREFERENZ[massnahmeId];
  if (!ref) return 0;
  const dosis = ref.zielMgProKg * gewichtKg;
  return ref.maxEinzeldosisMg ? Math.min(dosis, ref.maxEinzeldosisMg) : dosis;
}

export type Dosisstufe = 'unterdosiert' | 'therapeutisch' | 'ueberdosiert';

export function bewerteDosis(
  massnahmeId: MassnahmeId,
  dosisMg: number,
  gewichtKg: number,
): Dosisstufe {
  const ref = DOSISREFERENZ[massnahmeId];
  if (!ref) return 'therapeutisch';
  const mgProKg = dosisMg / gewichtKg;
  if (mgProKg < ref.minMgProKg) return 'unterdosiert';
  if (mgProKg > ref.maxMgProKg) return 'ueberdosiert';
  return 'therapeutisch';
}

function kombiniereEffekte(a: VitalVerlauf | undefined, b: VitalVerlauf): VitalVerlauf {
  const kombiniert: VitalVerlauf = { ...a };
  for (const [schluessel, wert] of Object.entries(b)) {
    const key = schluessel as keyof VitalVerlauf;
    kombiniert[key] = (kombiniert[key] ?? 0) + wert;
  }
  return kombiniert;
}

function skaliere(effekt: VitalVerlauf, faktor: number): VitalVerlauf {
  return Object.fromEntries(
    Object.entries(effekt).map(([schluessel, wert]) => [schluessel, wert * faktor]),
  );
}

export interface DosisErgebnis {
  stufe: Dosisstufe;
  /** Tatsächlich anzuwendende Vitalwert-Änderung - `null` heißt: keine. */
  effekt: VitalVerlauf | null;
  /** Ob die Maßnahme das zugeordnete Problem lösen darf. */
  loestProblem: boolean;
}

/**
 * Verrechnet die Katalog-Wirkung (`basisEffekt`, meist die Ziel-Dosis-Wirkung)
 * mit der tatsächlich gewählten Dosis. Unterdosiert: keine Wirkung, kein
 * gelöstes Problem - "ohne Effekt" heißt wirklich ohne Effekt. Überdosiert:
 * die Katalog-Wirkung bleibt (das Mittel wirkt ja auch), dazu kommt der
 * `toxischerEffekt`, linear zwischen 1× und 2× skaliert je nachdem, wie weit
 * die Dosis über der Schwelle liegt (gedeckelt, damit eine Zahleneingabe kein
 * beliebig extremes Ergebnis erzeugt).
 */
export function wirkungBeiDosis(
  massnahmeId: MassnahmeId,
  basisEffekt: VitalVerlauf | undefined,
  dosisMg: number,
  gewichtKg: number,
): DosisErgebnis {
  const ref = DOSISREFERENZ[massnahmeId];
  if (!ref) return { stufe: 'therapeutisch', effekt: basisEffekt ?? null, loestProblem: true };

  const stufe = bewerteDosis(massnahmeId, dosisMg, gewichtKg);
  if (stufe === 'unterdosiert') return { stufe, effekt: null, loestProblem: false };
  if (stufe === 'therapeutisch') {
    return { stufe, effekt: basisEffekt ?? null, loestProblem: true };
  }

  // ueberdosiert
  if (!ref.toxischerEffekt) return { stufe, effekt: basisEffekt ?? null, loestProblem: true };
  const mgProKg = dosisMg / gewichtKg;
  const faktor = Math.min(2, 1 + (mgProKg - ref.maxMgProKg) / ref.maxMgProKg);
  const toxisch = skaliere(ref.toxischerEffekt, faktor);
  return { stufe, effekt: kombiniereEffekte(basisEffekt, toxisch), loestProblem: true };
}
