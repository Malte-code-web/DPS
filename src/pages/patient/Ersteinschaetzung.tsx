import { Ersteindruck } from '../../components/Ersteindruck';
import { Massnahmenliste } from '../../components/Massnahmenliste';
import { Sichtungsauswahl } from '../../components/Sichtungsauswahl';
import { Verlegung } from '../../components/Verlegung';
import { useSimulation } from '../../state/useSimulation';
import type { MassnahmenKategorie, Patient } from '../../domain/types';

/** In der Vorsichtung sind nur die lebensrettenden Gruppen aufgeklappt. */
const OFFEN: MassnahmenKategorie[] = ['x', 'A'];

interface Props {
  patient: Patient;
  aufVersorgung: () => void;
  aufNaechsten: () => void;
  naechsterName: string | null;
}

/**
 * @anker ui.ersteinschaetzung Der schnelle Weg - und die Versuchung daneben
 *
 * Schadensstelle: erster Eindruck, Vorsichtung, lebensrettende Handgriffe.
 *
 * Der Maßnahmenkatalog steht vollständig zur Verfügung, aber nur x und A sind
 * offen. Der Weg in die Individualmedizin ist ein Klick auf eine Gruppe.
 */
export function Ersteinschaetzung({
  patient,
  aufVersorgung,
  aufNaechsten,
  naechsterName,
}: Props) {
  const { dispatch } = useSimulation();
  const gesichtet = patient.gesichtetAls !== null;

  return (
    <div className="stufe stufe-erst">
      <section className="karte karte-eindruck">
        <h3>Erster Eindruck</h3>
        <Ersteindruck patient={patient} />
      </section>

      <section className="karte karte-massnahmen">
        <h3>Maßnahmen</h3>
        <Massnahmenliste
          patient={patient}
          standardOffen={OFFEN}
          onMassnahme={(massnahmeId) =>
            dispatch({ typ: 'massnahmeDurchfuehren', patientId: patient.id, massnahmeId })
          }
        />
      </section>

      <section className="karte karte-sichtung">
        <h3>Vorsichtung</h3>
        <Sichtungsauswahl patient={patient} />
        <h3>Verlegung</h3>
        <Verlegung patient={patient} />
      </section>

      <div className="stufe-abschluss">
        {/* Erst nach vergebener Kategorie ist Weitergehen die richtige Hauptaktion. */}
        <button
          type="button"
          className={`weiter-button${gesichtet ? ' primaer' : ''}`}
          onClick={aufNaechsten}
        >
          {gesichtet ? 'Weiter zum nächsten Patienten' : 'Ohne Sichtung weitergehen'}
          <small>{naechsterName ?? 'zurück zur Übersicht'}</small>
        </button>

        <button type="button" className="verlockung" onClick={aufVersorgung}>
          Erweiterte Versorgung
        </button>
      </div>
    </div>
  );
}
