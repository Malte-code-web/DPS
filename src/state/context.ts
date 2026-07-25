import { createContext } from 'react';
import type { Dispatch } from 'react';
import type { SimulationAction, SimulationState } from './reducer';

export interface SimulationContextWert {
  state: SimulationState;
  dispatch: Dispatch<SimulationAction>;
}

export const SimulationContext = createContext<SimulationContextWert | null>(null);
