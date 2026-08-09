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
