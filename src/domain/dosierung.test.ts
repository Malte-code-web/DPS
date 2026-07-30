import { describe, expect, it } from 'vitest';
import {
  ANALGETIKA,
  DOSISREFERENZ,
  bewerteDosis,
  empfohleneDosisMg,
  geschaetztesGewicht,
  gewichtVon,
  wirkungBeiDosis,
} from './dosierung';
import { MASSNAHMEN } from './massnahmen';

describe('geschaetztesGewicht', () => {
  it('schätzt Kinder nach der APLS-Faustregel (Alter + 4) × 2', () => {
    expect(geschaetztesGewicht(0, 'd')).toBe(8);
    expect(geschaetztesGewicht(5, 'w')).toBe(18);
    expect(geschaetztesGewicht(14, 'm')).toBe(36);
  });

  it('schätzt Erwachsene nach Geschlecht (Destatis-Durchschnitt)', () => {
    expect(geschaetztesGewicht(40, 'm')).toBe(86.5);
    expect(geschaetztesGewicht(40, 'w')).toBe(69.7);
    expect(geschaetztesGewicht(40, 'd')).toBe(78);
  });
});

describe('gewichtVon', () => {
  it('nutzt das hinterlegte Gewicht, wenn vorhanden', () => {
    expect(gewichtVon({ gewicht: 55, alter: 30, geschlecht: 'w' })).toBe(55);
  });

  it('fällt auf die Schätzung zurück, wenn kein Gewicht hinterlegt ist', () => {
    expect(gewichtVon({ alter: 30, geschlecht: 'w' })).toBe(69.7);
  });
});

describe('ANALGETIKA', () => {
  it('enthält genau die sechs Analgetika, jedes mit einer Dosisreferenz', () => {
    expect(ANALGETIKA).toEqual(['morphin', 'fentanyl', 'nalbuphin', 'esketamin', 'paracetamol', 'ibuprofen']);
    for (const id of ANALGETIKA) {
      expect(DOSISREFERENZ[id], id).toBeDefined();
      expect(MASSNAHMEN[id], id).toBeDefined();
    }
  });

  it('lässt Butylscopolamin und Midazolam bewusst außen vor', () => {
    expect(ANALGETIKA).not.toContain('butylscopolamin');
    expect(ANALGETIKA).not.toContain('midazolam');
  });
});

describe('empfohleneDosisMg', () => {
  it('berechnet die Zieldosis aus Gewicht und Referenz', () => {
    // Morphin: zielMgProKg 0,075 × 80 kg = 6 mg
    expect(empfohleneDosisMg('morphin', 80)).toBeCloseTo(6, 5);
  });

  it('deckelt an der absoluten Einzeldosis, falls die Referenz einen Deckel kennt', () => {
    // Morphin-Deckel 10 mg; bei 200 kg wäre die reine Rechnung 15 mg
    expect(empfohleneDosisMg('morphin', 200)).toBe(10);
  });

  it('liefert 0 für Maßnahmen ohne Dosisreferenz', () => {
    expect(empfohleneDosisMg('tourniquet', 80)).toBe(0);
  });
});

describe('bewerteDosis', () => {
  it('erkennt Unterdosierung, therapeutische Dosis und Überdosierung', () => {
    const gewichtKg = 80;
    // Morphin: min 0,03 / ziel 0,075 / max 0,15 mg/kg
    expect(bewerteDosis('morphin', 1, gewichtKg)).toBe('unterdosiert'); // 0,0125 mg/kg
    expect(bewerteDosis('morphin', 6, gewichtKg)).toBe('therapeutisch'); // 0,075 mg/kg
    expect(bewerteDosis('morphin', 20, gewichtKg)).toBe('ueberdosiert'); // 0,25 mg/kg
  });

  it('bewertet den Nalbuphin-Ceiling-Bereich als überdosiert, nicht als Fehler', () => {
    expect(bewerteDosis('nalbuphin', 40, 80)).toBe('ueberdosiert'); // 0,5 mg/kg > 0,45
  });
});

