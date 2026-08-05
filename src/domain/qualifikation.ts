import type { Spieler } from './sitzung';
import type { DelegationsFreigabe, Einsatzabschnitt, MassnahmeId, Qualifikation } from './types';

/**
 * @anker domain.qualifikation Rangfolge und Prüfung der fachlichen Qualifikation
 *
 * Fünf Stufen (→ `modell.qualifikation`): Sanitätshelfer/Einsatzsanitäter
 * (`basis`) und Rettungshelfer (`rettungshelfer`, medizinisch gleich, aber
 * einsatztaktisch vertieft) bilden die ehrenamtliche Grundausbildung;
 * Rettungssanitäter (`rettungssanitaeter`) liegt klar darüber und klar unter
 * Notfallsanitäter (`notsan`, nach § 2a NotSanG); Notärztin/Notarzt
 * (`notarzt`) bleibt die knappste, oberste Stufe. Die Prüfung gilt nur
 * innerhalb einer Mehrspieler-Sitzung (→ `state.sitzung`) - im
 * Einzel-/Teamspiel ohne Sitzung bleibt jede Maßnahme frei wählbar, wie
 * bisher.
 */
const RANG: Record<Qualifikation, number> = {
  basis: 0,
  rettungshelfer: 1,
  rettungssanitaeter: 2,
  notsan: 3,
  notarzt: 4,
};

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

/**
 * Ob eine Maßnahme für GENAU diese Person bei diesem Patienten freigegeben
 * ist (→ `modell.delegation`) - eine gezielte, keine patientenweite Freigabe.
 */
export function istFuerSpielerDelegiert(
  delegierteMassnahmen: DelegationsFreigabe[],
  massnahmeId: MassnahmeId,
  spielerId: string | null,
): boolean {
  if (!spielerId) return false;
  return delegierteMassnahmen.some(
    (freigabe) => freigabe.massnahmeId === massnahmeId && freigabe.spielerId === spielerId,
  );
}

/**
 * @anker domain.delegationskandidaten Wen fragen? - Kandidaten für eine Delegationsanfrage
 *
 * Wer als Ziel einer Anfrage infrage kommt: nicht die anfragende Person
 * selbst, im selben Einsatzabschnitt anwesend (→ `sitzung.modell`,
 * `aktuellerAbschnitt`) und mit ausreichender Qualifikation, um die Maßnahme
 * selbst durchführen (und damit delegieren) zu dürfen - dieselbe Regel wie
 * bei `darfDelegieren`, nur auf jede andere Person statt auf die eigene
 * angewendet.
 */
export function delegationsKandidaten(
  recht: MassnahmeRecht,
  spieler: Spieler[],
  eigeneId: string | null,
  eigenerAbschnitt: Einsatzabschnitt,
): Spieler[] {
  return spieler.filter(
    (kandidat) =>
      kandidat.id !== eigeneId &&
      kandidat.aktuellerAbschnitt === eigenerAbschnitt &&
      darfDelegieren(recht, kandidat.qualifikation),
  );
}

/**
 * @anker domain.notfallnarkose_team Team aus RS + NotSan + NotArzt gleichzeitig anwesend
 *
 * Anders als jede Qualifikationssperre reicht hier nicht die eigene Stufe -
 * es müssen drei *verschiedene* Personen mit Rettungssanitäter-, NotSan- und
 * NotArzt-Qualifikation gleichzeitig in der Sitzung sein (→ `benoetigtTeam`,
 * `modell.notfallnarkose`). Eine einzelne, noch so hoch qualifizierte Person
 * darf nicht allein einleiten. Geprüft wird von der höchsten Anforderung her:
 * zuerst eine Notärztin/ein Notarzt aus dem Spieler-Pool gezogen, danach aus
 * dem Rest ein/e NotSan, danach aus dem verbleibenden Rest ein/e
 * Rettungssanitäter/-in - so kann eine überqualifizierte Person nicht
 * mehrere Rollen gleichzeitig "besetzen". Außerhalb einer Mehrspieler-Sitzung
 * gilt dieselbe Ausnahme wie bei jeder anderen Qualifikationssperre: im
 * Einzel-/Teamspiel bleibt alles frei wählbar.
 */
export function notfallnarkoseTeamVerfuegbar(sitzungAktiv: boolean, spieler: Spieler[]): boolean {
  if (!sitzungAktiv) return true;
  const pool = [...spieler];
  const ziehe = (mindestens: Qualifikation): boolean => {
    const index = pool.findIndex((s) => erfuelltQualifikation(s.qualifikation, mindestens));
    if (index === -1) return false;
    pool.splice(index, 1);
    return true;
  };
  return ziehe('notarzt') && ziehe('notsan') && ziehe('rettungssanitaeter');
}
