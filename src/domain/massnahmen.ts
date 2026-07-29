import type { Massnahme, MassnahmeId, MassnahmenKategorie, Qualifikation } from './types';

/**
 * Katalog aller in der Simulation verfügbaren Maßnahmen.
 * @anker massnahmen.katalog Alle Maßnahmen mit Dauer und Wirkung - hier neue ergänzen
 *
 * Fachliche Grundlage sind die **Standardarbeitsanweisungen und Behandlungspfade
 * Rettungsdienst des Kreises Steinfurt, Version Januar 2026** (ÄLRD Kreis
 * Steinfurt). Übernommen sind Bezeichnung, Indikation, Dosierung und die
 * Zuordnung zur Qualifikation - also das, was ein Notfallsanitäter nach § 2a
 * NotSanG eigenverantwortlich darf.
 *
 * Was NICHT aus der Quelle stammt, sondern didaktisch gesetzt ist:
 * die `dauerSek` und der `sofortEffekt`. Beide sind Stellschrauben der Übung,
 * keine medizinischen Aussagen - siehe die Vereinfachungen in DOKUMENTATION.md.
 *
 * Die Zuordnung zu xABCDE folgt dem Zielproblem: Tranexamsäure steht bei x,
 * weil sie zur kritischen Blutung gehört, nicht bei C, wo sie gespritzt wird.
 */

/** Zugänge, über die ein i.v.-Medikament laufen kann. */
const ZUGANG: MassnahmeId[] = ['zugang_iv', 'zugang_io'];