describe('wirkungBeiDosis', () => {
  const basisEffekt = MASSNAHMEN.morphin.sofortEffekt!;

  it('hebt die Wirkung bei Unterdosierung komplett auf und löst kein Problem', () => {
    const ergebnis = wirkungBeiDosis('morphin', basisEffekt, 1, 80);
    expect(ergebnis.stufe).toBe('unterdosiert');
    expect(ergebnis.effekt).toBeNull();
    expect(ergebnis.loestProblem).toBe(false);
  });

  it('wendet die unveränderte Katalog-Wirkung bei therapeutischer Dosis an', () => {
    const ergebnis = wirkungBeiDosis('morphin', basisEffekt, 6, 80);
    expect(ergebnis.stufe).toBe('therapeutisch');
    expect(ergebnis.effekt).toEqual(basisEffekt);
    expect(ergebnis.loestProblem).toBe(true);
  });

  it('addiert bei Überdosierung den toxischen Effekt zur Katalog-Wirkung', () => {
    const ergebnis = wirkungBeiDosis('morphin', basisEffekt, 13, 80); // 0,1625 mg/kg > 0,15 Schwelle
    expect(ergebnis.stufe).toBe('ueberdosiert');
    expect(ergebnis.loestProblem).toBe(true);
    // Die Wirkung bleibt (schmerz), zusätzlich die toxische Atemdepression.
    expect(ergebnis.effekt!.schmerz).toBe(basisEffekt.schmerz);
    expect(ergebnis.effekt!.atemfrequenz!).toBeLessThan(0);
  });

  it('skaliert den toxischen Effekt mit der Überdosis, gedeckelt bei 2x', () => {
    const leichtUeber = wirkungBeiDosis('morphin', basisEffekt, 13, 80); // knapp über der Schwelle
    const weitUeber = wirkungBeiDosis('morphin', basisEffekt, 1000, 80); // weit jenseits
    expect(Math.abs(weitUeber.effekt!.atemfrequenz!)).toBeGreaterThan(
      Math.abs(leichtUeber.effekt!.atemfrequenz!),
    );
    // Deckel bei 2x der Basis-Toxizität (-6 atemfrequenz → max -12).
    const toxinBasis = DOSISREFERENZ.morphin!.toxischerEffekt!.atemfrequenz!;
    const zusatz = weitUeber.effekt!.atemfrequenz! - basisEffekt.atemfrequenz!;
    expect(zusatz).toBeCloseTo(toxinBasis * 2, 5);
  });

  it('lässt Nalbuphin über der Ceiling-Dosis ohne zusätzliche Wirkung (Ceiling-Effekt)', () => {
    const basis = MASSNAHMEN.nalbuphin.sofortEffekt!;
    const ergebnis = wirkungBeiDosis('nalbuphin', basis, 40, 80); // 0,5 mg/kg > 0,45 Ceiling
    expect(ergebnis.stufe).toBe('ueberdosiert');
    expect(ergebnis.effekt).toEqual(basis);
  });

  it('lässt Paracetamol über der Zieldosis ohne akute Zusatzwirkung (verzögerte Toxizität)', () => {
    const basis = MASSNAHMEN.paracetamol.sofortEffekt!;
    const ergebnis = wirkungBeiDosis('paracetamol', basis, 3000, 80); // weit über 30 mg/kg
    expect(ergebnis.stufe).toBe('ueberdosiert');
    expect(ergebnis.effekt).toEqual(basis);
  });

  it('lässt Maßnahmen ohne Dosisreferenz unverändert (Katalog-Wirkung, Problem lösbar)', () => {
    const basis = MASSNAHMEN.tourniquet.sofortEffekt;
    const ergebnis = wirkungBeiDosis('tourniquet', basis, 999, 80);
    expect(ergebnis.stufe).toBe('therapeutisch');
    expect(ergebnis.effekt).toEqual(basis);
    expect(ergebnis.loestProblem).toBe(true);
  });
});
