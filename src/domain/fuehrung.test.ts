import { describe, expect, it } from 'vitest';
import {
  FUEHRUNGSROLLEN,
  FUEHRUNGSROLLE_LABEL,
  darfFahrzeugeDisponieren,
  erfuelltFuehrung,
  formatStaerke,
  istRegiefuehrend,
  istZugfuehrend,
  staerkemeldung,
} from './fuehrung';
import type { Spieler } from './sitzung';

describe('istRegiefuehrend', () => {
  it('gilt für Übungsleitung und Beobachter, nicht für Spieler oder niemanden', () => {
    expect(istRegiefuehrend('uebungsleiter')).toBe(true);
    expect(istRegiefuehrend('beobachter')).toBe(true);
    expect(istRegiefuehrend('spieler')).toBe(false);
    expect(istRegiefuehrend(null)).toBe(false);
  });
});

describe('istZugfuehrend', () => {
  it('gilt nur für Spieler mit der Führungsrolle zugfuehrer, exakt getroffen', () => {
    expect(istZugfuehrend('spieler', 'zugfuehrer')).toBe(true);
    expect(istZugfuehrend('spieler', 'gruppenfuehrer')).toBe(false);
    expect(istZugfuehrend('spieler', 'keine')).toBe(false);
    expect(istZugfuehrend('spieler', undefined)).toBe(false);
  });

  it('höhere Ränge (OrgL RD/LNA) erben die Zugführer-Ansicht nicht', () => {
    expect(istZugfuehrend('spieler', 'orgl_rd')).toBe(false);
    expect(istZugfuehrend('spieler', 'lna')).toBe(false);
  });

  it('gilt nicht für Übungsleitung/Beobachter, auch nicht mit Führungsrolle', () => {
    expect(istZugfuehrend('uebungsleiter', 'zugfuehrer')).toBe(false);
    expect(istZugfuehrend('beobachter', 'zugfuehrer')).toBe(false);
    expect(istZugfuehrend(null, 'zugfuehrer')).toBe(false);
  });
});

function spieler(id: string, fuehrungsrolle: Spieler['fuehrungsrolle']): Spieler {
  return { id, name: id, rolle: 'spieler', qualifikation: 'basis', fuehrungsrolle };
}

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

  it('lässt Beobachter wie die Übungsleitung immer disponieren', () => {
    expect(darfFahrzeugeDisponieren(true, 'beobachter', undefined)).toBe(true);
    expect(darfFahrzeugeDisponieren(true, 'beobachter', 'keine')).toBe(true);
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

describe('staerkemeldung / formatStaerke', () => {
  const alleSpieler = [
    spieler('anna', 'zugfuehrer'),
    spieler('bert', 'gruppenfuehrer'),
    spieler('chris', 'truppfuehrer'),
    spieler('dana', 'keine'),
    spieler('erik', undefined),
    spieler('flo', 'lna'),
  ];

  it('ordnet Zugführer/OrgL RD/LNA als Führungskraft ein', () => {
    const staerke = staerkemeldung(['anna', 'flo'], alleSpieler);
    expect(staerke).toEqual({ fuehrungskraefte: 2, unterfuehrer: 0, mannschaft: 0, gesamt: 2 });
  });

  it('ordnet Trupp-/Gruppenführer als Unterführer ein', () => {
    const staerke = staerkemeldung(['bert', 'chris'], alleSpieler);
    expect(staerke).toEqual({ fuehrungskraefte: 0, unterfuehrer: 2, mannschaft: 0, gesamt: 2 });
  });

  it('ordnet Personen ohne Führungsrolle als Mannschaft ein, auch ohne gesetztes Feld', () => {
    const staerke = staerkemeldung(['dana', 'erik'], alleSpieler);
    expect(staerke).toEqual({ fuehrungskraefte: 0, unterfuehrer: 0, mannschaft: 2, gesamt: 2 });
  });

  it('mischt alle drei Stufen in einer Besatzung', () => {
    const staerke = staerkemeldung(['anna', 'bert', 'dana', 'erik'], alleSpieler);
    expect(staerke).toEqual({ fuehrungskraefte: 1, unterfuehrer: 1, mannschaft: 2, gesamt: 4 });
    expect(formatStaerke(staerke)).toBe('1/1/2/4');
  });

  it('liefert 0/0/0/0 für eine leere Besatzung', () => {
    expect(formatStaerke(staerkemeldung([], alleSpieler))).toBe('0/0/0/0');
  });

  it('ignoriert leere Platzhalter ("") aus der positionellen Platzliste', () => {
    const staerke = staerkemeldung(['anna', '', 'dana', ''], alleSpieler);
    expect(staerke).toEqual({ fuehrungskraefte: 1, unterfuehrer: 0, mannschaft: 1, gesamt: 2 });
  });
});
