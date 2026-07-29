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
 * @anker domain.massnahmerecht Wer eine Maßnahme durchführen und wer sie delegieren darf
 *
 * Zwei einstellbare Schwellen je Maßnahme (→ `domain.massnahmenrechte`). Wer
 * `qualifikation` erreicht, darf die Maßnahme selbst durchführen - und kann sie
 * immer auch an eine niedrigere Stufe delegieren, das ist nicht extra
 * einstellbar. `delegationsstufe` erweitert das Delegieren zusätzlich auf
 * Personen, die die Maßnahme selbst nicht durchführen dürften (z. B. eine
 * Praxisanleitung, die NotSan-Maßnahmen freigeben, aber nicht selbst
 * durchführen darf) - sie ist deshalb sinnvoll nur unterhalb von
 * `qualifikation` gesetzt. Die Übungsleitung stellt beides vor dem Start ein;
 * ohne Anpassung startet jede Maßnahme mit ihrer Katalog-Stufe für beides
 * (→ `domain.massnahmenrechte`, `standardMassnahmenrechte`).
 */
export interface MassnahmeRecht {
  /** Mindeststufe, um die Maßnahme selbst durchzuführen - und sie zu delegieren. */
  qualifikation: Qualifikation;
  /** Zusätzliche, niedrigere Mindeststufe, die allein zum Delegieren berechtigt. */
  delegationsstufe: Qualifikation;
}

/**
 * Ob eine Maßnahme für die eigene Qualifikation gesperrt ist. `eigene` ist
 * `null` außerhalb einer Sitzung (keine Einschränkung). `delegiert` hebt die
 * Sperre für diesen einen Patienten auf - jemand Berechtigtes hat die
 * Maßnahme freigegeben (→ `massnahmeDelegieren`).
 */
export function massnahmeGesperrtWegenQualifikation(
  recht: MassnahmeRecht,
  eigene: Qualifikation | null,
  delegiert: boolean,
): boolean {
  if (eigene === null || delegiert) return false;
  return !erfuelltQualifikation(eigene, recht.qualifikation);
}

/**
 * Ob die eigene Qualifikation ausreicht, um diese Maßnahme zu delegieren: wer
 * sie selbst durchführen dürfte, darf sie immer auch delegieren; zusätzlich
 * berechtigt die eigens einstellbare Delegationsstufe.
 */
export function darfDelegieren(recht: MassnahmeRecht, eigene: Qualifikation | null): boolean {
  if (eigene === null) return false;
  return (
    erfuelltQualifikation(eigene, recht.qualifikation) ||
    erfuelltQualifikation(eigene, recht.delegationsstufe)
  );
}
