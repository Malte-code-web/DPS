import { describe, expect, it } from 'vitest';
import {
  darfDelegieren,
  erfuelltQualifikation,
  massnahmeGesperrtWegenQualifikation,
} from './qualifikation';
import type { MassnahmeRecht } from './qualifikation';

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
