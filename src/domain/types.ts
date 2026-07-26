/**
 * Kern-Datenmodell der Dynamischen Patienten-Simulation (DPS).
 *
 * Grundidee: Ein Patient besitzt Vitalparameter und eine Liste offener
 * `Problem`e. Jedes unbehandelte Problem verändert die Vitalparameter pro
 * Minute (siehe `simulation.ts`). Eine passende Maßnahme löst das Problem und
 * stoppt damit die Verschlechterung.
 */

/**
 * Sichtungskategorien nach bundeseinheitlicher Systematik.
 * @anker modell.sichtungskategorien Die vier Sichtungskategorien und EX mit Farbe und Bedeutung
 */
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

/**
 * Messbare Vitalparameter.
 * @anker modell.vitalwerte Welche sechs Messwerte die Simulation führt
 */
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
  /** Blutzucker in mg/dl. */
  blutzucker: number;
  /** Körperkerntemperatur in Grad Celsius. */
  temperatur: number;
  /** Schmerzstärke auf der numerischen Rangskala, 0-10. */
  schmerz: number;
}

export type VitalKey = keyof Vitalwerte;

/**
 * Die sechs Werte, die jede Szenario-Vorlage nennen muss.
 * @anker modell.kernwerte Pflichtwerte einer Vorlage - der Rest wird aufgefüllt
 *
 * Blutzucker, Temperatur und Schmerz sind erst später dazugekommen. Sie sind
 * in der Vorlage freiwillig: fehlen sie, setzt `patientAusVorlage` unauffällige
 * Standardwerte ein. Dadurch bleiben ältere Szenariodateien gültig.
 */
export type KernVitalKey =
  | 'atemfrequenz'
  | 'herzfrequenz'
  | 'systolischerRR'
  | 'spo2'
  | 'gcs'
  | 'rekapzeit';

export type Startwerte = Pick<Vitalwerte, KernVitalKey> &
  Partial<Omit<Vitalwerte, KernVitalKey>>;

/** Pupillenbefund - Ergebnis der Pupillenkontrolle. */
export type Pupillenbefund =
  | 'unauffaellig'
  | 'eng'
  | 'weit'
  | 'seitendifferent'
  | 'entrundet';

export const PUPILLEN_TEXT: Record<Pupillenbefund, string> = {
  unauffaellig: 'mittelweit, seitengleich, prompte Lichtreaktion',
  eng: 'beidseits eng, träge Lichtreaktion',
  weit: 'beidseits weit, kaum Lichtreaktion',
  seitendifferent: 'seitendifferent (Anisokorie)',
  entrundet: 'entrundet, keine Lichtreaktion',
};

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
 * @anker modell.problem Herzstück der Dynamik: Problem -> Vitalwertänderung pro Minute
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
 * @anker modell.abschnitte Die Stationen, die ein Patient durchläuft
 *
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

/**
 * Statische Beschreibung eines Patienten in einem Szenario.
 * @anker modell.patientvorlage Felder, die ein neuer Szenario-Patient braucht
 */
export interface PatientVorlage {
  id: string;
  name: string;
  alter: number;
  geschlecht: 'w' | 'm' | 'd';
  /** Was die Einsatzkraft auf den ersten Blick sieht. */
  kurzbefund: string;
  /** Detailbefund nach körperlicher Untersuchung (Bodycheck). */
  untersuchungsbefund: string;
  gehfaehig: boolean;
  kritischeBlutung: boolean;
  spontanatmung: boolean;
  /** Reagiert auf Ansprache und befolgt Aufforderungen. */
  befolgtAufforderungen: boolean;
  startVitalwerte: Startwerte;
  probleme: Problem[];
  /** Erwartete Sichtungskategorie zum Einsatzbeginn - Referenz für das Debriefing. */
  erwarteteSK: Sichtungskategorie;
  /** Ergebnis der Pupillenkontrolle. Fehlt es, ist der Befund unauffällig. */
  pupillen?: Pupillenbefund;
  /** Auskultationsbefund der Lunge. Fehlt er, ist er seitengleich unauffällig. */
  auskultation?: string;
  /** Rhythmus im Monitoring. Fehlt er, ist es ein Sinusrhythmus. */
  ekg?: string;
}

/**
 * Diagnostische Maßnahmen - jede deckt genau ihren Befund auf.
 * @anker modell.diagnostik Einzelne Untersuchungen statt einer Rundumschau
 */
export type DiagnostikId =
  | 'puls_tasten'
  | 'atemfrequenz_zaehlen'
  | 'rekapzeit_pruefen'
  | 'pupillen_kontrollieren'
  | 'bewusstsein_pruefen'
  | 'schmerz_erfragen'
  | 'blutdruck_messen'
  | 'pulsoxymetrie'
  | 'blutzucker_messen'
  | 'temperatur_messen'
  | 'ekg_monitoring'
  | 'auskultation'
  | 'bodycheck';

/** Was eine Untersuchung aufdecken kann. */
export type Befundschluessel = VitalKey | 'pupillen' | 'auskultation' | 'ekg' | 'koerper';

/** Grobe Einteilung: was ohne Gerät geht, was Technik braucht, was Zeit kostet. */
export type Diagnostikgruppe = 'basis' | 'geraet' | 'koerperlich';

export interface Diagnostik {
  id: DiagnostikId;
  label: string;
  gruppe: Diagnostikgruppe;
  /** Zeitbedarf in Sekunden - läuft für alle Patienten mit. */
  dauerSek: number;
  /** Welche Befunde danach sichtbar sind. */
  zeigt: Befundschluessel[];
}

/**
 * Laufzeitzustand eines Patienten während der Simulation.
 * @anker modell.patient Alles, was sich an einem Patienten im Einsatz ändert
 */
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
  /** Welche Untersuchungen durchgeführt wurden - steuert, was sichtbar ist. */
  durchgefuehrteDiagnostik: DiagnostikId[];
  /** Abkürzung für "Bodycheck erfolgt". */
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
