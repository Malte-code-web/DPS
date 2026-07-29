import { supabase } from './supabaseClient';
import type { SitzungsNachricht } from './protokoll';
import type { TransportFabrik } from './sitzungstransport';

/**
 * @anker net.supabase Sitzungstransport über Supabase Realtime (Cross-Device)
 *
 * Ein Supabase-Realtime-Kanal je Sitzungscode ersetzt den lokalen
 * `BroadcastChannel` (→ `net.lokal`) - dieselbe Nachrichtenform, jetzt über
 * echte Geräte hinweg. Supabase leitet nur weiter; gerechnet wird weiterhin
 * ausschließlich im Browser der Übungsleitung (host-autoritativ,
 * → `state.provider`). Der Kanalname trägt den Sitzungscode - wer ihn kennt,
 * kann beitreten; das ist dieselbe Zugriffsregel wie beim lokalen Transport.
 */
const PRAEFIX = 'dps-sitzung-';

export const erzeugeSupabaseTransport: TransportFabrik = (code, onNachricht) => {
  const client = supabase;
  if (!client) {
    throw new Error(
      'Supabase ist nicht konfiguriert (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY fehlen).',
    );
  }
  const kanal = client.channel(PRAEFIX + code);
  kanal
    .on('broadcast', { event: 'nachricht' }, ({ payload }) => {
      onNachricht(payload as SitzungsNachricht);
    })
    .subscribe();

  return {
    senden(nachricht) {
      void kanal.send({ type: 'broadcast', event: 'nachricht', payload: nachricht });
    },
    schliessen() {
      void client.removeChannel(kanal);
    },
  };
};
