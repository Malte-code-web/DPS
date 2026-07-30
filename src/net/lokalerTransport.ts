import type { SitzungsNachricht } from './protokoll';
import type { TransportFabrik } from './sitzungstransport';

/**
 * @anker net.lokal Sitzungstransport über BroadcastChannel (ein Gerät)
 *
 * Verbindet mehrere Tabs desselben Browsers über einen nach dem Beitrittscode
 * benannten Kanal. Damit lässt sich der komplette Mehrspieler-Ablauf lokal
 * spielen und prüfen - ganz ohne Server. Cross-Device kommt später über den
 * Supabase-Transport hinter derselben Schnittstelle (→ `net.transport`).
 */
const PRAEFIX = 'dps-sitzung-';

export const erzeugeLokalenTransport: TransportFabrik = (code, onNachricht, onStatus) => {
  const kanal = new BroadcastChannel(PRAEFIX + code);
  const beiNachricht = (ereignis: MessageEvent) => {
    onNachricht(ereignis.data as SitzungsNachricht);
  };
  kanal.addEventListener('message', beiNachricht);
  // BroadcastChannel verbindet synchron ohne Handshake - sobald die
  // Konstruktion nicht geworfen hat, steht der Kanal.
  onStatus?.('verbunden');

  return {
    senden(nachricht) {
      kanal.postMessage(nachricht);
    },
    schliessen() {
      kanal.removeEventListener('message', beiNachricht);
      kanal.close();
    },
  };
};