export const MASSNAHMEN: Record<MassnahmeId, Massnahme> = {
  // --- x: Kritische Blutung ----------------------------------------
  blutstillung: {
    id: 'blutstillung',
    label: 'Manuelle Blutstillung / Druckverband',
    kategorie: 'x',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 45,
    hinweis: 'Direkter Druck, dann Druckverband.',
    indikation: 'Sichtbare, komprimierbare äußere Blutung.',
    sofortEffekt: { systolischerRR: 5 },
    sofortmassnahme: true,
  },
  tourniquet: {
    id: 'tourniquet',
    label: 'Tourniquet anlegen',
    kategorie: 'x',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 60,
    hinweis: '5-10 cm proximal der Blutungsquelle, nicht auf Kleidung.',
    indikation:
      'Lebensgefährliche oder multiple Blutungen einer Extremität; Blutstillung anders nicht möglich; Zeitdruck unter Gefahr.',
    sofortEffekt: { systolischerRR: 10 },
    sofortmassnahme: true,
  },
  beckenschlinge: {
    id: 'beckenschlinge',
    label: 'Beckenschlinge anlegen',
    kategorie: 'x',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis: 'Höhe Trochanter major, Beine leicht innenrotiert fixieren.',
    indikation: 'Verdacht auf komplexe Beckenverletzung.',
    sofortEffekt: { systolischerRR: 8 },
  },
  tranexamsaeure: {
    id: 'tranexamsaeure',
    label: 'Tranexamsäure i.v.',
    kategorie: 'x',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 120,
    hinweis: 'Antifibrinolytikum, als Kurzinfusion.',
    indikation: 'Blutung nach schwerem Trauma im hämorrhagischen Schock.',
    dosierung: '15 mg/kg KG langsam i.v. über 15 min, max. 1000 mg',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { systolischerRR: 4 },
  },

  // --- A: Atemweg ---------------------------------------------------
  mundraumkontrolle: {
    id: 'mundraumkontrolle',
    label: 'Mundraumkontrolle',
    kategorie: 'A',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 10,
    hinweis: 'Mund öffnen, einsehen: Fremdkörper, Blut, Erbrochenes, Zunge?',
    indikation: 'Vor jeder Atemwegssicherung - erst sehen, ob und womit der Atemweg verlegt ist.',
    sofortmassnahme: true,
  },
  atemwege_freimachen: {
    id: 'atemwege_freimachen',
    benoetigtEinesVon: ['mundraumkontrolle'],
    effektNurBeiProblem: true,
    label: 'Atemwege freimachen',
    kategorie: 'A',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 20,
    hinweis: 'Kopf überstrecken, Mundraum inspizieren, Fremdkörper entfernen.',
    indikation: 'Verlegter Atemweg, schnarchende Atmung.',
    sofortEffekt: { spo2: 4 },
    sofortmassnahme: true,
  },
  absaugen_oral: {
    id: 'absaugen_oral',
    benoetigtEinesVon: ['mundraumkontrolle'],
    effektNurBeiProblem: true,
    label: 'Absaugen Mund / Rachen',
    kategorie: 'A',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 30,
    hinweis: 'Vor jedem Atemwegsmanöver, verhindert Aspiration.',
    indikation: 'Sekret, Blut oder Erbrochenes im Mund-Rachen-Raum.',
    sofortEffekt: { spo2: 4 },
    sofortmassnahme: true,
  },
  guedeltubus: {
    id: 'guedeltubus',
    benoetigtEinesVon: ['mundraumkontrolle'],
    effektNurBeiProblem: true,
    nurBeiBewusstlosigkeit: true,
    label: 'Guedel-Tubus einlegen',
    kategorie: 'A',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 30,
    hinweis: 'Oropharyngealtubus über den Mund. Nur beim tief Bewusstlosen - sonst Würgereiz.',
    indikation: 'Verlegter Atemweg durch die zurückfallende Zunge beim Bewusstlosen ohne Schutzreflexe.',
    sofortEffekt: { spo2: 5 },
    sofortmassnahme: true,
  },
  wendltubus: {
    id: 'wendltubus',
    benoetigtEinesVon: ['mundraumkontrolle'],
    effektNurBeiProblem: true,
    nurBeiBewusstlosigkeit: true,
    label: 'Wendl-Tubus einlegen',
    kategorie: 'A',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 30,
    hinweis: 'Nasopharyngealtubus über das Nasenloch, beim Bewusstlosen mit verlegtem Atemweg.',
    indikation: 'Verlegter Atemweg beim Bewusstlosen, wenn der oropharyngeale Weg nicht frei ist.',
    sofortEffekt: { spo2: 5 },
    sofortmassnahme: true,
  },
  larynxmaske: {
    id: 'larynxmaske',
    benoetigtEinesVon: ['mundraumkontrolle'],
    effektNurBeiProblem: true,
    label: 'Larynxmaske (extraglottischer Atemweg)',
    kategorie: 'A',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis: 'Größtmögliche Maske, Cuff faltenfrei entlüftet.',
    indikation: 'Herz-Kreislauf-Stillstand; Ateminsuffizienz mit Bewusstlosigkeit und fehlenden Schutzreflexen.',
    sofortEffekt: { spo2: 10 },
  },
  laryngoskopie: {
    id: 'laryngoskopie',
    benoetigtEinesVon: ['mundraumkontrolle'],
    effektNurBeiProblem: true,
    label: 'Laryngoskopie / Magillzange',
    kategorie: 'A',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis: 'Bevorzugt Videolaryngoskopie, Beatmung und Absaugung bereithalten.',
    indikation: 'Bolus bei (sub-)totaler Atemwegsverlegung; Kreislaufstillstand unklarer Ursache.',
    sofortEffekt: { spo2: 12 },
  },
  absaugen_endobronchial: {
    id: 'absaugen_endobronchial',
    benoetigtEinesVon: ['mundraumkontrolle'],
    effektNurBeiProblem: true,
    label: 'Endobronchiales Absaugen',
    kategorie: 'A',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis: 'Präoxygenierung, steriles Arbeiten, Vagusreiz beachten.',
    indikation: 'Akute respiratorische Insuffizienz durch Sekret, Blut oder Eiter.',
    sofortEffekt: { spo2: 6 },
  },
  intubation: {
    id: 'intubation',
    benoetigtEinesVon: ['mundraumkontrolle'],
    effektNurBeiProblem: true,
    label: 'Endotracheale Intubation',
    kategorie: 'A',
    art: 'invasiv',
    qualifikation: 'notarzt',
    dauerSek: 180,
    hinweis: 'Bindet die knappste Ressource im MANV - kritisch abzuwägen.',
    indikation: 'Definitiver Atemweg, wenn extraglottische Verfahren nicht ausreichen.',
    sofortEffekt: { spo2: 12 },
  },

  // --- B: Beatmung --------------------------------------------------
  sauerstoffgabe: {
    id: 'sauerstoffgabe',
    label: 'Sauerstoffgabe',
    kategorie: 'B',
    art: 'medikament',
    qualifikation: 'basis',
    dauerSek: 30,
    hinweis: 'Nasenbrille < 5 l/min, Maske ab 5 l/min.',
    indikation: 'Hypoxämie; CO-Intoxikation; Tauchunfall.',
    dosierung: 'Ziel SpO2 92-96 %, bei Hyperkapnierisiko 88-92 %',
    sofortEffekt: { spo2: 8 },
  },
  beatmung: {
    id: 'beatmung',
    label: 'Assistierte Beatmung',
    kategorie: 'B',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 60,
    hinweis: 'Beutel-Masken-Beatmung, möglichst zu zweit.',
    indikation: 'Insuffiziente oder fehlende Spontanatmung.',
    sofortEffekt: { spo2: 10, atemfrequenz: 4 },
    sofortmassnahme: true,
  },
  cpap_niv: {
    id: 'cpap_niv',
    label: 'Nichtinvasives CPAP / NIV',
    kategorie: 'B',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 120,
    hinweis: 'Maske erst manuell halten, Toleranz aufbauen.',
    indikation: 'Schwere respiratorische Insuffizienz; CO-Intoxikation.',
    sofortEffekt: { spo2: 10, atemfrequenz: -3 },
  },
  thoraxentlastung: {
    id: 'thoraxentlastung',
    label: 'Thoraxentlastungspunktion',
    kategorie: 'B',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis: '2. ICR medioklavikulär oder 4. ICR vordere Axillarlinie.',
    indikation: 'Spannungspneumothorax mit rasch zunehmender Instabilität.',
    sofortEffekt: { spo2: 12, systolischerRR: 15 },
  },
  salbutamol: {
    id: 'salbutamol',
    label: 'Salbutamol inhalativ',
    kategorie: 'B',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis: 'ß2-Sympathomimetikum, Vernebelung.',
    indikation: 'Bronchialobstruktion.',
    dosierung: '> 12 J.: 2,5 mg inhalativ; 4-12 J.: 1,25 mg; Repetition nach 10 min',
    sofortEffekt: { spo2: 5, atemfrequenz: -2 },
  },
  ipratropium: {
    id: 'ipratropium',
    label: 'Ipratropiumbromid inhalativ',
    kategorie: 'B',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis: 'Inhalatives Parasympatholytikum, mit Salbutamol kombinierbar.',
    indikation: 'Bronchialobstruktion: Asthmaanfall, COPD-Exazerbation.',
    dosierung: '> 12 J.: 0,5 mg inhalativ; 6-12 J.: 0,25 mg; Repetition nach 30 min',
    sofortEffekt: { spo2: 3 },
  },
  prednisolon: {
    id: 'prednisolon',
    label: 'Prednisolon i.v.',
    kategorie: 'B',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis: 'Glukokortikoid, Wirkeintritt verzögert.',
    indikation: 'Anaphylaxie; Bronchialobstruktion; Pseudokrupp.',
    dosierung: 'Anaphylaxie > 12 J.: 250 mg i.v.; Obstruktion > 12 J.: 100 mg i.v.',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { spo2: 2 },
  },
  dimetinden: {
    id: 'dimetinden',
    label: 'Dimetinden i.v.',
    kategorie: 'B',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis: 'H1-Antihistaminikum.',
    indikation: 'Anaphylaxie.',
    dosierung: '0,1 mg/kg KG, max. 8 mg langsam i.v., keine Repetition',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { spo2: 2 },
  },

  // --- C: Kreislauf -------------------------------------------------
  zugang_iv: {
    id: 'zugang_iv',
    label: 'i.v.-Zugang',
    kategorie: 'C',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis: 'Voraussetzung für fast jedes Medikament.',
    indikation: 'Infusion oder zu erwartende i.v.-Medikamentengabe.',
  },
  zugang_io: {
    id: 'zugang_io',
    label: 'i.o.-Zugang (EZ-IO)',
    kategorie: 'C',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 120,
    hinweis: 'Proximale Tibia medial der Tuberositas.',
    indikation: 'Kreislaufstillstand oder zwingender Zugang bei unmöglichem i.v.-Zugang.',
  },
  volumengabe: {
    id: 'volumengabe',
    label: 'Vollelektrolytlösung i.v.',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 120,
    hinweis: 'Beim Trauma möglichst erst nach der Blutstillung.',
    indikation: 'Blutung / hämorrhagischer Schock; Dehydratation; Anaphylaxie; Sepsis; Verbrennung.',
    dosierung: '> 12 J.: 500-1000 ml i.v.; ≤ 12 J.: 10 ml/kg KG',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { systolischerRR: 15, herzfrequenz: -8 },
  },
  schocklage: {
    id: 'schocklage',
    label: 'Schocklagerung',
    kategorie: 'C',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 20,
    hinweis: 'Beine hoch, kostet nichts außer zwanzig Sekunden.',
    indikation: 'Hypotonie ohne Hinweis auf Schädel-Hirn-Trauma.',
    sofortEffekt: { systolischerRR: 6 },
  },
  monitoring: {
    id: 'monitoring',
    label: 'Monitoring anschließen',
    kategorie: 'C',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 45,
    hinweis:
      'EKG, SpO₂ und Atemfrequenz laufen danach kontinuierlich mit; der Monitor alarmiert bei jeder Grenzwertverletzung.',
    indikation: 'Jeder überwachungspflichtige Patient - Standard vor Behandlung und Transport.',
  },
  defibrillation: {
    id: 'defibrillation',
    label: 'Manuelle Defibrillation',
    kategorie: 'C',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis: 'Klebeelektroden rechts-pektoral / apikal.',
    indikation: 'Kreislaufstillstand bei Kammerflimmern oder pulsloser VT.',
  },
  kardioversion: {
    id: 'kardioversion',
    label: 'Kardioversion',
    kategorie: 'C',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis: 'Synchronisiert, nur bei Bewusstlosigkeit.',
    indikation: 'Kardiale Tachykardie mit Instabilität und Bewusstlosigkeit.',
  },
  schrittmacher: {
    id: 'schrittmacher',
    label: 'Externe Schrittmacheranlage',
    kategorie: 'C',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 120,
    hinweis: 'Demand-Modus, Frequenz 70/min, Energie schrittweise steigern.',
    indikation: 'Bradykardie mit Instabilität und Bewusstlosigkeit.',
    sofortEffekt: { herzfrequenz: 25, systolischerRR: 10 },
  },
  epinephrin: {
    id: 'epinephrin',
    label: 'Epinephrin i.v.',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis: 'Sympathomimetikum.',
    indikation: 'Reanimation; instabile Bradykardie; Anaphylaxie ab Stadium II.',
    dosierung: 'Reanimation Erw.: 1 mg i.v./i.o.; Bradykardie: 5 µg bolusweise',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { systolischerRR: 20, herzfrequenz: 15 },
  },
  amiodaron: {
    id: 'amiodaron',
    label: 'Amiodaron i.v.',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis: 'Antiarrhythmikum Klasse 3, mit Vollelektrolytlösung nachspülen.',
    indikation: 'Refraktäres Kammerflimmern, pulslose VT.',
    dosierung: 'Erw.: 300 mg nach der 3. Defibrillation, 150 mg nach der 5.',
    benoetigtEinesVon: ZUGANG,
  },
  lidocain: {
    id: 'lidocain',
    label: 'Lidocain i.v.',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis: 'Gleichwertige Alternative zu Amiodaron.',
    indikation: 'Defibrillierbare Rhythmen im Rahmen der Reanimation.',
    dosierung: 'Erw.: 100 mg nach dem 3. Schock, 50 mg nach dem 5.',
    benoetigtEinesVon: ZUGANG,
  },
  atropin: {
    id: 'atropin',
    label: 'Atropin i.v.',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis: 'Parasympatholytikum; bei Wirkungslosigkeit Wechsel auf Epinephrin.',
    indikation: 'Instabile Bradykardie.',
    dosierung: '0,5 mg i.v., Repetition alle 3-5 min bis max. 3 mg',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { herzfrequenz: 20 },
  },
  metoprolol: {
    id: 'metoprolol',
    label: 'Metoprolol i.v.',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis: 'Betablocker.',
    indikation: 'STEMI mit tachykardem Vorhofflimmern oder multiplen VES.',
    dosierung: '2 mg i.v., Repetition 2 mg und 1 mg, max. 5 mg',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { herzfrequenz: -15 },
  },
  ass: {
    id: 'ass',
    label: 'Acetylsalicylsäure',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis: 'Thrombozytenaggregationshemmer.',
    indikation: 'Akutes Koronarsyndrom, Myokardinfarkt.',
    dosierung: '250 mg langsam i.v. oder 500 mg oral, keine Repetition',
  },
  heparin: {
    id: 'heparin',
    label: 'Heparin i.v.',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis: 'Antikoagulans.',
    indikation: 'Akutes Koronarsyndrom; Lungenarterienembolie; arterieller Verschluss.',
    dosierung: '5.000 I.E. i.v., keine Repetition',
    benoetigtEinesVon: ZUGANG,
  },
  nitrat: {
    id: 'nitrat',
    label: 'Glyceroltrinitrat sublingual',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 20,
    hinweis: 'Nicht unter RRsys 100 mmHg; sicherer Zugang vorher.',
    indikation: 'Kardiales Lungenödem; hypertensiver Notfall mit kardialer Symptomatik.',
    dosierung: '1 Hub à 0,4 mg s.l., einmalige Repetition nach 5 min',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { systolischerRR: -15 },
  },
  urapidil: {
    id: 'urapidil',
    label: 'Urapidil i.v.',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis: 'Antihypertensivum, α1-Blocker.',
    indikation: 'Hypertensiver Notfall; akutes Aortensyndrom; Schlaganfall.',
    dosierung: '5 mg langsam i.v., Repetition möglich, max. 25 mg',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { systolischerRR: -20 },
  },
  furosemid: {
    id: 'furosemid',
    label: 'Furosemid i.v.',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis: 'Schleifendiuretikum.',
    indikation: 'Kardiales Lungenödem.',
    dosierung: '20 mg langsam i.v., einmalige Repetition nach 15 min',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { spo2: 4 },
  },

  // --- D: Neurologie / Schmerz --------------------------------------
  esketamin: {
    id: 'esketamin',
    label: 'Esketamin i.v.',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 60,
    hinweis: 'Analgetikum und dosisabhängig Anästhetikum; CO2-Überwachung anlegen.',
    indikation: 'Starker Schmerz ab NRS 6.',
    dosierung: 'i.v. 0,125-0,25 mg/kg KG, max. 0,5 mg/kg KG; nasal/i.m. 1 mg/kg KG',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { schmerz: -6, herzfrequenz: -10 },
  },
  morphin: {
    id: 'morphin',
    label: 'Morphin i.v.',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 60,
    hinweis: 'Opiat, BtM; CO2-Überwachung anlegen, Atemdepression beachten.',
    indikation: 'Starke und stärkste Schmerzen ab NRS 6.',
    dosierung: 'Erw.: 2 mg fraktioniert alle 3-4 min, max. 10 mg',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { schmerz: -5, herzfrequenz: -12, atemfrequenz: -2 },
  },
  paracetamol: {
    id: 'paracetamol',
    label: 'Paracetamol',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 60,
    hinweis: 'Nicht-Opioid-Analgetikum, auch rektal.',
    indikation: 'Schmerzen ab NRS 3; Fieber beim Kind nach Krampfanfall.',
    dosierung: 'Kurzinfusion 1 g / 100 ml; Kinder rektal 125-250 mg',
    sofortEffekt: { schmerz: -3, temperatur: -0.4 },
  },
  midazolam: {
    id: 'midazolam',
    label: 'Midazolam',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis: 'Benzodiazepin; buccal, nasal, i.m. und i.v. möglich.',
    indikation: 'Komplizierter Krampfanfall / Fieberkrampf; Analgosedierung mit Esketamin.',
    dosierung: '0,1 mg/kg KG i.v., einmalige Repetition möglich',
    sofortEffekt: { schmerz: -2, atemfrequenz: -2 },
  },
  glucose: {
    id: 'glucose',
    label: 'Glucose i.v.',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 60,
    hinweis: 'Auf sichere intravasale Lage achten, max. 20 %ig.',
    indikation: 'Hypoglykämie unter 60 mg/dl mit erforderlicher Fremdhilfe.',
    dosierung: 'Erw. und > 30 kg: 8-10 g i.v.; Kinder 0,2 g/kg KG',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { blutzucker: 90, gcs: 4 },
  },
  naloxon: {
    id: 'naloxon',
    label: 'Naloxon',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis: 'Opioid-Antidot; fraktioniert bis zur suffizienten Atmung.',
    indikation: 'Opioid-Intoxikation bei Versagen der primären Maßnahmen.',
    dosierung: '0,1 mg fraktioniert alle 2 min; Kinder 0,01 mg/kg KG',
    sofortEffekt: { atemfrequenz: 6, gcs: 4, spo2: 5 },
  },
  thiamin: {
    id: 'thiamin',
    label: 'Thiamin i.v.',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis: 'Vitamin B1.',
    indikation: 'Bewusstseinsstörung, Delir, Hypoglykämie oder Krampfanfall bei Mangelernährung.',
    dosierung: '100 mg i.v.',
    benoetigtEinesVon: ZUGANG,
  },
  butylscopolamin: {
    id: 'butylscopolamin',
    label: 'Butylscopolamin i.v.',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis: 'Parasympatholytikum, Spasmolyse.',
    indikation: 'Starke kolikartige abdominelle Schmerzen.',
    dosierung: '0,3 mg/kg KG langsam i.v., max. 20 mg',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { schmerz: -3 },
  },
  analgesie: {
    id: 'analgesie',
    label: 'Analgesie (Sammelbegriff)',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis: 'Aus der ersten Fassung - neue Szenarien nennen das Präparat.',
    veraltet: true,
    sofortEffekt: { herzfrequenz: -15, atemfrequenz: -3, schmerz: -5 },
  },

  // --- E: Umgebung / Exposition -------------------------------------
  immobilisation: {
    id: 'immobilisation',
    label: 'Immobilisation',
    kategorie: 'E',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 120,
    hinweis: 'Vakuummatratze oder Schienung.',
    indikation: 'Fraktur, Verdacht auf Wirbelsäulenverletzung.',
    sofortEffekt: { schmerz: -2 },
  },
  achsengerechte_immobilisation: {
    id: 'achsengerechte_immobilisation',
    label: 'Achsengerechte Immobilisation / Extension',
    kategorie: 'E',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 120,
    hinweis: 'Zug am distalen Frakturanteil; DMS vorher und nachher prüfen.',
    indikation: 'Dislozierte Fraktur mit Durchblutungsstörung oder Gewebespannung.',
    sofortEffekt: { schmerz: -3, systolischerRR: 3 },
  },
  waermeerhalt: {
    id: 'waermeerhalt',
    label: 'Wärmeerhalt',
    kategorie: 'E',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 30,
    hinweis: 'Rettungsdecke - Hypothermie verschlechtert die Gerinnung.',
    indikation: 'Jeder Traumapatient, jede längere Liegezeit im Freien.',
    sofortEffekt: { rekapzeit: -0.3, temperatur: 0.6 },
  },
  betreuung: {
    id: 'betreuung',
    label: 'Psychische Betreuung',
    kategorie: 'E',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 60,
    hinweis: 'Auch bei SK IV die wichtigste Maßnahme.',
    indikation: 'Akute Belastungsreaktion; abwartende Behandlung.',
    sofortEffekt: { herzfrequenz: -8, atemfrequenz: -2, schmerz: -1 },
  },
  dimenhydrinat: {
    id: 'dimenhydrinat',
    label: 'Dimenhydrinat',
    kategorie: 'E',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis: 'Antiemetikum.',
    indikation: 'Übelkeit und Erbrechen.',
    dosierung: '> 14 J.: 62 mg langsam i.v.; 6-14 J.: 40 mg i.v. oder rektal',
  },
  injektion_im: {
    id: 'injektion_im',
    label: 'Intramuskuläre Injektion',
    kategorie: 'E',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis: 'Alternative, wenn kein Zugang gelingt.',
    indikation: 'Medikamentengabe ohne verfügbaren i.v.-Zugang.',
  },
  gabe_intranasal: {
    id: 'gabe_intranasal',
    label: 'Intranasale Medikamentengabe',
    kategorie: 'E',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 20,
    hinweis: 'Zerstäuber; schnell und ohne Zugang.',
    indikation: 'Analgesie oder Antikonvulsivum ohne i.v.-Zugang.',
  },
};

