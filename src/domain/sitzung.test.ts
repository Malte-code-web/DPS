import { describe, expect, it } from 'vitest';
import {
  erzeugeCode,
  erzeugeId,
  istGueltigerCode,
  mitSpieler,
  normalisiereCode,
  ohneSpieler,
} from './sitzung';
import type { Spieler } from './sitzung';

describe('Sitzungscode', () => {
  it('erzeugt Codes der gewünschten Länge', () => {
    expect(erzeugeCode()).toHaveLength(5);
    expect(erzeugeCode(6)).toHaveLength(6);
  });

  it('erzeugt nur gut lesbare Zeichen (keine 0/1/O/I)', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(erzeugeCode()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
    }
  });

  it('normalisiert Eingaben zu Großbuchstaben ohne Leerzeichen', () => {
    expect(normalisiereCode('  k7 qp2 ')).toBe('K7QP2');
  });

  it('prüft gültige und ungültige Codes', () => {
    expect(istGueltigerCode('K7QP2')).toBe(true);
    expect(istGueltigerCode('k7qp2')).toBe(true);
    expect(istGueltigerCode('ab')).toBe(false);
    expect(istGueltigerCode('K7-QP2!')).toBe(false);
    expect(istGueltigerCode('ABCDEFGHI')).toBe(false);
  });
});

describe('Spieler-Ids', () => {
  it('erzeugt eindeutige Ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => erzeugeId()));
    expect(ids.size).toBe(100);
  });
});

describe('Spielerliste', () => {
  const a: Spieler = { id: 'a', name: 'Anna', rolle: 'spieler', qualifikation: 'basis' };
  const b: Spieler = { id: 'b', name: 'Ben', rolle: 'spieler', qualifikation: 'basis' };

  it('fügt einen Spieler hinzu', () => {
    expect(mitSpieler([a], b)).toEqual([a, b]);
  });

  it('aktualisiert einen bestehenden Spieler statt zu doppeln', () => {
    const aNeu: Spieler = { id: 'a', name: 'Anna M.', rolle: 'spieler', qualifikation: 'basis' };
    const liste = mitSpieler([a, b], aNeu);
    expect(liste).toHaveLength(2);
    expect(liste.find((s) => s.id === 'a')?.name).toBe('Anna M.');
  });

  it('entfernt einen Spieler über die Id', () => {
    expect(ohneSpieler([a, b], 'a')).toEqual([b]);
    expect(ohneSpieler([a, b], 'x')).toEqual([a, b]);
  });
});
