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

describe('Modul-Export ohne hinterlegte Zugangsdaten (Testumgebung)', () => {
  it('bleibt ohne .env sicher auf null - kein Absturz beim Import', () => {
    expect(supabaseKonfiguriert).toBe(false);
    expect(supabase).toBeNull();
  });
});
