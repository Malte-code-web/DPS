import { useEffect } from 'react';

/**
 * @anker ui.nachoben Jede neue Ansicht beginnt oben
 *
 * Ohne das behält der Browser die Scrollposition über einen Ansichtswechsel
 * hinweg bei - die App wechselt ihre Seiten über den Zustand
 * (→ `ui.app`, `ui.einsatzseite`), nicht über echte Navigation, sodass es auch
 * keine automatische Wiederherstellung gibt. Wer weit unten in einer langen
 * Liste stand und einen Patienten öffnete, landete mitten im Befund statt am
 * Kopf der Seite.
 *
 * `behavior: 'auto'` statt `'smooth'`: ein Ansichtswechsel soll sofort oben
 * sein, nicht scrollend hinfahren - das wäre bei jedem Wechsel eine
 * unnötige Bewegung und ginge gegen `prefers-reduced-motion`.
 *
 * @param schluessel Wechselt dieser Wert, wird nach oben gesprungen.
 */
export function useNachObenBeiWechsel(schluessel: unknown): void {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [schluessel]);
}
