import { useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { SimulationContext } from './context';
import { ANFANGSZUSTAND, simulationReducer } from './reducer';

/**
 * Taktrate der Simulationsuhr in Millisekunden (Echtzeit).
 * @anker state.uhr Der Taktgeber der laufenden Simulation
 */
const TAKT_MS = 500;

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(simulationReducer, ANFANGSZUSTAND);
  const { laufend, geschwindigkeit, phase } = state;

  useEffect(() => {
    if (!laufend || phase !== 'einsatz') return;
    const dtSek = (TAKT_MS / 1000) * geschwindigkeit;
    const timer = window.setInterval(() => dispatch({ typ: 'tick', dtSek }), TAKT_MS);
    return () => window.clearInterval(timer);
  }, [laufend, geschwindigkeit, phase]);

  const wert = useMemo(() => ({ state, dispatch }), [state]);

  return <SimulationContext value={wert}>{children}</SimulationContext>;
}
