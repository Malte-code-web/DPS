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
 *
 * Ein Websocket bricht ab, sobald ein mobiler Browser in den Hintergrund
 * geschoben wird (Betriebssystem drosselt oder kappt die Verbindung) - ohne
 * eigenes Zutun kommt hier nie wieder eine Nachricht an, auch nachdem das
 * Gerät zurück im Vordergrund ist. Deshalb baut dieser Transport die
 * Verbindung bei Abbruch selbst neu auf: mit steigender Wartezeit
 * (Exponential-Backoff) im Hintergrund, und sofort, sobald die Seite wieder
 * sichtbar wird (`visibilitychange`) - ohne auf den nächsten Backoff-Schritt
 * zu warten.
 */
const PRAEFIX = 'dps-sitzung-';

/** Obergrenze für den Backoff, damit ein dauerhafter Ausfall nicht zu selten neu versucht. */
const MAX_WARTEZEIT_MS = 15_000;

export const erzeugeSupabaseTransport: TransportFabrik = (code, onNachricht, onStatus) => {
  const client = supabase;
  if (!client) {
    throw new Error(
      'Supabase ist nicht konfiguriert (VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY fehlen).',
    );
  }

  let kanal: ReturnType<typeof client.channel> | null = null;
  // Der Kanal braucht einen Websocket-Handshake, bevor er zustellt - eine
  // Nachricht direkt nach der Erzeugung (z. B. der Beitritt) wartet in dieser
  // Warteschlange, statt riskiert zu werden, bevor "SUBSCRIBED" feststeht.
  // Dieselbe Warteschlange fängt auch Nachrichten während einer
  // Wiederverbindung auf.
  let verbunden = false;
  let geschlossen = false;
  let warteschlange: SitzungsNachricht[] = [];
  let wiederverbindungsVersuch = 0;
  let wiederverbindungsTimer: ReturnType<typeof setTimeout> | null = null;

  const tatsaechlichSenden = (nachricht: SitzungsNachricht) => {
    if (!kanal) return;
    void kanal.send({ type: 'broadcast', event: 'nachricht', payload: nachricht }).then((ergebnis) => {
      if (ergebnis !== 'ok') {
        onStatus?.('fehler', `Nachricht nicht zugestellt (${ergebnis}).`);
      }
    });
  };

  const wiederverbindungAbbrechen = () => {
    if (wiederverbindungsTimer !== null) {
      clearTimeout(wiederverbindungsTimer);
      wiederverbindungsTimer = null;
    }
  };

  const planeWiederverbindung = () => {
    if (geschlossen || wiederverbindungsTimer !== null) return;
    const wartezeit = Math.min(1000 * 2 ** wiederverbindungsVersuch, MAX_WARTEZEIT_MS);
    wiederverbindungsVersuch += 1;
    wiederverbindungsTimer = setTimeout(() => {
      wiederverbindungsTimer = null;
      verbinde();
    }, wartezeit);
  };

  const verbinde = () => {
    if (geschlossen) return;
    verbunden = false;
    if (kanal) {
      void client.removeChannel(kanal);
    }
    const neuerKanal = client.channel(PRAEFIX + code);
    kanal = neuerKanal;
    neuerKanal
      .on('broadcast', { event: 'nachricht' }, ({ payload }) => {
        onNachricht(payload as SitzungsNachricht);
      })
      .subscribe((status, fehler) => {
        // SUBSCRIBED = verbunden. CHANNEL_ERROR/TIMED_OUT/CLOSED = fehlgeschlagen
        // oder abgebrochen - ohne diesen Callback blieb das komplett unsichtbar,
        // ein Beitritt hing dann stumm im Wartebereich fest.
        if (geschlossen) return;
        if (status === 'SUBSCRIBED') {
          verbunden = true;
          wiederverbindungsVersuch = 0;
          wiederverbindungAbbrechen();
          onStatus?.('verbunden');
          for (const nachricht of warteschlange) tatsaechlichSenden(nachricht);
          warteschlange = [];
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          verbunden = false;
          onStatus?.('fehler', fehler?.message ?? `Verbindung ${status.toLowerCase()}.`);
          planeWiederverbindung();
        }
      });
  };

  verbinde();

  const beiSichtbarkeit = () => {
    if (document.visibilityState === 'visible' && !verbunden && !geschlossen) {
      wiederverbindungAbbrechen();
      verbinde();
    }
  };
  document.addEventListener('visibilitychange', beiSichtbarkeit);

  return {
    senden(nachricht) {
      if (verbunden) {
        tatsaechlichSenden(nachricht);
      } else {
        warteschlange.push(nachricht);
      }
    },
    schliessen() {
      geschlossen = true;
      wiederverbindungAbbrechen();
      document.removeEventListener('visibilitychange', beiSichtbarkeit);
      if (kanal) void client.removeChannel(kanal);
    },
  };
};
