import type { Spieler } from '../domain/sitzung';
import type { Schnappschuss, SimulationAction } from '../state/reducer';

/**
 * @anker net.protokoll Nachrichten zwischen Übungsleiter (Host) und Spielern
 *
 * Spieler senden `beitritt`/`verlassen` und ihre `aktion`; der Host verteilt den
 * `schnappschuss` des geteilten Zustands. Mehr braucht das host-autoritative
 * Modell nicht - die Domäne rechnet nur der Host.
 */
export type SitzungsNachricht =
  | { typ: 'beitritt'; spieler: Spieler; nachrichtId: string }
  | { typ: 'verlassen'; spielerId: string }
  | { typ: 'aktion'; aktion: SimulationAction; nachrichtId: string }
  | { typ: 'nachrichtBestaetigt'; nachrichtId: string }
  | { typ: 'schnappschuss'; schnappschuss: Schnappschuss };
