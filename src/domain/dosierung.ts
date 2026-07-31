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
 * Literatur, gegengelesen gegen die Bestückung RTW Kreis Steinfurt Stand
 * 01.02.2025), aber wie `dauerSek` und `sofortEffekt` im übrigen Katalog eine
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

  // --- Weitere dosisabhängige Medikamente (→ Kreis-Steinfurt-Bestückung) ---
  // Recherchiert wie oben, aber ohne eigene Sammelauswahl - jede Zeile
  // bekommt ihre Dosis-Eingabe einzeln (→ `ui.dosiseingabe`).
  epinephrin: {
    // SAA nennt für die instabile Bradykardie 5-µg-Boli, für Kinder generell
    // 0,01 mg/kg - beides trifft sich bei ca. 0,01 mg/kg als Zielwert (1 mg
    // beim ca. 80-100 kg schweren Erwachsenen liegt in derselben Größenordnung).
    // Überdosierung: rasche hypertensive Krise mit Tachyarrhythmie statt der
    // erwünschten dosierten Kreislaufunterstützung (Rn/Ren 2023 Fallbericht;
    // ISMP-Fehlerberichte zu Verwechslungen der Reanimations- mit der
    // Bradykardie-Dosis).
    minMgProKg: 0.003,
    zielMgProKg: 0.01,
    maxMgProKg: 0.02,
    toxischerEffekt: { systolischerRR: 35, herzfrequenz: 35, gcs: -2 },
  },
  amiodaron: {
    // SAA: 300 mg nach dem 3., 150 mg nach dem 5. Schock; Kinder 5 mg/kg. Beim
    // durchschnittlich schweren Erwachsenen deckt sich das mit ca. 4 mg/kg.
    // Überdosierung/zu schnelle Gabe: Hypotonie und Bradykardie dominieren
    // (Infusionsgeschwindigkeit ist der Haupttreiber, nicht allein die Menge -
    // PMC4867816, PMC9199562) - kein eigener sofortEffekt im Katalog, die
    // Überdosierung bringt trotzdem einen Schadeffekt.
    minMgProKg: 1,
    zielMgProKg: 4,
    maxMgProKg: 6,
    maxEinzeldosisMg: 300,
    toxischerEffekt: { systolischerRR: -25, herzfrequenz: -20 },
  },
  lidocain: {
    // SAA-Zieldosis (100 mg bzw. 1 mg/kg) deckt sich mit dem Literaturwert für
    // den Beginn systemischer Lokalanästhetika-Toxizität (LAST) von ca.
    // 4,5 mg/kg bei Infiltration - für die i.v.-Bolusgabe hier vorsichtiger
    // auf 3 mg/kg angesetzt. LAST beginnt neurologisch (Kribbeln, Unruhe,
    // Krampfneigung) und geht bei mehr Dosis in kardiale Depression über -
    // im Spiel als GCS- und Kreislaufabfall zusammengefasst (EMCrit IBCC LAST).
    minMgProKg: 0.3,
    zielMgProKg: 1,
    maxMgProKg: 3,
    maxEinzeldosisMg: 100,
    toxischerEffekt: { gcs: -3, herzfrequenz: -15, systolischerRR: -15 },
  },
  atropin: {
    // SAA gibt eine feste Erwachsenendosis (0,5 mg, Wiederholung bis max. 3 mg)
    // ohne Gewichtsbezug - hier für die Spielmechanik auf den Steinfurt-
    // Referenzerwachsenen (78 kg) umgerechnet. Das SAA-eigene Limit von 3 mg
    // liegt bewusst unterhalb der Literaturschwelle für das anticholinerge
    // Syndrom (ca. 5-10 mg) - wer die Wiederholungsgrenze der SAA überschreitet,
    // bekommt im Spiel schon die beginnende Symptomatik (Tachykardie, Unruhe/
    // Verwirrtheit), nicht erst das volle Vollbild.
    minMgProKg: 0.002,
    zielMgProKg: 0.0064,
    maxMgProKg: 0.035,
    maxEinzeldosisMg: 3,
    toxischerEffekt: { herzfrequenz: 25, gcs: -2 },
  },
  metoprolol: {
    // SAA: feste Erwachsenendosis (2 mg, Wiederholung bis max. 5 mg), auch
    // hier auf 78 kg umgerechnet. Überdosierung: die gefürchtete Trias aus
    // Bradykardie, Hypotonie und Bewusstseinstrübung durch Low-Output
    // (Medscape Beta-Blocker Toxicity; LITFL).
    minMgProKg: 0.01,
    zielMgProKg: 0.026,
    maxMgProKg: 0.06,
    maxEinzeldosisMg: 5,
    toxischerEffekt: { herzfrequenz: -25, systolischerRR: -25, gcs: -2 },
  },
  midazolam: {
    // SAA-Zielwert für den Krampfanfall (0,1 mg/kg) ist die einzige echte
    // mg/kg-Angabe im Katalog - die übrigen Routen (Analgosedierung) sind
    // fixe Kleinstdosen. Perioperative Induktionsdosen bis 0,3-0,4 mg/kg
    // (FDA-Fachinfo) markieren die Überdosierungsschwelle. Atemdepression bis
    // zum Atemstillstand ist die dominante Gefahr, besonders in Kombination
    // mit Opioiden.
    minMgProKg: 0.03,
    zielMgProKg: 0.1,
    maxMgProKg: 0.3,
    maxEinzeldosisMg: 20,
    toxischerEffekt: { atemfrequenz: -6, gcs: -4, spo2: -4 },
  },
  diazepam_rektal: {
    // SAA gibt zwei Gewichtsbänder (5 mg bis 15 kg, 10 mg ab 15 kg) statt
    // eines mg/kg-Werts - der Zielwert hier ist der Mittelwert dieser Bänder.
    // Gleiches Wirkprofil wie Midazolam (Benzodiazepin), rektal etwas
    // verzögerter, deshalb dieselbe Atemdepression, nur eine Stufe milder.
    minMgProKg: 0.15,
    zielMgProKg: 0.4,
    maxMgProKg: 0.8,
    maxEinzeldosisMg: 10,
    toxischerEffekt: { atemfrequenz: -5, gcs: -3, spo2: -3 },
  },
  naloxon: {
    // Naloxon selbst ist pharmakologisch bemerkenswert ungiftig - das
    // eigentliche "Überdosierungs"-Risiko ist die präzipitierte Entzugsreaktion
    // bei Opioidabhängigkeit: Sympathikus-Sturm mit Tachykardie, Hypertonie und
    // Unruhe statt Organtoxizität (PMC11089786) - ein lehrreicher Kontrast zu
    // den übrigen Medikamenten dieser Liste. SAA-Zielwert (0,01 mg/kg Kinder,
    // fraktioniert 0,1 mg beim Erwachsenen) als mg/kg-Basis übernommen.
    minMgProKg: 0.002,
    zielMgProKg: 0.01,
    maxMgProKg: 0.03,
    toxischerEffekt: { herzfrequenz: 20, systolischerRR: 15, schmerz: 3 },
  },
  nitrat: {
    // SAA kennt nur den Hub (0,4 mg, eine Wiederholung) ohne Gewichtsbezug -
    // hier auf den Referenzerwachsenen (78 kg) umgerechnet. Die gefürchtete
    // Überdosierungsreaktion ist nicht die erwartbare Reflextachykardie,
    // sondern paradox oft Hypotonie MIT Bradykardie (Bezold-Jarisch-Reflex,
    // AHA Circulation 54:624) - deshalb hier bewusst keine Herzfrequenz-
    // Erhöhung, sondern eine Senkung.
    minMgProKg: 0.002,
    zielMgProKg: 0.005,
    maxMgProKg: 0.01,
    maxEinzeldosisMg: 0.8,
    toxischerEffekt: { systolischerRR: -35, herzfrequenz: -15 },
  },
  urapidil: {
    // SAA: 5 mg, Wiederholung bis max. 25 mg, ohne Gewichtsbezug - auf den
    // Referenzerwachsenen (78 kg) umgerechnet. Anders als bei klassischen
    // Alpha-Blockern bleibt die Reflextachykardie aus (zentrale 5-HT1A-
    // Wirkkomponente) - bei Überdosierung fällt der Druck stärker, ohne dass
    // die Herzfrequenz gegensteuert, ein lehrreicher Kontrast zu Nitrat oben.
    minMgProKg: 0.02,
    zielMgProKg: 0.064,
    maxMgProKg: 0.32,
    maxEinzeldosisMg: 25,
    toxischerEffekt: { systolischerRR: -35 },
  },
  furosemid: {
    // SAA: 20 mg, eine Wiederholung nach 15 min, ohne Gewichtsbezug - auf den
    // Referenzerwachsenen (78 kg) umgerechnet. Überdosierung wirkt über
    // Volumenmangel: Hypotonie mit kompensatorischer Tachykardie und
    // verlängerter Rekapillarisierung, keine Organtoxizität im Spielzeitfenster
    // (Furosemid-Fachinfo Overdosage).
    minMgProKg: 0.1,
    zielMgProKg: 0.26,
    maxMgProKg: 0.5,
    maxEinzeldosisMg: 40,
    toxischerEffekt: { systolischerRR: -15, herzfrequenz: 15, rekapzeit: 0.5 },
  },

  // --- Notfallnarkose (RSI, → `NOTFALLNARKOSE`) -----------------------
  // Handlungsempfehlung zur prähospitalen Notfallnarkose beim Erwachsenen
  // (DGAI/BAND, Notfall+Rettungsmedizin): Esketamin 80 mg, Thiopental 300 mg
  // oder Propofol 150 mg zur Einleitung beim ca. 78 kg schweren
  // Referenzerwachsenen. Je instabiler der Patient, desto eher Esketamin
  // statt Propofol/Thiopental - deshalb tragen die therapeutischen Effekte
  // hier bewusst schon bei Zieldosis den realen hämodynamischen Unterschied
  // (Propofol/Thiopental leicht kreislaufdepressiv, Esketamin stützend), nicht
  // erst bei Überdosierung - genau das macht die Medikamentenwahl zur echten
  // Entscheidung statt einer reinen Dosisrechnung.
  propofol: {
    minMgProKg: 1,
    zielMgProKg: 1.9,
    maxMgProKg: 3,
    maxEinzeldosisMg: 150,
    toxischerEffekt: { systolischerRR: -20, herzfrequenz: -10, atemfrequenz: -3 },
  },
  thiopental: {
    minMgProKg: 2,
    zielMgProKg: 3.85,
    maxMgProKg: 6,
    maxEinzeldosisMg: 300,
    toxischerEffekt: { systolischerRR: -20, herzfrequenz: -8, atemfrequenz: -4 },
  },
  esketamin_narkose: {
    // Eigene Referenz getrennt von `esketamin` (Analgetikum, 0,0625-0,5 mg/kg) -
    // die Narkosedosis liegt deutlich höher, und eine Überdosierung bedeutet
    // hier überschießende Hypertonie/Tachykardie statt der bei der
    // Schmerztherapie unerwünschten Dissoziation.
    minMgProKg: 0.5,
    zielMgProKg: 1.2,
    maxMgProKg: 2.5,
    maxEinzeldosisMg: 80,
    toxischerEffekt: { herzfrequenz: 20, systolischerRR: 25, gcs: -2 },
  },
  rocuronium: {
    // RSI-Dosis 1,2 mg/kg gut belegt; die reale Sicherheitsspanne ist enorm
    // (kardiale Symptome laut Literatur erst ab ca. 135 mg/kg) - eine
    // Überdosierung verschwendet Medikament und verlängert die Lähmung
    // unnötig, ohne zusätzliche Organtoxizität. Deshalb kein toxischerEffekt,
    // dieselbe Ceiling-Logik wie bei Nalbuphin oben.
    minMgProKg: 0.6,
    zielMgProKg: 1.2,
    maxMgProKg: 3,
  },
};

