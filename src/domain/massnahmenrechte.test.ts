import { describe, expect, it } from 'vitest';
import { MASSNAHMEN_LISTE } from './massnahmen';
import { standardMassnahmenrechte, vervollstaendigeMassnahmenrechte } from './massnahmenrechte';

describe('standardMassnahmenrechte', () => {
  it('deckt jede Maßnahme des Katalogs ab, beide Felder auf der Katalog-Stufe', () => {
    const rechte = standardMassnahmenrechte();
    for (const massnahme of MASSNAHMEN_LISTE) {
      expect(rechte[massnahme.id]).toEqual({
        qualifikation: massnahme.qualifikation,
        delegationsstufe: massnahme.qualifikation,
      });
    }
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
      [irgendeine]: { qualifikation: 'notarzt', delegationsstufe: 'notarzt' },
    });
    expect(rechte[irgendeine]).toEqual({ qualifikation: 'notarzt', delegationsstufe: 'notarzt' });
  });

  it('fällt bei ungültigen Werten auf den Katalog-Standard zurück statt sie zu übernehmen', () => {
    const irgendeine = MASSNAHMEN_LISTE[0]!.id;
    const standard = standardMassnahmenrechte();
    const rechte = vervollstaendigeMassnahmenrechte({
      [irgendeine]: { qualifikation: 'oberarzt', delegationsstufe: 42 },
    });
    expect(rechte[irgendeine]).toEqual(standard[irgendeine]);
  });

  it('ignoriert Einträge zu Maßnahmen, die es nicht mehr gibt', () => {
    const rechte = vervollstaendigeMassnahmenrechte({
      'nicht-mehr-vorhanden': { qualifikation: 'notarzt', delegationsstufe: 'notarzt' },
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
