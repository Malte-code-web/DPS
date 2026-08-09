import type {
  Einsatzabschnitt,
  FlaechenAbschnitt,
  FlaechenTypId,
  PlatzierteFlaeche,
  ZeltTypId,
} from './types';

/**
 * @anker domain.flaechen Reale Zeltgrößen und markierte Flächen für die Einsatzstelle
 *
 * Nach dem DRK-Konzept "Behandlungsplatz 50" (Rheinland-Pfalz, Tabelle
 * "Zeltmaße und -Gewichte", Herstellerangaben Lanco/Inhag) - dieselbe
 * SG20/30/40/50-Kategorie, die auch in der Wikipedia zum Sanitätszelt
 * auftaucht. `flaecheQm` ist der real dokumentierte Wert, nicht
 * `breiteM * tiefeM` (die Zelte sind keine exakten Rechtecke).
 * `richtwertPatientenSk1` ist reine Anzeige (→ `ui.zelttypauswahl`) - anders
 * als die sorgfältig ausgewertete Fahrzeug-Bestückung wird daraus in dieser
 * Ausbaustufe keine harte Kapazitätsgrenze für die Patientenkette
 * (→ `domain.abschnitte`); eine Sperre dort wäre ein viel größerer Eingriff
 * in den zentralen, gut getesteten Sichtungs-/Verlegungs-Code. `aufbauSek`
 * ist - wie `VERLEGUNGSDAUER_SEK` - eine bewusst gewählte, plausible
 * Schätzung (größenproportional), keine sourcierte Angabe.
 *
 * Nicht jede Lage braucht ein echtes Zelt, aber eine definierte Fläche -
 * `FLAECHENTYPEN` deckt Abschnitte ab, die nur markiert/abgesperrt werden
 * (Ablage, Bereitstellungsraum, Transport), ohne ein reales Zeltprodukt
 * dahinter. Ein-/Ausgangssichtung dürfen wahlweise aus beiden Katalogen
 * wählen (→ `ui.zelttypauswahl`).
 */
export interface ZeltTypInfo {
  id: ZeltTypId;
  bezeichnung: string;
  breiteM: number;
  tiefeM: number;
  flaecheQm: number;
  richtwertPatientenSk1: number;
  aufbauSek: number;
}

export const ZELTTYPEN: Record<ZeltTypId, ZeltTypInfo> = {
  SG20: {
    id: 'SG20',
    bezeichnung: 'SG 20',
    breiteM: 5.0,
    tiefeM: 4.74,
    flaecheQm: 23.7,
    richtwertPatientenSk1: 6,
    aufbauSek: 300,
  },
  SG30: {
    id: 'SG30',
    bezeichnung: 'SG 30',
    breiteM: 6.0,
    tiefeM: 5.64,
    flaecheQm: 33.8,
    richtwertPatientenSk1: 7,
    aufbauSek: 420,
  },
  SG40: {
    id: 'SG40',
    bezeichnung: 'SG 40',
    breiteM: 8.0,
    tiefeM: 5.64,
    flaecheQm: 45.1,
    richtwertPatientenSk1: 8,
    aufbauSek: 600,
  },
  SG50: {
    id: 'SG50',
    bezeichnung: 'SG 50',
    breiteM: 10.0,
    tiefeM: 5.64,
    flaecheQm: 56.4,
    richtwertPatientenSk1: 10,
    aufbauSek: 900,
  },
};

/**
 * Reine markierte/abgesperrte Fläche, kein reales Zeltprodukt - deutlich
 * kürzere Aufbauzeit als ein echtes Zelt (Flatterband spannen statt eine
 * Struktur aufstellen), bewusst gewählte plausible Größen wie bei
 * `ZELTTYPEN`, kein `richtwertPatientenSk1` (nicht zutreffend).
 */
export interface FlaechenTypInfo {
  id: FlaechenTypId;
  bezeichnung: string;
  breiteM: number;
  tiefeM: number;
  flaecheQm: number;
  aufbauSek: number;
}

export const FLAECHENTYPEN: Record<FlaechenTypId, FlaechenTypInfo> = {
  FL_S: { id: 'FL_S', bezeichnung: 'Fläche klein', breiteM: 5, tiefeM: 5, flaecheQm: 25, aufbauSek: 60 },
  FL_M: { id: 'FL_M', bezeichnung: 'Fläche mittel', breiteM: 10, tiefeM: 10, flaecheQm: 100, aufbauSek: 120 },
  FL_L: { id: 'FL_L', bezeichnung: 'Fläche groß', breiteM: 15, tiefeM: 15, flaecheQm: 225, aufbauSek: 180 },
};

/** Gemeinsamer Lookup über beide Kataloge (→ `domain.flaechen`). */
export function groesseVon(typ: ZeltTypId | FlaechenTypId): ZeltTypInfo | FlaechenTypInfo {
  return (ZELTTYPEN as Record<string, ZeltTypInfo>)[typ] ?? FLAECHENTYPEN[typ as FlaechenTypId];
}

/** Mindestabstand zwischen zwei Flächen (DRK-Konzept "Behandlungsplatz 50"). */
export const ZELT_MINDESTABSTAND_M = 2;

/**
 * Ohne im Szenario hinterlegtes `baufeld` (→ `Szenario.baufeld`) gilt diese
 * Fläche - abgeleitet aus dem MANV-Konzept Kreis Steinfurt (BHP-B-50-Modul:
 * 40 × 50 m = 2.000 m² für Zelte und Fahrzeuge/Personal zusammen).
 */
export const STANDARD_BAUFELD = { breiteM: 40, tiefeM: 50 };

