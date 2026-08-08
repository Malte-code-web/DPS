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
  | 'wendltubus'
  | 'beatmung'
  | 'blutstillung'
  | 'schocklage'
  | 'immobilisation'
  | 'waermeerhalt'
  | 'betreuung'
  | 'monitoring'
  | 'reanimation'
  | 'aed'
  | 'valsalva'
  | 'fahrzeugrettung'
  | 'esmarch'
  | 'hws_immobilisation'
  | 'fremdkoerper_entfernung'
  | 'glucose_oral'
  | 'lagerung_neuro'
  | 'oberkoerperhochlagerung'
  | 'stabile_seitenlage'
  | 'wundversorgung'
  | 'verbrennungsversorgung'
  | 'amputatversorgung'
  | 'gefahrenbeurteilung'
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
  | 'wundtamponade'
  | 'kapnografie'
  | 'mcpr'
  // SAA - Medikamente
  | 'sauerstoffgabe'
  | 'epinephrin_inhalativ'
  | 'epinephrin_im'
  | 'aktivkohle'
  | 'nalbuphin'
  | 'fentanyl'
  | 'ibuprofen'
  | 'glucagon'
  | 'diazepam_rektal'
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
  // Ärztliche Maßnahmen, nicht von der SAA gedeckt
  | 'intubation'
  | 'koniotomie'
  | 'levetiracetam'
  | 'thoraxdrainage'
  // Notfallnarkose (RSI) - eigene Einträge trotz teils gleichem Wirkstoff wie
  // ein Analgetikum, weil Dosisbereich und Überdosierungsbedeutung anders
  // sind (→ `domain.dosierung`, `esketamin_narkose` vs. `esketamin`)
  | 'propofol'
  | 'thiopental'
  | 'esketamin_narkose'
  | 'rocuronium'
  // Sammelbegriff aus der ersten Fassung - siehe massnahmen.veraltet
  | 'analgesie';

/**
 * Wer eine Maßnahme im Regeldienst eigenverantwortlich durchführen darf.
 * @anker modell.qualifikation Fünf Ausbildungsstufen von Basis bis Notärztin
 *
 * Fünf Stufen entlang der ehrenamtlichen und hauptamtlichen Ausbildungskette:
 * `basis` (Sanitätshelfer/-in, Einsatzsanitäter/-in), `rettungshelfer`
 * (medizinisch identischer Umfang wie `basis`, zusätzlich Fahren unter
 * Sonder-/Wegerechten und vertiefte Einsatztaktik - deshalb ohne eigene
 * Maßnahmen im Katalog), `rettungssanitaeter` (u. a. Larynxtubus/-maske
 * sicher beherrscht, erweiterte Rettungstechnik aus Fahrzeugen, regional auch
 * Sauerstoff/Aktivkohle), `notsan` (Notfallsanitäter/-in nach § 2a NotSanG)
 * und `notarzt`. Im MANV ist das keine Formalie: Notärztinnen sind die
 * knappste Ressource überhaupt. Eine Maßnahme, die nur sie durchführen
 * dürfen, bindet die eine Kraft, die an mehreren Stellen gleichzeitig
 * gebraucht wird.
 */
export type Qualifikation = 'basis' | 'rettungshelfer' | 'rettungssanitaeter' | 'notsan' | 'notarzt';

/**
 * Organisatorische Führungsebene, unabhängig von der fachlichen Qualifikation.
 * @anker modell.fuehrung Führung ist eine zweite Ebene neben der Qualifikation
 *
 * Nicht „darf mehr behandeln", sondern „darf einteilen": Truppführer (`truppfuehrer`)
 * und Gruppenführer (`gruppenfuehrer`) führen kleine Teileinheiten, Zugführer
 * (`zugfuehrer`) den ganzen Zug - erst ab hier darf disponiert werden (→
 * `domain.fuehrung`). Organisatorischer Leiter Rettungsdienst (`orgl_rd`) und
 * Leitende Notärztin/Leitender Notarzt (`lna`) sind reale Spitzenfunktionen
 * ohne Rangfolge zueinander (medizinische vs. organisatorische Leitung) -
 * beide stehen im selben, höchsten Rang. `keine` ist der Standard: eine
 * Führungsrolle wird von der Übungsleitung zugeteilt, nicht wie die
 * Qualifikation selbst gewählt (→ `sitzung.modell`).
 */
