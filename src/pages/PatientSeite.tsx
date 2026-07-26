import { useEffect } from 'react';
import { abschnittInfo } from '../domain/abschnitte';
import { useSimulation } from '../state/useSimulation';
import { Patientenansicht } from './patient/Patientenansicht';
import type { Patient } from '../domain/types';

/**
 * @anker ui.patientseite Rahmen der Patientenseite: Navigation und Blättern
 *
 * Die Ansicht selbst ist für alle Einsatzabschnitte dieselbe
 * (→ `ui.patientenansicht`); was sich unterscheidet, steht in der Domäne.
 */
export function PatientSeite({ patient }: { patient: Patient }) {
  const { state, dispatch } = useSimulation();

  const abschnitt = abschnittInfo(patient.abschnitt);

  // Nur Patienten desselben Abschnitts sind über die Blättern-Schaltflächen erreichbar.
  const nachbarn = state.patienten.filter(
    (eintrag) => eintrag.abschnitt === patient.abschnitt,
  );
  const position = nachbarn.findIndex((eintrag) => eintrag.id === patient.id);
  const vorheriger = nachbarn[position - 1];
  const naechster = nachbarn[position + 1];

  const zurueckZurListe = () => dispatch({ typ: 'patientWaehlen', patientId: null });

  // Escape führt zurück zur Liste des Abschnitts.
  useEffect(() => {
    const beiTaste = (ereignis: KeyboardEvent) => {
      if (ereignis.key === 'Escape') dispatch({ typ: 'patientWaehlen', patientId: null });
    };
    window.addEventListener('keydown', beiTaste);
    return () => window.removeEventListener('keydown', beiTaste);
  }, [dispatch]);

  return (
    <div className="patientseite">
      <nav className="patientseite-nav">
        <button type="button" onClick={zurueckZurListe}>
          &larr; {abschnitt.name}
        </button>
        <div className="patientseite-blaettern">
          <button
            type="button"
            disabled={!vorheriger}
            onClick={() =>
              vorheriger && dispatch({ typ: 'patientWaehlen', patientId: vorheriger.id })
            }
          >
            &larr; Vorheriger
          </button>
          <span className="patientseite-zaehler">
            {position + 1} von {nachbarn.length}
          </span>
          <button
            type="button"
            disabled={!naechster}
            onClick={() =>
              naechster && dispatch({ typ: 'patientWaehlen', patientId: naechster.id })
            }
          >
            Nächster &rarr;
          </button>
        </div>
      </nav>

      <Patientenansicht patient={patient} />
    </div>
  );
}
