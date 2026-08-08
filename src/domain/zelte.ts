import type { Einsatzabschnitt, PlatzierterZelt, ZeltAbschnitt, ZeltTypId } from './types';

/**
 * @anker domain.zelte Reale Zeltgrößen und Flächenlogik für den Behandlungsplatz
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

/** Mindestabstand zwischen zwei Zelten (DRK-Konzept "Behandlungsplatz 50"). */
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

interface ZeltRechteck {
  xM: number;
  yM: number;
  breiteM: number;
  tiefeM: number;
}

function zeltRechteck(typ: ZeltTypId, xM: number, yM: number): ZeltRechteck {
  const info = ZELTTYPEN[typ];
  return { xM, yM, breiteM: info.breiteM, tiefeM: info.tiefeM };
}

/**
 * Ob sich zwei Zelt-Rechtecke überschneiden, inklusive Mindestabstand -
 * expandiert dafür gedanklich beide Rechtecke um den halben Abstand, indem
 * der volle Abstand einseitig auf die Lückenbedingung addiert wird.
 */
export function ueberlapptMitAbstand(
  a: ZeltRechteck,
  b: ZeltRechteck,
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
 * @anker domain.platzierungGueltig Zelt passt ins Baufeld und überschneidet kein anderes
 *
 * Eine neue Platzierung ersetzt eine bestehende für dieselbe Farbe (→
 * `modell.platziertezelt`) - deshalb werden Zelte derselben `abschnitt`-Farbe
 * aus der Überschneidungsprüfung ausgenommen, statt dass der Aufruf selbst
 * daran denken müsste, sie vorher herauszufiltern.
 */
export function platzierungGueltig(
  kandidat: { typ: ZeltTypId; abschnitt: ZeltAbschnitt; xM: number; yM: number },
  bestehendeZelte: PlatzierterZelt[],
  baufeld: { breiteM: number; tiefeM: number },
): boolean {
  const info = ZELTTYPEN[kandidat.typ];
  if (kandidat.xM < 0 || kandidat.yM < 0) return false;
  if (kandidat.xM + info.breiteM > baufeld.breiteM) return false;
  if (kandidat.yM + info.tiefeM > baufeld.tiefeM) return false;

  const kandidatRechteck = zeltRechteck(kandidat.typ, kandidat.xM, kandidat.yM);
  return bestehendeZelte
    .filter((zelt) => zelt.abschnitt !== kandidat.abschnitt)
    .every(
      (zelt) =>
        !ueberlapptMitAbstand(
          kandidatRechteck,
          zeltRechteck(zelt.typ, zelt.xM, zelt.yM),
          ZELT_MINDESTABSTAND_M,
        ),
    );
}

export function belegteZeltFlaecheQm(zelte: PlatzierterZelt[]): number {
  return zelte.reduce((summe, zelt) => summe + ZELTTYPEN[zelt.typ].flaecheQm, 0);
}

/**
 * @anker domain.verfuegbareFlaecheQm Geteiltes Flächenbudget: Zelte und Fahrzeuge teilen sich das Baufeld
 *
 * Direkt aus dem MANV-Konzept Kreis Steinfurt abgeleitet: die dort
 * angegebene Gesamtfläche gilt für Zelte UND Fahrzeuge/Personal zusammen,
 * nicht nur für die Zelte. Kann negativ werden - das ist beabsichtigt (→
 * weiche Warnung statt Sperre, `ui.baufeld`), kein Clamping auf 0.
 */
export function verfuegbareFlaecheQm(
  baufeld: { breiteM: number; tiefeM: number },
  zelte: PlatzierterZelt[],
  fahrzeugAnzahl: number,
): number {
  return (
    baufeld.breiteM * baufeld.tiefeM -
    belegteZeltFlaecheQm(zelte) -
    fahrzeugAnzahl * FAHRZEUG_FLAECHENBEDARF_QM
  );
}

/**
 * @anker domain.istAbschnittEroeffnet Ob ein Abschnitt als Verlegungsziel gilt
 *
 * Schadensstelle ist vom Szenario vorgegeben und immer offen. Für die drei
 * Behandlungs-Zelte ist "eröffnet" gleichbedeutend mit "ein Zelt wurde dafür
 * platziert" (→ `modell.platziertezelt`) - kein separates Flag nötig. Die
 * übrigen Abschnitte (Ablage, Bereitstellungsraum, Eingangssichtung,
 * Ausgangssichtung, Transport) nutzen das einfache `eroeffneteAbschnitte`-Feld.
 */
export function istAbschnittEroeffnet(
  abschnitt: Einsatzabschnitt,
  eroeffneteAbschnitte: Einsatzabschnitt[],
  zeltPlatzierungen: PlatzierterZelt[],
): boolean {
  if (abschnitt === 'schadensstelle') return true;
  if (abschnitt === 'zelt_rot' || abschnitt === 'zelt_gelb' || abschnitt === 'zelt_gruen') {
    return zeltPlatzierungen.some((zelt) => zelt.abschnitt === abschnitt);
  }
  return eroeffneteAbschnitte.includes(abschnitt);
}
