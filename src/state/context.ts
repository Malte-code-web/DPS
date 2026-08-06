import { createContext } from 'react';
import type { Dispatch } from 'react';
import type { SimulationAction, SimulationState } from './reducer';

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
}

export const SimulationContext = createContext<SimulationContextWert | null>(null);
