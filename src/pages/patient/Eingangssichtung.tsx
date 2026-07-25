import { Ersteindruck } from '../../components/Ersteindruck';
import { Massnahmenliste } from '../../components/Massnahmenliste';
import { Massnahmenuebersicht } from '../../components/Massnahmenuebersicht';
import { Sichtungsauswahl } from '../../components/Sichtungsauswahl';
import { Verlegung } from '../../components/Verlegung';
import { useSimulation } from '../../state/useSimulation';
import type { Patient } from '../../domain/types';

/**
 * Eingangssichtung des Behandlungsplatzes: Der Patient kommt mit einer
 * Vorsichtungskategorie an, wird erneut gesichtet und einem Zelt zugewiesen.
 *
 * Bewusst eine reine Sichtungsansicht - der Maßnahmenkatalog ist vorhanden,
 * aber vollständig eingeklappt.
 */
export function Eingangssichtung({ patient }: { patient: Patient }) {
  const { dispatch } = useSimulation();

  return (
    <div className="stufe stufe-erst">
      <section className="karte karte-eindruck">
        <h3>Erster Eindruck</h3>
        <Ersteindruck patient={patient} />
      </section>

      <section className="karte karte-massnahmen">
        <h3>Bisheriger Verlauf</h3>
        <Massnahmenuebersicht patient={patient} />
      </section>

      <section className="karte karte-sichtung">
        <h3>Eingangssichtung</h3>
        <Sichtungsauswahl patient={patient} />
        <h3>Zuweisung</h3>
        <Verlegung patient={patient} />
      </section>

      <section className="karte karte-voll">
        <h3>Maßnahmen</h3>
        <Massnahmenliste
          patient={patient}
          onMassnahme={(massnahmeId) =>
            dispatch({ typ: 'massnahmeDurchfuehren', patientId: patient.id, massnahmeId })
          }
        />
      </section>
    </div>
  );
}
