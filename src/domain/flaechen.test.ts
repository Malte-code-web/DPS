import { describe, expect, it } from 'vitest';
import {
  FAHRZEUG_FLAECHENBEDARF_QM,
  FLAECHENTYPEN,
  STANDARD_BAUFELD,
  ZELTTYPEN,
  ZELT_MINDESTABSTAND_M,
  belegteZeltFlaecheQm,
  groesseVon,
  istAbschnittEroeffnet,
  platzierungGueltig,
  ueberlapptMitAbstand,
  verfuegbareFlaecheQm,
} from './flaechen';
import type { PlatzierteFlaeche } from './types';

const BAUFELD = { breiteM: 40, tiefeM: 50 };

function flaeche(
  abschnitt: PlatzierteFlaeche['abschnitt'],
  xM: number,
  yM: number,
  typ: PlatzierteFlaeche['typ'] = 'SG20',
): PlatzierteFlaeche {
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

describe('groesseVon', () => {
  it('findet ein Zelt im ZELTTYPEN-Katalog', () => {
    expect(groesseVon('SG20')).toBe(ZELTTYPEN.SG20);
  });

  it('findet eine Fläche im FLAECHENTYPEN-Katalog', () => {
    expect(groesseVon('FL_M')).toBe(FLAECHENTYPEN.FL_M);
  });
});

describe('platzierungGueltig', () => {
  it('lehnt eine Platzierung außerhalb des Baufelds ab, wenn die Grenze geprüft wird', () => {
    expect(
      platzierungGueltig({ typ: 'SG20', abschnitt: 'zelt_rot', xM: -1, yM: 0 }, [], BAUFELD),
    ).toBe(false);
    expect(
      platzierungGueltig({ typ: 'SG50', abschnitt: 'zelt_rot', xM: 35, yM: 0 }, [], BAUFELD),
    ).toBe(false);
  });

  it('erlaubt eine Platzierung außerhalb des Baufelds, wenn die Grenze nicht geprüft wird', () => {
    expect(
      platzierungGueltig(
        { typ: 'FL_S', abschnitt: 'ablage', xM: 500, yM: 500 },
        [],
        BAUFELD,
        false,
      ),
    ).toBe(true);
  });

  it('erlaubt eine freie Platzierung im Baufeld', () => {
    expect(
      platzierungGueltig({ typ: 'SG20', abschnitt: 'zelt_rot', xM: 0, yM: 0 }, [], BAUFELD),
    ).toBe(true);
  });

  it('lehnt eine Platzierung ab, die eine andere Fläche überschneidet', () => {
    const bestehende = [flaeche('zelt_gelb', 0, 0)];
    expect(
      platzierungGueltig({ typ: 'SG20', abschnitt: 'zelt_rot', xM: 2, yM: 2 }, bestehende, BAUFELD),
    ).toBe(false);
  });

  it('ignoriert eine bestehende Fläche desselben Abschnitts (wird ersetzt statt addiert)', () => {
    const bestehende = [flaeche('zelt_rot', 0, 0)];
    expect(
      platzierungGueltig({ typ: 'SG20', abschnitt: 'zelt_rot', xM: 0, yM: 0 }, bestehende, BAUFELD),
    ).toBe(true);
  });

  it('prüft die Überschneidung weiterhin, auch wenn die Grenze nicht geprüft wird', () => {
    const bestehende = [flaeche('ablage', 100, 100, 'FL_M')];
    expect(
      platzierungGueltig(
        { typ: 'FL_M', abschnitt: 'bereitstellungsraum', xM: 101, yM: 101 },
        bestehende,
        BAUFELD,
        false,
      ),
    ).toBe(false);
  });
});

describe('belegteZeltFlaecheQm / verfuegbareFlaecheQm', () => {
  it('summiert die reale Fläche der platzierten Zelte', () => {
    const flaechen = [flaeche('zelt_rot', 0, 0, 'SG20'), flaeche('zelt_gelb', 10, 0, 'SG30')];
    expect(belegteZeltFlaecheQm(flaechen)).toBeCloseTo(ZELTTYPEN.SG20.flaecheQm + ZELTTYPEN.SG30.flaecheQm);
  });

  it('summiert auch reine Flächen ohne Zeltprodukt', () => {
    const flaechen = [flaeche('ablage', 0, 0, 'FL_S')];
    expect(belegteZeltFlaecheQm(flaechen)).toBeCloseTo(FLAECHENTYPEN.FL_S.flaecheQm);
  });

  it('zieht Zelt- und Fahrzeugfläche vom Baufeld ab', () => {
    const flaechen = [flaeche('zelt_rot', 0, 0, 'SG20')];
    const erwartet =
      STANDARD_BAUFELD.breiteM * STANDARD_BAUFELD.tiefeM -
      ZELTTYPEN.SG20.flaecheQm -
      2 * FAHRZEUG_FLAECHENBEDARF_QM;
    expect(verfuegbareFlaecheQm(STANDARD_BAUFELD, flaechen, 2)).toBeCloseTo(erwartet);
  });

  it('kann negativ werden, wenn die Fläche überzogen ist - keine Sperre, nur ein Rechenwert', () => {
    const kleinesBaufeld = { breiteM: 5, tiefeM: 5 };
    expect(verfuegbareFlaecheQm(kleinesBaufeld, [], 10)).toBeLessThan(0);
  });
});

describe('istAbschnittEroeffnet', () => {
  it('gilt Schadensstelle immer als eröffnet, unabhängig vom State', () => {
    expect(istAbschnittEroeffnet('schadensstelle', [])).toBe(true);
  });

  it('gilt ein Zelt-Abschnitt als eröffnet, sobald ein Zelt dafür platziert ist', () => {
    expect(istAbschnittEroeffnet('zelt_rot', [])).toBe(false);
    expect(istAbschnittEroeffnet('zelt_rot', [flaeche('zelt_rot', 0, 0)])).toBe(true);
    // Ein Zelt eines anderen Abschnitts eröffnet nicht mit.
    expect(istAbschnittEroeffnet('zelt_gelb', [flaeche('zelt_rot', 0, 0)])).toBe(false);
  });

  it('gilt auch für die fünf erweiterten Abschnitte, sobald eine Fläche platziert ist', () => {
    expect(istAbschnittEroeffnet('ablage', [])).toBe(false);
    expect(istAbschnittEroeffnet('ablage', [flaeche('ablage', 0, 0, 'FL_S')])).toBe(true);
    expect(istAbschnittEroeffnet('bereitstellungsraum', [flaeche('ablage', 0, 0, 'FL_S')])).toBe(
      false,
    );
  });
});
