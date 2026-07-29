import { MASSNAHMEN_LISTE } from './massnahmen';
import type { MassnahmeRecht } from './qualifikation';
import type { MassnahmeId, Qualifikation } from './types';

/**
 * @anker domain.massnahmenrechte Je Sitzung einstellbare Durchführungs- und Delegationsstufen
 *
 * Der Maßnahmenkatalog (→ `massnahmen.katalog`) trägt weiterhin eine
 * Katalog-Qualifikation je Maßnahme - das ist der Ausgangswert. Die
 * Übungsleitung kann ihn vor jeder Sitzung anpassen (→ `ui.massnahmenrechte`);
 * die Anpassung wird auf dem Gerät der Übungsleitung gespeichert und beim
 * nächsten Mal vorgeschlagen, bleibt aber jedes Mal änderbar.
 */
export type Massnahmenrechte = Record<MassnahmeId, MassnahmeRecht>;

const GUELTIGE_QUALIFIKATIONEN: Qualifikation[] = ['basis', 'notsan', 'notarzt'];

/** Ausgangswert: Durchführung und Delegation beide auf der Katalog-Stufe. */
export function standardMassnahmenrechte(): Massnahmenrechte {
  const rechte = {} as Massnahmenrechte;
  for (const massnahme of MASSNAHMEN_LISTE) {
    rechte[massnahme.id] = {
      qualifikation: massnahme.qualifikation,
      delegationsstufe: massnahme.qualifikation,
    };
  }
  return rechte;
}

/**
 * Baut einen vollständigen, gültigen Stand aus einem gespeicherten (evtl.
 * älteren oder beschädigten) Wert: fehlende oder neue Maßnahmen bekommen den
 * Katalog-Standard, ungültige Werte werden verworfen statt übernommen.
 */
export function vervollstaendigeMassnahmenrechte(gespeichert: unknown): Massnahmenrechte {
  const standard = standardMassnahmenrechte();
  if (!gespeichert || typeof gespeichert !== 'object') return standard;
  const quelle = gespeichert as Record<string, Partial<MassnahmeRecht> | undefined>;
  const ergebnis = { ...standard };
  for (const id of Object.keys(standard) as MassnahmeId[]) {
    const eintrag = quelle[id];
    if (!eintrag) continue;
    ergebnis[id] = {
      qualifikation: GUELTIGE_QUALIFIKATIONEN.includes(eintrag.qualifikation as Qualifikation)
        ? (eintrag.qualifikation as Qualifikation)
        : standard[id].qualifikation,
      delegationsstufe: GUELTIGE_QUALIFIKATIONEN.includes(eintrag.delegationsstufe as Qualifikation)
        ? (eintrag.delegationsstufe as Qualifikation)
        : standard[id].delegationsstufe,
    };
  }
  return ergebnis;
}
