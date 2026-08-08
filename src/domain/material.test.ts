import { describe, expect, it } from 'vitest';
import {
  BESTUECKUNG,
  MASSNAHME_MATERIAL,
  MATERIAL_LABEL,
  materialAusVorlage,
  materialVerfuegbar,
  verbraucheMaterial,
} from './material';
import { FAHRZEUGTYPEN } from './fahrzeuge';
import type { Fahrzeug, MaterialTyp } from './types';

function fahrzeug(overrides: Partial<Fahrzeug> = {}): Fahrzeug {
  return {
    id: 'fz-1',
    typ: 'rtw',
    abschnitt: 'schadensstelle',
    besatzung: [],
    material: {},
    ...overrides,
  };
}

describe('BESTUECKUNG', () => {
  it('belegt RTW mit den realen Kreis-Steinfurt-Zahlen (Hauptliste + MANV-Tasche + Rucksacksystem)', () => {
    expect(BESTUECKUNG.rtw.tourniquet).toBe(8);
    expect(BESTUECKUNG.rtw.guedeltubus).toBe(12);
    expect(BESTUECKUNG.rtw.larynxmaske).toBe(10);
    expect(BESTUECKUNG.rtw.ivkanuele).toBe(65);
    expect(BESTUECKUNG.rtw.infusion).toBe(10);
    expect(BESTUECKUNG.rtw.midazolam).toBe(9);
    expect(BESTUECKUNG.rtw.morphin).toBe(3);
  });

  it('belegt NEF mit den realen Kreis-Steinfurt-Zahlen', () => {
    expect(BESTUECKUNG.nef.fentanyl).toBe(7);
    expect(BESTUECKUNG.nef.morphin).toBe(7);
    expect(BESTUECKUNG.nef.levetiracetam).toBe(10);
    expect(BESTUECKUNG.nef.aktivkohle).toBe(2);
    expect(BESTUECKUNG.nef.vakuummatratze).toBeUndefined();
    expect(BESTUECKUNG.nef.kedsystem).toBeUndefined();
  });

  it('ergänzt beim NEF den Desasterbag mit erweiterter invasiver Ausstattung', () => {
    expect(BESTUECKUNG.nef.koniotomieset).toBe(1);
    expect(BESTUECKUNG.nef.thoraxdrainageset).toBe(3);
    expect(BESTUECKUNG.nef.ionadel).toBe(3);
    expect(BESTUECKUNG.nef.propofol).toBe(2);
    expect(BESTUECKUNG.nef.tranexamsaeure).toBe(2);
    expect(BESTUECKUNG.rtw.koniotomieset).toBe(1); // RTW führt keinen Desasterbag, eigener Wert
  });

  it('belegt GW-San ohne Medikamente, ohne Tourniquet, ohne Larynxmaske (BBK-Begleitheft)', () => {
    expect(BESTUECKUNG.gw_san.tourniquet).toBeUndefined();
    expect(BESTUECKUNG.gw_san.larynxmaske).toBeUndefined();
    expect(BESTUECKUNG.gw_san.midazolam).toBeUndefined();
    expect(BESTUECKUNG.gw_san.guedeltubus).toBe(30);
    expect(BESTUECKUNG.gw_san.stifneck).toBe(20);
  });

  it('belegt AB-MANV mit den realen Zahlen der Kreis-Steinfurt-Packliste', () => {
    expect(BESTUECKUNG.ab_manv.tourniquet).toBe(120);
    expect(BESTUECKUNG.ab_manv.esketamin).toBe(200);
    expect(BESTUECKUNG.ab_manv.midazolam).toBe(120);
    expect(BESTUECKUNG.ab_manv.rocuronium).toBe(40);
  });

  it('leitet GW-Rett proportional aus den echten GW-San-Zahlen her (13/25)', () => {
    for (const [typ, menge] of Object.entries(BESTUECKUNG.gw_san) as [MaterialTyp, number][]) {
      expect(BESTUECKUNG.gw_rett[typ], typ).toBe(Math.max(1, Math.round(menge * (13 / 25))));
    }
  });

  it('führt bei ELW 2 und GW-Log kein Patientenmaterial', () => {
    expect(BESTUECKUNG.elw2).toEqual({});
    expect(BESTUECKUNG.gw_log).toEqual({});
  });

  it('hat für jeden FahrzeugTyp einen Eintrag', () => {
    for (const typ of FAHRZEUGTYPEN) {
      expect(BESTUECKUNG[typ], typ).toBeDefined();
    }
  });
});

describe('MATERIAL_LABEL / MASSNAHME_MATERIAL', () => {
  it('hat für jeden in MASSNAHME_MATERIAL verwendeten MaterialTyp ein Label', () => {
    for (const materialTyp of Object.values(MASSNAHME_MATERIAL)) {
      expect(MATERIAL_LABEL[materialTyp], materialTyp).toBeTruthy();
    }
  });

  it('bindet absaugen_oral und absaugen_endobronchial an denselben Katheter-Pool', () => {
    expect(MASSNAHME_MATERIAL.absaugen_oral).toBe('absaugkatheter');
    expect(MASSNAHME_MATERIAL.absaugen_endobronchial).toBe('absaugkatheter');
  });

  it('bindet esketamin und esketamin_narkose an dieselbe Ampulle', () => {
    expect(MASSNAHME_MATERIAL.esketamin).toBe('esketamin');
    expect(MASSNAHME_MATERIAL.esketamin_narkose).toBe('esketamin');
  });

  it('bindet die aus NEF/Rucksack neu gefundenen Medikamente', () => {
    expect(MASSNAHME_MATERIAL.fentanyl).toBe('fentanyl');
    expect(MASSNAHME_MATERIAL.morphin).toBe('morphin');
    expect(MASSNAHME_MATERIAL.levetiracetam).toBe('levetiracetam');
    expect(MASSNAHME_MATERIAL.aktivkohle).toBe('aktivkohle');
    expect(MASSNAHME_MATERIAL.diazepam_rektal).toBe('diazepam_rektal');
  });

  it('lässt Maßnahmen ohne auffindbare Quelle unlimitiert', () => {
    expect(MASSNAHME_MATERIAL.nalbuphin).toBeUndefined();
    expect(MASSNAHME_MATERIAL.glucagon).toBeUndefined();
    expect(MASSNAHME_MATERIAL.reanimation).toBeUndefined();
    expect(MASSNAHME_MATERIAL.defibrillation).toBeUndefined();
  });
});

