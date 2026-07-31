import type { Rolle } from './sitzung';
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
