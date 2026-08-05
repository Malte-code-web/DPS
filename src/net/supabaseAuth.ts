import { supabase } from './supabaseClient';

/**
 * @anker net.supabaseAuth Anmeldung der Übungsleitung über Supabase Auth
 *
 * E-Mail/Passwort-Konten werden nicht in der App angelegt, sondern vorab im
 * Supabase-Dashboard der Übungsleitung ("Authentication" -> "Add user") -
 * hier steht nur der Login. Ohne konfiguriertes Supabase (→ `net.supabaseClient`)
 * ist die Übungsleitungs-Rolle komplett gesperrt (→ `ui.rolle`); Spieler
 * treten weiterhin ohne Konto per Code bei.
 */
export interface Anmeldeergebnis {
  erfolg: boolean;
  fehler?: string;
}

const FEHLERTEXTE: Record<string, string> = {
  'Invalid login credentials': 'E-Mail oder Passwort falsch.',
  'Email not confirmed': 'Diese E-Mail-Adresse ist noch nicht bestätigt.',
};

function uebersetzeFehler(meldung: string): string {
  return FEHLERTEXTE[meldung] ?? `Anmeldung fehlgeschlagen: ${meldung}`;
}

export async function meldeUebungsleitungAn(email: string, passwort: string): Promise<Anmeldeergebnis> {
  if (!supabase) {
    return { erfolg: false, fehler: 'Supabase ist nicht konfiguriert.' };
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });
  if (error) {
    return { erfolg: false, fehler: uebersetzeFehler(error.message) };
  }
  return { erfolg: true };
}
