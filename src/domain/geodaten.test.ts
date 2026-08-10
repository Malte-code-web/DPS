import { describe, expect, it } from 'vitest';
import { VERLEGUNGSDAUER_SEK } from './abschnitte';
import { geoPunktName, geoZuLokalM, haversineMeter, lokalMZuGeo, verlegungsdauerSek } from './geodaten';
import type { GeoPosition, Route } from './types';

const ROUTE: Route = {
  id: 'r-1',
  von: 'schadensstelle',
  nach: 'eingangssichtung',
  distanzMeter: 150,
};

describe('verlegungsdauerSek', () => {
  it('fällt ohne angelegte Route auf VERLEGUNGSDAUER_SEK zurück', () => {
    expect(verlegungsdauerSek([], 'schadensstelle', 'eingangssichtung')).toBe(VERLEGUNGSDAUER_SEK);
    expect(verlegungsdauerSek([ROUTE], 'ablage', 'eingangssichtung')).toBe(VERLEGUNGSDAUER_SEK);
  });

  it('berechnet die Dauer aus der Distanz, wenn eine Route passt', () => {
    expect(verlegungsdauerSek([ROUTE], 'schadensstelle', 'eingangssichtung')).toBe(150);
  });

  it('findet eine Route unabhängig von der Richtung', () => {
    expect(verlegungsdauerSek([ROUTE], 'eingangssichtung', 'schadensstelle')).toBe(150);
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
