import { describe, expect, it } from 'vitest';
import { FAHRZEUGTYPEN, FAHRZEUGTYP_INFO, fahrzeugAusVorlage, verlegeFahrzeug } from './fahrzeuge';
import type { Fahrzeug } from './types';

describe('FAHRZEUGTYP_INFO', () => {
  it('deckt jeden FahrzeugTyp mit Label und Info ab', () => {
    for (const typ of FAHRZEUGTYPEN) {
      expect(FAHRZEUGTYP_INFO[typ].label, typ).toBeTruthy();
      expect(FAHRZEUGTYP_INFO[typ].info, typ).toBeTruthy();
    }
  });
});

describe('fahrzeugAusVorlage', () => {
  it('startet an der Schadensstelle ohne Besatzung', () => {
    const fahrzeug = fahrzeugAusVorlage({ id: 'rtw-1', typ: 'rtw', kennung: 'Florian 1' });
    expect(fahrzeug).toEqual({
      id: 'rtw-1',
      typ: 'rtw',
      kennung: 'Florian 1',
      abschnitt: 'schadensstelle',
      besatzung: [],
    });
  });
});

describe('verlegeFahrzeug', () => {
  const basis: Fahrzeug = {
    id: 'rtw-1',
    typ: 'rtw',
    abschnitt: 'schadensstelle',
    besatzung: ['spieler-1'],
  };

  it('setzt den neuen Abschnitt, ohne die Besatzung zu verändern', () => {
    const verlegt = verlegeFahrzeug(basis, 'eingangssichtung');
    expect(verlegt.abschnitt).toBe('eingangssichtung');
    expect(verlegt.besatzung).toEqual(['spieler-1']);
  });

  it('ändert nichts, wenn Ziel gleich dem aktuellen Abschnitt ist', () => {
    const verlegt = verlegeFahrzeug(basis, 'schadensstelle');
    expect(verlegt).toEqual(basis);
  });
});
