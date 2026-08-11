import type { Spieler } from '../domain/sitzung';
import type { Schnappschuss, SimulationAction } from '../state/reducer';

/**
 * @anker net.funksignal Aushandlungsdaten einer WebRTC-Verbindung
 *
 * Reine Verbindungsaushandlung zwischen genau zwei Teilnehmenden - kein
 * Spielzustand, läuft deshalb nie durch den Reducer (→ `state.sprechfunk`).
 */
export type FunkSignalDaten =
  | { art: 'angebot'; sdp: string }
  | { art: 'antwort'; sdp: string }
  | { art: 'icecandidate'; kandidat: RTCIceCandidateInit };

/**
 * @anker net.protokoll Nachrichten zwischen Übungsleiter (Host) und Spielern
 *
 * Spieler senden `beitritt`/`verlassen` und ihre `aktion`; der Host verteilt den
 * `schnappschuss` des geteilten Zustands. `funkSignal` ist die einzige
 * Nachricht, die nicht über den Host läuft, sondern direkt zwischen zwei
 * Teilnehmenden adressiert ist (→ `net.funksignal`) - der Transport selbst
 * kennt keine Adressierung (reiner Broadcast-Bus), `vonId`/`anId` filtert
 * jede Person selbst heraus.
 *
 * `schnappschussPuls` und `vollbildAnfordern` bilden zusammen die Reparatur
 * (→ `state.puls`): Der Host schlägt regelmäßig mit seiner aktuellen
 * Laufnummer an, wer zurückliegt meldet sich und bekommt ein Vollbild. Früher
 * wiederholte der Host stattdessen den kompletten Zustand im selben Takt -
 * dieselbe Reparatur, nur um ein Vielfaches teurer (→ `net.delta`).
 */
export type SitzungsNachricht =
  | { typ: 'beitritt'; spieler: Spieler; nachrichtId: string }
  | { typ: 'verlassen'; spielerId: string }
  | { typ: 'aktion'; aktion: SimulationAction; nachrichtId: string }
  | { typ: 'nachrichtBestaetigt'; nachrichtId: string }
  | { typ: 'schnappschuss'; schnappschuss: Schnappschuss }
  | { typ: 'schnappschussPuls'; folge: number }
  | { typ: 'vollbildAnfordern'; spielerId: string }
  | { typ: 'funkSignal'; vonId: string; anId: string; daten: FunkSignalDaten };
