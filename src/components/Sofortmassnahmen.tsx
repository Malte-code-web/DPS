import {
  QUALIFIKATION_LABEL,
  SOFORTMASSNAHMEN,
  fehlendeVoraussetzung,
  voraussetzungKurz,
} from '../domain/massnahmen';
import { massnahmeGesperrtWegenQualifikation } from '../domain/qualifikation';
import { useSimulation } from '../state/useSimulation';
import type { MassnahmeId, Patient } from '../domain/types';

interface Props {
  patient: Patient;
  onMassnahme: (massnahmeId: MassnahmeId) => void;
}

/**
 * @anker ui.sofortmassnahmen Lebensrettende Griffe, dauerhaft in der Übersicht
 *
 * Solange der Patient an der Schadensstelle liegt, stehen die lebensrettenden
 * Sofortmaßnahmen direkt in der Übersicht - nicht hinter einem Knopf. Kritische
 * Blutung, Mundraumkontrolle, Atemweg, Beatmung: der Griff, der zählt, muss
 * ohne Umweg erreichbar sein.
 *
 * Die Mundraumkontrolle steht bewusst mit dabei. Ohne sie wirkt keine
 * Atemwegssicherung - der Tubus sitzt zwar, aber solange niemand nachgesehen
 * hat, ob und womit der Atemweg verlegt ist, bleibt die Maßnahme wirkungslos
 * (→ `sim.effektnurbeiproblem`).
 */
export function Sofortmassnahmen({ patient, onMassnahme }: Props) {
  const { state } = useSimulation();
  const gesperrt = patient.status === 'verstorben' || patient.status === 'transportiert';
  const eigeneQualifikation = state.sitzung.aktiv
    ? (state.sitzung.spieler.find((s) => s.id === state.sitzung.eigeneId)?.qualifikation ?? 'basis')
    : null;

  return (
    <section className="sofortmassnahmen" aria-label="Lebensrettende Sofortmaßnahmen">
      <h2 className="sofort-titel">Sofortmaßnahmen</h2>
      <div className="sofort-liste">
        {SOFORTMASSNAHMEN.map((massnahme) => {
          const erledigt = patient.durchgefuehrteMassnahmen.includes(massnahme.id);
          const fehlt = fehlendeVoraussetzung(massnahme, patient.durchgefuehrteMassnahmen);
          const delegiert = patient.delegierteMassnahmen.includes(massnahme.id);
          const qualifikationFehlt = massnahmeGesperrtWegenQualifikation(
            massnahme.qualifikation,
            eigeneQualifikation,
            delegiert,
          );

          return (
            <button
              key={massnahme.id}
              type="button"
              className={`sofort-knopf massnahme-${massnahme.art}${
                erledigt ? ' massnahme-erledigt' : ''
              }`}
              disabled={gesperrt || erledigt || fehlt !== null || qualifikationFehlt}
              onClick={() => onMassnahme(massnahme.id)}
            >
              <span className="sofort-label">{massnahme.label}</span>
              <span className="sofort-marke">
                {erledigt
                  ? 'erledigt'
                  : fehlt
                    ? voraussetzungKurz(fehlt)
                    : qualifikationFehlt
                      ? `erfordert ${QUALIFIKATION_LABEL[massnahme.qualifikation]}`
                      : `${massnahme.dauerSek} s`}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