export type Fuehrungsrolle =
  | 'keine'
  | 'truppfuehrer'
  | 'gruppenfuehrer'
  | 'zugfuehrer'
  | 'orgl_rd'
  | 'lna';

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
  /**
   * Wirkt nur beim bewusstlosen Patienten. Guedel- und Wendl-Tubus lösen beim
   * wachen Patienten den Würgereiz aus und werden nicht toleriert - sie sichern
   * den Atemweg dann nicht.
   */
  nurBeiBewusstlosigkeit?: boolean;
  /**
   * @anker modell.benoetigtTeam Nur mit vollem Team durchführbar - löst eine Kollegenanfrage aus
   *
   * Nur mit gleichzeitig anwesendem Team aus Rettungssanitäter/-in, NotSan
   * und Notärztin/Notarzt durchführbar (→ `notfallnarkoseTeamVerfuegbar` in
   * `qualifikation.ts` für die reine Möglichkeits-Prüfung; die tatsächliche
   * Anfrage/Bindung → `modell.gebunden`, `state.reducer`) - bisher nur bei
   * den drei Notfallnarkose-Induktionsmitteln gesetzt. Außerhalb einer
   * Mehrspieler-Sitzung nicht durchgesetzt, wie jede andere
   * Qualifikationssperre auch.
   */
  benoetigtTeam?: boolean;
  /**
   * Zusätzliche Bindungsdauer in Sekunden, die über `dauerSek` hinaus gilt -
   * bei den drei Notfallnarkose-Induktionsmitteln auf die Dauer der
   * nachfolgenden Intubation gesetzt (180s), da dasselbe Team bis zur
   * gesicherten Atemwegssicherung gebunden bleibt, nicht nur für die
   * Medikamentengabe selbst.
   */
  bindetZusaetzlichSek?: number;
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
  /**
   * Wird nicht schon durch Hinsehen, sondern erst durch diese Maßnahme
   * aufgedeckt - der verlegte Atemweg etwa durch die Mundraumkontrolle. Der
   * Bodycheck deckt zusätzlich alles auf; dieses Feld ist der zweite, gezielte
   * Weg dorthin.
   */
  entdecktDurch?: MassnahmeId;
}

/**
 * @anker modell.abschnitte Die Stationen, die ein Patient durchläuft
 *
 * Einsatzabschnitte, die ein Patient nacheinander durchläuft:
 * Schadensstelle -> Eingangssichtung -> Behandlungsplatz (Zelt nach
 * Sichtungskategorie) -> Ausgangssichtung -> Abtransport.
 *
 * `verdeckt` ist kein echter Ort, sondern der Warteplatz vor der ersten
 * Freigabe (→ `modell.freigabemodus`) - taucht bewusst nicht in `ABSCHNITTE`
 * auf, damit er in keiner Spieler-Ansicht als Tab erscheint. `ablage` ist ein
 * zur Schadensstelle gleichwertiger, aber eigenständiger Startpunkt (RD nicht
 * an der Schadensstelle), `bereitstellungsraum` der Warteplatz nachgeforderter
 * Fahrzeuge (→ `modell.ereignis`).
 */
export type Einsatzabschnitt =
  | 'verdeckt'
  | 'schadensstelle'
  | 'ablage'
  | 'bereitstellungsraum'
  | 'eingangssichtung'
  | 'zelt_rot'
  | 'zelt_gelb'
  | 'zelt_gruen'
  | 'ausgangssichtung'
  | 'transport';

/**
 * @anker modell.fahrzeug Fahrzeuge durchlaufen dieselben Stationen wie Patienten
 *
 * Kernfahrzeuge nach dem MANV-Konzept Kreis Steinfurt (Rettungswagen,
 * Notarzt-Einsatzfahrzeug, Krankentransportwagen, Gerätewagen Rettungsdienst/
 * Sanitätsdienst, Abrollbehälter MANV, Einsatzleitwagen 2, Gerätewagen
 * Logistik) - Einsatzeinheiten, Patiententransportzüge und Behandlungs-/
 * Betreuungsplatz-Bereitschaften sind bewusst kein eigenes Fahrzeug-Objekt,
 * sondern bleiben spätere Erweiterung (→ ROADMAP.md, Baustein 4).
 */
