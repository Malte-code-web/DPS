import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Patient } from '../../domain/types';

interface Props {
  patient: Patient;
  titel: string;
  /** Kurzer Stand, z. B. "01:00 erhoben" - steht neben dem Titel. */
  marke?: string;
  onSchliessen: () => void;
  children: ReactNode;
}

/**
 * @anker ui.bereichsseite Diagnostik, Maßnahmen und Verlegung als eigene Seite
 *
 * Die Übersicht soll auf einen Bildschirm passen. Alles, was dafür zu lang ist
 * - der Katalog mit 51 Maßnahmen, die Befundtafel, das Protokoll -, bekommt
 * deshalb eine eigene Seite statt eines aufklappenden Blocks darunter.
 *
 * Der Kopf bleibt stehen, gescrollt wird nur der Inhalt. Escape und der Knopf
 * "Zurück" führen zur Karte. Die Simulationsuhr läuft dabei weiter: eine
 * geöffnete Seite ist keine Pause.
 */
export function Bereichsseite({ patient, titel, marke, onSchliessen, children }: Props) {
  // Escape schließt die Bereichsseite - nicht die Patientenseite darunter.
  useEffect(() => {
    const beiTaste = (ereignis: KeyboardEvent) => {
      if (ereignis.key !== 'Escape') return;
      ereignis.stopPropagation();
      onSchliessen();
    };
    window.addEventListener('keydown', beiTaste, true);
    return () => window.removeEventListener('keydown', beiTaste, true);
  }, [onSchliessen]);

  return (
    <div className="bereichsseite" role="dialog" aria-label={`${titel} – ${patient.name}`}>
      <header className="bereichsseite-kopf">
        <button type="button" onClick={onSchliessen}>
          &larr; Zurück
        </button>
        <div className="bereichsseite-titel">
          <h2>{titel}</h2>
          <span>
            {patient.id} · {patient.name}
            {marke && ` · ${marke}`}
          </span>
        </div>
      </header>
      <div className="bereichsseite-inhalt">{children}</div>
    </div>
  );
}
