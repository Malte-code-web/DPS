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

export const ABSCHNITTE: AbschnittInfo[] = [
  {
    id: 'schadensstelle',
    name: 'Schadensstelle',
    kurz: 'Schadensstelle',
    aufgabe: 'Vorsichtung und lebensrettende Sofortmaßnahmen',
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

export function abschnittInfo(id: Einsatzabschnitt): AbschnittInfo {
  const info = NACH_ID.get(id);
  if (!info) throw new Error(`Unbekannter Einsatzabschnitt: ${id}`);
  return info;
}

/** Wohin ein Patient von hier aus verlegt werden kann. */
const ZIELE: Record<Einsatzabschnitt, Einsatzabschnitt[]> = {
  schadensstelle: ['eingangssichtung'],
  eingangssichtung: ['zelt_rot', 'zelt_gelb', 'zelt_gruen'],
  zelt_rot: ['ausgangssichtung', 'zelt_gelb', 'zelt_gruen'],
  zelt_gelb: ['ausgangssichtung', 'zelt_rot', 'zelt_gruen'],
  zelt_gruen: ['ausgangssichtung', 'zelt_rot', 'zelt_gelb'],
  ausgangssichtung: ['transport'],
  transport: [],
};

export function moeglicheZiele(abschnitt: Einsatzabschnitt): AbschnittInfo[] {
  return ZIELE[abschnitt].map(abschnittInfo);
}

export function istVerlegungMoeglich(von: Einsatzabschnitt, nach: Einsatzabschnitt): boolean {
  return ZIELE[von].includes(nach);
}

/** Das Zelt, das zur Sichtungskategorie passt - Grundlage der Zuweisung. */
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
 * Zeitbedarf einer Verlegung: Trägertrupp holen, umlagern, transportieren.
 * Bewusst spürbar, damit das Verschieben eine Entscheidung bleibt.
 */
export const VERLEGUNGSDAUER_SEK = 30;
