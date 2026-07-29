import type { Qualifikation } from './types';

/**
 * @anker domain.qualifikation Rangfolge und Prüfung der fachlichen Qualifikation
 *
 * Einsatzsanitäter/-in (Malteser-Fachausbildung Sanitätsdienst) entspricht der
 * Stufe `basis`; Notfallsanitäter/Notärztin sind externe, staatlich geregelte
 * Qualifikationen darüber. Die Prüfung gilt nur innerhalb einer
 * Mehrspieler-Sitzung (→ `state.sitzung`) - im Einzel-/Teamspiel ohne Sitzung
 * bleibt jede Maßnahme frei wählbar, wie bisher.
 */
const RANG: Record<Qualifikation, number> = { basis: 0, notsan: 1, notarzt: 2 };

export function erfuelltQualifikation(hat: Qualifikation, braucht: Qualifikation): boolean {
  return RANG[hat] >= RANG[braucht];
}

/**
 * @anker domain.massnahmerecht Wer eine Maßnahme durchführen darf, und an wen sie delegiert werden kann
 *
 * `qualifikation` legt fest, wer die Maßnahme selbst durchführen darf - und
 * genau diese Personen sind es auch, die delegieren dürfen (keine eigene,
 * unabhängige "wer darf delegieren"-Schwelle). Was einstellbar ist, ist das
 * *Ziel* der Delegation: `delegationsziel` benennt die Stufe, an die
 * delegiert werden darf - alle mit mindestens dieser Stufe dürfen die
 * Maßnahme danach für den freigegebenen Patienten durchführen, auch ohne
 * selbst `qualifikation` zu erreichen. `delegationsziel: null` heißt: diese
 * Maßnahme ist gar nicht delegierbar, unabhängig davon, wer sie durchführen
 * dürfte. Die Übungsleitung stellt beides vor dem Start ein; ohne Anpassung
 * startet jede Maßnahme mit ihrer Katalog-Stufe und ist an alle delegierbar
 * (→ `domain.massnahmenrechte`, `standardMassnahmenrechte`).
 */
export interface MassnahmeRecht {
  /** Mindeststufe, um die Maßnahme selbst durchzuführen. */
  qualifikation: Qualifikation;
  /** Stufe, an die delegiert werden darf - `null` heißt: nicht delegierbar. */
  delegationsziel: Qualifikation | null;
}

/**
 * Ob eine Maßnahme für die eigene Qualifikation gesperrt ist. `eigene` ist
 * `null` außerhalb einer Sitzung (keine Einschränkung). `delegiert` heißt:
 * eine durchführungsberechtigte Person hat die Maßnahme für diesen Patienten
 * freigegeben (→ `massnahmeDelegieren`) - die Sperre fällt dann nur für alle,
 * die mindestens das eingestellte Delegationsziel erreichen.
 */
export function massnahmeGesperrtWegenQualifikation(
  recht: MassnahmeRecht,
  eigene: Qualifikation | null,
  delegiert: boolean,
): boolean {
  if (eigene === null) return false;
  if (erfuelltQualifikation(eigene, recht.qualifikation)) return false;
  if (delegiert && recht.delegationsziel !== null) {
    return !erfuelltQualifikation(eigene, recht.delegationsziel);
  }
  return true;
}

/**
 * Ob die eigene Qualifikation ausreicht, um diese Maßnahme zu delegieren: nur
 * wer sie selbst durchführen dürfte, kann sie delegieren - und nur, wenn sie
 * überhaupt delegierbar ist (`delegationsziel` nicht `null`).
 */
export function darfDelegieren(recht: MassnahmeRecht, eigene: Qualifikation | null): boolean {
  if (eigene === null || recht.delegationsziel === null) return false;
  return erfuelltQualifikation(eigene, recht.qualifikation);
}
