import { useEffect, useState } from 'react';
import { useSimulation } from './useSimulation';
import type { CSSProperties } from 'react';
import type { SimulationAction } from './reducer';

export interface ZeitkostenStatus {
  /** Die gerade laufende Aktion - `null`, wenn niemand beschäftigt ist. */
  aktion: SimulationAction | null;
  restSek: number;
  anteil: number;
}

const RUHIG: ZeitkostenStatus = { aktion: null, restSek: 0, anteil: 0 };

/**
 * @anker state.zeitkostenstatus Live-Countdown des laufenden Zeitkosten-Timers
 *
 * Ein einziger `setInterval` pro Aufrufer, und der tickt nur, während
 * tatsächlich ein Timer läuft - nicht einer je Maßnahmen-Knopf auf der
 * Seite. Welcher Knopf konkret gerade läuft, entscheidet der Aufrufer selbst
 * durch einen Abgleich von `aktion` gegen die eigene Handlung
 * (→ `state.zeitkostenabgleich`, z. B. `istMassnahmeAktion`).
 */
export function useZeitkostenStatus(): ZeitkostenStatus {
  const { zeitkostentimer } = useSimulation();
  const endeMs = zeitkostentimer?.endeMs ?? null;
  const startMs = zeitkostentimer?.startMs ?? null;

  const [jetzt, setJetzt] = useState(() => Date.now());
  useEffect(() => {
    if (endeMs === null) return;
    setJetzt(Date.now());
    const intervall = setInterval(() => setJetzt(Date.now()), 200);
    return () => clearInterval(intervall);
  }, [endeMs]);

  if (!zeitkostentimer || endeMs === null || startMs === null) return RUHIG;

  const restSek = Math.max(0, Math.ceil((endeMs - jetzt) / 1000));
  const gesamtSek = Math.max(1, Math.round((endeMs - startMs) / 1000));
  const anteil = Math.min(1, Math.max(0, 1 - restSek / gesamtSek));
  return { aktion: zeitkostentimer.aktion, restSek, anteil };
}

/**
 * Füllstand als Knopf-Hintergrund statt eines eigenen Balken-Elements - läuft
 * dadurch in jedem bestehenden Knopf, ohne dessen Auszeichnung um ein
 * zusätzliches, absolut positioniertes Kind samt Stapelkontext zu erweitern.
 * Der Übergang zwischen den beiden Farbstopps bleibt hart (kein Verlauf):
 * Der Füllstand selbst wandert alle 200 ms weiter.
 */
export function zeitkostenHintergrund(anteil: number): CSSProperties {
  const prozent = `${Math.round(anteil * 100)}%`;
  return {
    background: `linear-gradient(to right, color-mix(in srgb, var(--akzent) 45%, var(--bg-panel-hoch)) ${prozent}, var(--bg-panel-hoch) ${prozent})`,
  };
}
