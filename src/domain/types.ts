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
  // Basismaßnahmen - kein invasiver Eingriff, keine Medikamente
  | 'mundraumkontrolle'
  | 'atemwege_freimachen'
  | 'absaugen_oral'
  | 'guedeltubus'
  | 'beatmung'
  | 'blutstillung'
  | 'schocklage'
  | 'immobilisation'
  | 'waermeerhalt'
  | 'betreuung'
  // SAA - invasive Maßnahmen
  | 'zugang_iv'
  | 'zugang_io'
  | 'larynxmaske'
  | 'laryngoskopie'
  | 'cpap_niv'
  | 'tourniquet'
  | 'beckenschlinge'
  | 'achsengerechte_immobilisation'
  | 'thoraxentlastung'
  | 'defibrillation'
  | 'kardioversion'
  | 'schrittmacher'
  | 'absaugen_endobronchial'
  | 'injektion_im'
  | 'gabe_intranasal'
  // SAA - Medikamente
  | 'sauerstoffgabe'
  | 'ass'
  | 'amiodaron'
  | 'atropin'
  | 'butylscopolamin'
  | 'dimenhydrinat'
  | 'dimetinden'
  | 'epinephrin'
  | 'esketamin'
  | 'furosemid'
  | 'glucose'
  | 'nitrat'
  | 'heparin'
  | 'ipratropium'
  | 'lidocain'
  | 'metoprolol'
  | 'midazolam'
  | 'morphin'
  | 'naloxon'
  | 'paracetamol'
  | 'prednisolon'
  | 'salbutamol'
  | 'thiamin'
  | 'tranexamsaeure'
  | 'urapidil'
  | 'volumengabe'
  // Ärztliche Maßnahme, nicht von der SAA gedeckt
  | 'intubation'
  // Sammelbegriff aus der ersten Fassung - siehe massnahmen.veraltet
  | 'analgesie';

/**
 * Wer eine Maßnahme im Regeldienst eigenverantwortlich durchführen darf.
 * @anker modell.qualifikation Basis, Notfallsanitäter nach SAA, Notärztin
 *
 * Im MANV ist das keine Formalie: Notärztinnen sind die knappste Ressource
 * überhaupt. Eine Maßnahme, die nur sie durchführen dürfen, bindet die eine
 * Kraft, die an mehreren Stellen gleichzeitig gebraucht wird.
 */
export type Qualifikation = 'basis' | 'notsan' | 'notarzt';

/** Handgriff, invasiver Eingriff oder Medikament. */
export type Massnahmenart = 'basis' | 'invasiv' | 'medikament';

export interface Massnahme {
  id: MassnahmeId;
  label: string;
  kategorie: MassnahmenKategorie;
  /** Zeitbedarf in Sekunden - fließt in die Auswertung des Debriefings ein. */
  dauerSek: number;
  hinweis: string;
  art: Massnahmenart;
  qualifikation: Qualifikation;
  /** Indikation nach SAA - Nachschlagewissen, kein Hinweis auf diesen Patienten. */
  indikation?: string;
  /** Dosierung nach SAA. */
  dosierung?: string;
  /**
   * Voraussetzung: mindestens eine dieser Maßnahmen muss vorher erfolgt sein.
   * Für i.v.-Medikamente also der Zugang.
   */
  benoetigtEinesVon?: MassnahmeId[];
  /** Einmalige Verbesserung der Vitalwerte direkt nach Durchführung. */
  sofortEffekt?: VitalVerlauf;
  /**
   * Lebensrettende Sofortmaßnahme im Sinne der Vorsichtung: nur kritische
   * Blutung und Atemweg. Alles andere ist Individualmedizin und gehört im
   * MANV erst auf den Behandlungsplatz.
   */
  sofortmassnahme?: boolean;
  /**
   * Der Sofort-Effekt wirkt nur, wenn die Maßnahme ein aktives Problem löst.
   * Für die Atemwegssicherung: Ein Tubus in einen freien Atemweg bringt
   * nichts - die Sättigung steigt nur, wenn der Atemweg wirklich verlegt war.
   */
  effektNurBeiProblem?: boolean;
  /** Nicht mehr in der Auswahl, aber in alten Szenarien noch gültig. */
  veraltet?: boolean;
}

/**
 * Körperregion, in der ein Problem sitzt.
 * @anker modell.koerperregion Wo am Patienten das Problem sitzt - für das Körperschema
 *
 * Seitenangaben sind aus Sicht des Patienten. Auf der Vorderansicht liegt die
 * rechte Körperhälfte deshalb links im Bild - so, wie man vor dem Patienten
 * steht.
 */
export type Koerperregion =
  | 'kopf'
  | 'hals'
  | 'thorax'
  | 'abdomen'
  | 'becken'
  | 'arm_rechts'
  | 'arm_links'
  | 'bein_rechts'
  | 'bein_links'
  | 'ruecken';

export const KOERPERREGION_TEXT: Record<Koerperregion, string> = {
  kopf: 'Kopf',
  hals: 'Hals',
  thorax: 'Thorax',
  abdomen: 'Abdomen',
  becken: 'Becken',
  arm_rechts: 'rechter Arm',
  arm_links: 'linker Arm',
  bein_rechts: 'rechtes Bein',
  bein_links: 'linkes Bein',
  ruecken: 'Rücken',
};

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
  /** Wo am Körper - wird nach dem Bodycheck im Körperschema markiert. */
  koerperregion?: Koerperregion;
  /**
   * Auf den ersten Blick erkennbar - sichtbare Blutung, Fehlstellung,
   * Verbrennung, hörbare Atmung oder eine Klage des Patienten. Erscheint im
   * Körperschema sofort, ohne Bodycheck.
   */
  offensichtlich?: boolean;
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
  /** Endgültige Sichtung - danach ist die Kategorie nicht mehr vorläufig. */
  final?: boolean;
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
  /**
   * Die Kategorie wurde als endgültig bestätigt.
   * @anker modell.finalsichtung Vorläufig oder endgültig - die Anhängekarte zeigt es
   *
   * Auf der Verletztenanhängekarte ist jede Sichtung zunächst vorläufig; erst
   * die Abschlusssichtung legt fest. In der Oberfläche ist die Karte deshalb
   * bei vorläufiger Sichtung zur Hälfte eingefärbt, bei endgültiger ganz.
   */
  sichtungFinal: boolean;
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
