import { describe, expect, it } from 'vitest';
import { meldeUebungsleitungAn } from './supabaseAuth';
import { supabaseKonfiguriert } from './supabaseClient';

/**
 * Diese Prüfungen gelten dem Verhalten **ohne** hinterlegte Zugangsdaten - dem
 * Normalfall in der Entwicklung und in der Testumgebung. Liegt eine `.env` vor
 * (→ `net.livetest`), sind sie gegenstandslos und würden zwangsläufig
 * scheitern: Dann ist Supabase eben konfiguriert. `skipIf` macht diese
 * Abhängigkeit sichtbar, statt die Suite je nach Arbeitsplatz rot werden zu
 * lassen.
 */
describe.skipIf(supabaseKonfiguriert)('meldeUebungsleitungAn ohne Zugangsdaten', () => {
  it('meldet einen klaren Fehler statt stumm zu scheitern', async () => {
    const ergebnis = await meldeUebungsleitungAn('test@example.com', 'geheim123');
    expect(ergebnis).toEqual({ erfolg: false, fehler: 'Supabase ist nicht konfiguriert.' });
  });
});
