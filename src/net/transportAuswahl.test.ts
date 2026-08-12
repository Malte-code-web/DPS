import { describe, expect, it } from 'vitest';
import { erzeugeLokalenTransport } from './lokalerTransport';
import { erzeugeSupabaseTransport } from './supabaseTransport';
import { supabaseKonfiguriert } from './supabaseClient';
import { waehleTransport } from './transportAuswahl';

describe('waehleTransport', () => {
  it('wählt den lokalen Kanal ohne Supabase-Konfiguration', () => {
    expect(waehleTransport(false)).toBe(erzeugeLokalenTransport);
  });

  it('wählt Supabase, sobald konfiguriert', () => {
    expect(waehleTransport(true)).toBe(erzeugeSupabaseTransport);
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
describe.skipIf(supabaseKonfiguriert)('erzeugeSupabaseTransport ohne Zugangsdaten', () => {
  it('lehnt die Verbindung mit einer klaren Fehlermeldung ab statt stumm zu scheitern', () => {
    expect(() => erzeugeSupabaseTransport('ABCDE', () => {})).toThrow(/nicht konfiguriert/);
  });
});
