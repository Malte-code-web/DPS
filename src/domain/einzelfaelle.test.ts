import { describe, expect, it } from 'vitest';
import { EINZELFAELLE } from './einzelfaelle';
import { pruefeSzenario } from './szenarioPruefung';

describe('Einzelfälle für den Ein-Person-Modus', () => {
  it('sind jeweils genau eine Person', () => {
    for (const fall of EINZELFAELLE) {
      expect(fall.patienten, fall.id).toHaveLength(1);
    }
  });

  it('sind in sich stimmig - bestehen dieselbe Prüfung wie eigene Szenarien', () => {
    for (const fall of EINZELFAELLE) {
      expect(pruefeSzenario(fall).gueltig, fall.id).toBe(true);
    }
  });

  it('haben eindeutige IDs und Patienten-IDs', () => {
    const ids = EINZELFAELLE.map((fall) => fall.id);
    expect(new Set(ids).size).toBe(ids.length);
    const patientIds = EINZELFAELLE.map((fall) => fall.patienten[0]!.id);
    expect(new Set(patientIds).size).toBe(patientIds.length);
  });
});
