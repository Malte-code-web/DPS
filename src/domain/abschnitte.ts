import type { Einsatzabschnitt, Sichtungskategorie, Sichtungsstelle } from './types';

/**
 * Die Einsatzabschnitte einer MANV-Lage und der Weg der Patienten dazwischen:
 *
 *   Schadensstelle -> Eingangssichtung -> rotes/gelbes/grünes Zelt
 *                  -> Ausgangssichtung -> Abtransport
 *
 * Zwischen den Zelten ist eine Verlegung möglich, weil eine Nachsichtung die
 * Kategorie ändern kann.
 */

export interface AbschnittInfo {
  id: Einsatzabschnitt;
  name: string;
  kurz: string;
  aufgabe: string;
  /** Zelte tragen die Farbe ihrer Sichtungskategorie. */
  kategorie?: Sichtungskategorie;
}

/**
 * @anker abschnitte.liste Namen und Aufgaben der Einsatzabschnitte
 *
 * `verdeckt`, `bereitstellungsraum` und `rettungsmittelhalteplatz` erscheinen
 * hier bewusst nicht: `verdeckt` ist der Warteplatz vor der Freigabe (→
 * `modell.freigabemodus`), kein Ort, den eine Person auswählen können soll.
 * `bereitstellungsraum` und `rettungsmittelhalteplatz` sind reine
 * Fahrzeug-Infrastruktur (nachgeforderte bzw. wartende Transportfahrzeuge, →
 * `modell.ereignis`, `modell.transport`) - Patienten landen dort nie. Ihre
 * Namen/Kurzformen liegen stattdessen in `ZUSATZ_ABSCHNITTE`, damit
 * `abschnittInfo` trotzdem für sie funktioniert, sobald sie als Fahrzeugziel
 * auftauchen (→ `abschnitte.fahrzeugziele`).
 */
export const ABSCHNITTE: AbschnittInfo[] = [
  {
    id: 'schadensstelle',
    name: 'Schadensstelle',
    kurz: 'Schadensstelle',
    aufgabe: 'Vorsichtung und lebensrettende Sofortmaßnahmen',
  },
  {
    id: 'ablage',
    name: 'Ablage',
    kurz: 'Ablage',
    aufgabe: 'Vorsichtung und lebensrettende Sofortmaßnahmen (RD nicht an der Schadensstelle)',
  },
  {
    id: 'eingangssichtung',
    name: 'Eingangssichtung',
    kurz: 'Eingang',
    aufgabe: 'Sichtung und Zuweisung zum Behandlungsplatz',
  },
  {
    id: 'zelt_rot',
    name: 'Rotes Zelt',
    kurz: 'Rot',
    aufgabe: 'Diagnostik und Behandlung, Sofortbehandlung',
    kategorie: 'SK1',
  },
  {
    id: 'zelt_gelb',
    name: 'Gelbes Zelt',
    kurz: 'Gelb',
    aufgabe: 'Diagnostik und Behandlung, aufgeschobene Dringlichkeit',
    kategorie: 'SK2',
  },
  {
    id: 'zelt_gruen',
    name: 'Grünes Zelt',
    kurz: 'Grün',
    aufgabe: 'Betreuung und einfache Versorgung',
    kategorie: 'SK3',
  },
  {
    id: 'ausgangssichtung',
    name: 'Ausgangssichtung',
    kurz: 'Ausgang',
    aufgabe: 'Abschlusssichtung und Transportorganisation',
  },
  {
    id: 'transport',
    name: 'Abtransport',
    kurz: 'Transport',
    aufgabe: 'Patient hat den Behandlungsplatz verlassen',
  },
];

const NACH_ID = new Map(ABSCHNITTE.map((abschnitt) => [abschnitt.id, abschnitt]));

/**
 * Namen für Abschnitte außerhalb `ABSCHNITTE` (kein Patienten-Ziel), die
 * trotzdem einen Namen brauchen, sobald sie als Fahrzeugziel auftauchen (→
 * `abschnitte.fahrzeugziele`). `bereitstellungsraum` braucht das nicht -
 * keine Kante referenziert ihn als Ziel.
 */
const ZUSATZ_ABSCHNITTE: Partial<Record<Einsatzabschnitt, AbschnittInfo>> = {
  rettungsmittelhalteplatz: {
    id: 'rettungsmittelhalteplatz',
    name: 'Rettungsmittelhalteplatz',
    kurz: 'RMHP',
    aufgabe: 'Warteplatz einsatzbereiter Transportfahrzeuge, Abruf zur Ausgangssichtung',
  },
};

export function abschnittInfo(id: Einsatzabschnitt): AbschnittInfo {
  const info = NACH_ID.get(id) ?? ZUSATZ_ABSCHNITTE[id];
  if (!info) throw new Error(`Unbekannter Einsatzabschnitt: ${id}`);
  return info;
}

/**
 * Wohin ein Patient von hier aus verlegt werden kann.
 * @anker abschnitte.wege Erlaubte Verlegungen - hier ändert man den Ablauf
 */
