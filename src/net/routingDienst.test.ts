import { afterEach, describe, expect, it, vi } from 'vitest';
import { holeStrassenroute } from './routingDienst';

const von = { lat: 52.0, lon: 7.0 };
const nach = { lat: 52.01, lon: 7.01 };

describe('holeStrassenroute', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('liefert Distanz und Geometrie bei erfolgreicher Antwort', async () => {
    const antwort = {
      code: 'Ok',
      routes: [
        {
          distance: 1234.5,
          geometry: {
            coordinates: [
              [7.0, 52.0],
              [7.005, 52.005],
              [7.01, 52.01],
            ],
          },
        },
      ],
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(antwort) }),
    );

    const ergebnis = await holeStrassenroute(von, nach);

    expect(ergebnis).not.toBeNull();
    expect(ergebnis?.distanzMeter).toBe(1234.5);
    expect(ergebnis?.geometrie).toEqual([
      { lat: 52.0, lon: 7.0 },
      { lat: 52.005, lon: 7.005 },
      { lat: 52.01, lon: 7.01 },
    ]);
  });

  it('liefert null bei HTTP-Fehler', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) }));

    expect(await holeStrassenroute(von, nach)).toBeNull();
  });

  it('liefert null bei Netzwerkfehler/Timeout statt zu werfen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    expect(await holeStrassenroute(von, nach)).toBeNull();
  });

  it('liefert null bei unerwarteter Antwortform (kein Route-Array, kein "Ok")', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ code: 'NoRoute' }) }),
    );

    expect(await holeStrassenroute(von, nach)).toBeNull();
  });
});
