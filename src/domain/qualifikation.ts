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
 * Zwei vollständig unabhängig einstellbare Schwellen je Maßnahme
 * (→ `domain.massnahmenrechte`) - keine Kopplung, kein automatischer
 * Freifahrtschein: Wer `qualifikation` erreicht, darf durchführen; wer
 * `delegationsstufe` erreicht, darf delegieren. Beides ist bewusst getrennt
 * einzustellen, damit die Übungsleitung für jede Maßnahme explizit
 * entscheidet, ob Durchführende auch delegieren dürfen (dafür `delegationsstufe`
 * auf `qualifikation` setzen - der Ausgangswert) oder ob eine andere Stufe
 * delegieren soll, ohne dass Durchführende es automatisch dürften. Die
 * Übungsleitung stellt beides vor dem Start ein; ohne Anpassung startet jede
 * Maßnahme mit ihrer Katalog-Stufe für beides (→ `domain.massnahmenrechte`,
 * `standardMassnahmenrechte`).
 */
export interface MassnahmeRecht {
  /** Mindeststufe, um die Maßnahme selbst durchzuführen. */
  qualifikation: Qualifikation;
  /** Mindeststufe, um die Maßnahme für einen Patienten zu delegieren - unabhängig von `qualifikation`. */
  delegationsstufe: Qualifikation;
}

/**
 * Ob eine Maßnahme für die eigene Qualifikation gesperrt ist. `eigene` ist
 * `null` außerhalb einer Sitzung (keine Einschränkung). `delegiert` hebt die
 * Sperre für diesen einen Patienten auf - jemand mit ausreichender
 * Delegationsstufe hat die Maßnahme freigegeben (→ `massnahmeDelegieren`).
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
 * Ob die eigene Qualifikation ausreicht, um diese Maßnahme zu delegieren -
 * allein anhand der eigens eingestellten Delegationsstufe, unabhängig davon,
 * ob die eigene Stufe auch zum Durchführen reichen würde.
 */
export function darfDelegieren(recht: MassnahmeRecht, eigene: Qualifikation | null): boolean {
  if (eigene === null) return false;
  return erfuelltQualifikation(eigene, recht.delegationsstufe);
}
