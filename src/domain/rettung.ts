import type { EingeklemmtStatus, MaterialTyp } from './types';

/**
 * @anker domain.rettung Rettung eingeklemmter Personen - live gewürfelter Bedarf
 *
 * Weder Materialbedarf noch benötigte Anzahl Kolleg:innen stehen im
 * Szenario fest (→ `modell.eingeklemmt`) - beides wird erst bei der
 * tatsächlichen Freigabe der Person ausgewürfelt, damit dieselbe
 * eingeklemmte Person in zwei Durchläufen unterschiedlich anspruchsvoll
 * ausfallen kann. `kedsystem` deckt Combi-Carrier/KED-System als eine
 * Maßnahme ab, wie schon bei `fahrzeugrettung` (→ `domain.massnahmen`).
 */
const MATERIALBEDARF_WAHRSCHEINLICHKEIT = 0.5;
const MAX_BENOETIGTE_KOLLEGEN = 2;

export function wuerfleEinklemmungsbedarf(zufall: () => number = Math.random): {
  benoetigtesMaterial: MaterialTyp | null;
  benoetigteKollegenAnzahl: number;
} {
  return {
    benoetigtesMaterial: zufall() < MATERIALBEDARF_WAHRSCHEINLICHKEIT ? 'kedsystem' : null,
    benoetigteKollegenAnzahl: Math.floor(zufall() * (MAX_BENOETIGTE_KOLLEGEN + 1)),
  };
}

/**
 * Ob die Rettung starten kann: das ggf. benötigte Material muss bereitstehen
 * und genug Kolleg:innen müssen zugesagt haben. Ohne Bedarf (Material `null`,
 * `benoetigteKollegenAnzahl` 0) ist beides automatisch erfüllt.
 */
export function rettungBereit(status: EingeklemmtStatus): boolean {
  const materialBereit = status.benoetigtesMaterial === null || status.materialBereitgestellt;
  const kollegenBereit = status.helfendeIds.length >= status.benoetigteKollegenAnzahl;
  return materialBereit && kollegenBereit;
}
