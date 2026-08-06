import { createContext } from 'react';
import type { Dispatch } from 'react';
import type { FunkSignalDaten, SitzungsNachricht } from '../net/protokoll';
import type { SimulationAction, SimulationState } from './reducer';

export type FunkSignalNachricht = Extract<SitzungsNachricht, { typ: 'funkSignal' }>;

/**
 * Laufender Zeitkosten-Timer (→ `state.zeitkostentimer`) - noch nicht
 * angewendete Aktion. `aktion` bleibt erhalten, damit ein einzelner Knopf
 * (→ `state.zeitkostenstatus`) erkennen kann, ob genau er es ist, der gerade
 * läuft - nicht nur, dass irgendetwas läuft.
 */
export interface Zeitkostentimer {
  aktion: SimulationAction;
  label: string;
  startMs: number;
  endeMs: number;
}

export interface SimulationContextWert {
  state: SimulationState;
  dispatch: Dispatch<SimulationAction>;
  zeitkostentimer: Zeitkostentimer | null;
  /**
   * Abonniert eingehende WebRTC-Signalisierung (→ `net.funksignal`), ohne den
   * Reducer zu berühren - gibt eine Abbestell-Funktion zurück.
   */
  aufFunkSignal: (hoerer: (nachricht: FunkSignalNachricht) => void) => () => void;
  /** Sendet Aushandlungsdaten gezielt an eine einzelne Person (→ `net.funksignal`). */
  sendeFunkSignal: (anId: string, daten: FunkSignalDaten) => void;
}

export const SimulationContext = createContext<SimulationContextWert | null>(null);
