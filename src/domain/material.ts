import type { Einsatzabschnitt, Fahrzeug, FahrzeugTyp, MassnahmeId, MaterialTyp } from './types';

/**
 * @anker domain.material Fahrzeug-Bestückung und Materialverbrauch je Maßnahme
 *
 * Quellen: „Bestückung RTW Kreis Steinfurt", Stand 01.02.2025 (ÄLRD, 15
 * Seiten, vollständig ausgewertet - `RTW_BESTAND`); „Packliste AB ManV Kreis
 * Steinfurt" (vollständig ausgewertet - `AB_MANV_BESTAND`); BBK-Begleitheft
 * „GW San: Mercedes Benz Sprinter 519 CDI DOKA 4x4" (Bund-Ausführung NRW,
 * vollständig ausgewertet - `GW_SAN_BESTAND`). NEF/KTW/GW-Rett haben keine
 * gleichwertig detaillierte Quelle - sie werden aus den echten Zahlen
 * hergeleitet (`skaliere`/`nurTypen`) und sind unten je Block klar als
 * Schätzung gekennzeichnet. ELW 2 und GW-Log führen kein Patientenmaterial.
 *
 * Ein Fahrzeug materialisiert seinen Bestand beim Öffnen der Sitzung
 * (`materialAusVorlage`, analog zu `fahrzeugAusVorlage`) und verbraucht ihn
 * danach unabhängig von den übrigen Fahrzeugen seines Typs. Wie die
 * Qualifikationssperre ist die Durchsetzung bewusst nur clientseitig
 * (`materialVerfuegbar` für die UI-Sperre); der Reducer zieht Material über
 * `verbraucheMaterial` unabhängig davon ab, aber nie unter 0.
 */

// --- RTW: reale Bestückung Kreis Steinfurt (Stand 01.02.2025) --------------
const RTW_BESTAND: Partial<Record<MaterialTyp, number>> = {
  // Verbandmaterial/Blutstillung, Fach 6+8
  druckverband: 6, // Verbandpäckchen groß (4) + Druckverband "Israeli Bandage" (2)
  haemostyptikum: 2, // ChitoGauze XR Pro
  tourniquet: 4,
  beckengurt: 2, // Beckengurt S+L, Fach 12
  verbandmaterial: 18, // Saugkompressen/Mullkompresse/Wundschnellverband/Mullbinde, Fach 8
  brandwundenverband: 4, // Verbandtuch Aluderm, Fach 8
  replantatbeutel: 2, // Replantatbeutel Bein+Hand, Fach 6
  // Atemweg/Beatmung, Fach 7+9 + Absaugkatheter-Fach
  guedeltubus: 4, // Gr. 2-5 je 1
  wendltubus: 2, // Ch24+28
  larynxmaske: 3, // LMA Supreme Gr. 3/4/5
  endotrachealtubus: 12, // Gr. 5,0-8,5 summiert
  koniotomieset: 1, // nicht einzeln gelistet - ein Notfallset geschätzt
  absaugkatheter: 15, // CH12/18/8 je 5
  beatmungsbeutel: 1, // Beatmungsbeutelset Erwachsene
  cpapmaske: 3, // CPAP-Einmalmaske S/M/L
  kapnografieadapter: 4, // CO2-Adapter, Fach 2 Schütte 1
  sauerstoffflasche: 3, // 2×10l + 1×2l, Außenfach
  thoraxentlastungsnadel: 2, // Fach 2 Schütte 2
  thoraxdrainageset: 1, // Modultasche rot "DUO", Fach 4
  // Zugänge/Infusion, Fach 2+3+11 + Modultasche EZ-IO
  ivkanuele: 50, // Venenverweilkanüle 24G-14G summiert
  ionadel: 3, // Intraossäre Nadel 15/25/45mm
  infusion: 9, // Jonosteril 500ml, Fach 11
  // Immobilisation, Fach 8 + Außenfach Beifahrerseite
  stifneck: 4, // Stifneck Erwachsene+Kind, Fach 13
  vakuummatratze: 1,
  kedsystem: 1, // KED-System
  universalschiene: 4, // Gr. XL+M je 2
  // Medikamente, Fach 2 Ebene 4 + Fach 3 Medikamentenboard + BTM-Fach + Fach 5 Kühlschrank
  amiodaron: 3,
  atropin: 3,
  ass: 4, // ASS Tablette (2) + ASS 500mg/5ml i.v. (2)
  butylscopolamin: 2,
  dimenhydrinat: 2,
  dimetinden: 2,
  epinephrin: 2, // Suprarenin, Fach 5 Kühlschrank
  esketamin: 3, // dieselbe Ampulle für `esketamin`/`esketamin_narkose`
  furosemid: 4,
  glucose: 2, // Glukose 20% 100ml
  glucose_oral: 3, // Jubin 40g
  heparin: 2,
  ipratropium: 4,
  lidocain: 1,
  metoprolol: 2,
  midazolam: 6, // Medikamentenboard (4) + BTM-Fach (2)
  naloxon: 2,
  nitrat: 1, // Nitrolingualspray
  paracetamol: 2,
  prednisolon: 2,
  propofol: 1,
  rocuronium: 2, // Fach 5 Kühlschrank
  salbutamol: 4,
  thiamin: 1,
  thiopental: 2,
  tranexamsaeure: 2,
  urapidil: 3,
};

