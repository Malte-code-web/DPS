import type { Qualifikation } from './types';

/**
 * @anker domain.qualifikation Rangfolge und Prüfung der fachlichen Qualifikation
 *
 * Einsatzsanitäter/-in (Malteser-Fachausbildung Sanitätsdienst) entspricht der
 * Stufe `basis` des Maßnahmenkatalogs; Notfallsanitäter/Notärztin sind externe,
 * staatlich geregelte Qualifikationen darüber. Die Prüfung gilt nur innerhalb
 * einer Mehrspieler-Sitzung (→ `state.sitzung`) - im Einzel-/Teamspiel ohne
 * Sitzung bleibt jede Maßnahme frei wählbar, wie bisher.
 */
const RANG: Record<Qualifikation, number> = { basis: 0, notsan: 1, notarzt: 2 };

export function erfuelltQualifikation(hat: Qualifikation, braucht: Qualifikation): boolean {
  return RANG[hat] >= RANG[braucht];
}

/**
 * Ob eine Maßnahme für die eigene Qualifikation gesperrt ist. `eigene` ist
 * `null` außerhalb einer Sitzung (keine Einschränkung). `delegiert` hebt die
 * Sperre für diesen einen Patienten auf - eine höherqualifizierte Person hat
 * die Maßnahme freigegeben (→ `state.aktionen`, `massnahmeDelegieren`).
 */
export function massnahmeGesperrtWegenQualifikation(
  benoetigt: Qualifikation,
  eigene: Qualifikation | null,
  delegiert: boolean,
): boolean {
  if (eigene === null || delegiert) return false;
  return !erfuelltQualifikation(eigene, benoetigt);
}
