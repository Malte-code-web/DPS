import { describe, expect, it } from 'vitest';
import { istSupabaseKonfiguriert, supabase, supabaseKonfiguriert } from './supabaseClient';

describe('istSupabaseKonfiguriert', () => {
  it('ist erst konfiguriert, wenn URL und Key beide gesetzt sind', () => {
    expect(istSupabaseKonfiguriert({})).toBe(false);
    expect(istSupabaseKonfiguriert({ url: 'https://x.supabase.co' })).toBe(false);
    expect(istSupabaseKonfiguriert({ anonKey: 'abc' })).toBe(false);
    expect(istSupabaseKonfiguriert({ url: 'https://x.supabase.co', anonKey: 'abc' })).toBe(true);
  });

  it('leere Zeichenketten zählen nicht als gesetzt', () => {
    expect(istSupabaseKonfiguriert({ url: '', anonKey: '' })).toBe(false);
  });
});

/**
 * Diese Prüfungen gelten dem Verhalten **ohne** hinterlegte Zugangsdaten - dem
 * Normalfall in der Entwicklung und in der Testumgebung. Liegt eine `.env` vor
 * (→ `net.livetest`), sind sie gegenstandslos und würden zwangsläufig
 * scheitern: Dann ist Supabase eben konfiguriert. `skipIf` macht diese
 * Abhängigkeit sichtbar, statt die Suite je nach Arbeitsplatz rot werden zu
 * lassen.
 */
describe.skipIf(supabaseKonfiguriert)('Modul-Export ohne hinterlegte Zugangsdaten', () => {
  it('bleibt ohne .env sicher auf null - kein Absturz beim Import', () => {
    expect(supabaseKonfiguriert).toBe(false);
    expect(supabase).toBeNull();
  });
});
