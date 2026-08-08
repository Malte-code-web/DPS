import { describe, expect, it } from 'vitest';
import { VERLEGUNGSDAUER_SEK } from './abschnitte';
import {
  geoPunktName,
  geoZuLokalM,
  haversineMeter,
  lokalMZuGeo,
  routenAusSzenario,
  verlegungsdauerSek,
} from './geodaten';
import type { GeoPosition, Route, Szenario } from './types';

const ROUTE_FREI: Route = {
  id: 'r-1',
  von: 'schadensstelle',
  nach: 'eingangssichtung',
  distanzMeter: 150,
  sperraufschlagSek: 90,
  status: 'frei',
};

describe('verlegungsdauerSek', () => {
  it('fällt ohne passende Route auf VERLEGUNGSDAUER_SEK zurück', () => {
    expect(verlegungsdauerSek([], 'schadensstelle', 'eingangssichtung')).toBe(VERLEGUNGSDAUER_SEK);
    expect(verlegungsdauerSek([ROUTE_FREI], 'ablage', 'eingangssichtung')).toBe(VERLEGUNGSDAUER_SEK);
  });

  it('berechnet die Dauer aus der Distanz, wenn eine Route passt', () => {
    expect(verlegungsdauerSek([ROUTE_FREI], 'schadensstelle', 'eingangssichtung')).toBe(150);
  });

  it('findet eine Route unabhängig von der Richtung', () => {
    expect(verlegungsdauerSek([ROUTE_FREI], 'eingangssichtung', 'schadensstelle')).toBe(150);
  });

  it('addiert den Sperraufschlag nur bei gesperrter Route, als Zeitaufschlag statt Blockade', () => {
    const gesperrt: Route = { ...ROUTE_FREI, status: 'gesperrt' };
    expect(verlegungsdauerSek([gesperrt], 'schadensstelle', 'eingangssichtung')).toBe(150 + 90);
    // Bleibt trotz Sperrung ein endlicher, passierbarer Wert - keine Blockade.
    expect(verlegungsdauerSek([gesperrt], 'schadensstelle', 'eingangssichtung')).toBeLessThan(Infinity);
  });
});

describe('geoPunktName', () => {
  it('benennt bereitstellungsraum, obwohl er nicht in der normalen Abschnittsliste steht', () => {
    // abschnittInfo() kennt bereitstellungsraum bewusst nicht (reine
    // Fahrzeug-Infrastruktur, kein Patientenziel) - die Karte muss ihn
    // trotzdem beschriften können, sobald ein Szenario ihm eine Koordinate gibt.
    expect(geoPunktName('bereitstellungsraum')).toBe('Bereitstellungsraum');
  });

  it('nutzt sonst denselben Namen wie die normale Abschnittsliste', () => {
    expect(geoPunktName('schadensstelle')).toBe('Schadensstelle');
  });
});

describe('haversineMeter', () => {
  it('liefert 0 für identische Punkte', () => {
    const punkt: GeoPosition = { lat: 52.35, lon: 7.9 };
    expect(haversineMeter(punkt, punkt)).toBeCloseTo(0);
  });

  it('berechnet eine plausible Distanz für einen bekannten Versatz (~111 m pro 0,001° Breite)', () => {
    const a: GeoPosition = { lat: 52.35, lon: 7.9 };
    const b: GeoPosition = { lat: 52.351, lon: 7.9 };
    expect(haversineMeter(a, b)).toBeCloseTo(111.3, 0);
  });
});

describe('geoZuLokalM / lokalMZuGeo', () => {
  it('bildet Ursprung auf (0, 0) ab', () => {
    const ursprung: GeoPosition = { lat: 52.35, lon: 7.9 };
    expect(geoZuLokalM(ursprung, ursprung)).toEqual({ xM: 0, yM: 0 });
  });

  it('ist zueinander invers (Rundreise landet wieder beim Ausgangspunkt)', () => {
    const ursprung: GeoPosition = { lat: 52.35, lon: 7.9 };
    const punkt: GeoPosition = { lat: 52.3495, lon: 7.9012 };
    const { xM, yM } = geoZuLokalM(ursprung, punkt);
    const zurueck = lokalMZuGeo(ursprung, xM, yM);
    expect(zurueck.lat).toBeCloseTo(punkt.lat, 6);
    expect(zurueck.lon).toBeCloseTo(punkt.lon, 6);
  });

  it('Süden ist positives yM, Osten ist positives xM', () => {
    const ursprung: GeoPosition = { lat: 52.35, lon: 7.9 };
    const suedlich: GeoPosition = { lat: 52.349, lon: 7.9 };
    const oestlich: GeoPosition = { lat: 52.35, lon: 7.901 };
    expect(geoZuLokalM(ursprung, suedlich).yM).toBeGreaterThan(0);
    expect(geoZuLokalM(ursprung, oestlich).xM).toBeGreaterThan(0);
  });
});

describe('routenAusSzenario', () => {
  const basisSzenario: Szenario = {
    id: 's-1',
    titel: 'Test',
    lagemeldung: '',
    einsatzhinweis: '',
    patienten: [],
  };

  it('liefert eine leere Liste ohne Geodaten - ein Szenario ohne Geodaten bleibt unverändert nutzbar', () => {
    expect(routenAusSzenario(basisSzenario)).toEqual([]);
  });

  it('materialisiert Routen mit Status "frei", sofern nicht gesperrtBeimStart gesetzt ist', () => {
    const szenario: Szenario = {
      ...basisSzenario,
      geodaten: {
        schluesselpunkte: {},
        routen: [
          { id: 'r-1', von: 'schadensstelle', nach: 'eingangssichtung', distanzMeter: 150, sperraufschlagSek: 90 },
          {
            id: 'r-2',
            von: 'bereitstellungsraum',
            nach: 'schadensstelle',
            distanzMeter: 350,
            sperraufschlagSek: 90,
            gesperrtBeimStart: true,
          },
        ],
      },
    };
    const routen = routenAusSzenario(szenario);
    expect(routen.find((r) => r.id === 'r-1')?.status).toBe('frei');
    expect(routen.find((r) => r.id === 'r-2')?.status).toBe('gesperrt');
  });

  it('berechnet distanzMeter aus den Koordinaten, wenn kein Override angegeben ist', () => {
    const szenario: Szenario = {
      ...basisSzenario,
      geodaten: {
        schluesselpunkte: {
          schadensstelle: { lat: 52.35, lon: 7.9 },
          eingangssichtung: { lat: 52.349, lon: 7.9 },
        },
        routen: [
          { id: 'r-1', von: 'schadensstelle', nach: 'eingangssichtung', sperraufschlagSek: 90 },
        ],
      },
    };
    const route = routenAusSzenario(szenario).find((r) => r.id === 'r-1');
    expect(route?.distanzMeter).toBeCloseTo(haversineMeter({ lat: 52.35, lon: 7.9 }, { lat: 52.349, lon: 7.9 }));
  });

  it('bevorzugt einen manuellen distanzMeter-Override vor der Berechnung', () => {
    const szenario: Szenario = {
      ...basisSzenario,
      geodaten: {
        schluesselpunkte: {
          schadensstelle: { lat: 52.35, lon: 7.9 },
          eingangssichtung: { lat: 52.349, lon: 7.9 },
        },
        routen: [
          { id: 'r-1', von: 'schadensstelle', nach: 'eingangssichtung', distanzMeter: 999, sperraufschlagSek: 90 },
        ],
      },
    };
    const route = routenAusSzenario(szenario).find((r) => r.id === 'r-1');
    expect(route?.distanzMeter).toBe(999);
  });
});
