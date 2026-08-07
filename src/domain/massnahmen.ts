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
 *
 * Die Maßnahmen unterhalb der NotSan-Stufe (`reanimation`, `fahrzeugrettung`,
 * `aktivkohle`, sowie die auf `rettungssanitaeter` abgesenkte `larynxmaske`)
 * stammen aus der Ausbildungsbroschüre Malteser Bildungszentrum
 * Baden-Württemberg (Stand 05/2025) - siehe `modell.qualifikation`.
 *
 * Der Katalog wurde zusätzlich gegen die frei zugängliche Fachliteratur
 * abgeglichen, weil die Steinfurter SAA nicht öffentlich ist: **SAA/BPR 2025
 * der ÄLRD in BW, BB, MV, NRW, SN, ST** (Stand 30.04.2025) als Mutterdokument,
 * **DBRD-Musteralgorithmen 2026**, **AWMF S3 Polytrauma 187-023**,
 * **ERC/RCUK 2025**, **Pyramidenprozess Anlage 3** sowie der
 * **Sichtungs-Konsensus** von Bundesärztekammer und BBK. Wo eine Angabe
 * zwischen den Quellen abweicht, steht die Abweichung in `dosierung` oder
 * `hinweis` dabei statt stillschweigend aufgelöst zu werden.
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
    hinweis:
      'Direkter Druck, dann Druckverband - möglichst mit Hämostyptikum. Verband nicht wiederholt zur Kontrolle anheben.',
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
    hinweis:
      '5-10 cm proximal der Blutungsquelle, gelenkfern, nicht auf Kleidung. Bis zum Sistieren der Blutung anziehen - halb angezogen staut es venös und verstärkt die Blutung. Anlagezeit notieren, im Rettungsdienst nicht wieder öffnen.',
    indikation:
      'Lebensgefährliche oder multiple Blutungen einer Extremität; Blutstillung anders nicht möglich; Zeitdruck unter Gefahr.',
    sofortEffekt: { systolischerRR: 10 },
    sofortmassnahme: true,
  },
  wundtamponade: {
    id: 'wundtamponade',
    label: 'Wundtamponade / Hämostyptikum',
    kategorie: 'x',
    art: 'invasiv',
    qualifikation: 'basis',
    dauerSek: 90,
    hinweis:
      'Wundhöhle vollständig austamponieren (möglichst mit Hämostyptikum), dann 1-3 min direkter Druck, darüber ein Druckverband. Für Stellen, an denen kein Tourniquet sitzt.',
    indikation:
      'Nicht komprimierbare oder stammnahe Blutung (Axilla, Leiste, Hals), tiefe Stich- oder Schusswunde, Blutung trotz Tourniquet.',
    sofortEffekt: { systolischerRR: 8 },
    sofortmassnahme: true,
  },
  beckenschlinge: {
    id: 'beckenschlinge',
    label: 'Beckenschlinge anlegen',
    kategorie: 'x',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis:
      'Höhe Trochanter major, Beine leicht innenrotiert fixieren. Becken nicht federn - die Palpation kann die Blutung verstärken. Anlagezeit dokumentieren, im Rettungsdienst nicht öffnen.',
    indikation:
      'Verdacht auf komplexe Beckenverletzung - Indikation aus Unfallmechanismus (Hochrasanz, Sturz > 3 m), Inspektion und Schmerz, nicht aus der Palpation.',
    sofortEffekt: { systolischerRR: 8 },
  },
  tranexamsaeure: {
    id: 'tranexamsaeure',
    label: 'Tranexamsäure i.v.',
    kategorie: 'x',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 120,
    hinweis:
      'Antifibrinolytikum als Kurzinfusion. Nur innerhalb von 3 h nach Trauma; nicht bei isoliertem SHT oder gastrointestinaler Blutung; keine Anwendung unter 6 Jahren.',
    indikation: 'Blutung nach schwerem Trauma im hämorrhagischen Schock.',
    dosierung: '15 mg/kg KG langsam i.v. über 15 min, max. 1000 mg (S3-Leitlinie: 1 g über 10 min)',
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
    hinweis:
      'Kopf überstrecken und Kinn anheben - bei Traumaverdacht stattdessen Esmarch-Handgriff (HWS!). Mundraum inspizieren, Fremdkörper entfernen.',
    indikation: 'Verlegter Atemweg, schnarchende Atmung.',
    sofortEffekt: { spo2: 4 },
    sofortmassnahme: true,
  },
  esmarch: {
    id: 'esmarch',
    benoetigtEinesVon: ['mundraumkontrolle'],
    effektNurBeiProblem: true,
    label: 'Esmarch-Handgriff',
    kategorie: 'A',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 15,
    hinweis:
      'Unterkiefer beidseits nach vorn schieben, HWS dabei in Neutralstellung lassen. Der Weg, den Atemweg ohne Überstrecken freizubekommen.',
    indikation:
      'Verlegter Atemweg beim Bewusstlosen, insbesondere bei Traumaverdacht, wenn Überstrecken vermieden werden soll.',
    sofortEffekt: { spo2: 4 },
    sofortmassnahme: true,
  },
  fremdkoerper_entfernung: {
    id: 'fremdkoerper_entfernung',
    effektNurBeiProblem: true,
    label: 'Rückenschläge / Oberbauchkompressionen',
    kategorie: 'A',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 30,
    hinweis:
      'Fünf Schläge zwischen die Schulterblätter, dann fünf Oberbauchkompressionen im Wechsel. Bei Säuglingen Thorax- statt Oberbauchkompressionen. Bei Bewusstlosigkeit sofort mit Reanimation beginnen.',
    indikation:
      'Atemwegsverlegung durch Fremdkörper bei ineffektivem Hustenstoß, noch ansprechbarer Patient.',
    sofortEffekt: { spo2: 8 },
    sofortmassnahme: true,
  },
  stabile_seitenlage: {
    id: 'stabile_seitenlage',
    benoetigtEinesVon: ['mundraumkontrolle'],
    label: 'Stabile Seitenlage',
    kategorie: 'A',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 30,
    hinweis:
      'Aspirationsschutz, nachdem der Atemweg frei ist. Bei Traumaverdacht achsengerecht drehen und die HWS stabilisieren.',
    indikation: 'Bewusstseinsgetrübter Patient mit erhaltener Spontanatmung und Aspirationsgefahr.',
    sofortEffekt: { spo2: 2 },
    sofortmassnahme: true,
  },
  hws_immobilisation: {
    id: 'hws_immobilisation',
    label: 'HWS-Immobilisation',
    kategorie: 'A',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 60,
    hinweis:
      'Zuerst manuelle In-line-Stabilisierung. Ein Stützkragen allein genügt nicht - nur zusammen mit Kopffixierung oder Vakuummatratze. Bei Schädel-Hirn-Trauma an den Hirndruckanstieg denken.',
    indikation:
      'Verdacht auf Wirbelsäulenverletzung; jeder Bewusstlose nach Trauma; vor jeder technischen Rettung.',
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
    // Bewusst OHNE nurBeiBewusstlosigkeit: Der Nasopharyngealtubus ist gerade
    // das Mittel für den Patienten mit erhaltenen Schutzreflexen - er wird
    // auch bei Würgereiz toleriert und steht im eskalierenden
    // Atemwegsmanagement deshalb VOR dem Guedel-Tubus (DBRD 2026).
    label: 'Wendl-Tubus einlegen',
    kategorie: 'A',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 30,
    hinweis:
      'Nasopharyngealtubus über das Nasenloch, wird auch bei Würgereiz toleriert. Nicht bei Mittelgesichts- oder Schädelbasisfraktur.',
    indikation:
      'Verlegter Atemweg bei erhaltenen Schutzreflexen, Trismus oder eingeschränkter Mundöffnung - wenn ein Guedel-Tubus nicht toleriert wird.',
    sofortEffekt: { spo2: 5 },
    sofortmassnahme: true,
  },
  larynxmaske: {
    id: 'larynxmaske',
    benoetigtEinesVon: ['mundraumkontrolle'],
    effektNurBeiProblem: true,
    nurBeiBewusstlosigkeit: true,
    label: 'Extraglottischer Atemweg (Larynxmaske / Larynxtubus / i-gel)',
    kategorie: 'A',
    art: 'invasiv',
    qualifikation: 'rettungssanitaeter',
    dauerSek: 90,
    hinweis:
      'Gerät der 2. Generation mit Drainagekanal. Lage mit Kapnografie kontrollieren. (Freigabe für Rettungssanitäter/-innen nach DRK-Empfehlung 06/2023 bei jährlichem Training; der Pyramidenprozess ordnet die Maßnahme dem NotSan zu.)',
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
    // Setzt einen künstlichen Atemweg voraus - tief abgesaugt wird durch
    // Tubus oder extraglottischen Atemweg, nicht am freien Mundraum.
    benoetigtEinesVon: ['intubation', 'larynxmaske'],
    effektNurBeiProblem: true,
    label: 'Endobronchiales Absaugen',
    kategorie: 'A',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis: 'Präoxygenierung, möglichst aseptisches Arbeiten, Vagusreiz beachten.',
    indikation: 'Akute respiratorische Insuffizienz durch Sekret, Blut oder Eiter.',
    sofortEffekt: { spo2: 6 },
  },
  intubation: {
    id: 'intubation',
    // Entweder der bestehende Weg beim bereits bewusstlosen/tolerierenden
    // Patienten (Mundraumkontrolle), oder neu über die volle Notfallnarkose-
    // Sequenz beim wachen Patienten (→ `rocuronium`, `domain.notfallnarkose`).
    benoetigtEinesVon: ['mundraumkontrolle', 'rocuronium'],
    effektNurBeiProblem: true,
    label: 'Endotracheale Intubation',
    kategorie: 'A',
    art: 'invasiv',
    qualifikation: 'notarzt',
    dauerSek: 180,
    hinweis:
      'Bindet die knappste Ressource im MANV - kritisch abzuwägen. Lage mit Kapnografie bestätigen.',
    indikation: 'Definitiver Atemweg, wenn extraglottische Verfahren nicht ausreichen.',
    sofortEffekt: { spo2: 12 },
  },
  koniotomie: {
    id: 'koniotomie',
    benoetigtEinesVon: ['intubation'],
    effektNurBeiProblem: true,
    label: 'Notfallkoniotomie',
    kategorie: 'A',
    art: 'invasiv',
    qualifikation: 'notarzt',
    dauerSek: 120,
    hinweis:
      'Chirurgische Technik (Skalpell - Bougie - Tubus 6,0). Ultima Ratio am Ende des Atemwegsalgorithmus.',
    indikation: '"Can\'t intubate, can\'t oxygenate" - Versagen aller anderen Verfahren.',
    sofortEffekt: { spo2: 14 },
  },

  // --- A: Notfallnarkose (RSI) ---------------------------------------
  // @anker domain.notfallnarkose Team aus RS + NotSan + NotArzt nötig
  //
  // Anders als jede andere Maßnahme im Katalog braucht die Einleitung ein
  // gleichzeitig anwesendes Team dreier verschiedener Qualifikationsstufen
  // (→ `benoetigtTeam`, `notfallnarkoseTeamVerfuegbar` in qualifikation.ts) -
  // eine Person allein, und sei sie noch so hoch qualifiziert, darf nicht
  // einleiten. `bindetZusaetzlichSek` deckt die auf die Gabe folgende
  // Intubation mit ab (→ `modell.benoetigtTeam`) - dasselbe Team bleibt bis
  // zur gesicherten Atemwegssicherung gebunden.
  //
  // Die Wahl des Induktionsmittels macht real Unterschied: Wer
  // bereits hämodynamisch instabil ist, bekommt durch Propofol/Thiopental
  // (beide leicht kreislaufdepressiv) einen zusätzlichen Blutdruckabfall,
  // Esketamin dagegen wirkt sympathomimetisch und stützt den Kreislauf eher -
  // deshalb SAA-Empfehlung "Opiat + Esketamin + Rocuronium" bei Instabilität
  // (Handlungsempfehlung zur prähospitalen Notfallnarkose beim Erwachsenen,
  // DGAI/BAND, Notfall+Rettungsmedizin).
  propofol: {
    id: 'propofol',
    benoetigtEinesVon: ZUGANG,
    benoetigtTeam: true,
    bindetZusaetzlichSek: 180,
    label: 'Propofol (Notfallnarkose)',
    kategorie: 'A',
    art: 'medikament',
    qualifikation: 'notarzt',
    dauerSek: 60,
    hinweis:
      'Standard-Induktionsmittel. Kreislaufdepressiv (Vasodilatation) - beim bereits hypotensiven Patienten Esketamin bevorzugen.',
    indikation: 'Notfallnarkose zur Atemwegssicherung beim hämodynamisch stabilen Patienten.',
    dosierung:
      '1,5-2,5 mg/kg KG i.v. (Handlungsempfehlung: 150 mg beim ca. 78 kg schweren Erwachsenen)',
    sofortEffekt: { gcs: -8, systolischerRR: -10, herzfrequenz: -5 },
  },
  thiopental: {
    id: 'thiopental',
    benoetigtEinesVon: ZUGANG,
    benoetigtTeam: true,
    bindetZusaetzlichSek: 180,
    label: 'Thiopental (Notfallnarkose)',
    kategorie: 'A',
    art: 'medikament',
    qualifikation: 'notarzt',
    dauerSek: 60,
    hinweis:
      'Barbiturat, Alternative zu Propofol - hirndrucksenkend, deshalb bei isoliertem Schädel-Hirn-Trauma erwogen (hier nicht simuliert). Ebenfalls kreislaufdepressiv, nicht bei Instabilität.',
    indikation: 'Notfallnarkose zur Atemwegssicherung, Alternative zu Propofol.',
    dosierung:
      '3-5 mg/kg KG i.v. (Handlungsempfehlung: 300 mg beim ca. 78 kg schweren Erwachsenen)',
    sofortEffekt: { gcs: -8, systolischerRR: -12, atemfrequenz: -2 },
  },
  esketamin_narkose: {
    id: 'esketamin_narkose',
    benoetigtEinesVon: ZUGANG,
    benoetigtTeam: true,
    bindetZusaetzlichSek: 180,
    label: 'Esketamin (Notfallnarkose)',
    kategorie: 'A',
    art: 'medikament',
    qualifikation: 'notarzt',
    dauerSek: 60,
    hinweis:
      'Sympathomimetisch statt kreislaufdepressiv - Mittel der Wahl beim hämodynamisch instabilen Patienten (Handlungsempfehlung: "Opiat + Esketamin + Rocuronium" bei Instabilität). Eigener Katalogeintrag getrennt vom analgetischen Esketamin (→ `esketamin`) - anderer Dosisbereich, andere Bedeutung von Überdosierung.',
    indikation: 'Notfallnarkose zur Atemwegssicherung beim hämodynamisch instabilen Patienten.',
    dosierung:
      '1-2 mg/kg KG i.v. (Handlungsempfehlung: 80 mg beim ca. 78 kg schweren Erwachsenen); bei Ketamin statt Esketamin Dosis verdoppeln',
    sofortEffekt: { gcs: -8, systolischerRR: 8, herzfrequenz: 10 },
  },
  rocuronium: {
    id: 'rocuronium',
    benoetigtEinesVon: ['propofol', 'thiopental', 'esketamin_narkose'],
    label: 'Rocuronium (Relaxierung)',
    kategorie: 'A',
    art: 'medikament',
    qualifikation: 'notarzt',
    dauerSek: 45,
    hinweis:
      'Nicht-depolarisierendes Muskelrelaxans, nur nach eingeleiteter Narkose (nie ohne Sedierung - sonst wach und gelähmt). Lähmt auch die Atemmuskulatur vollständig: Team übernimmt die Beatmung. Große Sicherheitsspanne - eine Überdosis verschwendet Medikament und verlängert die Lähmung unnötig, ohne zusätzliche Organtoxizität (Ceiling-Effekt-Analogie zu Nalbuphin, → `domain.dosierung`).',
    indikation: 'Muskelrelaxierung nach eingeleiteter Notfallnarkose, unmittelbar vor der Intubation.',
    dosierung: '1,2 mg/kg KG i.v. (RSI-Dosis)',
    sofortEffekt: { atemfrequenz: -50 },
  },

  // --- B: Beatmung --------------------------------------------------
  sauerstoffgabe: {
    id: 'sauerstoffgabe',
    label: 'Sauerstoffgabe',
    kategorie: 'B',
    art: 'medikament',
    qualifikation: 'basis',
    dauerSek: 30,
    hinweis:
      'Nasenbrille unter 5 l/min, Maske ab 5 l/min. Hyperkapnierisiko bei COPD, Mukoviszidose, Thoraxdeformität, neuromuskulärer Erkrankung, BMI über 40. Cave Explosionsgefahr bei der Defibrillation.',
    indikation: 'Hypoxämie; CO-Intoxikation; Tauchunfall.',
    dosierung:
      'Ziel SpO2 92-96 %, bei Hyperkapnierisiko 88-92 %. Hochdosiert 15 l/min OHNE Zielwert bei schwerer Atemnot, CO-Intoxikation, Tauchunfall oder kritisch Krankem ohne Pulsoxymetriesignal - dort misst die Sättigung falsch hoch.',
    sofortEffekt: { spo2: 8 },
  },
  beatmung: {
    id: 'beatmung',
    label: 'Assistierte Beatmung',
    kategorie: 'B',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 60,
    hinweis:
      'Beutel-Masken-Beatmung, möglichst in Zwei-Helfer-Technik mit FiO2 1,0. Beatmungsdruck niedrig halten, zu große Volumina und Hyperventilation vermeiden (Magenüberblähung, Aspiration).',
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
    hinweis:
      'Maske erst manuell halten, Toleranz aufbauen. Start mit PEEP 5 / PS 5 mbar, Steigerung nach Sättigung und Tidalvolumen. Kontraindiziert bei Bewusstlosigkeit, fehlender Spontanatmung, Spannungspneumothorax, Erbrechen oder gastrointestinaler Blutung, Gesichtsverletzung und RRsys unter 90 mmHg. Abbruch bei zunehmender Erschöpfung oder Vigilanzminderung.',
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
    hinweis:
      '2. ICR medioklavikulär (Monaldi) oder 4. ICR vordere Axillarlinie (Bülau). Kanüle über 8 cm, senkrecht am Rippenoberrand. Nur Überbrückung bis zur ärztlichen Thoraxdrainage; bei erneuter Symptomatik ist eine zweite Punktion zulässig.',
    indikation: 'Spannungspneumothorax mit rasch zunehmender Instabilität.',
    sofortEffekt: { spo2: 12, systolischerRR: 15 },
  },
  oberkoerperhochlagerung: {
    id: 'oberkoerperhochlagerung',
    label: 'Oberkörperhochlagerung',
    kategorie: 'B',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 20,
    hinweis:
      'Bei Atemnot sitzend. Beim kardialen Lungenödem Herzbettlage: Oberkörper hoch, Beine tief. Beim Schädel-Hirn-Trauma 30 Grad, aber nur bei RRsys über 100 mmHg.',
    indikation: 'Dyspnoe; kardiales Lungenödem; Bronchialobstruktion; Pseudokrupp; Schädel-Hirn-Trauma.',
    sofortEffekt: { spo2: 3, atemfrequenz: -1 },
  },
  kapnografie: {
    id: 'kapnografie',
    label: 'Kapnografie anschließen',
    kategorie: 'B',
    art: 'basis',
    qualifikation: 'rettungssanitaeter',
    dauerSek: 30,
    hinweis:
      'Bestätigt und überwacht die Tubuslage fortlaufend. Unter Reanimation ist etCO2 über 15 mmHg ein Maß für die Qualität der Thoraxkompression; sonst Zielbereich 35-45 mmHg.',
    indikation: 'Jede Beatmung über Tubus oder extraglottischen Atemweg; Reanimation; NIV-Therapie.',
    benoetigtEinesVon: ['larynxmaske', 'intubation', 'cpap_niv', 'beatmung'],
  },
  thoraxdrainage: {
    id: 'thoraxdrainage',
    benoetigtEinesVon: ['thoraxentlastung'],
    label: 'Thoraxdrainage',
    kategorie: 'B',
    art: 'invasiv',
    qualifikation: 'notarzt',
    dauerSek: 300,
    hinweis:
      'Definitive Entlastung nach der überbrückenden Punktion - ärztliche Maßnahme. Bindet die knappste Ressource im MANV für fünf Minuten.',
    indikation: 'Spannungspneumothorax oder Hämatothorax nach überbrückender Entlastungspunktion.',
    sofortEffekt: { spo2: 8, systolischerRR: 8 },
  },
  epinephrin_inhalativ: {
    id: 'epinephrin_inhalativ',
    label: 'Epinephrin-Vernebelung',
    kategorie: 'B',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis:
      'Unverdünnt (1:1000) über Verneblermaske mit Sauerstoff. Kein Zugang nötig - der Weg für das Kind unter 4 Jahren und für die Schleimhautschwellung der oberen Atemwege. Ersetzt bei Anaphylaxie nicht die i.m.-Gabe.',
    indikation:
      'Obstruktion der oberen Atemwege durch Schleimhautschwellung; Pseudokrupp; Anaphylaxie mit A-/B-Problem; Bronchialobstruktion beim Kind unter 4 Jahren.',
    dosierung: '4 mg vernebeln, Repetition nach 10 min möglich',
    sofortEffekt: { spo2: 8, atemfrequenz: -2 },
  },
  salbutamol: {
    id: 'salbutamol',
    label: 'Salbutamol inhalativ',
    kategorie: 'B',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis:
      'ß2-Sympathomimetikum, Vernebelung mit Sauerstoff. Nicht unter 4 Jahren - dort stattdessen Epinephrin vernebeln. Keine Gabe bei symptomatischer Tachykardie oder Tachyarrhythmie; Cave ACS, HOCM, Schwangerschaft (Wehenhemmung).',
    indikation: 'Bronchialobstruktion.',
    dosierung: '> 12 J.: 2,5 mg inhalativ; 4-12 J.: 1,25 mg; einmalige Repetition nach 10 min',
    sofortEffekt: { spo2: 5, atemfrequenz: -2 },
  },
  ipratropium: {
    id: 'ipratropium',
    label: 'Ipratropiumbromid inhalativ',
    kategorie: 'B',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis:
      'Inhalatives Parasympatholytikum, mit Salbutamol kombinierbar. Vernebelte Lösung darf nicht in die Augen gelangen (Glaukomrisiko) - auf festen Sitz der Maske achten.',
    indikation: 'Bronchialobstruktion: Asthmaanfall, COPD-Exazerbation.',
    dosierung: '> 12 J.: 0,5 mg inhalativ; 6-12 J.: 0,25 mg; Repetition nach 30 min',
    sofortEffekt: { spo2: 3 },
  },
  prednisolon: {
    id: 'prednisolon',
    label: 'Prednisolon i.v. / rektal',
    kategorie: 'B',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis:
      'Glukokortikoid, Wirkeintritt verzögert. Beim Kleinkind rektal - kein Zugang nötig und ohne den Stress einer Punktion. Beim Pseudokrupp ist rektal der vorgesehene Weg.',
    indikation: 'Anaphylaxie; Bronchialobstruktion; Pseudokrupp.',
    dosierung:
      'Anaphylaxie: > 12 J. 250 mg i.v.; 30-60 kg 100 mg i.v. oder rektal; 15-30 kg 50 mg i.v. oder 100 mg rektal. Obstruktion: > 12 J. 80 mg i.v.; bis 12 J. 2 mg/kg KG i.v. (max. 80 mg) oder 100 mg rektal. Pseudokrupp: 100 mg rektal.',
    sofortEffekt: { spo2: 2 },
  },
  dimetinden: {
    id: 'dimetinden',
    label: 'Dimetinden i.v.',
    kategorie: 'B',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis:
      'H1-Antihistaminikum. Nicht bei Kindern unter 12 Jahren, nicht in Schwangerschaft und Stillzeit. Cave Glaukom und Epilepsie; wirkt sedierend.',
    indikation: 'Anaphylaxie.',
    dosierung: 'Erw. und Kinder ab 12 J.: 4-8 mg (0,1 mg/kg KG, max. 8 mg) langsam i.v.',
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
    hinweis:
      'Proximale Tibia medial der Tuberositas. Indiziert nach zwei frustranen i.v.-Versuchen oder wenn ein Zugang zwingend und i.v. unmöglich ist. Eine Lidocain-Gabe zur Analgesie ist für Notfallsanitäter/-innen nicht vorgesehen.',
    indikation: 'Kreislaufstillstand oder zwingender Zugang bei unmöglichem i.v.-Zugang.',
  },
  volumengabe: {
    id: 'volumengabe',
    label: 'Vollelektrolytlösung i.v.',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 120,
    hinweis:
      'Beim Trauma erst nach der Blutstillung. Bei nicht kontrollierbarer Blutung permissive Hypotension mit Ziel RRsys 80-90 mmHg - Ausnahme Schädel-Hirn-Trauma, spinales Trauma und Schwangerschaft, dort Normotension. Nicht bei kardialer Dekompensation oder Lungenödem.',
    indikation:
      'Blutung / hämorrhagischer Schock; Dehydratation; Anaphylaxie; Sepsis; Verbrennung; kritische Hyperglykämie.',
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
  reanimation: {
    id: 'reanimation',
    label: 'Reanimation (HLW) mit AED',
    kategorie: 'C',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 120,
    hinweis:
      'Erwachsene 30:2, Thoraxkompressionen 100-120/min und 5-6 cm tief; Kinder erst 5 Beatmungen, dann 15:2. Helferwechsel alle zwei Minuten. AED anschließen, sobald verfügbar.',
    indikation: 'Kreislaufstillstand: keine Reaktion, keine oder keine normale Atmung.',
    sofortEffekt: { herzfrequenz: 8, spo2: 3 },
  },
  aed: {
    id: 'aed',
    label: 'AED anwenden',
    kategorie: 'C',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 45,
    hinweis:
      'Elektroden nach Aufdruck kleben, den Ansagen des Geräts folgen, beim Schock berührt niemand den Patienten. Bei Kindern möglichst Kinderelektroden. Der AED gehört in jede Hand - er ist ausdrücklich keine Fachkraftmaßnahme.',
    indikation: 'Kreislaufstillstand - so früh wie verfügbar, parallel zur laufenden Reanimation.',
    sofortEffekt: { herzfrequenz: 10 },
  },
  mcpr: {
    id: 'mcpr',
    label: 'Thoraxkompressionsgerät (mCPR)',
    kategorie: 'C',
    art: 'invasiv',
    qualifikation: 'rettungssanitaeter',
    dauerSek: 60,
    hinweis:
      'Nur wenn hochwertige manuelle Kompression nicht praktikabel ist - Transport unter Reanimation, extreme Enge. Die Anbauzeit darf die Kompressionspause nicht über 5-10 s treiben und die Defibrillation nicht verzögern.',
    indikation:
      'Laufende Reanimation mit Transportindikation oder nicht sicher durchführbarer manueller Kompression.',
  },
  valsalva: {
    id: 'valsalva',
    label: 'Modifiziertes Valsalva-Manöver',
    kategorie: 'C',
    art: 'basis',
    qualifikation: 'notsan',
    dauerSek: 60,
    hinweis:
      '15 s gegen eine 10-20-ml-Spritze pressen lassen, danach flach lagern und die Beine 15 s um 45 Grad anheben. Deutlich wirksamer als das Standardmanöver und kostet nichts außer einer Minute.',
    indikation: 'Regelmäßige Schmalkomplextachykardie ohne bedrohliche Zeichen.',
    sofortEffekt: { herzfrequenz: -25 },
  },
  defibrillation: {
    id: 'defibrillation',
    label: 'Manuelle Defibrillation',
    kategorie: 'C',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis:
      'Klebeelektroden rechts-pektoral/apikal oder anterior-posterior. Thoraxkompressionen während der Ladephase fortsetzen, Hands-off unter 10 s, sofort danach weiter drücken. Kinder 4 J/kg KG. Abstand zu sauerstoffführenden Geräten.',
    indikation: 'Kreislaufstillstand bei Kammerflimmern oder pulsloser VT.',
  },
  kardioversion: {
    id: 'kardioversion',
    label: 'Kardioversion',
    kategorie: 'C',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 90,
    hinweis:
      'Synchronisierter Modus, AED-Funktion ausschalten, Reanimationsbereitschaft. Erwachsene 120-150 J biphasisch, bis zu drei Versuche mit Steigerung. Eine Analgosedierung ist für Notfallsanitäter/-innen nicht vorgesehen - Vigilanzminderung wird vorausgesetzt.',
    indikation: 'Kardiale Tachykardie mit Instabilität und Bewusstlosigkeit.',
  },
  schrittmacher: {
    id: 'schrittmacher',
    label: 'Externe Schrittmacheranlage',
    kategorie: 'C',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 120,
    hinweis:
      'Demand-Modus, Frequenz 70/min. Start 25 mA, in 10-mA-Schritten bis zu durchgehenden Captures, dann noch einmal 15 mA Sicherheitsüberschuss. Immer den Puls tasten - ein elektrisches Capture ohne Auswurf zählt nicht. Analgesie erst nach wirksamer Stimulation.',
    indikation: 'Bradykardie mit Instabilität und Bewusstlosigkeit.',
    sofortEffekt: { herzfrequenz: 25, systolischerRR: 10 },
  },
  epinephrin: {
    id: 'epinephrin',
    label: 'Epinephrin i.v. / i.o.',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis:
      'Sympathomimetikum. Nicht zeitgleich mit Natriumbikarbonat über denselben Zugang. Für die Anaphylaxie gibt es die eigene i.m.-Gabe - die wartet nicht auf einen Zugang.',
    indikation: 'Reanimation; instabile Bradykardie.',
    dosierung:
      'Reanimation Erw.: 1 mg i.v./i.o., Repetition alle 3-5 min; Kinder 0,01 mg/kg KG; bei Kammerflimmern/pulsloser VT erst nach der 3. Defibrillation, bei Asystolie/PEA so früh wie möglich. Instabile Bradykardie: 1 mg in 100 ml NaCl, davon 5 µg bolusweise jede Minute',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { systolischerRR: 20, herzfrequenz: 15 },
  },
  epinephrin_im: {
    id: 'epinephrin_im',
    benoetigtEinesVon: ['injektion_im'],
    label: 'Epinephrin i.m. (Anaphylaxie)',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis:
      'Mittleres Drittel des lateralen Oberschenkels. Die erste und wichtigste Maßnahme der Anaphylaxie - vor Antihistaminikum und Kortikoid, und ohne auf einen Zugang zu warten.',
    indikation: 'Anaphylaxie ab Stadium II mit Atemstörung oder Schock.',
    dosierung:
      '> 12 J.: 0,5 mg i.m.; 6-12 J.: 0,3 mg i.m.; unter 6 J.: 0,15 mg i.m.; Repetition alle 5 min bis zur Stabilisierung',
    sofortEffekt: { systolischerRR: 18, herzfrequenz: 10, spo2: 4 },
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
    dosierung:
      'Erw.: 300 mg nach der 3. Defibrillation, 150 mg nach der 5.; Kinder 5 mg/kg KG (max. 300 bzw. 150 mg). Nicht unter 3 Jahren (Benzylalkohol).',
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
    dosierung:
      'Erw.: 100 mg nach dem 3. Schock, 50 mg nach dem 5.; Kinder 1 mg/kg KG bzw. 0,5 mg/kg KG',
    benoetigtEinesVon: ZUGANG,
  },
  atropin: {
    id: 'atropin',
    label: 'Atropin i.v.',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis:
      'Parasympatholytikum; bei Wirkungslosigkeit kein weiterer Versuch, sondern Wechsel auf Epinephrin. Cave Engwinkelglaukom. Nicht unter 18 Jahren.',
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
    hinweis:
      'Betablocker. Nicht bei RRsys unter 120 mmHg, Herzfrequenz unter 60/min, AV-Block II. oder III. Grades oder pulmonaler Stauung; nicht zeitgleich mit Nitrat (beide senken den Druck). Cave BRASH-Syndrom. Nicht unter 18 Jahren.',
    indikation:
      'STEMI mit nicht schmerzbedingtem tachykardem Vorhofflimmern (über 100/min) oder multiplen VES.',
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
    hinweis:
      'Thrombozytenaggregationshemmer. Durch Notfallsanitäter/-innen nicht unter 18 Jahren. Nicht bei innerer oder nicht komprimierbarer Blutung und bei Verdacht auf akutes Aortensyndrom.',
    indikation: 'Akutes Koronarsyndrom, Myokardinfarkt.',
    dosierung: '250 mg langsam i.v. oder 200 mg oral, keine Repetition',
  },
  heparin: {
    id: 'heparin',
    label: 'Heparin i.v.',
    kategorie: 'C',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis:
      'Antikoagulans. Nicht bei intrakranieller Blutung oder Schlaganfall, akutem Aortensyndrom, aktiver Blutung oder heparininduzierter Thrombozytopenie in der Vorgeschichte.',
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
    hinweis:
      'Nicht unter RRsys 100 mmHg; sicherer i.v.-Zugang vorher. Keine Gabe nach PDE-5-Hemmern (Sildenafil u. a.) - lebensbedrohlicher Blutdruckabfall. Nicht bei inferiorem Infarkt mit rechtsventrikulärer Beteiligung, Schock, HOCM oder Verdacht auf erhöhten Hirndruck. Nicht unter 12 Jahren.',
    indikation:
      'Kardiales Lungenödem; hypertensiver Notfall mit kardialer Symptomatik; Myokardinfarkt (keine routinemäßige Gabe).',
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
    hinweis:
      'Antihypertensivum, α1-Blocker. Zielwerte: akutes Aortensyndrom RRsys 100-120 mmHg; beim Schlaganfall nicht unter 180 mmHg senken. Nicht in der Schwangerschaft, nicht unter 12 Jahren.',
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
    label: 'Esketamin i.v. / nasal',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 60,
    hinweis:
      'Analgetikum und dosisabhängig Anästhetikum; CO2-Überwachung anlegen. Wirkeintritt i.v. nach ca. 1 min, Wirkdauer ca. 20 min. Bei i.v.-Gabe Kombination mit Midazolam empfohlen. Nasal und i.m. auch ohne Zugang. Bei Ketamin statt Esketamin Dosis verdoppeln.',
    indikation: 'Starker Schmerz ab NRS 6.',
    dosierung:
      'i.v. 0,125-0,25 mg/kg KG, max. 0,25 mg/kg KG (6-Länder-SAA 2025; Kreis Steinfurt bis 0,5); nasal/i.m. 1 mg/kg KG',
    sofortEffekt: { schmerz: -6, herzfrequenz: -10 },
  },
  nalbuphin: {
    id: 'nalbuphin',
    label: 'Nalbuphin i.v. / nasal',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis:
      'Opioid-Agonist-Antagonist und - anders als Morphin und Fentanyl - kein Betäubungsmittel. Auch nasal, i.m. und s.c. wirksam, damit ohne Zugang gebbar. Im MANV deshalb oft das praktikabelste starke Analgetikum.',
    indikation: 'Starke Schmerzen ab NRS 6.',
    dosierung:
      'unter 65 J.: 0,2 mg/kg KG i.v.; ab 65 J.: 0,1 mg/kg KG; Repetition bis max. 20 mg; nasal/i.m./s.c. 0,2 mg/kg KG',
    sofortEffekt: { schmerz: -5, herzfrequenz: -10 },
  },
  fentanyl: {
    id: 'fentanyl',
    label: 'Fentanyl i.v. / nasal',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis:
      'Hochpotentes Opioid, BtM. Bei zu schneller Gabe Thoraxrigidität möglich. CO2-Überwachung anlegen. Nasal und i.m. auch ohne Zugang.',
    indikation: 'Starke Schmerzen ab NRS 6.',
    dosierung:
      'i.v. in 50-µg-Schritten alle 3-4 min, max. 2 µg/kg ideales KG; nasal/i.m. 2 µg/kg KG',
    sofortEffekt: { schmerz: -6, herzfrequenz: -10, atemfrequenz: -2 },
  },
  ibuprofen: {
    id: 'ibuprofen',
    label: 'Ibuprofen p.o. / rektal',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis:
      'Nicht-Opioid-Analgetikum, kein Zugang nötig. Keine Anwendung unter 6 Monaten bzw. 7 kg. Cave gastrointestinale Blutung, Niereninsuffizienz, Asthma.',
    indikation: 'Schmerzen ab NRS 3; Fieber beim Kind nach Krampfanfall.',
    dosierung:
      '7-9 kg: 50 mg; 10-15 kg: 100 mg; 16-19 kg: 150 mg; 20-39 kg: 200 mg; über 40 kg: 7,5 mg/kg KG; i.v. 600 mg ab 18 J.; max. 1200 mg/Tag',
    sofortEffekt: { schmerz: -3, temperatur: -0.4 },
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
    dosierung:
      'Erw.: 2 mg fraktioniert alle 3-4 min, max. 10 mg; Kinder 0,05 mg/kg KG alle 3-4 min',
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
    hinweis:
      'Nicht-Opioid-Analgetikum. i.v. nur mit Zugang, rektal ohne. Einmalige Kurzinfusion über 15 min, keine Repetition; Abstand zur letzten Gabe mindestens 6 h.',
    indikation: 'Schmerzen ab NRS 3; Fieber beim Kind nach Krampfanfall.',
    dosierung:
      '> 50 kg: 1000 mg als Kurzinfusion (1 g / 100 ml); 15-50 kg: 15 mg/kg KG i.v.; rektal 125 mg (7-12 kg) bzw. 250 mg (13-25 kg)',
    sofortEffekt: { schmerz: -3, temperatur: -0.4 },
  },
  midazolam: {
    id: 'midazolam',
    label: 'Midazolam',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis:
      'Benzodiazepin; buccal, nasal (MAD), i.m. und i.v. möglich - deshalb auch ohne Zugang gebbar. Achtung: Die Dosis zur Analgosedierung ist um ein Vielfaches niedriger als die zur Krampfdurchbrechung.',
    indikation: 'Komplizierter Krampfanfall / Fieberkrampf; Analgosedierung mit Esketamin.',
    dosierung:
      'Krampfanfall: 0,1 mg/kg KG i.v., einmalige Repetition; nasal 2,5 mg (bis 10 kg) / 5 mg (10-20 kg) / 10 mg (> 20 kg); buccal 2,5 mg (3-11 Mon.) / 5 mg (1-4 J.) / 7,5 mg (5-9 J.) / 10 mg (ab 10 J.); Erw. 10 mg i.m., nasal oder buccal; max. Gesamtdosis 20 mg. — Analgosedierung mit Esketamin: Kinder > 10 kg bis 2 mg, Erw. > 50 kg bis 3 mg, über 60 J. oder < 50 kg 1 mg langsam i.v.',
    sofortEffekt: { schmerz: -2, atemfrequenz: -2 },
  },
  diazepam_rektal: {
    id: 'diazepam_rektal',
    label: 'Diazepam-Rectiole',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis:
      'Benzodiazepin als Rectiole - der Weg zur Krampfdurchbrechung, wenn weder Zugang noch nasale/buccale Applikation möglich ist. Atmung überwachen.',
    indikation: 'Anhaltender Krampfanfall ohne verfügbaren Zugang.',
    dosierung: 'bis 15 kg: 5 mg rektal; ab 15 kg: 10 mg rektal',
    sofortEffekt: { atemfrequenz: -2 },
  },
  levetiracetam: {
    id: 'levetiracetam',
    label: 'Levetiracetam i.v.',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notarzt',
    dauerSek: 120,
    hinweis: 'Antikonvulsivum der zweiten Stufe, wenn Benzodiazepine den Status nicht durchbrechen.',
    indikation: 'Status epilepticus nach erfolgloser Benzodiazepingabe.',
    dosierung: 'Erw.: 60 mg/kg KG i.v., max. 4500 mg über 10 min',
    benoetigtEinesVon: ZUGANG,
  },
  lagerung_neuro: {
    id: 'lagerung_neuro',
    label: 'Lagerung bei Krampfanfall / Schlaganfall',
    kategorie: 'D',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 30,
    hinweis:
      'Oberkörper 30° hoch, beim Bewusstlosen stabile Seitenlage. Vor Sekundärverletzungen schützen, Umgebung polstern. Kein Beißkeil, nichts in den Mund.',
    indikation: 'Krampfanfall; zentrales neurologisches Defizit (Schlaganfall).',
    sofortEffekt: { spo2: 2 },
  },
  glucose: {
    id: 'glucose',
    label: 'Glucose i.v.',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 60,
    hinweis:
      'Auf sichere intravasale Lage achten, max. 20 %ig, zusammen mit einlaufender Vollelektrolytlösung. Beim wachen, schluckfähigen Patienten geht Glucose oral vor. Bei Verdacht auf Mangelernährung Thiamin vor der Glucose.',
    indikation: 'Hypoglykämie unter 60 mg/dl mit erforderlicher Fremdhilfe.',
    dosierung: 'Erw. und > 30 kg: 8-10 g i.v.; Kinder 0,2 g/kg KG; Repetitionen möglich',
    benoetigtEinesVon: ZUGANG,
    sofortEffekt: { blutzucker: 90, gcs: 4 },
  },
  glucose_oral: {
    id: 'glucose_oral',
    label: 'Glucose oral',
    kategorie: 'D',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 30,
    hinweis:
      'Traubenzucker, Glucosegel oder gezuckertes Getränk. Beim wachen, schluckfähigen Patienten der leitliniengemäße Erstweg - noch vor jedem Zugang.',
    indikation: 'Hypoglykämie beim wachen Patienten mit erhaltenen Schutzreflexen und Schluckfähigkeit.',
    sofortEffekt: { blutzucker: 60, gcs: 2 },
  },
  glucagon: {
    id: 'glucagon',
    label: 'Glucagon i.m. / nasal',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis:
      'Die Antwort auf "Hypoglykämie ohne Zugang". Wirkt nur bei gefüllten Glykogenspeichern - bei Alkoholabusus oder Mangelernährung unzuverlässig. Nach Aufwachen Kohlenhydrate nachgeben.',
    indikation: 'Hypoglykämie unter 60 mg/dl mit erforderlicher Fremdhilfe, wenn kein Zugang gelingt.',
    dosierung: 'über 25 kg: 1 mg i.m.; unter 25 kg: 0,5 mg i.m.; ab 4 J.: 3 mg nasal',
    sofortEffekt: { blutzucker: 70, gcs: 3 },
  },
  naloxon: {
    id: 'naloxon',
    label: 'Naloxon',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 45,
    hinweis:
      'Opioid-Antidot; fraktioniert bis zur suffizienten Atmung, nicht bis zur vollen Vigilanz. Wirkt kürzer als die meisten Opioide - nach Abbau kann die Opioidwirkung zurückkehren, deshalb weiter überwachen.',
    indikation: 'Opioid-Intoxikation bei Versagen der primären Maßnahmen.',
    dosierung:
      '0,1 mg fraktioniert alle 2 min i.v.; Kinder 0,01 mg/kg KG; ohne Zugang 0,8 mg i.m. oder nasal (MAD)',
    sofortEffekt: { atemfrequenz: 6, gcs: 4, spo2: 5 },
  },
  aktivkohle: {
    id: 'aktivkohle',
    label: 'Medizinische Kohle (Aktivkohle) p.o.',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'rettungssanitaeter',
    dauerSek: 60,
    hinweis:
      'Keine Routinemaßnahme - Rücksprache mit der Giftinformationszentrale. Unwirksam bei Säuren, Laugen, Alkoholen, Metallen und Lösungsmitteln. Ohne intakte Schutzreflexe kontraindiziert (Aspiration). Regional sehr unterschiedlich freigegeben: In den SAA/BPR der ÄLRD (6 Länder 2025, Kreis Steinfurt 2026) kommt Kohle nicht vor; wo es sie gibt, ist sie meist ärztlich freigegeben. Die hier hinterlegte Stufe folgt der Malteser-Ausbildungsbroschüre und ist in den Maßnahmenrechten anpassbar.',
    indikation: 'Orale Vergiftung innerhalb einer Stunde nach Einnahme, wacher Patient mit intakten Schutzreflexen.',
    dosierung: '0,5-1 g/kg KG p.o.; Erw. 50 g (bis 100 g); 4-12 J. halbe, unter 4 J. viertel Flasche',
  },
  thiamin: {
    id: 'thiamin',
    label: 'Thiamin i.v.',
    kategorie: 'D',
    art: 'medikament',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis:
      'Vitamin B1 - vor der Glucose geben. Eine Glucosegabe ohne Thiamin kann bei Mangelernährung ein irreversibles Wernicke-Korsakow-Syndrom auslösen. Nicht unter 18 Jahren. Regional unterschiedlich freigegeben.',
    indikation:
      'Bewusstseinsstörung, Delir, Hypoglykämie oder Krampfanfall UND Verdacht auf Mangelernährung (v. a. Alkoholabusus).',
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
    hinweis:
      'Parasympatholytikum, Spasmolyse. Wirkeintritt erst nach ca. 15 min. Bei Nierenkoliken nach Leitlinie (AWMF 043-025) nicht mehr angezeigt.',
    indikation: 'Starke kolikartige abdominelle Schmerzen.',
    dosierung: '0,3 mg/kg KG langsam i.v., Repetition nach 5 min, max. 20 mg',
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
    hinweis:
      'Vakuummatratze mit Kopffixierung ist die effektivste Ganzkörperimmobilisation; die Schaufeltrage immobilisiert nur eingeschränkt und dient dem Umlagern. HWS zuerst manuell in Neutralposition - bei Schmerz oder zunehmendem Defizit dort belassen. Bei Schädel-Hirn-Trauma starre Zervikalstütze abwägen (Hirndruck).',
    indikation:
      'Fraktur; Wirbelsäulenverletzung bei Trauma mit GCS unter 15, neurologischem Defizit, Wirbelsäulenschmerz oder entsprechendem Unfallmechanismus. Bewusstlose nach Trauma gelten bis zum Beweis des Gegenteils als wirbelsäulenverletzt.',
    sofortEffekt: { schmerz: -2 },
  },
  fahrzeugrettung: {
    id: 'fahrzeugrettung',
    label: 'Spineboard-/KED-Rettung aus dem Fahrzeug',
    kategorie: 'E',
    art: 'basis',
    qualifikation: 'rettungssanitaeter',
    dauerSek: 240,
    hinweis:
      'KED-Korsett nur beim unkritischen sitzenden Patienten - die Anlage dauert zu lange für einen kritischen. Bei kritischem Zustand oder Sofortrettungsindikation (Feuer, Reanimationspflicht) stattdessen schnelle Rettung mit manuell stabilisierter HWS. Spineboard für die schnelle Rettung, nicht für lange Transportwege.',
    indikation:
      'Sitzende, nicht eingeklemmte Person im Fahrzeug mit Verdacht auf Wirbelsäulenverletzung und stabilem Zustand.',
    sofortEffekt: { schmerz: -1 },
  },
  achsengerechte_immobilisation: {
    id: 'achsengerechte_immobilisation',
    label: 'Achsengerechte Immobilisation / Extension',
    kategorie: 'E',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 120,
    hinweis:
      'Längszug am distalen Frakturanteil, proximal gegenhalten; vorher Analgesie, danach zwingend immobilisieren. DMS vor und nach der Maßnahme prüfen und dokumentieren; bei Verschlechterung sofort zurück in die Ausgangsstellung. Kein zu starker Zug (Logendruck).',
    indikation:
      'Grob dislozierte Fraktur oder Luxation - zwingend bei gestörter Durchblutung, außerdem bei Gewebespannung, langer Rettungszeit, extremen Schmerzen oder transportbehindernder Fehlstellung.',
    sofortEffekt: { schmerz: -3, systolischerRR: 3 },
  },
  gefahrenbeurteilung: {
    id: 'gefahrenbeurteilung',
    label: 'Gefahrenbeurteilung / Eigenschutz',
    kategorie: 'E',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 20,
    hinweis:
      'Persönliche Schutzausrüstung anlegen, Wirkkette aus Ursache, Wirkung und bedrohtem Objekt prüfen, bei unkalkulierbarem Risiko zurückziehen. Der Vorsichtung ist die Frage nach dem Eigenschutz ausdrücklich vorangestellt.',
    indikation: 'Vor jeder Patientenmaßnahme und vor jeder Vorsichtung.',
  },
  wundversorgung: {
    id: 'wundversorgung',
    label: 'Wunde reinigen und steril verbinden',
    kategorie: 'E',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 60,
    hinweis:
      'Grobe Verschmutzung entfernen, großzügig steril verbinden, danach wie eine geschlossene Verletzung immobilisieren. Der Verband bleibt bis zur Klinik.',
    indikation: 'Jede offene Wunde und jede offene Fraktur.',
    sofortEffekt: { schmerz: -1 },
  },
  verbrennungsversorgung: {
    id: 'verbrennungsversorgung',
    label: 'Brandwunde versorgen',
    kategorie: 'E',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 90,
    hinweis:
      'Der Rettungsdienst kühlt nicht aktiv und beendet eine bereits laufende Kühlung - die Unterkühlung schadet mehr als die Kühlung nützt. Sterile, trockene, nicht verklebende Auflage; sie ist selbst Teil der Analgesie. Danach konsequenter Wärmeerhalt.',
    indikation: 'Thermische Verletzung jeden Grades.',
    sofortEffekt: { schmerz: -2 },
  },
  amputatversorgung: {
    id: 'amputatversorgung',
    label: 'Amputat asservieren',
    kategorie: 'E',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 90,
    hinweis:
      'Stumpf schienen und steril verbinden. Amputat grob reinigen, in sterile feuchte Kompressen wickeln, Doppelbeutelmethode: innerer Beutel in einen Beutel mit Eiswasser (ein Drittel Eis, zwei Drittel Wasser). Nie direkter Eiskontakt. Behälter mit Name und Kühlbeginn beschriften.',
    indikation: 'Traumatische Amputation.',
  },
  waermeerhalt: {
    id: 'waermeerhalt',
    label: 'Wärmeerhalt',
    kategorie: 'E',
    art: 'basis',
    qualifikation: 'basis',
    dauerSek: 30,
    hinweis:
      'Nasse und kalte Kleidung entfernen (aufschneiden, nicht ausziehen), abtrocknen, Rettungsdecke; Fahrzeug vorheizen, Infusionen anwärmen. Hypothermie ist Teil der letalen Trias, Ziel ist Normothermie über 36 Grad. Unterkühlte nicht aktiv bewegen (Afterdrop).',
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
    hinweis:
      'Zuwendung, Reizabschirmung, Information. Bei SK IV die palliative Kernmaßnahme, bei SK III oft die einzige nötige.',
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
    hinweis:
      'H1-Antihistaminikum als Antiemetikum, langsam über 2 min. Keine Anwendung bei akuter Bronchialobstruktion, Engwinkelglaukom, Epilepsie oder Long-QT-Syndrom; keine rektale Gabe unter 1 Jahr.',
    indikation: 'Übelkeit und Erbrechen.',
    dosierung:
      '> 14 J.: 62 mg langsam i.v. über 2 min; 6-14 J.: 40 mg i.v. oder rektal; unter 6 J.: 40 mg rektal',
    benoetigtEinesVon: ZUGANG,
  },
  injektion_im: {
    id: 'injektion_im',
    label: 'Intramuskuläre Injektion',
    kategorie: 'C',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 30,
    hinweis:
      'Mittleres Drittel des lateralen Oberschenkels, senkrecht. Nicht bei Kreislaufstillstand oder manifestem Schock - dort wird nichts resorbiert. Nicht in paretische oder verletzte Extremitäten, nicht bei Antikoagulation.',
    indikation: 'Medikamentengabe ohne verfügbaren i.v.-Zugang.',
  },
  gabe_intranasal: {
    id: 'gabe_intranasal',
    label: 'Intranasale Medikamentengabe',
    kategorie: 'C',
    art: 'invasiv',
    qualifikation: 'notsan',
    dauerSek: 20,
    hinweis:
      'Zerstäuber (MAD), höchstkonzentrierte Lösung, maximal 1 ml pro Nasenloch. Nicht bei Nasenverletzung, Nasenbluten oder starker Schleimbildung.',
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
  rettungshelfer: 'RH',
  rettungssanitaeter: 'RS',
  notsan: 'NotSan',
  notarzt: 'Notärztin',
};

/**
 * Ausgeschriebene Bezeichnung für die Qualifikationswahl im Wartebereich
 * (→ `domain.qualifikation`) - anders als `QUALIFIKATION_LABEL`, das als kurze
 * Ausnahme-Kennzeichnung an einer Maßnahme steht und bei `basis` leer bleibt.
 */
export const QUALIFIKATION_VOLLNAME: Record<Qualifikation, string> = {
  basis: 'Sanitätshelfer/-in / Einsatzsanitäter/-in (Basis)',
  rettungshelfer: 'Rettungshelfer/-in',
  rettungssanitaeter: 'Rettungssanitäter/-in',
  notsan: 'Notfallsanitäter/-in',
  notarzt: 'Notärztin/Notarzt',
};

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
