import { use } from 'react';
import { SimulationContext } from './context';
import type { SimulationContextWert } from './context';

export function useSimulation(): SimulationContextWert {
  const wert = use(SimulationContext);
  if (!wert) {
    throw new Error('useSimulation muss innerhalb von <SimulationProvider> verwendet werden.');
  }
  return wert;
}