export const MASSNAHMEN_LISTE: Massnahme[] = Object.values(MASSNAHMEN);

/**
 * @anker massnahmen.veraltet Was aus der Auswahl verschwindet, aber gültig bleibt
 *
 * Alte Szenariodateien nennen Maßnahmen, die es in dieser Form nicht mehr gibt.
 * Sie bleiben im Katalog und damit gültig, tauchen aber nicht mehr in der
 * Auswahl auf - sonst müssten Übungsleitungen ihre Dateien nachziehen.
 */
export const WAEHLBARE_MASSNAHMEN: Massnahme[] = MASSNAHMEN_LISTE.filter(
  (massnahme) => !massnahme.veraltet,
);

/**
 * Reihenfolge der Gruppen nach xABCDE.
 * @anker massnahmen.xabcde Gruppierung und Reihenfolge der Maßnahmengruppen
 */
export const KATEGORIEN: MassnahmenKategorie[] = ['x', 'A', 'B', 'C', 'D', 'E'];

export const KATEGORIE_LABEL: Record<MassnahmenKategorie, string> = {
  x: 'Kritische Blutung',
  A: 'Atemweg',
  B: 'Beatmung',
  C: 'Kreislauf',
  D: 'Neurologie',
  E: 'Umgebung',
};

export const QUALIFIKATION_LABEL: Record<Qualifikation, string> = {
  basis: '',
  notsan: 'NotSan',
  notarzt: 'Notärztin',
};

