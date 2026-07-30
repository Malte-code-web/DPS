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

export const erzeugeSupabaseTransport: TransportFabrik = (code, onNachricht, onStatus) => {
  const client = supabase;
  if (!client) {
    throw new Error(
      'Supabase ist nicht konfiguriert (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY fehlen).',
    );
  }
  const kanal = client.channel(PRAEFIX + code);

  // Der Kanal braucht einen Websocket-Handshake, bevor er zustellt - eine
  // Nachricht direkt nach der Erzeugung (z. B. der Beitritt) wartet in dieser
  // Warteschlange, statt riskiert zu werden, bevor "SUBSCRIBED" feststeht.
  let verbunden = false;
  let warteschlange: SitzungsNachricht[] = [];

  const tatsaechlichSenden = (nachricht: SitzungsNachricht) => {
    void kanal.send({ type: 'broadcast', event: 'nachricht', payload: nachricht }).then((ergebnis) => {
      if (ergebnis !== 'ok') {
        onStatus?.('fehler', `Nachricht nicht zugestellt (${ergebnis}).`);
      }
    });
  };

  kanal
    .on('broadcast', { event: 'nachricht' }, ({ payload }) => {
      onNachricht(payload as SitzungsNachricht);
    })
    .subscribe((status, fehler) => {
      // SUBSCRIBED = verbunden. CHANNEL_ERROR/TIMED_OUT/CLOSED = fehlgeschlagen
      // oder abgebrochen - ohne diesen Callback blieb das komplett unsichtbar,
      // ein Beitritt hing dann stumm im Wartebereich fest.
      if (status === 'SUBSCRIBED') {
        verbunden = true;
        onStatus?.('verbunden');
        for (const nachricht of warteschlange) tatsaechlichSenden(nachricht);
        warteschlange = [];
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        onStatus?.('fehler', fehler?.message ?? `Verbindung ${status.toLowerCase()}.`);
      }
    });

  return {
    senden(nachricht) {
      if (verbunden) {
        tatsaechlichSenden(nachricht);
      } else {
        warteschlange.push(nachricht);
      }
    },
    schliessen() {
      void client.removeChannel(kanal);
    },
  };
};
