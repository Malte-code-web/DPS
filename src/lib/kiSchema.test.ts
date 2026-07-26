import { describe, expect, it } from 'vitest';
import { MASSNAHMEN } from '../domain/massnahmen';
import { normalisiereSzenario, SZENARIO_SCHEMA } from './kiSchema';

/** Läuft rekursiv durch das Schema und sammelt alle Objektknoten ein. */
function objektknoten(knoten: unknown, gefunden: Record<string, unknown>[] = []) {
  if (typeof knoten !== 'object' || knoten === null) return gefunden;
  const eintrag = knoten as Record<string, unknown>;
  if (eintrag.type === 'object') gefunden.push(eintrag);
  for (const wert of Object.values(eintrag)) {
    if (Array.isArray(wert)) wert.forEach((teil) => objektknoten(teil, gefunden));
    else objektknoten(wert, gefunden);
  }
  return gefunden;
}

describe('SZENARIO_SCHEMA', () => {
  it('verbietet Zusatzfelder und verlangt jedes Feld - Bedingung für strikte Schemata', () => {
    const knoten = objektknoten(SZENARIO_SCHEMA);
    expect(knoten.length).toBeGreaterThan(3);
    for (const eintrag of knoten) {
      expect(eintrag.additionalProperties).toBe(false);
      expect(eintrag.required).toEqual(Object.keys(eintrag.properties as object));
    }
  });

  it('erlaubt genau die Maßnahmen aus dem Katalog', () => {
    // Der Pfad zur Maßnahmenliste: Szenario > patienten[] > probleme[] > behandeltDurch[]
    const gehe = (knoten: unknown, ...pfad: string[]): Record<string, unknown> =>
      pfad.reduce(
        (aktuell, feld) => (aktuell as Record<string, unknown>)[feld] as Record<string, unknown>,
        knoten as Record<string, unknown>,
      );

    const enumWerte = gehe(
      SZENARIO_SCHEMA,
      'properties',
      'patienten',
      'items',
      'properties',
      'probleme',
      'items',
      'properties',
      'behandeltDurch',
      'items',
      'enum',
    ) as unknown as string[];

    expect([...enumWerte].sort()).toEqual(Object.keys(MASSNAHMEN).sort());
  });
});

describe('normalisiereSzenario', () => {
  const roh = {
    id: 'test',
    titel: 'Test',
    lagemeldung: 'Lage',
    einsatzhinweis: 'Hinweis',
    patienten: [
      {
        id: 'P-01',
        probleme: [
          {
            id: 'blutung',
            verlauf: { systolischerRR: -8, spo2: null, gcs: 0, herzfrequenz: 4 },
            startetNachMin: null,
          },
          { id: 'spaet', verlauf: { spo2: -6 }, startetNachMin: 4 },
        ],
      },
    ],
  };

  it('entfernt leere Verlaufswerte und optionale Nullfelder', () => {
    const ergebnis = normalisiereSzenario(roh) as typeof roh;
    const [erstes, zweites] = ergebnis.patienten[0]!.probleme;

    expect(erstes!.verlauf).toEqual({ systolischerRR: -8, herzfrequenz: 4 });
    expect('startetNachMin' in erstes!).toBe(false);
    expect(zweites!.startetNachMin).toBe(4);
  });

  it('lässt fremde Strukturen unangetastet', () => {
    expect(normalisiereSzenario(null)).toBeNull();
    expect(normalisiereSzenario({ patienten: 'kaputt' })).toEqual({ patienten: 'kaputt' });
  });
});