// --- GW-San: reale Bestückung nach BBK-Begleitheft (Bund-Ausführung NRW) ---
// Führt laut Begleitheft keine Medikamente, keine Larynxmaske, kein
// Tourniquet und keinen Koniotomiesatz - Sanitätsdienst-Grundausstattung,
// kein ärztlich/NotSan-gebundenes Material.
const GW_SAN_BESTAND: Partial<Record<MaterialTyp, number>> = {
  druckverband: 100, // 25 Erste-Hilfe-Packs × je 2 Verbandpäckchen G + 2 M
  verbandmaterial: 520, // Verbandmittel aus 10 Sanitätsrucksäcken + Erste-Hilfe-Packs, aggregiert
  brandwundenverband: 26, // 25 Erste-Hilfe-Packs + 1 Rucksack
  stifneck: 20, // Immobilisierungskragen Erwachsene (10) + Kinder (10)
  universalschiene: 10, // Aluminium-Formschienensätze
  vakuummatratze: 1,
  kedsystem: 5, // Spineboards (kein KED geführt, gleiche Maßnahme)
  guedeltubus: 30, // 10 Sanitätsrucksäcke × 3 Größen
  endotrachealtubus: 80, // 10 Rucksäcke × (6 Erwachsenen- + 2 Kindergrößen)
  absaugkatheter: 60, // 10 Rucksäcke × 3 Größen × 2
  beatmungsbeutel: 20, // 10 Rucksäcke × (1 Erwachsene + 1 Kind)
  sauerstoffflasche: 10, // 10 Rucksäcke × 1
  ivkanuele: 80, // 10 Rucksäcke × 3 + 25 Erste-Hilfe-Packs × 2
  infusion: 35, // 10 Rucksäcke × 1 + 25 Erste-Hilfe-Packs × 1
};

// --- AB-MANV: reale Packliste Kreis Steinfurt -------------------------------
const AB_MANV_BESTAND: Partial<Record<MaterialTyp, number>> = {
  tourniquet: 120, // 50 Verletztenversorgungssets × 2 + Sichtungskiste 20
  druckverband: 140, // Verletztenversorgungssets × 2 (100) + Trauma-Kisten (40)
  haemostyptikum: 50, // Verletztenversorgungssets × 1
  beckengurt: 8, // Trauma-Kisten S (4) + L (4)
  stifneck: 30, // Immobilisationskragen Erwachsene (20) + Kinder (10)
  absaugkatheter: 80, // Atmungs-Kisten, Set je 40 grün/rot
  guedeltubus: 24, // 8 Sets × 3 Größen
  wendltubus: 110, // Verletztenversorgungssets (50) + Atmungs-/Sichtungskisten (60)
  endotrachealtubus: 72, // Erwachsene 8 Sets × 3 Größen (24) + Kinder 8 Sets × 6 Größen (48)
  koniotomieset: 14, // Erwachsene (10) + Kinder (4)
  thoraxentlastungsnadel: 100, // Verletztenversorgungssets × 2
  thoraxdrainageset: 10, // Thoraxdrainagen-Komplettsets Typ Kr. Steinfurt
  sauerstoffflasche: 16, // 8 Transportkästen × 2× 5l-Flaschen
  beatmungsbeutel: 16, // Erwachsene (8) + Kinder (8)
  ivkanuele: 600, // Verletztenversorgungssets (400) + Trauma-Kisten (200)
  ionadel: 60, // 4 EZ-IO-Bohrer-Sets × 15 Nadeln
  infusion: 130, // Verletztenversorgungssets (50) + Medikamentenkisten Jonosteril/Tetraspan (80)
  kedsystem: 10, // Spineboards
  universalschiene: 30, // Aluminium-Formschienen "Samsplint"
  verbandmaterial: 1040, // Kompressen/Verbandpäckchen/Mullbinden aus Trauma-Kisten + Sets, aggregiert
  esketamin: 200, // Ampullen 50mg/2ml
  epinephrin: 20, // Durchstechflaschen Suprarenin
  midazolam: 120, // Ampullen 5mg/5ml
  lidocain: 24, // Xylocain 2% 5ml
  rocuronium: 40, // 5ml 10mg
};