/**
 * Fläche, die ein Fahrzeug am Behandlungsplatz beansprucht - für den
 * Rettungsdienst gibt es dazu keine eigene Angabe, deshalb behelfsweise die
 * Feuerwehr-Bewegungsfläche (7 × 12 m, Muster-Richtlinien über Flächen für
 * die Feuerwehr) als grobe, klar zweckfremde Ersatzgröße (→ `verfuegbareFlaecheQm`).
 */
export const FAHRZEUG_FLAECHENBEDARF_QM = 84;

interface FlaechenRechteck {
  xM: number;
  yM: number;
  breiteM: number;
  tiefeM: number;
}

function flaechenRechteck(typ: ZeltTypId | FlaechenTypId, xM: number, yM: number): FlaechenRechteck {
  const info = groesseVon(typ);
  return { xM, yM, breiteM: info.breiteM, tiefeM: info.tiefeM };
}

/**
 * Ob sich zwei Flächen-Rechtecke überschneiden, inklusive Mindestabstand -
 * expandiert dafür gedanklich beide Rechtecke um den halben Abstand, indem
 * der volle Abstand einseitig auf die Lückenbedingung addiert wird.
 */
export function ueberlapptMitAbstand(
  a: FlaechenRechteck,
  b: FlaechenRechteck,
  mindestabstandM: number,
): boolean {
  return !(
    a.xM + a.breiteM + mindestabstandM <= b.xM ||
    b.xM + b.breiteM + mindestabstandM <= a.xM ||
    a.yM + a.tiefeM + mindestabstandM <= b.yM ||
    b.yM + b.tiefeM + mindestabstandM <= a.yM
  );
}

/**
 * @anker domain.platzierungGueltig Fläche passt ins Baufeld (falls geprüft) und überschneidet keine andere
 *
 * Eine neue Platzierung ersetzt eine bestehende für denselben Abschnitt (→
 * `modell.platzierteflaeche`) - deshalb werden Flächen desselben `abschnitt`
 * aus der Überschneidungsprüfung ausgenommen, statt dass der Aufruf selbst
 * daran denken müsste, sie vorher herauszufiltern. Die Grenzprüfung gegen
 * `baufeld` gilt nur für die drei Behandlungszelte (`pruefeGrenzen = true`,
 * Standard) - die übrigen fünf Abschnitte liegen oft weit außerhalb des
 * engen Zelt-Baufelds irgendwo auf der echten Einsatzstelle, dort wird nur
 * noch die Überschneidung geprüft.
 */
export function platzierungGueltig(
  kandidat: { typ: ZeltTypId | FlaechenTypId; abschnitt: FlaechenAbschnitt; xM: number; yM: number },
  bestehendeFlaechen: PlatzierteFlaeche[],
  baufeld: { breiteM: number; tiefeM: number },
  pruefeGrenzen: boolean = true,
): boolean {
  const info = groesseVon(kandidat.typ);
  if (pruefeGrenzen) {
    if (kandidat.xM < 0 || kandidat.yM < 0) return false;
    if (kandidat.xM + info.breiteM > baufeld.breiteM) return false;
    if (kandidat.yM + info.tiefeM > baufeld.tiefeM) return false;
  }

  const kandidatRechteck = flaechenRechteck(kandidat.typ, kandidat.xM, kandidat.yM);
  return bestehendeFlaechen
    .filter((flaeche) => flaeche.abschnitt !== kandidat.abschnitt)
    .every(
      (flaeche) =>
        !ueberlapptMitAbstand(
          kandidatRechteck,
          flaechenRechteck(flaeche.typ, flaeche.xM, flaeche.yM),
          ZELT_MINDESTABSTAND_M,
        ),
    );
}

export function belegteZeltFlaecheQm(flaechen: PlatzierteFlaeche[]): number {
  return flaechen.reduce((summe, flaeche) => summe + groesseVon(flaeche.typ).flaecheQm, 0);
}

/**
 * @anker domain.verfuegbareFlaecheQm Geteiltes Flächenbudget: Zelte/Flächen und Fahrzeuge teilen sich das Baufeld
 *
 * Direkt aus dem MANV-Konzept Kreis Steinfurt abgeleitet: die dort
 * angegebene Gesamtfläche gilt für Zelte UND Fahrzeuge/Personal zusammen,
 * nicht nur für die Zelte. Kann negativ werden - das ist beabsichtigt (→
 * weiche Warnung statt Sperre, `ui.lagekarte`), kein Clamping auf 0.
 */
export function verfuegbareFlaecheQm(
  baufeld: { breiteM: number; tiefeM: number },
  flaechen: PlatzierteFlaeche[],
  fahrzeugAnzahl: number,
): number {
  return (
    baufeld.breiteM * baufeld.tiefeM -
    belegteZeltFlaecheQm(flaechen) -
    fahrzeugAnzahl * FAHRZEUG_FLAECHENBEDARF_QM
  );
}

/**
 * @anker domain.istAbschnittEroeffnet Ob ein Abschnitt als Verlegungsziel gilt
 *
 * Schadensstelle ist vom Szenario vorgegeben und immer offen. Alle neun
 * `FlaechenAbschnitt`e gelten als eröffnet, sobald für sie eine Fläche
 * platziert wurde (→ `modell.platzierteflaeche`) - kein separates Flag
 * mehr nötig, seit auch Ablage/Bereitstellungsraum/Ein-/Ausgangssichtung/
 * Transport über dieselbe Platzierung laufen wie die drei Zelte.
 */
export function istAbschnittEroeffnet(
  abschnitt: Einsatzabschnitt,
  flaechen: PlatzierteFlaeche[],
): boolean {
  if (abschnitt === 'schadensstelle') return true;
  return flaechen.some((flaeche) => flaeche.abschnitt === abschnitt);
}
