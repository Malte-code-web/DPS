import { describe, expect, it } from 'vitest';
import { MASSNAHMEN, MASSNAHMEN_LISTE } from './massnahmen';
import { standardMassnahmenrechte, vervollstaendigeMassnahmenrechte } from './massnahmenrechte';

describe('standardMassnahmenrechte', () => {
  it('deckt jede Maßnahme des Katalogs ab: Durchführung auf Katalog-Stufe, delegierbar an alle', () => {
    const rechte = standardMassnahmenrechte();
    for (const massnahme of MASSNAHMEN_LISTE) {
      expect(rechte[massnahme.id]).toEqual({
        qualifikation: massnahme.qualifikation,
        delegationsziel: 'basis',
      });
    }
  });

  it('ordnet die Rettungssanitäter-Stufe den dafür ergänzten/verfeinerten Maßnahmen zu', () => {
    expect(MASSNAHMEN.larynxmaske.qualifikation).toBe('rettungssanitaeter');
    expect(MASSNAHMEN.fahrzeugrettung.qualifikation).toBe('rettungssanitaeter');
    expect(MASSNAHMEN.aktivkohle.qualifikation).toBe('rettungssanitaeter');
  });

  it('ordnet die Reanimation (HLW/AED) der Basis-Stufe zu', () => {
    expect(MASSNAHMEN.reanimation.qualifikation).toBe('basis');
  });
});

describe('vervollstaendigeMassnahmenrechte', () => {
  it('liefert den Standard ohne gespeicherten Wert', () => {
    expect(vervollstaendigeMassnahmenrechte(null)).toEqual(standardMassnahmenrechte());
    expect(vervollstaendigeMassnahmenrechte(undefined)).toEqual(standardMassnahmenrechte());
    expect(vervollstaendigeMassnahmenrechte('kaputt')).toEqual(standardMassnahmenrechte());
  });

  it('übernimmt eine gültige Anpassung', () => {
    const irgendeine = MASSNAHMEN_LISTE[0]!.id;
    const rechte = vervollstaendigeMassnahmenrechte({
      [irgendeine]: { qualifikation: 'notarzt', delegationsziel: 'notsan' },
    });
    expect(rechte[irgendeine]).toEqual({ qualifikation: 'notarzt', delegationsziel: 'notsan' });
  });

  it('übernimmt "nicht delegierbar" (delegationsziel = null)', () => {
    const irgendeine = MASSNAHMEN_LISTE[0]!.id;
    const rechte = vervollstaendigeMassnahmenrechte({
      [irgendeine]: { qualifikation: 'notarzt', delegationsziel: null },
    });
    expect(rechte[irgendeine]).toEqual({ qualifikation: 'notarzt', delegationsziel: null });
  });

  it('fällt bei ungültigen Werten auf den Katalog-Standard zurück statt sie zu übernehmen', () => {
    const irgendeine = MASSNAHMEN_LISTE[0]!.id;
    const standard = standardMassnahmenrechte();
    const rechte = vervollstaendigeMassnahmenrechte({
      [irgendeine]: { qualifikation: 'oberarzt', delegationsziel: 42 },
    });
    expect(rechte[irgendeine]).toEqual(standard[irgendeine]);
  });

  it('ignoriert Einträge zu Maßnahmen, die es nicht mehr gibt', () => {
    const rechte = vervollstaendigeMassnahmenrechte({
      'nicht-mehr-vorhanden': { qualifikation: 'notarzt', delegationsziel: 'notsan' },
    });
    expect(rechte).toEqual(standardMassnahmenrechte());
  });

  it('ergänzt fehlende (z. B. neu hinzugekommene) Maßnahmen mit dem Katalog-Standard', () => {
    const standard = standardMassnahmenrechte();
    const teilweise = { [MASSNAHMEN_LISTE[0]!.id]: standard[MASSNAHMEN_LISTE[0]!.id] };
    const rechte = vervollstaendigeMassnahmenrechte(teilweise);
    expect(rechte).toEqual(standard);
  });
});