/**
 * Ausgeschriebene Bezeichnung für die Qualifikationswahl im Wartebereich
 * (→ `domain.qualifikation`) - anders als `QUALIFIKATION_LABEL`, das als kurze
 * Ausnahme-Kennzeichnung an einer Maßnahme steht und bei `basis` leer bleibt.
 */
export const QUALIFIKATION_VOLLNAME: Record<Qualifikation, string> = {
  basis: 'Einsatzsanitäter/-in (Basis)',
  notsan: 'Notfallsanitäter/-in',
  notarzt: 'Notärztin/Notarzt',
};

/**
 * @anker massnahmen.schnell Auswahl für die Ausgangssichtung (bis 60 Sekunden)
 *
 * Maßnahmen, die sich auch kurz vor dem Abtransport noch durchführen lassen:
 * kurz UND ohne Eingriff oder Medikament. Seit der Katalog die vollständige
 * SAA abbildet, reicht die Zeitgrenze allein nicht mehr - ein Zugang ist in
 * 90 Sekunden gelegt, gehört an der Ausgangssichtung aber nicht mehr hin.
 */
export const SCHNELLE_MASSNAHMEN: Massnahme[] = WAEHLBARE_MASSNAHMEN.filter(
  (massnahme) => massnahme.dauerSek <= 60 && massnahme.qualifikation === 'basis',
);

