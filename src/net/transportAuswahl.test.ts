import { describe, expect, it } from 'vitest';
import { erzeugeLokalenTransport } from './lokalerTransport';
import { erzeugeSupabaseTransport } from './supabaseTransport';
import { waehleTransport } from './transportAuswahl';

describe('waehleTransport', () => {
  it('wählt den lokalen Kanal ohne Supabase-Konfiguration', () => {
    expect(waehleTransport(false)).toBe(erzeugeLokalenTransport);
  });

  it('wählt Supabase, sobald konfiguriert', () => {
    expect(waehleTransport(true)).toBe(erzeugeSupabaseTransport);
  });
});

describe('erzeugeSupabaseTransport ohne Zugangsdaten (Testumgebung)', () => {
  it('lehnt die Verbindung mit einer klaren Fehlermeldung ab statt stumm zu scheitern', () => {
    expect(() => erzeugeSupabaseTransport('ABCDE', () => {})).toThrow(/nicht konfiguriert/);
  });
});
