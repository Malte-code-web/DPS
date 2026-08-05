import { describe, expect, it } from 'vitest';
import {
  darfDelegieren,
  delegationsKandidaten,
  erfuelltQualifikation,
  istFuerSpielerDelegiert,
  massnahmeGesperrtWegenQualifikation,
  notfallnarkoseTeamVerfuegbar,
} from './qualifikation';
import type { MassnahmeRecht } from './qualifikation';
import type { Spieler } from './sitzung';
import type { DelegationsFreigabe, Einsatzabschnitt, Qualifikation } from './types';

let naechsteId = 0;
function spielerMit(
  qualifikation: Qualifikation,
  aktuellerAbschnitt?: Einsatzabschnitt,
): Spieler {
  naechsteId += 1;
  return {
    id: `s-${naechsteId}`,
    name: `Spieler ${naechsteId}`,
    rolle: 'spieler',
    qualifikation,
    aktuellerAbschnitt,
  };
}

describe('erfuelltQualifikation', () => {
  it('lässt die eigene Stufe und alles darunter zu', () => {
    expect(erfuelltQualifikation('basis', 'basis')).toBe(true);
    expect(erfuelltQualifikation('notsan', 'basis')).toBe(true);
    expect(erfuelltQualifikation('notarzt', 'basis')).toBe(true);
    expect(erfuelltQualifikation('notarzt', 'notsan')).toBe(true);
    expect(erfuelltQualifikation('notarzt', 'notarzt')).toBe(true);
  });

  it('verweigert eine höhere als die eigene Stufe', () => {
    expect(erfuelltQualifikation('basis', 'notsan')).toBe(false);
    expect(erfuelltQualifikation('basis', 'notarzt')).toBe(false);
    expect(erfuelltQualifikation('notsan', 'notarzt')).toBe(false);
  });

  it('ordnet die fünf Stufen Basis < Rettungshelfer < Rettungssanitäter < NotSan < NotArzt', () => {
    expect(erfuelltQualifikation('rettungshelfer', 'basis')).toBe(true);
    expect(erfuelltQualifikation('basis', 'rettungshelfer')).toBe(false);
    expect(erfuelltQualifikation('rettungssanitaeter', 'rettungshelfer')).toBe(true);
    expect(erfuelltQualifikation('rettungshelfer', 'rettungssanitaeter')).toBe(false);
    expect(erfuelltQualifikation('notsan', 'rettungssanitaeter')).toBe(true);
    expect(erfuelltQualifikation('rettungssanitaeter', 'notsan')).toBe(false);
  });
});

describe('massnahmeGesperrtWegenQualifikation', () => {
  it('sperrt nichts außerhalb einer Sitzung (eigene = null)', () => {
    const recht: MassnahmeRecht = { qualifikation: 'notsan', delegationsziel: 'basis' };
    expect(massnahmeGesperrtWegenQualifikation(recht, null, false)).toBe(false);
  });

  it('sperrt, wenn die eigene Stufe die Durchführungs-Schwelle nicht erreicht und nicht delegiert ist', () => {
    const recht: MassnahmeRecht = { qualifikation: 'notsan', delegationsziel: 'basis' };
    expect(massnahmeGesperrtWegenQualifikation(recht, 'basis', false)).toBe(true);
  });

  it('lässt zu, sobald die Durchführungs-Schwelle erreicht ist', () => {
    const recht: MassnahmeRecht = { qualifikation: 'notsan', delegationsziel: 'basis' };
    expect(massnahmeGesperrtWegenQualifikation(recht, 'notsan', false)).toBe(false);
    expect(massnahmeGesperrtWegenQualifikation(recht, 'notarzt', false)).toBe(false);
  });

  it('hebt die Sperre durch Delegation auf, sobald die eigene Stufe das Delegationsziel erreicht', () => {
    const recht: MassnahmeRecht = { qualifikation: 'notarzt', delegationsziel: 'notsan' };
    expect(massnahmeGesperrtWegenQualifikation(recht, 'notsan', true)).toBe(false);
    // Unterhalb des Delegationsziels bleibt es gesperrt, auch wenn delegiert wurde.
    expect(massnahmeGesperrtWegenQualifikation(recht, 'basis', true)).toBe(true);
  });

  it('bleibt gesperrt, wenn die Maßnahme nicht delegierbar ist (delegationsziel = null)', () => {
    const recht: MassnahmeRecht = { qualifikation: 'notarzt', delegationsziel: null };
    expect(massnahmeGesperrtWegenQualifikation(recht, 'basis', true)).toBe(true);
  });
});

describe('darfDelegieren', () => {
  it('verweigert außerhalb einer Sitzung (eigene = null)', () => {
    const recht: MassnahmeRecht = { qualifikation: 'notsan', delegationsziel: 'basis' };
    expect(darfDelegieren(recht, null)).toBe(false);
  });

  it('verweigert, wenn die Maßnahme nicht delegierbar ist', () => {
    const recht: MassnahmeRecht = { qualifikation: 'notsan', delegationsziel: null };
    expect(darfDelegieren(recht, 'notarzt')).toBe(false);
  });

  it('nur wer die Maßnahme selbst durchführen dürfte, darf delegieren', () => {
    const recht: MassnahmeRecht = { qualifikation: 'notsan', delegationsziel: 'basis' };
    expect(darfDelegieren(recht, 'basis')).toBe(false);
    expect(darfDelegieren(recht, 'notsan')).toBe(true);
    expect(darfDelegieren(recht, 'notarzt')).toBe(true);
  });
});