describe('materialAusVorlage', () => {
  it('liefert eine Kopie, kein geteiltes Objekt', () => {
    const bestand = materialAusVorlage('rtw');
    bestand.tourniquet = 0;
    expect(BESTUECKUNG.rtw.tourniquet).not.toBe(0);
  });
});

describe('materialVerfuegbar', () => {
  it('ist immer verfügbar ohne verknüpften MaterialTyp', () => {
    expect(materialVerfuegbar('mundraumkontrolle', 'schadensstelle', [])).toBe(true);
  });

  it('ist unbegrenzt, wenn keine Fahrzeuge im Spiel sind (Solo)', () => {
    expect(materialVerfuegbar('tourniquet', 'schadensstelle', [])).toBe(true);
  });

  it('ist verfügbar, wenn ein Fahrzeug im selben Abschnitt Bestand hat', () => {
    const fz = fahrzeug({ material: { tourniquet: 1 } });
    expect(materialVerfuegbar('tourniquet', 'schadensstelle', [fz])).toBe(true);
  });

  it('ist gesperrt, wenn der Bestand im Abschnitt erschöpft ist', () => {
    const fz = fahrzeug({ material: { tourniquet: 0 } });
    expect(materialVerfuegbar('tourniquet', 'schadensstelle', [fz])).toBe(false);
  });

  it('ist gesperrt, wenn das Fahrzeug mit Bestand im falschen Abschnitt steht', () => {
    const fz = fahrzeug({ abschnitt: 'zelt_rot', material: { tourniquet: 4 } });
    expect(materialVerfuegbar('tourniquet', 'schadensstelle', [fz])).toBe(false);
  });

  it('ist gesperrt, wenn das einzige Fahrzeug mit Bestand als ausgefallen gemeldet ist (→ modell.ereignis)', () => {
    const fz = fahrzeug({ material: { tourniquet: 4 }, ausgefallen: true });
    expect(materialVerfuegbar('tourniquet', 'schadensstelle', [fz])).toBe(false);
  });

  it('greift wieder auf ein ausgefallenes Fahrzeug zu, sobald es als einsatzbereit gemeldet ist', () => {
    const fz = fahrzeug({ material: { tourniquet: 4 }, ausgefallen: false });
    expect(materialVerfuegbar('tourniquet', 'schadensstelle', [fz])).toBe(true);
  });
});

describe('verbraucheMaterial', () => {
  it('zieht 1 vom Fahrzeug im richtigen Abschnitt ab', () => {
    const fz = fahrzeug({ material: { tourniquet: 4 } });
    const danach = verbraucheMaterial([fz], 'tourniquet', 'schadensstelle');
    expect(danach[0]!.material.tourniquet).toBe(3);
  });

  it('lässt andere Fahrzeuge unverändert', () => {
    const a = fahrzeug({ id: 'a', material: { tourniquet: 4 } });
    const b = fahrzeug({ id: 'b', material: { tourniquet: 4 } });
    const danach = verbraucheMaterial([a, b], 'tourniquet', 'schadensstelle');
    expect(danach.find((f) => f.id === 'a')!.material.tourniquet).toBe(3);
    expect(danach.find((f) => f.id === 'b')!.material.tourniquet).toBe(4);
  });

  it('ist ein No-op ohne verknüpften MaterialTyp', () => {
    const fz = fahrzeug();
    const danach = verbraucheMaterial([fz], 'mundraumkontrolle', 'schadensstelle');
    expect(danach).toEqual([fz]);
  });

  it('ist ein No-op, wenn kein Fahrzeug im Abschnitt Bestand hat', () => {
    const fz = fahrzeug({ material: { tourniquet: 0 } });
    const danach = verbraucheMaterial([fz], 'tourniquet', 'schadensstelle');
    expect(danach[0]!.material.tourniquet).toBe(0);
  });

  it('wird nie negativ', () => {
    const fz = fahrzeug({ material: { tourniquet: 0 } });
    const danach = verbraucheMaterial(verbraucheMaterial([fz], 'tourniquet', 'schadensstelle'), 'tourniquet', 'schadensstelle');
    expect(danach[0]!.material.tourniquet).toBe(0);
  });

  it('liefert kein Material mehr von einem ausgefallenen Fahrzeug (→ modell.ereignis)', () => {
    const fz = fahrzeug({ material: { tourniquet: 4 }, ausgefallen: true });
    const danach = verbraucheMaterial([fz], 'tourniquet', 'schadensstelle');
    expect(danach[0]!.material.tourniquet).toBe(4);
  });
});
