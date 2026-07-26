import { MASSNAHMEN } from '../domain/massnahmen';
import type { MassnahmeId, Patient } from '../domain/types';

/**
 * Die zwei lebensrettenden Sofortmaßnahmen, die auf der Patientenseite ganz
 * oben - ohne Umweg über die Maßnahmenliste - erreichbar sein sollen.
 */
const SOFORT_IDS: MassnahmeId[] = ['tourniquet', 'guedeltubus'];

/**
 * @anker ui.sofortmassnahmen Schnellzugriff auf Tourniquet und Wendeltubus
 *
 * Eigener Bereich oberhalb der Bereichswahl: beide Maßnahmen sind
 * lebensrettende Sofortmaßnahmen und sollen ohne das Öffnen der
 * Maßnahmenliste ausgelöst werden können.
 */
export function Sofortmassnahmen({
  patient,
  onMassnahme,
}: {
  patient: Patient;
  onMassnahme: (massnahmeId: MassnahmeId) => void;
}) {
  const gesperrt = patient.status === 'verstorben' || patient.status === 'transportiert';

  return (
    <div className="sofortmassnahmen">
      {SOFORT_IDS.map((id) => {
        const massnahme = MASSNAHMEN[id];
        const bereitsDurchgefuehrt = patient.durchgefuehrteMassnahmen.includes(id);

        return (
          <button
            key={id}
            type="button"
            className={`massnahme massnahme-${massnahme.art}${
              bereitsDurchgefuehrt ? ' massnahme-erledigt' : ''
            }`}
            disabled={gesperrt || bereitsDurchgefuehrt}
            onClick={() => onMassnahme(id)}
          >
            <span className="massnahme-label">{massnahme.label}</span>
            <span className="massnahme-dauer">
              {bereitsDurchgefuehrt ? 'durchgeführt' : `${massnahme.dauerSek} s`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
