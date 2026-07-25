/**
 * Kern-Datenmodell der Dynamischen Patienten-Simulation (DPS).
 *
 * Grundidee: Ein Patient besitzt Vitalparameter und eine Liste offener
 * `Problem`e. Jedes unbehandelte Problem verändert die Vitalparameter pro
 * Minute (siehe `simulation.ts`). Eine passende Maßnahme löst das Problem und
 * stoppt damit die Verschlechterung.
 */

/** Sichtungskategorien nach bundeseinheitlicher Systematik. */
export type Sichtungskategorie = 'SK1' | 'SK2' | 'SK3' | 'SK4' | 'EX';

export interface SichtungskategorieInfo {
  kuerzel: string;
  farbe: string;
  bezeichnung: string;
  behandlung: string;
}

export const SICHTUNGSKATEGORIEN: Record<Sichtungskategorie, SichtungskategorieInfo> = {
  SK1: {
    kuerzel: 'I',
    farbe: 'rot',
    bezeichnung: 'Akute vitale Bedrohung',
    behandlung: 'Sofortbehandlung',
  },
  SK2: {
    kuerzel: 'II',
    farbe: 'gelb',
    bezeichnung: 'Schwer verletzt / erkrankt',
    behandlung: 'Aufgeschobene Behandlungsdringlichkeit',
  },
  SK3: {
    kuerzel: 'III',
    farbe: 'gruen',
    bezeichnung: 'Leicht verletzt / erkrankt',
    behandlung: 'Spätere (ambulante) Behandlung',
  },
  SK4: {
    kuerzel: 'IV',
    farbe: 'blau',
    bezeichnung: 'Ohne Überlebenschance',
    behandlung: 'Betreuende (abwartende) Behandlung',
  },
  EX: {
    kuerzel: 'EX',
    farbe: 'schwarz',
    bezeichnung: 'Verstorben',
    behandlung: 'Kennzeichnung, keine Maßnahmen',
  },
};

/** Messbare Vitalparameter. Alle Werte sind gerundete Momentanwerte. */
export interface Vitalwerte {
  /** Atemfrequenz pro Minute. */
  atemfrequenz: number;
  /** Herzfrequenz pro Minute. */
  herzfrequenz: number;
  /** Systolischer Blutdruck in mmHg. */
  systolischerRR: number;
  /** Periphere Sauerstoffsättigung in Prozent. */
  spo2: number;
  /** Glasgow Coma Scale, 3-15. */
  gcs: number;
  /** Rekapillarisierungszeit in Sekunden. */
  rekapzeit: number;
}

export type VitalKey = keyof Vitalwerte;

/** Veränderung von Vitalparametern pro Minute. */
export type VitalVerlauf = Partial<Record<VitalKey, number>>;

/**
 * xABCDE-Schema. Das vorangestellte x steht für die kritische Blutung, die
 * vor allem anderen gestillt wird.
 */
export type MassnahmenKategorie = 'x' | 'A' | 'B' | 'C' | 'D' | 'E';

export type MassnahmeId =
  | 'atemwege_freimachen'
  | 'guedeltubus'
  | 'intubation'
  | 'sauerstoffgabe'
  | 'beatmung'
  | 'thoraxentlastung'
  | 'blutstillung'
  | 'tourniquet'
  | 'beckenschlinge'
  | 'volumengabe'
  | 'schocklage'
  | 'analgesie'
  | 'immobilisation'
  | 'waermeerhalt'
  | 'betreuung';

export interface Massnahme {
  id: MassnahmeId;
  label: string;
  kategorie: MassnahmenKategorie;
  /** Zeitbedarf in Sekunden - fließt in die Auswertung des Debriefings ein. */
  dauerSek: number;
  hinweis: string;
  /** Einmalige Verbesserung der Vitalwerte direkt nach Durchführung. */
  sofortEffekt?: VitalVerlauf;
  /**
   * Lebensrettende Sofortmaßnahme im Sinne der Vorsichtung: nur kritische
   * Blutung und Atemweg. Alles andere ist Individualmedizin und gehört im
   * MANV erst auf den Behandlungsplatz.
   */
  sofortmassnahme?: boolean;
}

