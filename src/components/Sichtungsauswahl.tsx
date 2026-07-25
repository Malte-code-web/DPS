import { SICHTUNGSKATEGORIEN } from '../domain/types';
import { useSimulation } from '../state/useSimulation';
import type { Patient, Sichtungskategorie } from '../domain/types';

const AUSWAHL: Sichtungskategorie[] = ['SK1', 'SK2', 'SK3', 'SK4'];

/** Vergabe der Sichtungskategorie - an jeder Sichtungsstelle dieselbe Auswahl. */
export function Sichtungsauswahl({ patient }: { patient: Patient }) {
  const { dispatch } = useSimulation();
  const verstorben = patient.status === 'verstorben';

  return (
    <div className="sichtung-buttons">
      {AUSWAHL.map((kategorie) => (
        <button
          key={kategorie}
          type="button"
          className={`sichtung-button sk-${kategorie}${
            patient.gesichtetAls === kategorie ? ' sichtung-gewaehlt' : ''
          }`}
          disabled={verstorben}
          onClick={() => dispatch({ typ: 'patientSichten', patientId: patient.id, kategorie })}
        >
          SK {SICHTUNGSKATEGORIEN[kategorie].kuerzel}
          <small>{SICHTUNGSKATEGORIEN[kategorie].bezeichnung}</small>
        </button>
      ))}
    </div>
  );
}
