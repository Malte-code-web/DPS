import { useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { ladeEigeneSzenarien, sichereEigeneSzenarien } from '../lib/speicher';
import { SimulationContext } from './context';
import { ANFANGSZUSTAND, simulationReducer } from './reducer';

/**
 * Taktrate der Simulationsuhr in Millisekunden (Echtzeit).
 * @anker state.uhr Der Taktgeber der laufenden Simulation
 */
const TAKT_MS = 500;

export function SimulationProvider({ children }: { children: ReactNode }) {
  // Eigene Szenarien liegen im Browser und werden beim Start eingelesen.
  const [state, dispatch] = useReducer(simulationReducer, ANFANGSZUSTAND, (basis) => ({
    ...basis,
    eigeneSzenarien: ladeEigeneSzenarien(),
  }));
  const { laufend, geschwindigkeit, phase } = state;

  useEffect(() => {
    if (!laufend || phase !== 'einsatz') return;
    const dtSek = (TAKT_MS / 1000) * geschwindigkeit;
    const timer = window.setInterval(() => dispatch({ typ: 'tick', dtSek }), TAKT_MS);
    return () => window.clearInterval(timer);
  }, [laufend, geschwindigkeit, phase]);

  useEffect(() => {
    sichereEigeneSzenarien(state.eigeneSzenarien);
  }, [state.eigeneSzenarien]);

  const wert = useMemo(() => ({ state, dispatch }), [state]);

  return <SimulationContext value={wert}>{children}</SimulationContext>;
}