function skaliere(
  basis: Partial<Record<MaterialTyp, number>>,
  faktor: number,
): Partial<Record<MaterialTyp, number>> {
  const ergebnis: Partial<Record<MaterialTyp, number>> = {};
  for (const [typ, menge] of Object.entries(basis) as [MaterialTyp, number][]) {
    ergebnis[typ] = Math.max(1, Math.round(menge * faktor));
  }
  return ergebnis;
}

function nurTypen(
  basis: Partial<Record<MaterialTyp, number>>,
  typen: MaterialTyp[],
): Partial<Record<MaterialTyp, number>> {
  const ergebnis: Partial<Record<MaterialTyp, number>> = {};
  for (const typ of typen) {
    const menge = basis[typ];
    if (menge !== undefined) ergebnis[typ] = menge;
  }
  return ergebnis;
}

// NEF transportiert nicht und versorgt nur einen Patienten gleichzeitig -
// dieselbe Auswahl wie RTW ohne die reinen Transport-/Lagerungs-Items,
// Menge halbiert (aufgerundet). Schätzung, keine eigene Quelle gefunden.
const NEF_TYPEN: MaterialTyp[] = [
  'druckverband', 'haemostyptikum', 'tourniquet', 'absaugkatheter', 'guedeltubus',
  'wendltubus', 'larynxmaske', 'endotrachealtubus', 'koniotomieset', 'beatmungsbeutel',
  'cpapmaske', 'kapnografieadapter', 'sauerstoffflasche', 'thoraxentlastungsnadel',
  'thoraxdrainageset', 'ivkanuele', 'ionadel', 'infusion',
  'amiodaron', 'atropin', 'ass', 'butylscopolamin', 'dimenhydrinat', 'dimetinden',
  'epinephrin', 'esketamin', 'furosemid', 'glucose', 'glucose_oral', 'heparin',
  'ipratropium', 'lidocain', 'metoprolol', 'midazolam', 'naloxon', 'nitrat',
  'paracetamol', 'prednisolon', 'propofol', 'rocuronium', 'salbutamol', 'thiamin',
  'thiopental', 'tranexamsaeure', 'urapidil',
];

// KTW transportiert nur gehfähige/stabile Patienten ohne Notfallausstattung -
// nur Basismaterial, ein Viertel der RTW-Menge (aufgerundet). Schätzung.
const KTW_TYPEN: MaterialTyp[] = [
  'druckverband', 'verbandmaterial', 'stifneck', 'universalschiene', 'beckengurt',
  'sauerstoffflasche',
];

/**
 * Bestückung je Fahrzeugtyp. `rtw`, `gw_san` und `ab_manv` sind reale
 * Kreis-Steinfurt-/Bund-Zahlen (→ Kommentare oben); `nef`/`ktw`/`gw_rett`
 * sind daraus hergeleitete Schätzungen; `elw2`/`gw_log` führen kein
 * Patientenmaterial (Führungs-/Logistikfahrzeuge).
 */
export const BESTUECKUNG: Record<FahrzeugTyp, Partial<Record<MaterialTyp, number>>> = {
  rtw: RTW_BESTAND,
  nef: skaliere(nurTypen(RTW_BESTAND, NEF_TYPEN), 0.5),
  ktw: skaliere(nurTypen(RTW_BESTAND, KTW_TYPEN), 0.25),
  // Keine eigene Quelle für GW-Rett gefunden - hergeleitet aus den echten
  // GW-San-Zahlen im Verhältnis der bereits hinterlegten Patientenkapazität
  // (13 statt 25, → `FAHRZEUGTYP_INFO`), da beide derselben Gerätewagen-
  // Familie angehören.
  gw_rett: skaliere(GW_SAN_BESTAND, 13 / 25),
  gw_san: GW_SAN_BESTAND,
  ab_manv: AB_MANV_BESTAND,
  elw2: {},
  gw_log: {},
};

