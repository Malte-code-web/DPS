import { describe, expect, it } from 'vitest';
import { ABSCHNITTE, istVerlegungMoeglich, moeglicheZiele, sichtungsstelleIn } from './abschnitte';

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
