import { describe, expect, it } from 'vitest';
import { FUEHRUNGSROLLEN, FUEHRUNGSROLLE_LABEL, darfFahrzeugeDisponieren, erfuelltFuehrung } from './fuehrung';

describe('erfuelltFuehrung', () => {
  it('ordnet die Stufen TrFü < GrFü < ZgFü', () => {
    expect(erfuelltFuehrung('gruppenfuehrer', 'truppfuehrer')).toBe(true);
    expect(erfuelltFuehrung('truppfuehrer', 'gruppenfuehrer')).toBe(false);
    expect(erfuelltFuehrung('zugfuehrer', 'gruppenfuehrer')).toBe(true);
    expect(erfuelltFuehrung('gruppenfuehrer', 'zugfuehrer')).toBe(false);
  });

  it('lässt OrgL RD und LNA im selben, höchsten Rang stehen', () => {
    expect(erfuelltFuehrung('orgl_rd', 'lna')).toBe(true);
    expect(erfuelltFuehrung('lna', 'orgl_rd')).toBe(true);
    expect(erfuelltFuehrung('orgl_rd', 'zugfuehrer')).toBe(true);
    expect(erfuelltFuehrung('zugfuehrer', 'orgl_rd')).toBe(false);
  });

  it('lässt "keine" nichts erfüllen außer sich selbst', () => {
    expect(erfuelltFuehrung('keine', 'keine')).toBe(true);
    expect(erfuelltFuehrung('keine', 'truppfuehrer')).toBe(false);
  });
});

describe('FUEHRUNGSROLLE_LABEL / FUEHRUNGSROLLEN', () => {
  it('deckt jede Führungsrolle mit einem Label ab', () => {
    for (const rolle of FUEHRUNGSROLLEN) {
      expect(FUEHRUNGSROLLE_LABEL[rolle], rolle).toBeTruthy();
    }
  });
});

describe('darfFahrzeugeDisponieren', () => {
  it('sperrt nichts außerhalb einer Sitzung', () => {
    expect(darfFahrzeugeDisponieren(false, null, undefined)).toBe(true);
    expect(darfFahrzeugeDisponieren(false, 'spieler', 'keine')).toBe(true);
  });

  it('lässt die Übungsleitung immer disponieren, unabhängig von der Führungsrolle', () => {
    expect(darfFahrzeugeDisponieren(true, 'uebungsleiter', undefined)).toBe(true);
    expect(darfFahrzeugeDisponieren(true, 'uebungsleiter', 'keine')).toBe(true);
  });

  it('lässt Spieler erst ab Zugführer disponieren', () => {
    expect(darfFahrzeugeDisponieren(true, 'spieler', undefined)).toBe(false);
    expect(darfFahrzeugeDisponieren(true, 'spieler', 'keine')).toBe(false);
    expect(darfFahrzeugeDisponieren(true, 'spieler', 'gruppenfuehrer')).toBe(false);
    expect(darfFahrzeugeDisponieren(true, 'spieler', 'zugfuehrer')).toBe(true);
    expect(darfFahrzeugeDisponieren(true, 'spieler', 'orgl_rd')).toBe(true);
    expect(darfFahrzeugeDisponieren(true, 'spieler', 'lna')).toBe(true);
  });
});