/** Kopie des Katalog-Bestands - Verbräuche verändern nie `BESTUECKUNG` selbst. */
export function materialAusVorlage(typ: FahrzeugTyp): Partial<Record<MaterialTyp, number>> {
  return { ...BESTUECKUNG[typ] };
}

export const MATERIAL_LABEL: Record<MaterialTyp, string> = {
  druckverband: 'Druckverband',
  haemostyptikum: 'Hämostyptikum',
  tourniquet: 'Tourniquet',
  beckengurt: 'Beckenschlinge',
  verbandmaterial: 'Wundverband',
  brandwundenverband: 'Brandwundenverband',
  replantatbeutel: 'Replantatbeutel',
  guedeltubus: 'Guedeltubus',
  wendltubus: 'Wendltubus',
  larynxmaske: 'Larynxmaske',
  endotrachealtubus: 'Endotrachealtubus',
  koniotomieset: 'Koniotomieset',
  absaugkatheter: 'Absaugkatheter',
  beatmungsbeutel: 'Beatmungsbeutel',
  cpapmaske: 'CPAP-Maske',
  kapnografieadapter: 'CO2-Adapter',
  sauerstoffflasche: 'Sauerstoffflasche',
  thoraxentlastungsnadel: 'Thoraxentlastungsnadel',
  thoraxdrainageset: 'Thoraxdrainage-Set',
  ivkanuele: 'Venenverweilkanüle',
  ionadel: 'Intraossäre Nadel',
  infusion: 'Infusion',
  stifneck: 'Zervikalstütze',
  vakuummatratze: 'Vakuummatratze',
  kedsystem: 'Spineboard/KED-System',
  universalschiene: 'Universalschiene',
  amiodaron: 'Amiodaron',
  atropin: 'Atropin',
  ass: 'ASS',
  butylscopolamin: 'Butylscopolamin',
  dimenhydrinat: 'Dimenhydrinat',
  dimetinden: 'Dimetinden',
  epinephrin: 'Epinephrin',
  esketamin: 'Esketamin',
  furosemid: 'Furosemid',
  glucose: 'Glucose',
  glucose_oral: 'Glucose oral',
  heparin: 'Heparin',
  ipratropium: 'Ipratropiumbromid',
  lidocain: 'Lidocain',
  metoprolol: 'Metoprolol',
  midazolam: 'Midazolam',
  naloxon: 'Naloxon',
  nitrat: 'Glyceroltrinitrat',
  paracetamol: 'Paracetamol',
  prednisolon: 'Prednisolon',
  propofol: 'Propofol',
  rocuronium: 'Rocuronium',
  salbutamol: 'Salbutamol',
  thiamin: 'Thiamin',
  thiopental: 'Thiopental',
  tranexamsaeure: 'Tranexamsäure',
  urapidil: 'Urapidil',
};

/**
 * Welche Maßnahme welchen MaterialTyp verbraucht. Maßnahmen ohne Eintrag
 * sind unlimitiert - entweder ohne Einwegartikel (Diagnostik, Lagerungen,
 * Gerätezubehör wie Defibrillation/Monitoring) oder ohne auffindbare
 * Bestückungsquelle (u. a. fentanyl, nalbuphin, diazepam_rektal,
 * levetiracetam, glucagon, aktivkohle, epinephrin_im, epinephrin_inhalativ -
 * in separaten Checklisten außerhalb der ausgewerteten Dokumente).
 */
