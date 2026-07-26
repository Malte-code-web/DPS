import { describe, expect, it } from 'vitest';
import { erzeugeSzenarioLokal, LAGEN_LISTE, verteilung } from './szenarioGenerator';
import { pruefeDynamik } from './szenarioDynamik';
import { pruefeSzenario } from './szenarioPruefung';
import type { LageId } from './szenarioGenerator';

const LAGEN = LAGEN_LISTE.map((eintrag) => eintrag.id);
const GROESSEN = [4, 6, 8, 12, 20, 30];

describe('verteilung', () => {
  it('hält die Mischung, die der Probelauf erwartet', () => {
    for (const anzahl of GROESSEN) {
      const kategorien = verteilung(anzahl);
      const zaehle = (sk: string) => kategorien.filter((eintrag) => eintrag === sk).length;

      expect(kategorien).toHaveLength(anzahl);
      expect(zaehle('SK1'), `SK1 bei ${anzahl}`).toBeGreaterThanOrEqual(1);
      expect(zaehle('SK1'), `SK1 bei ${anzahl}`).toBeLessThanOrEqual(anzahl / 2);
      expect(zaehle('SK3'), `SK3 bei ${anzahl}`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('erzeugeSzenarioLokal', () => {
  /**
   * Der eigentliche Anspruch des Baukastens: Was er ausgibt, besteht Prüfung
   * und Probelauf ohne jeden Befund - über alle Lagen, Größen und Saaten.
   */
  it('erzeugt durchweg fehler- und befundfreie Szenarien', () => {
    for (const lage of LAGEN) {
      for (const anzahl of GROESSEN) {
        for (let saat = 1; saat <= 12; saat += 1) {
          const szenario = erzeugeSzenarioLokal({ lage, anzahl, saat });
          const ort = `${lage}/${anzahl}/${saat}`;

          const pruefung = pruefeSzenario(szenario);
          expect(pruefung.befunde, ort).toEqual([]);
          expect(pruefeDynamik(szenario).befunde, ort).toEqual([]);
          expect(szenario.patienten, ort).toHaveLength(anzahl);
        }
      }
    }
  });

  it('liefert bei gleicher Saat dasselbe Szenario', () => {
    const wunsch = { lage: 'zug' as LageId, anzahl: 8, saat: 42 };
    expect(erzeugeSzenarioLokal(wunsch)).toEqual(erzeugeSzenarioLokal(wunsch));
  });

  it('liefert bei anderer Saat ein anderes Szenario', () => {
    const eins = erzeugeSzenarioLokal({ lage: 'zug', anzahl: 8, saat: 1 });
    const zwei = erzeugeSzenarioLokal({ lage: 'zug', anzahl: 8, saat: 2 });
    expect(eins.patienten).not.toEqual(zwei.patienten);
  });

  it('vergibt eindeutige Namen und IDs', () => {
    const szenario = erzeugeSzenarioLokal({ lage: 'verkehr', anzahl: 20, saat: 7 });
    expect(new Set(szenario.patienten.map((p) => p.name)).size).toBe(20);
    expect(new Set(szenario.patienten.map((p) => p.id)).size).toBe(20);
  });

  it('baut ab sechs Betroffenen eine Falle für die Nachsichtung ein', () => {
    // Ein gehfähiger Patient, der unbehandelt doch noch kippt.
    const szenario = erzeugeSzenarioLokal({ lage: 'verkehr', anzahl: 10, saat: 3 });
    const fallen = pruefeDynamik(szenario).patienten.filter(
      (eintrag) => eintrag.erwarteteSK === 'SK3' && eintrag.todUnbehandeltMin !== null,
    );
    expect(fallen).toHaveLength(1);
    expect(fallen[0]!.todUnbehandeltMin).toBeGreaterThanOrEqual(15);
  });

  it('trifft die vorgegebene Zielminute der kritischen Patienten', () => {
    const szenario = erzeugeSzenarioLokal({ lage: 'einsturz', anzahl: 12, saat: 5 });
    for (const eintrag of pruefeDynamik(szenario).patienten) {
      if (eintrag.erwarteteSK !== 'SK1') continue;
      expect(eintrag.todUnbehandeltMin, eintrag.id).not.toBeNull();
      expect(eintrag.todUnbehandeltMin!, eintrag.id).toBeGreaterThanOrEqual(8);
      expect(eintrag.todUnbehandeltMin!, eintrag.id).toBeLessThanOrEqual(18);
      expect(eintrag.todBehandeltMin, eintrag.id).toBeNull();
    }
  });
});
