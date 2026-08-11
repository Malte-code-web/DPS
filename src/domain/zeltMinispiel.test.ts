import { describe, expect, it } from 'vitest';
import {
  BONUS_SEK,
  MAX_BONUS_ANTEIL,
  RUNDEN_INTERVALL_SEK,
  istZeltTyp,
  naechsteZielZeit,
  rundenanzahlFuer,
  rundenplanErzeugen,
  sollMinispielStarten,
  teilnehmerVon,
} from './zeltMinispiel';
import type { Spieler } from './sitzung';
import type { Fahrzeug } from './types';

function fahrzeug(id: string, besatzung: string[], gruppenfuehrerId?: string): Fahrzeug {
  return { id, typ: 'rtw', abschnitt: 'bereitstellungsraum', besatzung, material: {}, gruppenfuehrerId };
}

function spieler(id: string, fuehrungsrolle: Spieler['fuehrungsrolle']): Spieler {
  return { id, name: id, rolle: 'spieler', qualifikation: 'basis', fuehrungsrolle };
}

describe('istZeltTyp', () => {
  it('erkennt echte Zeltprodukte', () => {
    expect(istZeltTyp('SG20')).toBe(true);
    expect(istZeltTyp('SG50')).toBe(true);
  });

  it('erkennt reine Flächen als kein Zelt', () => {
    expect(istZeltTyp('FL_S')).toBe(false);
    expect(istZeltTyp('FL_L')).toBe(false);
  });
});

describe('teilnehmerVon', () => {
  it('flacht die Besatzung aller Fahrzeuge der Gruppe ab, ohne den Gruppenführer selbst', () => {
    const fahrzeuge = [
      fahrzeug('f1', ['anna', 'bert', ''], 'anna'),
      fahrzeug('f2', ['chris'], 'anna'),
      fahrzeug('f3', ['dana'], 'egon'),
    ];
    expect(teilnehmerVon(fahrzeuge, 'anna').sort()).toEqual(['bert', 'chris']);
  });

  it('dedupliziert dieselbe Person über mehrere Fahrzeuge hinweg', () => {
    const fahrzeuge = [fahrzeug('f1', ['bert'], 'anna'), fahrzeug('f2', ['bert', 'chris'], 'anna')];
    expect(teilnehmerVon(fahrzeuge, 'anna').sort()).toEqual(['bert', 'chris']);
  });

  it('liefert eine leere Liste ohne zugewiesene Gruppe', () => {
    expect(teilnehmerVon([fahrzeug('f1', ['bert'], 'egon')], 'anna')).toEqual([]);
  });
});

describe('sollMinispielStarten', () => {
  const gruppenfuehrerMitTeam = [spieler('anna', 'gruppenfuehrer'), spieler('bert', undefined)];
  const fahrzeugeMitTeam = [fahrzeug('f1', ['bert'], 'anna')];

  it('greift für ein echtes Zelt, Gruppenführer mit Team', () => {
    expect(sollMinispielStarten(fahrzeugeMitTeam, gruppenfuehrerMitTeam, 'SG20', 'anna')).toBe(true);
  });

  it('greift nicht für reine Flächen (kein echtes Zelt)', () => {
    expect(sollMinispielStarten(fahrzeugeMitTeam, gruppenfuehrerMitTeam, 'FL_S', 'anna')).toBe(false);
  });

  it('greift nicht ohne Team (niemand zum Mitspielen)', () => {
    const ohneTeam = [fahrzeug('f1', [], 'anna')];
    expect(sollMinispielStarten(ohneTeam, gruppenfuehrerMitTeam, 'SG20', 'anna')).toBe(false);
  });

  it('greift nicht, wenn die bauende Person kein Gruppenführer ist', () => {
    const zugfuehrer = [spieler('anna', 'zugfuehrer'), spieler('bert', undefined)];
    expect(sollMinispielStarten(fahrzeugeMitTeam, zugfuehrer, 'SG20', 'anna')).toBe(false);
  });

  it('greift nicht ohne bekannte bauende Person', () => {
    expect(sollMinispielStarten(fahrzeugeMitTeam, gruppenfuehrerMitTeam, 'SG20', undefined)).toBe(false);
    expect(sollMinispielStarten(fahrzeugeMitTeam, gruppenfuehrerMitTeam, 'SG20', 'unbekannt')).toBe(false);
  });
});

describe('rundenanzahlFuer', () => {
  it('rechnet die Kalibrierungstabelle je Zeltgröße korrekt', () => {
    expect(rundenanzahlFuer(300)).toBe(5); // SG20
    expect(rundenanzahlFuer(420)).toBe(7); // SG30
    expect(rundenanzahlFuer(600)).toBe(10); // SG40
    expect(rundenanzahlFuer(900)).toBe(15); // SG50
  });

  it('rundet ungerade Vielfache des Rundenintervalls ab', () => {
    expect(rundenanzahlFuer(RUNDEN_INTERVALL_SEK * 3 + 10)).toBe(3);
  });
});

describe('rundenplanErzeugen', () => {
  it('verteilt Runden deterministisch im Round-Robin über die Teilnehmenden', () => {
    const plan = rundenplanErzeugen(['anna', 'bert'], 5);
    expect(plan.map((r) => r.spielerId)).toEqual(['anna', 'bert', 'anna', 'bert', 'anna']);
  });

  it('liefert einen leeren Plan ohne Teilnehmende', () => {
    expect(rundenplanErzeugen([], 5)).toEqual([]);
  });

  it('liefert einen leeren Plan bei null Runden', () => {
    expect(rundenplanErzeugen(['anna'], 0)).toEqual([]);
  });
});

describe('naechsteZielZeit', () => {
  it('zieht das Ziel um BONUS_SEK näher', () => {
    expect(naechsteZielZeit(1000, 300, 1300)).toBe(1300 - BONUS_SEK);
  });

  it('durchbricht den Deckel (MAX_BONUS_ANTEIL) auch bei vielen Treffern nie', () => {
    let ziel = 1000 + 300;
    for (let i = 0; i < 20; i += 1) {
      ziel = naechsteZielZeit(1000, 300, ziel);
    }
    expect(ziel).toBe(1000 + 300 * (1 - MAX_BONUS_ANTEIL));
  });
});
