import { describe, expect, it } from 'vitest';
import { holeTurnServer, istTurnKonfiguriert, turnKonfiguriert } from './turnAnbieter';

describe('istTurnKonfiguriert', () => {
  it('ist erst konfiguriert, wenn App-Name und API-Key beide gesetzt sind', () => {
    expect(istTurnKonfiguriert({})).toBe(false);
    expect(istTurnKonfiguriert({ appName: 'meine-app' })).toBe(false);
    expect(istTurnKonfiguriert({ apiKey: 'abc' })).toBe(false);
    expect(istTurnKonfiguriert({ appName: 'meine-app', apiKey: 'abc' })).toBe(true);
  });

  it('leere Zeichenketten zählen nicht als gesetzt', () => {
    expect(istTurnKonfiguriert({ appName: '', apiKey: '' })).toBe(false);
  });
});

describe('Modul-Export ohne hinterlegte Zugangsdaten (Testumgebung)', () => {
  it('bleibt ohne .env sicher unkonfiguriert', () => {
    expect(turnKonfiguriert).toBe(false);
  });

  it('holeTurnServer liefert ohne Konfiguration eine leere Liste, kein Netzwerkaufruf', async () => {
    expect(await holeTurnServer()).toEqual([]);
  });
});
