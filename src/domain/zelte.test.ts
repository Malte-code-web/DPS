import { describe, expect, it } from 'vitest';
import {
  FAHRZEUG_FLAECHENBEDARF_QM,
  STANDARD_BAUFELD,
  ZELTTYPEN,
  ZELT_MINDESTABSTAND_M,
  belegteZeltFlaecheQm,
  istAbschnittEroeffnet,
  platzierungGueltig,
  ueberlapptMitAbstand,
  verfuegbareFlaecheQm,
} from './zelte';
import type { PlatzierterZelt } from './types';

const BAUFELD = { breiteM: 40, tiefeM: 50 };

function zelt(abschnitt: PlatzierterZelt['abschnitt'], xM: number, yM: number, typ: PlatzierterZelt['typ'] = 'SG20'): PlatzierterZelt {
  return { id: `${abschnitt}-${xM}-${yM}`, typ, abschnitt, xM, yM };
}

describe('ueberlapptMitAbstand', () => {
  it('erkennt zwei sich überschneidende Rechtecke', () => {
    const a = { xM: 0, yM: 0, breiteM: 5, tiefeM: 5 };
    const b = { xM: 3, yM: 3, breiteM: 5, tiefeM: 5 };
    expect(ueberlapptMitAbstand(a, b, 0)).toBe(true);
  });

  it('erkennt zwei entfernte Rechtecke als frei', () => {
    const a = { xM: 0, yM: 0, breiteM: 5, tiefeM: 5 };
    const b = { xM: 20, yM: 20, breiteM: 5, tiefeM: 5 };
    expect(ueberlapptMitAbstand(a, b, 0)).toBe(false);
  });

  it('zählt den Mindestabstand als Überschneidung, auch ohne echte Deckung', () => {
    const a = { xM: 0, yM: 0, breiteM: 5, tiefeM: 5 };
    // Direkt angrenzend (5,0) - ohne Abstand frei, mit 2 m Mindestabstand nicht.
    const b = { xM: 5, yM: 0, breiteM: 5, tiefeM: 5 };
    expect(ueberlapptMitAbstand(a, b, 0)).toBe(false);
    expect(ueberlapptMitAbstand(a, b, ZELT_MINDESTABSTAND_M)).toBe(true);
  });
});

describe('platzierungGueltig', () => {
  it('lehnt eine Platzierung außerhalb des Baufelds ab', () => {
    expect(
      platzierungGueltig({ typ: 'SG20', abschnitt: 'zelt_rot', xM: -1, yM: 0 }, [], BAUFELD),
    ).toBe(false);
    expect(
      platzierungGueltig({ typ: 'SG50', abschnitt: 'zelt_rot', xM: 35, yM: 0 }, [], BAUFELD),
    ).toBe(false);
  });

  it('erlaubt eine freie Platzierung im Baufeld', () => {
    expect(
      platzierungGueltig({ typ: 'SG20', abschnitt: 'zelt_rot', xM: 0, yM: 0 }, [], BAUFELD),
    ).toBe(true);
  });

  it('lehnt eine Platzierung ab, die ein anderes Zelt überschneidet', () => {
    const bestehende = [zelt('zelt_gelb', 0, 0)];
    expect(
      platzierungGueltig({ typ: 'SG20', abschnitt: 'zelt_rot', xM: 2, yM: 2 }, bestehende, BAUFELD),
    ).toBe(false);
  });

  it('ignoriert ein bestehendes Zelt derselben Farbe (wird ersetzt statt addiert)', () => {
    const bestehende = [zelt('zelt_rot', 0, 0)];
    expect(
      platzierungGueltig({ typ: 'SG20', abschnitt: 'zelt_rot', xM: 0, yM: 0 }, bestehende, BAUFELD),
    ).toBe(true);
  });
});

describe('belegteZeltFlaecheQm / verfuegbareFlaecheQm', () => {
  it('summiert die reale Fläche der platzierten Zelte', () => {
    const zelte = [zelt('zelt_rot', 0, 0, 'SG20'), zelt('zelt_gelb', 10, 0, 'SG30')];
    expect(belegteZeltFlaecheQm(zelte)).toBeCloseTo(ZELTTYPEN.SG20.flaecheQm + ZELTTYPEN.SG30.flaecheQm);
  });

  it('zieht Zelt- und Fahrzeugfläche vom Baufeld ab', () => {
    const zelte = [zelt('zelt_rot', 0, 0, 'SG20')];
    const erwartet =
      STANDARD_BAUFELD.breiteM * STANDARD_BAUFELD.tiefeM -
      ZELTTYPEN.SG20.flaecheQm -
      2 * FAHRZEUG_FLAECHENBEDARF_QM;
    expect(verfuegbareFlaecheQm(STANDARD_BAUFELD, zelte, 2)).toBeCloseTo(erwartet);
  });

  it('kann negativ werden, wenn die Fläche überzogen ist - keine Sperre, nur ein Rechenwert', () => {
    const kleinesBaufeld = { breiteM: 5, tiefeM: 5 };
    expect(verfuegbareFlaecheQm(kleinesBaufeld, [], 10)).toBeLessThan(0);
  });
});

describe('istAbschnittEroeffnet', () => {
  it('gilt Schadensstelle immer als eröffnet, unabhängig vom State', () => {
    expect(istAbschnittEroeffnet('schadensstelle', [], [])).toBe(true);
  });

  it('gilt ein Zelt-Abschnitt als eröffnet, sobald ein Zelt dafür platziert ist', () => {
    expect(istAbschnittEroeffnet('zelt_rot', [], [])).toBe(false);
    expect(istAbschnittEroeffnet('zelt_rot', [], [zelt('zelt_rot', 0, 0)])).toBe(true);
    // Ein Zelt einer anderen Farbe eröffnet nicht mit.
    expect(istAbschnittEroeffnet('zelt_gelb', [], [zelt('zelt_rot', 0, 0)])).toBe(false);
  });

  it('nutzt eroeffneteAbschnitte für die übrigen Abschnitte', () => {
    expect(istAbschnittEroeffnet('ablage', [], [])).toBe(false);
    expect(istAbschnittEroeffnet('ablage', ['ablage'], [])).toBe(true);
    expect(istAbschnittEroeffnet('bereitstellungsraum', ['ablage'], [])).toBe(false);
  });
});
