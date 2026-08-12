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

/**
 * Wie bei Supabase (→ `net.livetest`) gelten diese beiden Prüfungen dem
 * Verhalten **ohne** hinterlegte Zugangsdaten. Liegen welche vor, sind sie
 * gegenstandslos - und `holeTurnServer` würde sogar wirklich ins Netz greifen,
 * was in einer Testsuite nichts zu suchen hat.
 */
describe.skipIf(turnKonfiguriert)('Modul-Export ohne hinterlegte Zugangsdaten', () => {
  it('bleibt ohne .env sicher unkonfiguriert', () => {
    expect(turnKonfiguriert).toBe(false);
  });

  it('holeTurnServer liefert ohne Konfiguration eine leere Liste mit erklärendem Fehler, kein Netzwerkaufruf', async () => {
    const ergebnis = await holeTurnServer();
    expect(ergebnis.server).toEqual([]);
    expect(ergebnis.fehler).toMatch(/nicht konfiguriert/);
  });
});