/**
 * @anker massnahmen.sofort Lebensrettende Griffe der Schadensstelle
 *
 * Was am Verletzten noch vor jeder Sichtung zählt: kritische Blutung stillen,
 * den Mundraum kontrollieren, den Atemweg sichern, beatmen. Solange der Patient
 * an der Schadensstelle liegt, stehen diese Maßnahmen dauerhaft in der Übersicht
 * - nicht erst hinter einem Knopf. Die Reihenfolge folgt xABCDE, so wie sie im
 * Katalog stehen.
 */
export const SOFORTMASSNAHMEN: Massnahme[] = WAEHLBARE_MASSNAHMEN.filter(
  (massnahme) => massnahme.sofortmassnahme,
);

export function massnahmenDerKategorie(kategorie: MassnahmenKategorie): Massnahme[] {
  // Innerhalb einer Gruppe zuerst der Handgriff, dann der Eingriff, dann das
  // Medikament - das ist die Reihenfolge, in der real gearbeitet wird.
  const rang: Record<Massnahme['art'], number> = { basis: 0, invasiv: 1, medikament: 2 };
  return WAEHLBARE_MASSNAHMEN.filter((massnahme) => massnahme.kategorie === kategorie).sort(
    (a, b) => rang[a.art] - rang[b.art],
  );
}

/**
 * @anker massnahmen.voraussetzung Was vor einer Maßnahme erledigt sein muss
 *
 * Ein i.v.-Medikament ohne Zugang gibt es nicht. Die Voraussetzung kostet ihre
 * eigene Zeit und macht den Unterschied zwischen "schnell mal etwas geben" und
 * dem, was es wirklich kostet.
 */
/** Kurzer Sperrtext für den Maßnahmenknopf, wenn die Voraussetzung fehlt. */
export function voraussetzungKurz(ids: MassnahmeId[]): string {
  if (ids.includes('zugang_iv')) return 'Zugang nötig';
  if (ids.includes('mundraumkontrolle')) return 'erst Mundraum prüfen';
  return 'Voraussetzung fehlt';
}

export function fehlendeVoraussetzung(
  massnahme: Massnahme,
  erledigt: MassnahmeId[],
): MassnahmeId[] | null {
  const noetig = massnahme.benoetigtEinesVon;
  if (!noetig || noetig.some((id) => erledigt.includes(id))) return null;
  return noetig;
}
