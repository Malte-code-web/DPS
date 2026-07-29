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
});

describe('massnahmeGesperrtWegenQualifikation', () => {
  const recht: MassnahmeRecht = { qualifikation: 'notsan', delegationsstufe: 'notarzt' };

  it('sperrt nichts außerhalb einer Sitzung (eigene = null)', () => {
    expect(massnahmeGesperrtWegenQualifikation(recht, null, false)).toBe(false);
  });

  it('sperrt, wenn die eigene Stufe die Durchführungs-Schwelle nicht erreicht', () => {
    expect(massnahmeGesperrtWegenQualifikation(recht, 'basis', false)).toBe(true);
  });

  it('lässt zu, sobald die Durchführungs-Schwelle erreicht ist', () => {
    expect(massnahmeGesperrtWegenQualifikation(recht, 'notsan', false)).toBe(false);
    expect(massnahmeGesperrtWegenQualifikation(recht, 'notarzt', false)).toBe(false);
  });

  it('hebt die Sperre durch Delegation auf - unabhängig von der eigenen Stufe', () => {
    expect(massnahmeGesperrtWegenQualifikation(recht, 'basis', true)).toBe(false);
  });
});

describe('darfDelegieren', () => {
  // Durchführung und Delegation sind unabhängig einstellbar: hier darf NotSan
  // die Maßnahme selbst durchführen, aber erst Notarzt darf sie delegieren.
  const recht: MassnahmeRecht = { qualifikation: 'notsan', delegationsstufe: 'notarzt' };

  it('verweigert außerhalb einer Sitzung (eigene = null)', () => {
    expect(darfDelegieren(recht, null)).toBe(false);
  });

  it('verweigert, wenn die eigene Stufe unter der Delegationsstufe liegt', () => {
    expect(darfDelegieren(recht, 'basis')).toBe(false);
    // Selbst wer die Maßnahme durchführen dürfte, darf sie hier noch nicht delegieren.
    expect(darfDelegieren(recht, 'notsan')).toBe(false);
  });

  it('erlaubt ab der Delegationsstufe', () => {
    expect(darfDelegieren(recht, 'notarzt')).toBe(true);
  });

  it('deckt sich mit der Durchführungs-Schwelle, wenn beide gleich gesetzt sind', () => {
    const gleich: MassnahmeRecht = { qualifikation: 'basis', delegationsstufe: 'basis' };
    expect(darfDelegieren(gleich, 'basis')).toBe(true);
  });
});
