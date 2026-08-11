import { describe, expect, it } from 'vitest';
import {
  ABSCHNITTE,
  abschnittInfo,
  fahrzeugZiele,
  istFahrzeugVerlegungMoeglich,
  istVerlegungMoeglich,
  moeglicheZiele,
  sichtungsstelleIn,
} from './abschnitte';

describe('Ablage und verdeckt (→ modell.freigabemodus)', () => {
  it('zeigt Ablage in der Abschnittsliste, verdeckt und bereitstellungsraum nicht', () => {
    const ids = ABSCHNITTE.map((abschnitt) => abschnitt.id);
    expect(ids).toContain('ablage');
    expect(ids).not.toContain('verdeckt');
    expect(ids).not.toContain('bereitstellungsraum');
  });

  it('erlaubt aus der Ablage denselben Weg wie von der Schadensstelle', () => {
    expect(moeglicheZiele('ablage').map((z) => z.id)).toEqual(['eingangssichtung']);
    expect(istVerlegungMoeglich('ablage', 'eingangssichtung')).toBe(true);
  });

  it('erlaubt keine normale Verlegung aus dem verdeckten Zustand heraus', () => {
    expect(moeglicheZiele('verdeckt')).toEqual([]);
    expect(istVerlegungMoeglich('verdeckt', 'schadensstelle')).toBe(false);
    expect(istVerlegungMoeglich('verdeckt', 'ablage')).toBe(false);
  });

  it('behandelt die Ablage wie die Schadensstelle als Vorsichtung', () => {
    expect(sichtungsstelleIn('ablage')).toBe('vorsichtung');
    expect(sichtungsstelleIn('schadensstelle')).toBe('vorsichtung');
  });
});

describe('Rettungsmittelhalteplatz (→ modell.transport, abschnitte.fahrzeugziele)', () => {
  it('zeigt den Rettungsmittelhalteplatz weder in der Abschnittsliste noch als Patientenziel', () => {
    const ids = ABSCHNITTE.map((abschnitt) => abschnitt.id);
    expect(ids).not.toContain('rettungsmittelhalteplatz');
    expect(moeglicheZiele('schadensstelle').map((z) => z.id)).not.toContain(
      'rettungsmittelhalteplatz',
    );
    expect(istVerlegungMoeglich('schadensstelle', 'rettungsmittelhalteplatz')).toBe(false);
  });

  it('liefert trotzdem einen Namen über abschnittInfo, statt zu werfen', () => {
    expect(() => abschnittInfo('rettungsmittelhalteplatz')).not.toThrow();
    expect(abschnittInfo('rettungsmittelhalteplatz').name).toBe('Rettungsmittelhalteplatz');
  });

  it('erlaubt den Rettungsmittelhalteplatz nur im Fahrzeug-Overlay als Ziel', () => {
    expect(fahrzeugZiele('schadensstelle').map((z) => z.id)).toContain('rettungsmittelhalteplatz');
    expect(fahrzeugZiele('bereitstellungsraum').map((z) => z.id)).toContain(
      'rettungsmittelhalteplatz',
    );
    expect(istFahrzeugVerlegungMoeglich('schadensstelle', 'rettungsmittelhalteplatz')).toBe(true);
    expect(istFahrzeugVerlegungMoeglich('rettungsmittelhalteplatz', 'ausgangssichtung')).toBe(true);
  });

  it('behält die alte Direktroute von der Ausgangssichtung zum Abtransport', () => {
    expect(istFahrzeugVerlegungMoeglich('ausgangssichtung', 'transport')).toBe(true);
    expect(istVerlegungMoeglich('ausgangssichtung', 'transport')).toBe(true);
  });
});

describe('Fahrzeuge fahren frei zwischen allen Standorten (→ abschnitte.fahrzeugziele)', () => {
  it('erlaubt jeden Standort als Ziel, unabhängig vom Patientenweg', () => {
    // Ein Fahrzeug ist ein rollendes Materiallager - der Einbahn-Trichter aus
    // `ZIELE` bildet den Weg eines Patienten ab und gilt für Fahrzeuge nicht.
    expect(istFahrzeugVerlegungMoeglich('schadensstelle', 'zelt_rot')).toBe(true);
    expect(istFahrzeugVerlegungMoeglich('zelt_gruen', 'schadensstelle')).toBe(true);
    expect(istFahrzeugVerlegungMoeglich('ausgangssichtung', 'zelt_gelb')).toBe(true);
    expect(istFahrzeugVerlegungMoeglich('rettungsmittelhalteplatz', 'zelt_rot')).toBe(true);
    // Für Patienten bleibt derselbe Weg weiterhin gesperrt.
    expect(istVerlegungMoeglich('schadensstelle', 'zelt_rot')).toBe(false);
    expect(istVerlegungMoeglich('zelt_gruen', 'schadensstelle')).toBe(false);
  });

  it('bietet von jedem Standort alle übrigen Standorte an, sich selbst nie', () => {
    const ziele = fahrzeugZiele('zelt_rot').map((z) => z.id);
    expect(ziele).toContain('schadensstelle');
    expect(ziele).toContain('bereitstellungsraum');
    expect(ziele).toContain('rettungsmittelhalteplatz');
    expect(ziele).toContain('ausgangssichtung');
    expect(ziele).not.toContain('zelt_rot');
    // `verdeckt` ist kein Ort, sondern der Warteplatz vor der Freigabe.
    expect(ziele).not.toContain('verdeckt');
    expect(istFahrzeugVerlegungMoeglich('zelt_rot', 'verdeckt')).toBe(false);
    expect(istFahrzeugVerlegungMoeglich('zelt_rot', 'zelt_rot')).toBe(false);
  });

  it('lässt aus dem Abtransport keinen Rückweg zu', () => {
    expect(fahrzeugZiele('transport')).toEqual([]);
    expect(istFahrzeugVerlegungMoeglich('transport', 'schadensstelle')).toBe(false);
  });

  it('liefert für jeden Fahrzeugstandort einen Namen, statt zu werfen', () => {
    for (const ziel of fahrzeugZiele('schadensstelle')) {
      expect(() => abschnittInfo(ziel.id)).not.toThrow();
    }
    expect(abschnittInfo('bereitstellungsraum').name).toBe('Bereitstellungsraum');
  });
});