export type FahrzeugTyp =
  | 'rtw'
  | 'nef'
  | 'ktw'
  | 'gw_rett'
  | 'gw_san'
  | 'ab_manv'
  | 'elw2'
  | 'gw_log';

/** Statische Vorlage - Teil eines `Szenario`, vor Sitzungsbeginn bearbeitbar. */
export interface FahrzeugVorlage {
  id: string;
  typ: FahrzeugTyp;
  /** Funkrufname oder Kennzeichen - rein informativ. */
  kennung?: string;
}

/**
 * Laufzeit-Fahrzeug: `FahrzeugVorlage` plus aktueller Standort und Besatzung.
 * Durchläuft denselben Abschnitts-Graphen wie `Patient.abschnitt`
 * (→ `domain.fahrzeuge`), hat aber keine tickende Simulation - anders als
 * Patienten entstehen Fahrzeuge daher schon beim Öffnen der Sitzung, nicht
 * erst beim Start der Übung.
 */
export interface Fahrzeug extends FahrzeugVorlage {
  abschnitt: Einsatzabschnitt;
  /**
   * Spieler-IDs der zugewiesenen Besatzung (→ `sitzung.modell`), positionell
   * nach Besatzungsplatz (Index = Platznummer aus der Dropdown-Zuweisung im
   * Wartebereich) - ein leerer Platz steht als `''` in der Liste, damit ein
   * einzelner Platz sich leeren lässt, ohne die übrigen zu verschieben.
   * Zählungen (→ `domain.staerkemeldung`) und Anzeige filtern leere Einträge.
   */
  besatzung: string[];
  /**
   * Materialbestand zur Laufzeit (→ `domain.material`), beim Öffnen der
   * Sitzung aus der Bestückung des Fahrzeugtyps materialisiert und von dort
   * ab pro Fahrzeug-Exemplar unabhängig verbraucht.
   */
  material: Partial<Record<MaterialTyp, number>>;
  /**
   * Von der Übungsleitung als Ereignis ausgelöster Ausfall (→ `modell.ereignis`)
   * - Besatzung und Materialbestand bleiben zugeordnet, liefern aber kein
   * Material mehr (→ `domain.material`), bis die Übungsleitung den Ausfall
   * wieder aufhebt. Reine Regie-Markierung, kein automatischer Auslöser.
   */
  ausgefallen?: boolean;
}

/**
 * @anker modell.material Verbrauchsmaterial, das eine Maßnahme aus einem Fahrzeug zieht
 *
 * Jede Maßnahme, die ein reales Einwegmaterial verbraucht, hängt an genau
 * einem `MaterialTyp` (→ `domain.material`); mehrere Maßnahmen dürfen auf
 * denselben Typ zeigen, wenn sie real dasselbe Material verbrauchen (z. B.
 * `absaugen_oral`/`absaugen_endobronchial` -> `absaugkatheter`). Bewusst nur
 * Verbrauchsgüter, keine wiederverwendeten Geräte (Defibrillator,
 * Beatmungsgerät, Absauggerät, Monitor, Laryngoskop) - die bleiben
 * unlimitiert.
 */
