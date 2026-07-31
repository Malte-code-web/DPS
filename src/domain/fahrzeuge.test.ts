import { describe, expect, it } from 'vitest';
import { FAHRZEUGTYPEN, FAHRZEUGTYP_INFO, fahrzeugAusVorlage, verlegeFahrzeug } from './fahrzeuge';
import { BESTUECKUNG } from './material';
import type { Fahrzeug } from './types';

describe('FAHRZEUGTYP_INFO', () => {
  it('deckt jeden FahrzeugTyp mit Label und Info ab', () => {
    for (const typ of FAHRZEUGTYPEN) {
      expect(FAHRZEUGTYP_INFO[typ].label, typ).toBeTruthy();
      expect(FAHRZEUGTYP_INFO[typ].info, typ).toBeTruthy();
    }
  });

  it('nennt für jeden FahrzeugTyp eine positive Sollbesatzung', () => {
    for (const typ of FAHRZEUGTYPEN) {
      expect(FAHRZEUGTYP_INFO[typ].sollbesatzung, typ).toBeGreaterThan(0);
    }
  });

  it('setzt die reale Sollbesatzung je Fahrzeugtyp (→ Fahrzeugtyp-Doku)', () => {
    expect(FAHRZEUGTYP_INFO.rtw.sollbesatzung).toBe(2);
    expect(FAHRZEUGTYP_INFO.nef.sollbesatzung).toBe(2);
    expect(FAHRZEUGTYP_INFO.ktw.sollbesatzung).toBe(2);
    expect(FAHRZEUGTYP_INFO.gw_rett.sollbesatzung).toBe(2);
    expect(FAHRZEUGTYP_INFO.gw_san.sollbesatzung).toBe(6);
    expect(FAHRZEUGTYP_INFO.ab_manv.sollbesatzung).toBe(2);
    expect(FAHRZEUGTYP_INFO.elw2.sollbesatzung).toBe(6);
    expect(FAHRZEUGTYP_INFO.gw_log.sollbesatzung).toBe(6);
  });
});

describe('fahrzeugAusVorlage', () => {
  it('startet an der Schadensstelle ohne Besatzung, mit vollem Materialbestand', () => {
    const fahrzeug = fahrzeugAusVorlage({ id: 'rtw-1', typ: 'rtw', kennung: 'Florian 1' });
    expect(fahrzeug).toEqual({
      id: 'rtw-1',
      typ: 'rtw',
      kennung: 'Florian 1',
      abschnitt: 'schadensstelle',
      besatzung: [],
      material: BESTUECKUNG.rtw,
    });
  });

  it('kopiert den Bestand, statt den Katalog zu teilen', () => {
    const fahrzeug = fahrzeugAusVorlage({ id: 'rtw-1', typ: 'rtw' });
    fahrzeug.material.tourniquet = 0;
    expect(BESTUECKUNG.rtw.tourniquet).not.toBe(0);
  });
});

describe('verlegeFahrzeug', () => {
  const basis: Fahrzeug = {
    id: 'rtw-1',
    typ: 'rtw',
    abschnitt: 'schadensstelle',
    besatzung: ['spieler-1'],
    material: {},
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
