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

/**
 * `verbunden`: Kanal steht und nimmt Nachrichten an. `fehler`: Verbindung
 * fehlgeschlagen oder abgebrochen (Netz, falscher/abgelaufener Code,
 * Supabase nicht erreichbar) - `meldung` ist für die Anzeige gedacht.
 */
export type TransportStatus = 'verbunden' | 'fehler';

/**
 * Baut einen Transport für einen Beitrittscode und meldet eingehende
 * Nachrichten. `onStatus` ist optional, damit einfache Test-Fabriken (die nie
 * fehlschlagen) ihn auslassen können - der lokale wie der Supabase-Transport
 * rufen ihn auf.
 */
export type TransportFabrik = (
  code: string,
  onNachricht: (nachricht: SitzungsNachricht) => void,
  onStatus?: (status: TransportStatus, meldung?: string) => void,
) => Sitzungstransport;
