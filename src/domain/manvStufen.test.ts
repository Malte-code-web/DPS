import { describe, expect, it } from 'vitest';
import { MANV_STUFEN, MANV_STUFEN_LISTE, fahrzeugeFuerStufe } from './manvStufen';

describe('fahrzeugeFuerStufe', () => {
  it('erzeugt die Fahrzeuge nach der MANV-10-Tabelle (3 RTW/2 NEF/1 KTW/1 GW-Rett)', () => {
    const fahrzeuge = fahrzeugeFuerStufe('manv10');
    expect(fahrzeuge.filter((f) => f.typ === 'rtw')).toHaveLength(3);
    expect(fahrzeuge.filter((f) => f.typ === 'nef')).toHaveLength(2);
    expect(fahrzeuge.filter((f) => f.typ === 'ktw')).toHaveLength(1);
    expect(fahrzeuge.filter((f) => f.typ === 'gw_rett')).toHaveLength(1);
    expect(fahrzeuge).toHaveLength(7);
  });

  it('erzeugt für jede Stufe genau die in MANV_STUFEN hinterlegte Stückzahl je Typ', () => {
    for (const stufe of MANV_STUFEN_LISTE) {
      const fahrzeuge = fahrzeugeFuerStufe(stufe.id);
      const erwartet = Object.values(stufe.bestand).reduce((summe, n) => summe + n, 0);
      expect(fahrzeuge, stufe.id).toHaveLength(erwartet);
      for (const [typ, anzahl] of Object.entries(stufe.bestand)) {
        expect(fahrzeuge.filter((f) => f.typ === typ), `${stufe.id}/${typ}`).toHaveLength(anzahl);
      }
    }
  });

  it('vergibt eindeutige IDs je Fahrzeug', () => {
    const fahrzeuge = fahrzeugeFuerStufe('manv50plus');
    const ids = new Set(fahrzeuge.map((f) => f.id));
    expect(ids.size).toBe(fahrzeuge.length);
  });

  it('wächst mit steigender Stufe monoton (kumulativ nach MANV-Konzept)', () => {
    expect(fahrzeugeFuerStufe('manv20').length).toBeGreaterThan(fahrzeugeFuerStufe('manv10').length);
    expect(fahrzeugeFuerStufe('manv50').length).toBeGreaterThanOrEqual(
      fahrzeugeFuerStufe('manv30').length,
    );
  });
});

describe('MANV_STUFEN', () => {
  it('enthält alle fünf Stufen mit Label und Patientenbereich', () => {
    const ids = ['manv10', 'manv20', 'manv30', 'manv50', 'manv50plus'] as const;
    for (const id of ids) {
      expect(MANV_STUFEN[id].label, id).toBeTruthy();
      expect(MANV_STUFEN[id].patientenBereich, id).toBeTruthy();
    }
  });
});
