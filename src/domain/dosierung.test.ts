import { describe, expect, it } from 'vitest';
import {
  ANALGETIKA,
  DOSISREFERENZ,
  bewerteDosis,
  empfohleneDosisMg,
  geschaetztesGewicht,
  gewichtVon,
  hatDosisreferenz,
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

describe('hatDosisreferenz', () => {
  it('erkennt sowohl die Analgetika als auch die übrigen dosisabhängigen Medikamente', () => {
    expect(hatDosisreferenz('morphin')).toBe(true);
    expect(hatDosisreferenz('amiodaron')).toBe(true);
    expect(hatDosisreferenz('urapidil')).toBe(true);
  });

  it('verneint für Maßnahmen ohne Dosisreferenz', () => {
    expect(hatDosisreferenz('tourniquet')).toBe(false);
  });
});

describe('Dosisreferenzen jenseits der Analgesie', () => {
  it('deckt jede fest zugesagte Maßnahme mit einer Referenz ab', () => {
    const erwartet = [
      'epinephrin',
      'amiodaron',
      'lidocain',
      'atropin',
      'metoprolol',
      'midazolam',
      'diazepam_rektal',
      'naloxon',
      'nitrat',
      'urapidil',
      'furosemid',
    ] as const;
    for (const id of erwartet) {
      expect(DOSISREFERENZ[id], id).toBeDefined();
      expect(MASSNAHMEN[id], id).toBeDefined();
    }
  });

  it('addiert bei Amiodaron-Überdosierung einen Schadeffekt, obwohl der Katalog keinen sofortEffekt kennt', () => {
    // Amiodaron hat im Katalog absichtlich keinen sofortEffekt (reanimationsnahe
    // Wirkung, kein direkter Vitalwert-Sprung) - die Überdosierung wirkt trotzdem.
    expect(MASSNAHMEN.amiodaron.sofortEffekt).toBeUndefined();
    const ergebnis = wirkungBeiDosis('amiodaron', undefined, 1000, 80); // 12,5 mg/kg, weit über 6
    expect(ergebnis.stufe).toBe('ueberdosiert');
    expect(ergebnis.effekt!.systolischerRR!).toBeLessThan(0);
    expect(ergebnis.effekt!.herzfrequenz!).toBeLessThan(0);
  });

  it('modelliert Naloxon-Überdosierung als präzipitierte Entzugsreaktion, nicht als Organtoxizität', () => {
    // Sympathikus-Aktivierung (HF/RR steigen) statt der sonst üblichen Depression.
    const ergebnis = wirkungBeiDosis('naloxon', MASSNAHMEN.naloxon.sofortEffekt, 5, 80); // 0,0625 mg/kg > 0,03
    expect(ergebnis.stufe).toBe('ueberdosiert');
    expect(ergebnis.effekt!.herzfrequenz!).toBeGreaterThan(0);
    expect(ergebnis.effekt!.systolischerRR!).toBeGreaterThan(0);
  });

  it('lässt Urapidil bei Überdosierung ohne Reflextachykardie (zentraler Wirkmechanismus)', () => {
    const ergebnis = wirkungBeiDosis('urapidil', MASSNAHMEN.urapidil.sofortEffekt, 40, 80); // 0,5 mg/kg > 0,32
    expect(ergebnis.stufe).toBe('ueberdosiert');
    expect(ergebnis.effekt!.systolischerRR!).toBeLessThan(0);
    expect(ergebnis.effekt!.herzfrequenz).toBeUndefined();
  });

  it('lässt Nitrat bei Überdosierung paradox mit Bradykardie statt Reflextachykardie reagieren', () => {
    const ergebnis = wirkungBeiDosis('nitrat', MASSNAHMEN.nitrat.sofortEffekt, 2, 80); // 0,025 mg/kg > 0,01
    expect(ergebnis.stufe).toBe('ueberdosiert');
    expect(ergebnis.effekt!.systolischerRR!).toBeLessThan(0);
    expect(ergebnis.effekt!.herzfrequenz!).toBeLessThan(0);
  });
});

describe('Notfallnarkose (RSI)', () => {
  it('deckt alle vier Notfallnarkose-Maßnahmen mit einer Referenz ab', () => {
    const erwartet = ['propofol', 'thiopental', 'esketamin_narkose', 'rocuronium'] as const;
    for (const id of erwartet) {
      expect(DOSISREFERENZ[id], id).toBeDefined();
      expect(MASSNAHMEN[id], id).toBeDefined();
      expect(hatDosisreferenz(id)).toBe(true);
    }
  });

  it('lässt bei therapeutischer Dosis Propofol den Kreislauf senken und Esketamin-Narkose ihn stützen', () => {
    // Genau der Unterschied, der die Mittelwahl situationsabhängig macht -
    // schon bei korrekter Dosis, nicht erst bei Überdosierung.
    const propofol = wirkungBeiDosis(
      'propofol',
      MASSNAHMEN.propofol.sofortEffekt,
      empfohleneDosisMg('propofol', 80),
      80,
    );
    const esketaminNarkose = wirkungBeiDosis(
      'esketamin_narkose',
      MASSNAHMEN.esketamin_narkose.sofortEffekt,
      empfohleneDosisMg('esketamin_narkose', 80),
      80,
    );
    expect(propofol.stufe).toBe('therapeutisch');
    expect(esketaminNarkose.stufe).toBe('therapeutisch');
    expect(propofol.effekt!.systolischerRR!).toBeLessThan(0);
    expect(esketaminNarkose.effekt!.systolischerRR!).toBeGreaterThan(0);
  });

  it('esketamin_narkose ist eine eigene Referenz getrennt vom analgetischen Esketamin', () => {
    const gewichtKg = 80;
    // Die Narkose-Zieldosis läge beim analgetischen Esketamin (max 0,5 mg/kg)
    // bereits deutlich überdosiert.
    const narkoseDosis = empfohleneDosisMg('esketamin_narkose', gewichtKg);
    expect(bewerteDosis('esketamin', narkoseDosis, gewichtKg)).toBe('ueberdosiert');
    expect(bewerteDosis('esketamin_narkose', narkoseDosis, gewichtKg)).toBe('therapeutisch');
  });

  it('bleibt bei Rocuronium-Überdosierung ohne zusätzlichen Schadeffekt (große Sicherheitsspanne)', () => {
    const basis = MASSNAHMEN.rocuronium.sofortEffekt!;
    const ergebnis = wirkungBeiDosis('rocuronium', basis, 500, 80); // 6,25 mg/kg, weit über 3
    expect(ergebnis.stufe).toBe('ueberdosiert');
    expect(ergebnis.effekt).toEqual(basis);
  });

  it('lässt Rocuronium bei zu niedriger Dosis ohne Wirkung - keine ausreichende Relaxierung', () => {
    const ergebnis = wirkungBeiDosis('rocuronium', MASSNAHMEN.rocuronium.sofortEffekt, 10, 80); // 0,125 mg/kg < 0,6
    expect(ergebnis.stufe).toBe('unterdosiert');
    expect(ergebnis.effekt).toBeNull();
    expect(ergebnis.loestProblem).toBe(false);
  });

  it('lähmt bei korrekter Rocuronium-Dosis die Atmung vollständig', () => {
    const dosis = empfohleneDosisMg('rocuronium', 80);
    const ergebnis = wirkungBeiDosis('rocuronium', MASSNAHMEN.rocuronium.sofortEffekt, dosis, 80);
    expect(ergebnis.stufe).toBe('therapeutisch');
    expect(ergebnis.effekt!.atemfrequenz!).toBeLessThan(-30);
  });
});
