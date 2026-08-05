import { describe, expect, it } from 'vitest';
import { meldeUebungsleitungAn } from './supabaseAuth';

describe('meldeUebungsleitungAn', () => {
  it('meldet einen klaren Fehler, wenn Supabase nicht konfiguriert ist (Testumgebung ohne .env)', async () => {
    const ergebnis = await meldeUebungsleitungAn('test@example.com', 'geheim123');
    expect(ergebnis).toEqual({ erfolg: false, fehler: 'Supabase ist nicht konfiguriert.' });
  });
});