export type MaterialTyp =
  // Verbandmaterial / Blutstillung
  | 'druckverband'
  | 'haemostyptikum'
  | 'tourniquet'
  | 'beckengurt'
  | 'verbandmaterial'
  | 'brandwundenverband'
  | 'replantatbeutel'
  // Atemweg / Beatmung
  | 'guedeltubus'
  | 'wendltubus'
  | 'larynxmaske'
  | 'endotrachealtubus'
  | 'koniotomieset'
  | 'absaugkatheter'
  | 'beatmungsbeutel'
  | 'cpapmaske'
  | 'kapnografieadapter'
  | 'sauerstoffflasche'
  | 'thoraxentlastungsnadel'
  | 'thoraxdrainageset'
  // Zugänge / Infusion
  | 'ivkanuele'
  | 'ionadel'
  | 'infusion'
  // Immobilisation
  | 'stifneck'
  | 'vakuummatratze'
  | 'kedsystem'
  | 'universalschiene'
  // Medikamente (eine Ampullenart je Wirkstoff)
  | 'aktivkohle'
  | 'amiodaron'
  | 'atropin'
  | 'ass'
  | 'butylscopolamin'
  | 'diazepam_rektal'
  | 'dimenhydrinat'
  | 'dimetinden'
  | 'epinephrin'
  | 'esketamin'
  | 'fentanyl'
  | 'furosemid'
  | 'glucose'
  | 'glucose_oral'
  | 'heparin'
  | 'ipratropium'
  | 'levetiracetam'
  | 'lidocain'
  | 'metoprolol'
  | 'midazolam'
  | 'morphin'
  | 'naloxon'
  | 'nitrat'
  | 'paracetamol'
  | 'prednisolon'
  | 'propofol'
  | 'rocuronium'
  | 'salbutamol'
  | 'thiamin'
  | 'thiopental'
  | 'tranexamsaeure'
  | 'urapidil';

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
  /**
   * Körpergewicht in kg - Grundlage der gewichtsbezogenen Dosierung
   * (→ `dosierung.gewicht`). Fehlt es, schätzt `gewichtVon()` es aus Alter
   * und Geschlecht.
   */
  gewicht?: number;
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
  /**
   * @anker modell.freigabemodus Geplante automatische Freigabe im gestaffelten Modus
   *
   * Nur wirksam, wenn die Sitzung mit `freigabemodus: 'gestaffelt'` läuft
   * (→ `state.reducer`): der Patient wird automatisch freigegeben, sobald die
   * Einsatzzeit diese Minute erreicht - zusätzlich zur jederzeit möglichen
   * manuellen Freigabe durch die Übungsleitung. Ohne gesetzten Wert bleibt der
   * Patient verdeckt, bis die Übungsleitung ihn manuell freigibt.
   */
  freigabeMinuten?: number;
  /**
   * @anker modell.eingeklemmt Rettung eingeklemmter Personen - zweiteilige Freigabe
   *
   * Im Szenario nur ein Marker: "diese Person ist beim Entdecken eingeklemmt".
   * Der eigentliche Rettungsbedarf (Material, Anzahl benötigter Kolleg:innen)
   * wird erst live bei der Freigabe ausgewürfelt, nicht hier vorab
   * festgelegt (→ `domain.rettung`, `state.reducer`, `Patient.eingeklemmt`
   * für den Laufzeitzustand). Teil 1 (Patienten-Info + Kommunikation) ist mit
   * der normalen Freigabe (→ `modell.freigabemodus`) schon sichtbar; volle
   * Behandlung erst nach abgeschlossener Rettung.
   */
  eingeklemmtBeimStart?: boolean;
}

/**
 * @anker modell.eingeklemmtstatus Laufzeitzustand der Rettung einer eingeklemmten Person
 *
 * Entsteht erst bei der Freigabe des Patienten (→ `modell.eingeklemmt`), nicht
 * vorher. `benoetigtesMaterial`/`benoetigteKollegenAnzahl` sind das Ergebnis
 * des Live-Würfelns zu diesem Zeitpunkt (→ `domain.rettung`).
 * `benoetigteKollegenAnzahl` zählt zusätzliche Kolleg:innen, die die zuerst
 * anfragende Person (`anfragendeId`) über eine Kollegenanfrage dazuholt
 * (→ `modell.kollegenanfrage`) - beide Rollen werden bei Abschluss der
 * Rettung wieder freigegeben. Die eigentliche Rettung führt nicht der RD
 * durch, sondern die Feuerwehr, simuliert durch die Übungsleitung
 * (`rettungDurchfuehren`) - erst wenn Material bereitsteht und genug
 * Kolleg:innen zugesagt haben.
 */