/**
 * Ein pathophysiologisches Problem des Patienten.
 * Solange es nicht behandelt ist, wirkt `verlauf` pro Minute auf die Vitalwerte.
 */
export interface Problem {
  id: string;
  label: string;
  /** Wird dem Übenden erst nach Untersuchung angezeigt. */
  beschreibung: string;
  /** Jede dieser Maßnahmen löst das Problem. */
  behandeltDurch: MassnahmeId[];
  verlauf: VitalVerlauf;
  /** Problem wird erst ab dieser Einsatzminute wirksam (z. B. Spannungspneu). */
  startetNachMin?: number;
}

/**
 * Einsatzabschnitte, die ein Patient nacheinander durchläuft:
 * Schadensstelle -> Eingangssichtung -> Behandlungsplatz (Zelt nach
 * Sichtungskategorie) -> Ausgangssichtung -> Abtransport.
 */
export type Einsatzabschnitt =
  | 'schadensstelle'
  | 'eingangssichtung'
  | 'zelt_rot'
  | 'zelt_gelb'
  | 'zelt_gruen'
  | 'ausgangssichtung'
  | 'transport';

/** An welcher Stelle im Ablauf eine Sichtungsentscheidung gefallen ist. */
export type Sichtungsstelle =
  | 'vorsichtung'
  | 'eingangssichtung'
  | 'nachsichtung'
  | 'ausgangssichtung';

export interface Sichtungseintrag {
  stelle: Sichtungsstelle;
  kategorie: Sichtungskategorie;
  zeitSek: number;
}

export type PatientStatus =
  | 'unbehandelt'
  | 'gesichtet'
  | 'in_behandlung'
  | 'transportiert'
  | 'verstorben';

export interface Verlaufseintrag {
  zeitSek: number;
  text: string;
}

/** Statische Beschreibung eines Patienten in einem Szenario. */
export interface PatientVorlage {
  id: string;
  name: string;
  alter: number;
  geschlecht: 'w' | 'm' | 'd';
  /** Was die Einsatzkraft auf den ersten Blick sieht. */
  kurzbefund: string;
  /** Detailbefund nach körperlicher Untersuchung. */
  untersuchungsbefund: string;
  gehfaehig: boolean;
  kritischeBlutung: boolean;
  spontanatmung: boolean;
  /** Reagiert auf Ansprache und befolgt Aufforderungen. */
  befolgtAufforderungen: boolean;
  startVitalwerte: Vitalwerte;
  probleme: Problem[];
  /** Erwartete Sichtungskategorie zum Einsatzbeginn - Referenz für das Debriefing. */
  erwarteteSK: Sichtungskategorie;
}

/** Laufzeitzustand eines Patienten während der Simulation. */
export interface Patient extends PatientVorlage {
  vitalwerte: Vitalwerte;
  status: PatientStatus;
  /** Aktueller Aufenthaltsort im Einsatz. */
  abschnitt: Einsatzabschnitt;
  /** Zuletzt gültige Sichtungskategorie, unabhängig davon, wo sie fiel. */
  gesichtetAls: Sichtungskategorie | null;
  gesichtetUmSek: number | null;
  /** Jede Sichtungsentscheidung mit Ort und Zeitpunkt. */
  sichtungsverlauf: Sichtungseintrag[];
  /** IDs bereits gelöster Probleme. */
  behandelteProbleme: string[];
  durchgefuehrteMassnahmen: MassnahmeId[];
  untersucht: boolean;
  verlauf: Verlaufseintrag[];
}

export interface Szenario {
  id: string;
  titel: string;
  lagemeldung: string;
  /** Kurze Einsatzbeschreibung für die Übungsleitung. */
  einsatzhinweis: string;
  patienten: PatientVorlage[];
}
