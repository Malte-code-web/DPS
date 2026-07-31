import type { Rolle, Spieler } from './sitzung';
import type { Fuehrungsrolle } from './types';

/**
 * @anker domain.fuehrung Rangfolge und Prüfung der Führungsrolle
 *
 * Zweite Ebene neben `domain.qualifikation` (→ `modell.fuehrung`): TrFü <
 * GrFü < ZgFü < {OrgL RD, LNA} - die beiden Spitzenfunktionen stehen im
 * selben Rang, da sie reale, gleichrangige Zuständigkeiten sind (medizinische
 * vs. organisatorische Leitung), keine Rangfolge zueinander. Anders als die
 * Qualifikation wird die Führungsrolle von der Übungsleitung zugeteilt
 * (→ `spielerFuehrungsrolleSetzen`), nicht selbst gewählt.
 */
const FUEHRUNGSRANG: Record<Fuehrungsrolle, number> = {
  keine: 0,
  truppfuehrer: 1,
  gruppenfuehrer: 2,
  zugfuehrer: 3,
  orgl_rd: 4,
  lna: 4,
};

export function erfuelltFuehrung(hat: Fuehrungsrolle, braucht: Fuehrungsrolle): boolean {
  return FUEHRUNGSRANG[hat] >= FUEHRUNGSRANG[braucht];
}

export const FUEHRUNGSROLLE_LABEL: Record<Fuehrungsrolle, string> = {
  keine: 'keine',
  truppfuehrer: 'TrFü',
  gruppenfuehrer: 'GrFü',
  zugfuehrer: 'ZgFü',
  orgl_rd: 'OrgL RD',
  lna: 'LNA',
};

export const FUEHRUNGSROLLEN: Fuehrungsrolle[] = [
  'keine',
  'truppfuehrer',
  'gruppenfuehrer',
  'zugfuehrer',
  'orgl_rd',
  'lna',
];

/**
 * Ob Fahrzeuge/Besatzung disponiert werden dürfen: die Übungsleitung immer
 * (Ersatz „bei Bedarf", → Nutzerwunsch), sonst ab Zugführer-Rang. Wie jede
 * Sperre außerhalb einer aktiven Mehrspieler-Sitzung nicht durchgesetzt
 * (→ `domain.qualifikation`).
 */
export function darfFahrzeugeDisponieren(
  sitzungAktiv: boolean,
  eigeneRolle: Rolle | null,
  eigeneFuehrungsrolle: Fuehrungsrolle | undefined,
): boolean {
  if (!sitzungAktiv) return true;
  if (eigeneRolle === 'uebungsleiter') return true;
  return erfuelltFuehrung(eigeneFuehrungsrolle ?? 'keine', 'zugfuehrer');
}

export interface Staerke {
  fuehrungskraefte: number;
  unterfuehrer: number;
  mannschaft: number;
  gesamt: number;
}

/**
 * @anker domain.staerkemeldung Reale Stärkemeldung einer Fahrzeugbesatzung
 *
 * Nach der BOS-Funkkonvention "Führungskräfte/Unterführer/Mannschaft/Gesamt"
 * (a/b/c/d), mit der Rettungsdienst und Feuerwehr ihre Einsatzstärke melden:
 * jede Person wird über ihre Führungsrolle (→ `domain.fuehrung`) eingeordnet -
 * Zugführer und höher zählen als Führungskraft, Trupp-/Gruppenführer als
 * Unterführer, alle ohne Führungsrolle als Mannschaft.
 */
export function staerkemeldung(besatzung: string[], spieler: Spieler[]): Staerke {
  const besetzteSpielerIds = besatzung.filter((spielerId) => spielerId !== '');
  let fuehrungskraefte = 0;
  let unterfuehrer = 0;
  let mannschaft = 0;
  for (const spielerId of besetzteSpielerIds) {
    const rolle = spieler.find((eintrag) => eintrag.id === spielerId)?.fuehrungsrolle ?? 'keine';
    if (rolle === 'zugfuehrer' || rolle === 'orgl_rd' || rolle === 'lna') {
      fuehrungskraefte += 1;
    } else if (rolle === 'truppfuehrer' || rolle === 'gruppenfuehrer') {
      unterfuehrer += 1;
    } else {
      mannschaft += 1;
    }
  }
  return { fuehrungskraefte, unterfuehrer, mannschaft, gesamt: besetzteSpielerIds.length };
}

export function formatStaerke(staerke: Staerke): string {
  return `${staerke.fuehrungskraefte}/${staerke.unterfuehrer}/${staerke.mannschaft}/${staerke.gesamt}`;
}