describe('notfallnarkoseTeamVerfuegbar', () => {
  it('sperrt nichts außerhalb einer Sitzung, egal wie besetzt', () => {
    expect(notfallnarkoseTeamVerfuegbar(false, [])).toBe(true);
    expect(notfallnarkoseTeamVerfuegbar(false, [spielerMit('basis')])).toBe(true);
  });

  it('lässt ein Team aus RS + NotSan + NotArzt zu', () => {
    const spieler = [
      spielerMit('rettungssanitaeter'),
      spielerMit('notsan'),
      spielerMit('notarzt'),
    ];
    expect(notfallnarkoseTeamVerfuegbar(true, spieler)).toBe(true);
  });

  it('sperrt, wenn eine der drei Rollen fehlt', () => {
    // Nur RS + NotArzt, kein NotSan.
    const ohneNotsan = [spielerMit('rettungssanitaeter'), spielerMit('notarzt')];
    expect(notfallnarkoseTeamVerfuegbar(true, ohneNotsan)).toBe(false);

    // Nur ein einzelner NotArzt allein - auch die höchste Stufe füllt nicht
    // gleichzeitig alle drei Rollen.
    expect(notfallnarkoseTeamVerfuegbar(true, [spielerMit('notarzt')])).toBe(false);
  });

  it('lässt eine höhere Stufe eine niedrigere Rolle füllen, aber nicht doppelt zählen', () => {
    // Zwei Notärztinnen + eine RS: die zweite Notärztin deckt die NotSan-Rolle
    // rangmäßig ab, die RS bleibt für die dritte Rolle übrig.
    const team = [spielerMit('notarzt'), spielerMit('notarzt'), spielerMit('rettungssanitaeter')];
    expect(notfallnarkoseTeamVerfuegbar(true, team)).toBe(true);

    // Eine einzelne Notärztin plus eine RS reicht nicht - die NotSan-Rolle
    // bleibt unbesetzt, weil die Notärztin schon für ihre eigene Rolle gezogen wurde.
    const zuKlein = [spielerMit('notarzt'), spielerMit('rettungssanitaeter')];
    expect(notfallnarkoseTeamVerfuegbar(true, zuKlein)).toBe(false);
  });

  it('ist unabhängig von der Reihenfolge im Spieler-Array', () => {
    const team = [
      spielerMit('notarzt'),
      spielerMit('rettungssanitaeter'),
      spielerMit('notsan'),
    ];
    expect(notfallnarkoseTeamVerfuegbar(true, [...team].reverse())).toBe(true);
  });
});

describe('istFuerSpielerDelegiert', () => {
  const freigaben: DelegationsFreigabe[] = [{ massnahmeId: 'thoraxentlastung', spielerId: 's-1' }];

  it('erkennt eine Freigabe für genau die anfragende Person', () => {
    expect(istFuerSpielerDelegiert(freigaben, 'thoraxentlastung', 's-1')).toBe(true);
  });

  it('gilt nicht für eine andere Person, selbst bei derselben Maßnahme', () => {
    expect(istFuerSpielerDelegiert(freigaben, 'thoraxentlastung', 's-2')).toBe(false);
  });

  it('gilt nicht für eine andere Maßnahme derselben Person', () => {
    expect(istFuerSpielerDelegiert(freigaben, 'intubation', 's-1')).toBe(false);
  });

  it('verweigert ohne eigene Id (außerhalb einer Sitzung)', () => {
    expect(istFuerSpielerDelegiert(freigaben, 'thoraxentlastung', null)).toBe(false);
  });
});

describe('delegationsKandidaten', () => {
  const recht: MassnahmeRecht = { qualifikation: 'notsan', delegationsziel: 'basis' };

  it('lässt nur Personen im selben Abschnitt mit ausreichender Qualifikation zu', () => {
    const gleicherAbschnitt = spielerMit('notarzt', 'zelt_rot');
    const andererAbschnitt = spielerMit('notarzt', 'zelt_gelb');
    const zuNiedrig = spielerMit('basis', 'zelt_rot');
    const kandidaten = delegationsKandidaten(
      recht,
      [gleicherAbschnitt, andererAbschnitt, zuNiedrig],
      'ich',
      'zelt_rot',
    );
    expect(kandidaten).toEqual([gleicherAbschnitt]);
  });

  it('schließt die anfragende Person selbst aus', () => {
    const selbst = { ...spielerMit('notarzt', 'zelt_rot'), id: 'ich' };
    const kandidaten = delegationsKandidaten(recht, [selbst], 'ich', 'zelt_rot');
    expect(kandidaten).toEqual([]);
  });

  it('zählt niemanden ohne bekannten aktuellen Abschnitt (Feld fehlt)', () => {
    const ohneAbschnitt = spielerMit('notarzt');
    const kandidaten = delegationsKandidaten(recht, [ohneAbschnitt], 'ich', 'zelt_rot');
    expect(kandidaten).toEqual([]);
  });

  it('bleibt leer, wenn die Maßnahme nicht delegierbar ist', () => {
    const nichtDelegierbar: MassnahmeRecht = { qualifikation: 'notsan', delegationsziel: null };
    const kandidat = spielerMit('notarzt', 'zelt_rot');
    expect(delegationsKandidaten(nichtDelegierbar, [kandidat], 'ich', 'zelt_rot')).toEqual([]);
  });
});
