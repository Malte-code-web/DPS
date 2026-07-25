import { KATEGORIE_LABEL, MASSNAHMEN_LISTE } from '../domain/massnahmen';
import type { MassnahmeId, MassnahmenKategorie, Patient } from '../domain/types';

const KATEGORIEN: MassnahmenKategorie[] = ['A', 'B', 'C', 'D', 'E'];

interface Props {
  patient: Patient;
  onMassnahme: (massnahmeId: MassnahmeId) => void;
}

export function Massnahmenliste({ patient, onMassnahme }: Props) {
  const gesperrt = patient.status === 'verstorben' || patient.status === 'transportiert';

  return (
    <div className="massnahmen">
      {KATEGORIEN.map((kategorie) => (
        <div key={kategorie} className="massnahmen-gruppe">
          <h4>{KATEGORIE_LABEL[kategorie]}</h4>
          <div className="massnahmen-buttons">
            {MASSNAHMEN_LISTE.filter((massnahme) => massnahme.kategorie === kategorie).map(
              (massnahme) => {
                const bereitsDurchgefuehrt = patient.durchgefuehrteMassnahmen.includes(massnahme.id);
                return (
                  <button
                    key={massnahme.id}
                    type="button"
                    className={`massnahme${bereitsDurchgefuehrt ? ' massnahme-erledigt' : ''}`}
                    title={`${massnahme.hinweis} (${massnahme.dauerSek} s)`}
                    disabled={gesperrt || bereitsDurchgefuehrt}
                    onClick={() => onMassnahme(massnahme.id)}
                  >
                    {massnahme.label}
                    <small>{massnahme.dauerSek} s</small>
                  </button>
                );
              },
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
