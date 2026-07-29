import { describe, expect, it } from 'vitest';
import { erfuelltQualifikation, massnahmeGesperrtWegenQualifikation } from './qualifikation';

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
});

describe('massnahmeGesperrtWegenQualifikation', () => {
  it('sperrt nichts außerhalb einer Sitzung (eigene = null)', () => {
    expect(massnahmeGesperrtWegenQualifikation('notarzt', null, false)).toBe(false);
  });

  it('sperrt eine zu hohe Maßnahme innerhalb einer Sitzung', () => {
    expect(massnahmeGesperrtWegenQualifikation('notsan', 'basis', false)).toBe(true);
    expect(massnahmeGesperrtWegenQualifikation('notarzt', 'notsan', false)).toBe(true);
  });

  it('lässt eine erfüllte Maßnahme zu', () => {
    expect(massnahmeGesperrtWegenQualifikation('basis', 'basis', false)).toBe(false);
    expect(massnahmeGesperrtWegenQualifikation('notsan', 'notarzt', false)).toBe(false);
  });

  it('hebt die Sperre durch Delegation auf', () => {
    expect(massnahmeGesperrtWegenQualifikation('notarzt', 'basis', true)).toBe(false);
  });
});
