import { erzeugeLokalenTransport } from './lokalerTransport';
import { erzeugeSupabaseTransport } from './supabaseTransport';
import { supabaseKonfiguriert } from './supabaseClient';
import type { TransportFabrik } from './sitzungstransport';

/**
 * @anker net.auswahl Supabase, wenn konfiguriert - sonst der lokale Kanal
 *
 * Ohne `.env` (→ `net.supabaseClient`) bleibt die App voll nutzbar: Sitzungen
 * laufen dann über mehrere Tabs eines Geräts statt über echte Geräte hinweg.
 */
export function waehleTransport(konfiguriert: boolean): TransportFabrik {
  return konfiguriert ? erzeugeSupabaseTransport : erzeugeLokalenTransport;
}

export const erzeugeSitzungstransport: TransportFabrik = waehleTransport(supabaseKonfiguriert);
