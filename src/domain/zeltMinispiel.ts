import { ZELTTYPEN } from './flaechen';
import { gruppeVon } from './fuehrung';
import type { Spieler } from './sitzung';
import type { Fahrzeug, FlaechenTypId, ZeltMinispielRunde, ZeltTypId } from './types';

/**
 * @anker domain.zeltminispiel Kooperatives "Kommando-Aufbau"-Minispiel beim Zeltaufbau
 *
 * Bewusst als eigenständiges, an genau einem Schalter ein-/ausschaltbares
 * Modul gebaut (Nutzerwunsch: schnell ein-/ausbaubar). `MINISPIEL_AKTIV` ist
 * die einzige Stelle, die umgestellt werden muss, um das Feature komplett
 * abzuschalten - `sollMinispielStarten` prüft sie als Erstes, sodass beide
 * Aufrufstellen (→ `ui.zeltbefehlbenachrichtigung`, `ui.lagekarte`) dann
 * unverändert auf den bisherigen `zeltPlatzieren`-Dispatch zurückfallen.
 *
 * Konzept: ab dem Baustart laufen feste "Bauschritt"-Runden im
 * `RUNDEN_INTERVALL_SEK`-Takt, jede Runde ist genau eine Person aus der
 * Gruppe (ohne den Gruppenführer) "dran" - nur der Gruppenführer kennt den
 * vollständigen Rundenplan im Voraus (→ `modell.zeltminispiel`,
 * Sichtbarkeit ist reine UI-Konvention, siehe `ZeltMinispielBenachrichtigung`),
 * alle anderen erfahren ihre Runde nur über echte Sprechfunk-Kommunikation.
 * Ein rechtzeitiger Treffer verkürzt die Bauzeit um `BONUS_SEK`, gedeckelt
 * auf maximal `MAX_BONUS_ANTEIL` der ungekürzten Dauer - ein verpasster oder
 * falscher Tipp kostet nichts, ohne jede Teilnahme bleibt es bei der
 * heutigen `aufbauSek`-Dauer.
 */
export const MINISPIEL_AKTIV = true;

/** Alle `RUNDEN_INTERVALL_SEK` Simulationssekunden ab Baustart eine neue Runde. */
export const RUNDEN_INTERVALL_SEK = 60;

/** Zeitfenster ab Rundenbeginn, in dem ein Treffer noch zählt. */
export const RUNDEN_FENSTER_SEK = 6;

/** Verkürzung der verbleibenden Bauzeit pro rechtzeitigem Treffer. */
export const BONUS_SEK = 20;

/** Harter Deckel: nie mehr als dieser Anteil der ungekürzten `aufbauSek` einsparbar. */
export const MAX_BONUS_ANTEIL = 0.5;

/** Ob `typ` ein reales Zeltprodukt ist (Minispiel gilt nie für reine Flächen). */
export function istZeltTyp(typ: ZeltTypId | FlaechenTypId): typ is ZeltTypId {
  return typ in ZELTTYPEN;
}

/**
 * Die Gruppe eines Gruppenführers als Spieler-IDs, ohne ihn selbst - flacht
 * `gruppeVon` (liefert Fahrzeuge, → `domain.gruppevon`) über deren
 * `besatzung` ab, filtert leere Plätze (`''`) und dedupliziert (dieselbe
 * Person kann auf mehreren Fahrzeugen der Gruppe stehen).
 */
export function teilnehmerVon(fahrzeuge: Fahrzeug[], gruppenfuehrerId: string): string[] {
  const alle = gruppeVon(fahrzeuge, gruppenfuehrerId).flatMap((fahrzeug) => fahrzeug.besatzung);
  const ohneLeereUndGruppenfuehrer = alle.filter(
    (spielerId) => spielerId !== '' && spielerId !== gruppenfuehrerId,
  );
  return [...new Set(ohneLeereUndGruppenfuehrer)];
}

/**
 * Ob ein anstehender Zeltbau statt des direkten `zeltPlatzieren`-Wegs das
 * Minispiel auslösen soll: Schalter an, echtes Zeltprodukt, die bauende
 * Person ist tatsächlich Gruppenführer (auch "Selbst bauen" in
 * `ui.lagekarte` kann theoretisch von einem Zugführer erreicht werden), und
 * es gibt mindestens eine weitere Person in der Gruppe zum Mitspielen.
 */
export function sollMinispielStarten(
  fahrzeuge: Fahrzeug[],
  spieler: Spieler[],
  flaechenTyp: ZeltTypId | FlaechenTypId,
  builderId: string | undefined,
): boolean {
  if (!MINISPIEL_AKTIV) return false;
  if (!istZeltTyp(flaechenTyp)) return false;
  if (!builderId) return false;
  const builder = spieler.find((eintrag) => eintrag.id === builderId);
  if (builder?.fuehrungsrolle !== 'gruppenfuehrer') return false;
  return teilnehmerVon(fahrzeuge, builderId).length > 0;
}

/** Rundenzahl für eine gegebene ungekürzte Bauzeit, fest ab Baustart getaktet. */
export function rundenanzahlFuer(aufbauSek: number): number {
  return Math.floor(aufbauSek / RUNDEN_INTERVALL_SEK);
}

/**
 * Deterministisches Round-Robin über die Teilnehmenden - keine Zufälligkeit
 * nötig (Fairness/Testbarkeit), die Sichtbarkeits-Asymmetrie kommt allein
 * aus der UI (→ `ui.zeltminispielbenachrichtigung`), nicht aus Geheimhaltung
 * der Reihenfolge selbst.
 */
export function rundenplanErzeugen(teilnehmerIds: string[], anzahlRunden: number): ZeltMinispielRunde[] {
  if (teilnehmerIds.length === 0) return [];
  return Array.from({ length: anzahlRunden }, (_, index) => ({
    spielerId: teilnehmerIds[index % teilnehmerIds.length]!,
  }));
}

/**
 * Nächstes Fertigstellungsziel nach einem Treffer - der Deckel wird bei
 * jedem einzelnen Treffer als harte Untergrenze durchgesetzt, nicht nur
 * einmal geprüft, damit spätere Kalibrierungs-Anpassungen ihn nicht versehentlich
 * unterschreiten können.
 */
export function naechsteZielZeit(
  startZeitSek: number,
  aufbauSekVoll: number,
  aktuellesZielZeitSek: number,
): number {
  const untergrenze = startZeitSek + aufbauSekVoll * (1 - MAX_BONUS_ANTEIL);
  return Math.max(untergrenze, aktuellesZielZeitSek - BONUS_SEK);
}
