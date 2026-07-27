import type { SitzungsNachricht } from './protokoll';

/**
 * @anker net.transport Austauschbarer Kanal für eine Sitzung
 *
 * Die eine Schnittstelle, hinter der sich alles Netz versteckt: lokal über
 * `BroadcastChannel` (Multi-Tab, für Tests) oder später Supabase Realtime
 * (echtes Cross-Device). Der Provider kennt nur diese Schnittstelle.
 */
export interface Sitzungstransport {
  senden(nachricht: SitzungsNachricht): void;
  schliessen(): void;
}

/** Baut einen Transport für einen Beitrittscode und meldet eingehende Nachrichten. */
export type TransportFabrik = (
  code: string,
  onNachricht: (nachricht: SitzungsNachricht) => void,
) => Sitzungstransport;