/**
 * @anker domain.dosierbar Alle Medikamente mit eigener Dosis-Eingabe
 *
 * Vereinigt die Analgesie-Sammelauswahl (→ `ANALGETIKA`) mit den übrigen
 * Katalog-Medikamenten, die eine eigene Dosisreferenz haben. Steuert, welche
 * Maßnahmenzeile in `Massnahmenliste` statt eines direkten Klicks die
 * Dosis-Eingabe öffnet (→ `ui.dosiseingabe`).
 */
export function hatDosisreferenz(massnahmeId: MassnahmeId): boolean {
  return massnahmeId in DOSISREFERENZ;
}

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
 * @anker domain.notfallnarkose_liste Die drei Induktionsmittel der Notfallnarkose-Sammelauswahl
 *
 * Zur Auswahl in der ersten Stufe der Notfallnarkose-Sammelauswahl
 * (→ `ui.notfallnarkoseauswahl`) - jedes davon `benoetigtTeam: true`
 * (→ `modell.notfallnarkose`). Rocuronium (zweite Stufe) steht bewusst nicht
 * hier, sondern wird erst sichtbar, sobald eines dieser drei Mittel gegeben
 * wurde (→ `rocuronium.benoetigtEinesVon`).
 */
export const NOTFALLNARKOSE_INDUKTION: MassnahmeId[] = [
  'propofol',
  'thiopental',
  'esketamin_narkose',
];

/** Alle vier Notfallnarkose-Maßnahmen - für den Zeilenfilter in `Massnahmenliste`. */
export const NOTFALLNARKOSE: MassnahmeId[] = [...NOTFALLNARKOSE_INDUKTION, 'rocuronium'];

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