export const MASSNAHME_MATERIAL: Partial<Record<MassnahmeId, MaterialTyp>> = {
  blutstillung: 'druckverband',
  wundtamponade: 'haemostyptikum',
  tourniquet: 'tourniquet',
  beckenschlinge: 'beckengurt',
  hws_immobilisation: 'stifneck',
  absaugen_oral: 'absaugkatheter',
  absaugen_endobronchial: 'absaugkatheter',
  guedeltubus: 'guedeltubus',
  wendltubus: 'wendltubus',
  larynxmaske: 'larynxmaske',
  intubation: 'endotrachealtubus',
  koniotomie: 'koniotomieset',
  thoraxentlastung: 'thoraxentlastungsnadel',
  thoraxdrainage: 'thoraxdrainageset',
  kapnografie: 'kapnografieadapter',
  cpap_niv: 'cpapmaske',
  sauerstoffgabe: 'sauerstoffflasche',
  beatmung: 'beatmungsbeutel',
  zugang_iv: 'ivkanuele',
  zugang_io: 'ionadel',
  volumengabe: 'infusion',
  immobilisation: 'vakuummatratze',
  fahrzeugrettung: 'kedsystem',
  achsengerechte_immobilisation: 'universalschiene',
  wundversorgung: 'verbandmaterial',
  verbrennungsversorgung: 'brandwundenverband',
  amputatversorgung: 'replantatbeutel',
  amiodaron: 'amiodaron',
  atropin: 'atropin',
  ass: 'ass',
  butylscopolamin: 'butylscopolamin',
  dimenhydrinat: 'dimenhydrinat',
  dimetinden: 'dimetinden',
  epinephrin: 'epinephrin',
  esketamin: 'esketamin',
  esketamin_narkose: 'esketamin',
  furosemid: 'furosemid',
  glucose: 'glucose',
  glucose_oral: 'glucose_oral',
  heparin: 'heparin',
  ipratropium: 'ipratropium',
  lidocain: 'lidocain',
  metoprolol: 'metoprolol',
  midazolam: 'midazolam',
  naloxon: 'naloxon',
  nitrat: 'nitrat',
  paracetamol: 'paracetamol',
  prednisolon: 'prednisolon',
  propofol: 'propofol',
  rocuronium: 'rocuronium',
  salbutamol: 'salbutamol',
  thiamin: 'thiamin',
  thiopental: 'thiopental',
  tranexamsaeure: 'tranexamsaeure',
  urapidil: 'urapidil',
};

/**
 * Ob eine Maßnahme in diesem Abschnitt ausgeführt werden kann: ohne
 * verknüpften MaterialTyp immer; ohne Fahrzeuge im Spiel (Solo, oder eine
 * Sitzung ohne konfigurierte Fahrzeuge) immer (→ `domain.fuehrung`,
 * `darfFahrzeugeDisponieren` folgt demselben Bypass-Muster); sonst nur,
 * wenn mindestens ein Fahrzeug im selben Abschnitt noch Bestand hat.
 */
export function materialVerfuegbar(
  massnahmeId: MassnahmeId,
  abschnitt: Einsatzabschnitt,
  fahrzeuge: Fahrzeug[],
): boolean {
  const materialTyp = MASSNAHME_MATERIAL[massnahmeId];
  if (!materialTyp) return true;
  if (fahrzeuge.length === 0) return true;
  return fahrzeuge
    .filter((fahrzeug) => fahrzeug.abschnitt === abschnitt)
    .some((fahrzeug) => (fahrzeug.material[materialTyp] ?? 0) > 0);
}

/**
 * Zieht 1 Einheit vom ersten Fahrzeug mit Bestand im Abschnitt ab. Reine
 * Funktion, kein Hard-Block: ohne Treffer (kein verknüpfter Typ, keine
 * Fahrzeuge, oder Bestand überall 0) unverändert zurückgegeben - die
 * eigentliche Sperre ist `materialVerfuegbar` im UI, hier kann höchstens
 * eine übersteuerte Sperre wirkungslos bleiben, nie negativer Bestand
 * entstehen.
 */
export function verbraucheMaterial(
  fahrzeuge: Fahrzeug[],
  massnahmeId: MassnahmeId,
  abschnitt: Einsatzabschnitt,
): Fahrzeug[] {
  const materialTyp = MASSNAHME_MATERIAL[massnahmeId];
  if (!materialTyp) return fahrzeuge;
  const ziel = fahrzeuge.find(
    (fahrzeug) => fahrzeug.abschnitt === abschnitt && (fahrzeug.material[materialTyp] ?? 0) > 0,
  );
  if (!ziel) return fahrzeuge;
  return fahrzeuge.map((fahrzeug) =>
    fahrzeug.id === ziel.id
      ? { ...fahrzeug, material: { ...fahrzeug.material, [materialTyp]: fahrzeug.material[materialTyp]! - 1 } }
      : fahrzeug,
  );
}