const ZIELE: Record<Einsatzabschnitt, Einsatzabschnitt[]> = {
  // Verlassen von `verdeckt` läuft über eine eigene Aktion (Freigabe durch die
  // Übungsleitung, → `modell.freigabemodus`), nicht über die normale
  // Verlegung - deshalb hier bewusst kein Ziel.
  verdeckt: [],
  schadensstelle: ['eingangssichtung'],
  ablage: ['eingangssichtung'],
  // Noch nicht verdrahtet (→ Phase C/D, Geodaten/Ereignis-Injektion) - Ziel
  // schon für die spätere Nachforderung vorgesehen.
  bereitstellungsraum: ['schadensstelle', 'ablage', 'eingangssichtung'],
  eingangssichtung: ['zelt_rot', 'zelt_gelb', 'zelt_gruen'],
  zelt_rot: ['ausgangssichtung', 'zelt_gelb', 'zelt_gruen'],
  zelt_gelb: ['ausgangssichtung', 'zelt_rot', 'zelt_gruen'],
  zelt_gruen: ['ausgangssichtung', 'zelt_rot', 'zelt_gelb'],
  ausgangssichtung: ['transport'],
  transport: [],
  rettungsmittelhalteplatz: [],
};

export function moeglicheZiele(abschnitt: Einsatzabschnitt): AbschnittInfo[] {
  return ZIELE[abschnitt].map(abschnittInfo);
}

export function istVerlegungMoeglich(von: Einsatzabschnitt, nach: Einsatzabschnitt): boolean {
  return ZIELE[von].includes(nach);
}

/**
 * @anker abschnitte.fahrzeugziele Zusätzliche, nur für Fahrzeuge gültige Kanten
 *
 * Additiv zu `ZIELE`, nie ersetzend - getrennt gehalten, weil `ZIELE` sonst
 * denselben Graphen auch für `patientVerlegen`/`ui.verlegung` öffnen würde:
 * eine Kante zum oder vom Rettungsmittelhalteplatz dürfen Patienten nie
 * sehen, das ist reine Fahrzeug-Infrastruktur (→ `modell.transport`).
 */
const FAHRZEUG_ZUSATZ_ZIELE: Partial<Record<Einsatzabschnitt, Einsatzabschnitt[]>> = {
  // Standard-Spawnpunkt aller Fahrzeuge (→ `domain.fahrzeuge`, `fahrzeugAusVorlage`).
  schadensstelle: ['rettungsmittelhalteplatz'],
  // Nachgeforderte Transportfahrzeuge (→ `modell.ereignis`) können von dort weiter.
  bereitstellungsraum: ['rettungsmittelhalteplatz'],
  // Abruf nach vorn, sobald ein Patient an der Ausgangssichtung wartet.
  rettungsmittelhalteplatz: ['ausgangssichtung'],
};

export function fahrzeugZiele(abschnitt: Einsatzabschnitt): AbschnittInfo[] {
  return [...ZIELE[abschnitt], ...(FAHRZEUG_ZUSATZ_ZIELE[abschnitt] ?? [])].map(abschnittInfo);
}

export function istFahrzeugVerlegungMoeglich(von: Einsatzabschnitt, nach: Einsatzabschnitt): boolean {
  return ZIELE[von].includes(nach) || (FAHRZEUG_ZUSATZ_ZIELE[von]?.includes(nach) ?? false);
}

/**
 * Das Zelt, das zur Sichtungskategorie passt.
 * @anker abschnitte.zeltzuordnung Welche Kategorie in welches Zelt gehört
 */
export function zeltFuerKategorie(kategorie: Sichtungskategorie): Einsatzabschnitt {
  switch (kategorie) {
    case 'SK1':
      return 'zelt_rot';
    case 'SK2':
      return 'zelt_gelb';
    case 'SK3':
      return 'zelt_gruen';
    // SK IV und Verstorbene werden betreut, nicht behandelt - im roten Zelt
    // ist die Betreuung angesiedelt.
    default:
      return 'zelt_rot';
  }
}

/** Welche Sichtungsentscheidung an diesem Ort getroffen wird. */
export function sichtungsstelleIn(abschnitt: Einsatzabschnitt): Sichtungsstelle {
  switch (abschnitt) {
    case 'schadensstelle':
    case 'ablage':
      return 'vorsichtung';
    case 'eingangssichtung':
      return 'eingangssichtung';
    case 'ausgangssichtung':
      return 'ausgangssichtung';
    default:
      return 'nachsichtung';
  }
}

export const SICHTUNGSSTELLE_LABEL: Record<Sichtungsstelle, string> = {
  vorsichtung: 'Vorsichtung',
  eingangssichtung: 'Eingangssichtung',
  nachsichtung: 'Nachsichtung',
  ausgangssichtung: 'Ausgangssichtung',
};

/**
 * @anker abschnitte.dauer Zeitkosten einer Verlegung
 *
 * Zeitbedarf einer Verlegung: Trägertrupp holen, umlagern, transportieren.
 * Bewusst spürbar, damit das Verschieben eine Entscheidung bleibt.
 */
export const VERLEGUNGSDAUER_SEK = 30;
