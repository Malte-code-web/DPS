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
  it('verweigert außerhalb einer Sitzung (eigene = null)', () => {
    const recht: MassnahmeRecht = { qualifikation: 'notsan', delegationsstufe: 'notsan' };
    expect(darfDelegieren(recht, null)).toBe(false);
  });

  it('richtet sich allein nach der Delegationsstufe, keine automatische Kopplung an die Durchführungs-Schwelle', () => {
    // Delegationsstufe liegt hier über der Durchführungs-Schwelle: Wer die
    // Maßnahme durchführen dürfte, darf sie deswegen noch nicht delegieren -
    // das muss die Übungsleitung explizit gleich einstellen, kein Automatismus.
    const recht: MassnahmeRecht = { qualifikation: 'notsan', delegationsstufe: 'notarzt' };
    expect(darfDelegieren(recht, 'notsan')).toBe(false);
    expect(darfDelegieren(recht, 'notarzt')).toBe(true);
  });

  it('verweigert unterhalb der Delegationsstufe', () => {
    const recht: MassnahmeRecht = { qualifikation: 'notsan', delegationsstufe: 'notsan' };
    expect(darfDelegieren(recht, 'basis')).toBe(false);
  });

  it('erlaubt eine niedrigere Delegationsstufe als die Durchführungs-Schwelle, ohne die Maßnahme selbst zu erlauben', () => {
    // NotArzt-Maßnahme, aber ab NotSan darf schon delegiert werden (z. B. eine
    // Praxisanleitung ohne eigene Durchführungsberechtigung).
    const recht: MassnahmeRecht = { qualifikation: 'notarzt', delegationsstufe: 'notsan' };
    expect(darfDelegieren(recht, 'notsan')).toBe(true);
    expect(darfDelegieren(recht, 'basis')).toBe(false);
  });

  it('erlaubt, wenn die Übungsleitung beide Schwellen bewusst gleich gesetzt hat', () => {
    const gleich: MassnahmeRecht = { qualifikation: 'basis', delegationsstufe: 'basis' };
    expect(darfDelegieren(gleich, 'basis')).toBe(true);
  });
});
