import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * @anker net.supabaseClient Zugriff auf das Supabase-Projekt der Übungsleitung
 *
 * Ohne hinterlegte Umgebungsvariablen bleibt `supabase` `null` - dann läuft die
 * Sitzung über den lokalen Transport (→ `net.lokal`), nur auf einem Gerät.
 * `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` kommen aus einer `.env`
 * (siehe `.env.example`); der anon key ist dafür gedacht, im Browser zu stehen
 * - der eigentliche Schutz liegt in den Kanal-Namen (Sitzungscode).
 */
export interface SupabaseUmgebung {
  url?: string;
  anonKey?: string;
}

/** Reine Prüfung ohne Seiteneffekt - testbar ohne echte Umgebungsvariablen. */
export function istSupabaseKonfiguriert(umgebung: SupabaseUmgebung): boolean {
  return Boolean(umgebung.url && umgebung.anonKey);
}

const umgebung: SupabaseUmgebung = {
  url: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
};

export const supabaseKonfiguriert = istSupabaseKonfiguriert(umgebung);

export const supabase: SupabaseClient | null = supabaseKonfiguriert
  ? createClient(umgebung.url!, umgebung.anonKey!)
  : null;
