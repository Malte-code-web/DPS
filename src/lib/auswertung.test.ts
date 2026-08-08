import { describe, expect, it } from 'vitest';
import { materialAusVorlage } from '../domain/material';
import type { Fahrzeug } from '../domain/types';
import { berechneMaterialverbrauch } from './auswertung';

function fahrzeug(overrides: Partial<Fahrzeug> = {}): Fahrzeug {
  return {
    id: 'fz-1',
    typ: 'rtw',
    abschnitt: 'schadensstelle',
    besatzung: [],
    material: materialAusVorlage('rtw'),
    ...overrides,
  };
}

describe('berechneMaterialverbrauch', () => {
  it('gibt eine leere Liste ohne Fahrzeuge zurück', () => {
    expect(berechneMaterialverbrauch([])).toEqual([]);
  });

  it('zeigt keinen Verbrauch, solange der Bestand unverändert der Bestückung entspricht', () => {
    expect(berechneMaterialverbrauch([fahrzeug()])).toEqual([]);
  });

  it('ermittelt den Verbrauch je Typ aus der Differenz zur Bestückung', () => {
    const bestand = materialAusVorlage('rtw');
    const ergebnis = berechneMaterialverbrauch([
      fahrzeug({ material: { ...bestand, druckverband: bestand.druckverband! - 2 } }),
    ]);
    expect(ergebnis).toEqual([{ typ: 'druckverband', verbraucht: 2 }]);
  });

  it('summiert den Verbrauch über mehrere Fahrzeuge und sortiert absteigend', () => {
    const bestandRtw = materialAusVorlage('rtw');
    const ergebnis = berechneMaterialverbrauch([
      fahrzeug({
        id: 'fz-1',
        material: { ...bestandRtw, druckverband: bestandRtw.druckverband! - 1 },
      }),
      fahrzeug({
        id: 'fz-2',
        material: {
          ...bestandRtw,
          druckverband: bestandRtw.druckverband! - 1,
          tourniquet: bestandRtw.tourniquet! - 4,
        },
      }),
    ]);
    expect(ergebnis).toEqual([
      { typ: 'tourniquet', verbraucht: 4 },
      { typ: 'druckverband', verbraucht: 2 },
    ]);
  });

  it('ignoriert einen als ausgefallen markierten Bestand nicht - die Bestückung selbst bleibt gültige Referenz', () => {
    const bestand = materialAusVorlage('ktw');
    const ergebnis = berechneMaterialverbrauch([
      fahrzeug({
        typ: 'ktw',
        ausgefallen: true,
        material: { ...bestand, stifneck: (bestand.stifneck ?? 0) - 1 },
      }),
    ]);
    expect(ergebnis).toEqual([{ typ: 'stifneck', verbraucht: 1 }]);
  });
});