export interface EingeklemmtStatus {
  benoetigtesMaterial: MaterialTyp | null;
  materialBereitgestellt: boolean;
  benoetigteKollegenAnzahl: number;
  /** Wer die Rettung begonnen hat - `null`, bis jemand "Unterstützung anfragen" auslöst. */
  anfragendeId: string | null;
  /** Zusätzliche Kolleg:innen, die eine Kollegenanfrage angenommen haben. */
  helfendeIds: string[];
  gerettet: boolean;
  /** `zeitSek` bei der Freigabe - Grundlage für `rettungsdauerSek` im Debriefing. */
  entdecktUmSek: number;
  rettungsdauerSek?: number;
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
 * @anker modell.delegation Gezielte Freigabe einer Maßnahme für eine bestimmte Person
 *
 * Anders als eine patientenweite Freigabe gilt diese nur für die eine Person,
 * die tatsächlich nachgefragt hat (→ `ui.delegationsanfrage`) - entsteht aus
 * einer angenommenen `DelegationsAnfrage`.
 */
export interface DelegationsFreigabe {
  massnahmeId: MassnahmeId;
  spielerId: string;
}

/**
 * @anker modell.delegationsanfrage Angefragte, noch nicht beantwortete Delegation
 *
 * Der anfragende Spieler wählt eine konkrete, im selben Einsatzabschnitt
 * anwesende Person mit ausreichender Qualifikation; diese sieht die Anfrage
 * als Benachrichtigung (→ `ui.delegationsanfrage`) und nimmt an oder lehnt ab.
 */
export interface DelegationsAnfrage {
  id: string;
  patientId: string;
  massnahmeId: MassnahmeId;
  anfragendeId: string;
  angefragteId: string;
}

/**
 * @anker modell.kollegenanfrage Offene Anfrage nach Unterstützung bei einer bindenden Maßnahme
 *
 * Anders als eine `DelegationsAnfrage` gezielt an eine Person, ist dies eine
 * offene Anfrage an jede verfügbare, passende Person - wer zuerst annimmt,
 * bekommt sie (→ `modell.gebunden`). Bei Narkose (→ `modell.benoetigtTeam`)
 * braucht es zwei getrennte Anfragen (eine je fehlender Rolle,
 * `benoetigteQualifikation` gesetzt), bei Rettung eine offene Anfrage, die
 * mehrere Personen annehmen können (`benoetigteQualifikation` fehlt - jede
 * verfügbare Person zählt).
 */
export interface Kollegenanfrage {
  id: string;
  patientId: string;
  grund: 'rettung' | 'narkose';
  anfragendeId: string;
  benoetigteQualifikation?: Qualifikation;
  /** Spieler-Ids, die bereits angenommen haben - bei Narkose maximal eine. */
  angenommenVon: string[];
  /** Nur bei `grund: 'narkose'`: welche Maßnahme mit vollständigem Team automatisch angewendet wird. */
  massnahmeId?: MassnahmeId;
  dosisMg?: number;
}

/**
 * @anker modell.rufgruppe Mitgliedschaft in einer Sprechfunk-Rufgruppe
 *
 * Wer ein Funkgerät "eingeschaltet" hat, steht mit genau einem Kanal hier -
 * unabhängig davon, ob die Person in `sitzung.spieler` geführt wird (die
 * Übungsleitung steht dort nicht, → `sitzung.modell`). `kanal: null` beim
 * Wählen entfernt den eigenen Eintrag wieder (Funkgerät aus). Grundlage für
 * den WebRTC-Mesh-Aufbau (→ `state.sprechfunk`) - wer denselben Kanal
 * gewählt hat, verbindet sich direkt mit jedem anderen dort.
 */
export interface Rufgruppenmitgliedschaft {
  teilnehmerId: string;
  /** Zum Wählzeitpunkt eingefroren - bleibt lesbar, auch ohne Spieler-Eintrag. */
  teilnehmerName: string;
  kanal: string;
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
  /**
   * Maßnahmen, die für diesen Patienten gezielt für eine bestimmte Person
   * freigegeben wurden - hebt die Qualifikationssperre für genau diese Person
   * auf (→ `domain.qualifikation`, `ui.delegationsanfrage`). Eine Freigabe
   * gilt nicht automatisch für alle, nur für die anfragende Person selbst.
   */
  delegierteMassnahmen: DelegationsFreigabe[];
  /** Welche Untersuchungen durchgeführt wurden - steuert, was sichtbar ist. */
  durchgefuehrteDiagnostik: DiagnostikId[];
  /** Abkürzung für "Bodycheck erfolgt". */
  untersucht: boolean;
  verlauf: Verlaufseintrag[];
  /** Laufzeitzustand der Rettung, nur gesetzt für Patienten mit `eingeklemmtBeimStart` nach ihrer Freigabe (→ `modell.eingeklemmtstatus`). */
  eingeklemmt?: EingeklemmtStatus;
}

/** @anker modell.geoposition Schematische Koordinate eines Szenario-Schlüsselpunkts */
export interface GeoPosition {
  lat: number;
  lon: number;
}

/**
 * @anker modell.route Weg zwischen zwei Einsatzabschnitten mit echter Distanz
 *
 * `distanzMeter` ist eine bewusst gewählte, plausible Schätzung je Szenario -
 * anders als die sorgfältig ausgewertete Fahrzeug-/Material-Bestückung gibt
 * es dafür keine reale Quelle (→ `domain.geodaten`). `sperraufschlagSek`
 * wirkt nur als fester Zeitaufschlag bei `status: 'gesperrt'`, nie als
 * Blockade - dieselbe "verzögert, nicht blockiert"-Linie wie überall sonst
 * in der Simulation.
 */
export interface RouteVorlage {
  id: string;
  von: Einsatzabschnitt;
  nach: Einsatzabschnitt;
  distanzMeter: number;
  sperraufschlagSek: number;
  /** Startet die Route gesperrt, statt frei (→ `modell.freigabemodus`-ähnliches Muster). */
  gesperrtBeimStart?: boolean;
}

export interface Route extends RouteVorlage {
  status: 'frei' | 'gesperrt';
}

/**
 * @anker modell.ereignis Von der Übungsleitung live ausgelöste Lageänderung
 *
 * Vordefinierte, im Szenario hinterlegte Nachzügler-Patienten (→ `ui.ereignissepanel`)
 * - anders als der Freigabemodus (→ `modell.freigabemodus`) existieren diese
 * Patienten bis zum Auslösen gar nicht in `state.patienten`, sondern nur als
 * Vorlage im Szenario. Ein Ereignis lässt sich pro Sitzung nur einmal
 * auslösen (→ `state.ausgeloesteEreignisse`).
 */
export interface LageereignisVorlage {
  id: string;
  titel: string;
  beschreibung: string;
  patienten: PatientVorlage[];
}

export interface Szenario {
  id: string;
  titel: string;
  lagemeldung: string;
  /** Kurze Einsatzbeschreibung für die Übungsleitung. */
  einsatzhinweis: string;
  patienten: PatientVorlage[];
  /**
   * Vorschlag für den Fahrzeugbestand - die Übungsleitung passt ihn vor
   * Sitzungsbeginn an (→ `ui.fahrzeugkonfiguration`). Optional, damit
   * bestehende Szenariodateien gültig bleiben.
   */
  fahrzeuge?: FahrzeugVorlage[];
  /**
   * Koordinaten und Wege der Schlüsselpunkte, Grundlage der Kartenansicht
   * (→ `ui.kartenansicht`) und der echten Verlegungsdauer
   * (→ `domain.geodaten`). Optional - ein Szenario ohne Geodaten funktioniert
   * unverändert mit der pauschalen `VERLEGUNGSDAUER_SEK`.
   */
  geodaten?: {
    schluesselpunkte: Partial<Record<Einsatzabschnitt, GeoPosition>>;
    routen: RouteVorlage[];
  };
  /**
   * Vordefinierte Lageänderungen, die die Übungsleitung während der Übung
   * live auslösen kann (→ `modell.ereignis`). Optional - ein Szenario ohne
   * hinterlegte Ereignisse zeigt das Ereignisse-Panel weiterhin (für
   * Fahrzeugausfall/Nachforderung), nur ohne Lageänderungs-Abschnitt.
   */
  ereignisse?: LageereignisVorlage[];
}
