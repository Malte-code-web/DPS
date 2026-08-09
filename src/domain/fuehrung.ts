import type { Rolle, Spieler } from './sitzung';
import type { Fahrzeug, Fuehrungsrolle } from './types';

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
 * @anker domain.regiefuehrend Übungsleitung und Beobachter teilen sich Sicht und Rechte
 *
 * Ein Beobachter (→ `sitzung.beobachter`) hat dieselbe Regie-Ansicht und
 * dieselben Rechte wie die Übungsleitung - überall, wo bisher gezielt auf
 * `eigeneRolle === 'uebungsleiter'` geprüft wurde, gilt jetzt diese Prüfung
 * statt vieler Einzeländerungen.
 */
export function istRegiefuehrend(rolle: Rolle | null): boolean {
  return rolle === 'uebungsleiter' || rolle === 'beobachter';
}

/**
 * @anker domain.zugfuehrend Der Zugführer leitet den Abschnitt Medizinische Rettung
 *
 * Bewusste Abweichung vom realen Vorbild: im MANV-Konzept Kreis Steinfurt
 * führt dort das System LNA/OrgL RD, der Zugführer leitet nur Bereitstellungsraum
 * und Rettungsmittelhalteplatz. Für dieses Übungskonzept übernimmt der
 * Zugführer stattdessen die Leitung der gesamten Patientenkette - die erste
 * echte Führungsstufe nach der reinen Regie-Ebene (→ `ui.zugfuehrerseite`).
 * Exakter Rollentreffer, kein `erfuelltFuehrung`-Rangvergleich: OrgL RD und
 * LNA bekommen später ihre eigenen, fachlich spezialisierten Ansichten,
 * statt diese hier zu erben. Übungsleitung/Beobachter haben ohnehin schon
 * die volle Regie-Sicht (→ `istRegiefuehrend`).
 */
export function istZugfuehrend(
  rolle: Rolle | null,
  fuehrungsrolle: Fuehrungsrolle | undefined,
): boolean {
  return rolle === 'spieler' && fuehrungsrolle === 'zugfuehrer';
}

/**
 * Ob Fahrzeuge/Besatzung disponiert werden dürfen: Übungsleitung und
 * Beobachter immer (Ersatz „bei Bedarf", → Nutzerwunsch), sonst ab
 * Zugführer-Rang. Wie jede Sperre außerhalb einer aktiven Mehrspieler-Sitzung
 * nicht durchgesetzt (→ `domain.qualifikation`).
 */
export function darfFahrzeugeDisponieren(
  sitzungAktiv: boolean,
  eigeneRolle: Rolle | null,
  eigeneFuehrungsrolle: Fuehrungsrolle | undefined,
): boolean {
  if (!sitzungAktiv) return true;
  if (istRegiefuehrend(eigeneRolle)) return true;
  return erfuelltFuehrung(eigeneFuehrungsrolle ?? 'keine', 'zugfuehrer');
}

/**
 * @anker domain.zugfuehrungaktiv Ob die Eröffnen-Sperre für Abschnitte überhaupt greift
 *
 * Dieselbe Blast-Radius-Begrenzung wie `darfFahrzeugeDisponieren`: ohne
 * aktive Sitzung oder ohne jemanden mit der Führungsrolle Zugführer (oder
 * höher, → `erfuelltFuehrung`) bleibt eine Verlegung wie bisher ungegatet -
 * dadurch bleiben Alleinspiel und die ~430 bestehenden Tests unangetastet,
 * nur eine Sitzung mit echtem Zugführer prüft `istAbschnittEroeffnet`
 * (→ `domain.zelte`) wirklich.
 */
export function zugfuehrungAktiv(sitzungAktiv: boolean, spieler: Spieler[]): boolean {
  if (!sitzungAktiv) return false;
  return spieler.some((eintrag) => erfuelltFuehrung(eintrag.fuehrungsrolle ?? 'keine', 'zugfuehrer'));
}

/**
 * @anker domain.gruppenfuehrerliste Wer als Gruppenführer in der Sitzung mitspielt
 *
 * Faktoriert den bisher inline in `Lagekarte.tsx` wiederholten Filter
 * (→ `ui.lagekarte`) an seinen fachlich richtigen Ort - dieselbe Definition
 * gilt jetzt auch für die Gruppen-Zuweisung (→ `ui.gruppenzuweisung`).
 */
export function gruppenfuehrerListe(spieler: Spieler[]): Spieler[] {
  return spieler.filter(
    (eintrag) => eintrag.rolle === 'spieler' && eintrag.fuehrungsrolle === 'gruppenfuehrer',
  );
}

/**
 * @anker domain.gruppevon Die einem Gruppenführer zugewiesenen Fahrzeuge (→ `modell.gruppe`)
 */
export function gruppeVon(fahrzeuge: Fahrzeug[], gruppenfuehrerId: string): Fahrzeug[] {
  return fahrzeuge.filter((fahrzeug) => fahrzeug.gruppenfuehrerId === gruppenfuehrerId);
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
