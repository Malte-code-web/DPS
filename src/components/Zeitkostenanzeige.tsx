import { useEffect, useState } from 'react';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.zeitkostenanzeige Laufender Zeitkosten-Timer sperrt die Bedienung
 *
 * Zeitkosten laufen inzwischen als echter Countdown bei der Handlung selbst
 * ab (→ `state.zeitkosten`), nicht mehr als sofortiger Sprung der Einsatzuhr.
 * Dieses Overlay macht die Sperre sichtbar: Solange der Timer läuft, ist die
 * handelnde Person ausgelastet und kann nichts anderes anstoßen - deckt
 * deshalb die gesamte Bedienfläche unterhalb der Einsatzleiste ab, ähnlich
 * platziert wie die Verbindungsfehler-Meldung und die
 * Delegationsbenachrichtigung.
 */
export function Zeitkostenanzeige() {
  const { zeitkostentimer } = useSimulation();
  const [jetzt, setJetzt] = useState(() => Date.now());

  useEffect(() => {
    if (!zeitkostentimer) return;
    setJetzt(Date.now());
    const intervall = setInterval(() => setJetzt(Date.now()), 200);
    return () => clearInterval(intervall);
  }, [zeitkostentimer]);

  if (!zeitkostentimer) return null;

  const restSek = Math.max(0, Math.ceil((zeitkostentimer.endeMs - jetzt) / 1000));
  const gesamtSek = Math.max(1, Math.round((zeitkostentimer.endeMs - zeitkostentimer.startMs) / 1000));
  const anteil = Math.min(1, Math.max(0, 1 - restSek / gesamtSek));

  return (
    <div className="zeitkosten-sperre" role="alert" aria-live="polite">
      <div className="zeitkosten-anzeige">
        <p className="zeitkosten-titel">
          <strong>{zeitkostentimer.label}</strong> läuft - noch {restSek} s
        </p>
        <div className="zeitkosten-balken">
          <div className="zeitkosten-balken-fuellung" style={{ width: `${anteil * 100}%` }} />
        </div>
        <p className="hinweis hinweis-knapp">
          Solange läuft nichts anderes - erst abwarten, bis die Handlung abgeschlossen ist.
        </p>
      </div>
    </div>
  );
}
