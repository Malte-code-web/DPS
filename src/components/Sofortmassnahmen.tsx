import { SOFORTMASSNAHMEN } from '../domain/massnahmen';
import type { MassnahmeId, Patient } from '../domain/types';

interface Props {
  patient: Patient;
  onMassnahme: (massnahmeId: MassnahmeId) => void;
}

/**
 * Die beiden Handgriffe, die während der Vorsichtung erlaubt sind: kritische
 * Blutung stillen und Atemweg freimachen. Bewusst gross und mit wenigen
 * Optionen - sie müssen in Sekunden auswählbar sein.
 */
export function Sofortmassnahmen({ patient, onMassnahme }: Props) {
  const gesperrt = patient.status === 'verstorben' || patient.status === 'transportiert';

  return (
    <div className="sofort-gruppen">
      {SOFORTMASSNAHMEN.map((gruppe) => (
        <div key={gruppe.titel} className="sofort-gruppe">
          <h4>{gruppe.titel}</h4>
          <p className="sofort-frage">{gruppe.frage}</p>
          <div className="sofort-buttons">
            {gruppe.massnahmen.map((massnahme) => {
              const erledigt = patient.durchgefuehrteMassnahmen.includes(massnahme.id);
              return (
                <button
                  key={massnahme.id}
                  type="button"
                  className={`sofort-button${erledigt ? ' sofort-button-erledigt' : ''}`}
                  disabled={gesperrt || erledigt}
                  title={massnahme.hinweis}
                  onClick={() => onMassnahme(massnahme.id)}
                >
                  <span className="sofort-label">{massnahme.label}</span>
                  <span className="sofort-dauer">
                    {erledigt ? 'durchgeführt' : `${massnahme.dauerSek} s`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
