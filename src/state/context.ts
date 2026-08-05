import { createContext } from 'react';
import type { Dispatch } from 'react';
import type { SimulationAction, SimulationState } from './reducer';

/** Laufender Zeitkosten-Timer (→ `state.zeitkostentimer`) - noch nicht angewendete Aktion. */
export interface Zeitkostentimer {
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
