import type { Massnahme, MassnahmeId, MassnahmenKategorie } from './types';

/** Katalog aller in der Simulation verfügbaren Maßnahmen (ABCDE-Schema). */
export const MASSNAHMEN: Record<MassnahmeId, Massnahme> = {
  atemwege_freimachen: {
    id: 'atemwege_freimachen',
    label: 'Atemwege freimachen',
    kategorie: 'A',
    dauerSek: 20,
    hinweis: 'Kopf überstrecken, Mundraum inspizieren, Fremdkörper entfernen.',
    sofortEffekt: { spo2: 4 },
    sofortmassnahme: true,
  },
  guedeltubus: {
    id: 'guedeltubus',
    label: 'Guedeltubus einlegen',
    kategorie: 'A',
    dauerSek: 30,
    hinweis: 'Nur bei fehlendem Würgereflex.',
    sofortEffekt: { spo2: 5 },
    sofortmassnahme: true,
  },
  intubation: {
    id: 'intubation',
    label: 'Endotracheale Intubation',
    kategorie: 'A',
    dauerSek: 180,
    hinweis: 'Bindet Personal - im MANV kritisch abzuwägen.',
    sofortEffekt: { spo2: 12 },
  },
  sauerstoffgabe: {
    id: 'sauerstoffgabe',
    label: 'Sauerstoffgabe',
    kategorie: 'B',
    dauerSek: 30,
    hinweis: 'Reservoirmaske, 12-15 l/min.',
    sofortEffekt: { spo2: 8 },
  },
  beatmung: {
    id: 'beatmung',
    label: 'Assistierte Beatmung',
    kategorie: 'B',
    dauerSek: 60,
    hinweis: 'Beutel-Masken-Beatmung bei insuffizienter Eigenatmung.',
    sofortEffekt: { spo2: 15, atemfrequenz: 4 },
  },
  thoraxentlastung: {
    id: 'thoraxentlastung',
    label: 'Thoraxentlastungspunktion',
    kategorie: 'B',
    dauerSek: 90,
    hinweis: 'Bei Spannungspneumothorax - lebensrettende Sofortmaßnahme.',
    sofortEffekt: { spo2: 14, systolischerRR: 20, herzfrequenz: -15 },
  },
  blutstillung: {
    id: 'blutstillung',
    label: 'Manuelle Blutstillung / Druckverband',
    kategorie: 'x',
    dauerSek: 45,
    hinweis: 'Erste Maßnahme bei jeder sichtbaren starken Blutung.',
    sofortEffekt: { systolischerRR: 5 },
    sofortmassnahme: true,
  },
  tourniquet: {
    id: 'tourniquet',
    label: 'Tourniquet anlegen',
    kategorie: 'x',
    dauerSek: 60,
    hinweis: 'Bei nicht komprimierbarer Extremitätenblutung, Zeit dokumentieren.',
    sofortEffekt: { systolischerRR: 8 },
    sofortmassnahme: true,
  },
  beckenschlinge: {
    id: 'beckenschlinge',
    label: 'Beckenschlinge anlegen',
    kategorie: 'C',
    dauerSek: 90,
    hinweis: 'Bei Verdacht auf instabile Beckenfraktur.',
    sofortEffekt: { systolischerRR: 10 },
  },
  volumengabe: {
    id: 'volumengabe',
    label: 'Volumengabe i.v./i.o.',
    kategorie: 'C',
    dauerSek: 120,
    hinweis: 'Permissive Hypotension beachten.',
    sofortEffekt: { systolischerRR: 25, herzfrequenz: -10, rekapzeit: -1 },
  },
  schocklage: {
    id: 'schocklage',
    label: 'Schocklagerung',
    kategorie: 'C',
    dauerSek: 20,
    hinweis: 'Schnell und ohne Material umsetzbar.',
    sofortEffekt: { systolischerRR: 10 },
  },
  analgesie: {
    id: 'analgesie',
    label: 'Analgesie',
    kategorie: 'D',
    dauerSek: 90,
    hinweis: 'Schmerzreduktion senkt Herzfrequenz und Stressantwort.',
    sofortEffekt: { herzfrequenz: -15, atemfrequenz: -3 },
  },
  immobilisation: {
    id: 'immobilisation',
    label: 'Immobilisation',
    kategorie: 'E',
    dauerSek: 120,
    hinweis: 'Vakuummatratze, Schienung, achsengerechte Lagerung.',
    sofortEffekt: { herzfrequenz: -5 },
  },
  waermeerhalt: {
    id: 'waermeerhalt',
    label: 'Wärmeerhalt',
    kategorie: 'E',
    dauerSek: 30,
    hinweis: 'Rettungsdecke - Hypothermie verschlechtert die Gerinnung.',
    sofortEffekt: { rekapzeit: -0.3 },
  },
  betreuung: {
    id: 'betreuung',
    label: 'Psychische Betreuung',
    kategorie: 'E',
    dauerSek: 60,
    hinweis: 'Auch bei SK IV die wichtigste Maßnahme.',
    sofortEffekt: { herzfrequenz: -8, atemfrequenz: -2 },
  },
};

export const MASSNAHMEN_LISTE: Massnahme[] = Object.values(MASSNAHMEN);

/** Reihenfolge der Gruppen nach xABCDE. */
export const KATEGORIEN: MassnahmenKategorie[] = ['x', 'A', 'B', 'C', 'D', 'E'];

export const KATEGORIE_LABEL: Record<MassnahmenKategorie, string> = {
  x: 'Kritische Blutung',
  A: 'Atemweg',
  B: 'Beatmung',
  C: 'Kreislauf',
  D: 'Neurologie',
  E: 'Umgebung',
};

/**
 * Maßnahmen, die sich auch kurz vor dem Abtransport noch durchführen lassen.
 * Alles darüber gehört in die Behandlung im Zelt.
 */
export const SCHNELLE_MASSNAHMEN: Massnahme[] = MASSNAHMEN_LISTE.filter(
  (massnahme) => massnahme.dauerSek <= 60,
);

export function massnahmenDerKategorie(kategorie: MassnahmenKategorie): Massnahme[] {
  return MASSNAHMEN_LISTE.filter((massnahme) => massnahme.kategorie === kategorie);
}
