import { Massnahmenliste } from '../../components/Massnahmenliste';
import { Verlegung } from '../../components/Verlegung';
import { Vitalmonitor } from '../../components/Vitalmonitor';
import {
  UNTERSUCHUNGSDAUER_SEK,
  aktiveProbleme,
  gebundeneZeitSek,
  individualmedizinZeitSek,
} from '../../domain/simulation';
import { zeitFormat } from '../../lib/format';
import { useSimulation } from '../../state/useSimulation';
import type { MassnahmenKategorie, Patient } from '../../domain/types';

const OFFEN: MassnahmenKategorie[] = ['x', 'A', 'B', 'C', 'D', 'E'];

interface Props {
  patient: Patient;
  /** Rückweg zur Ersteinschätzung - nur an der Schadensstelle vorhanden. */
  zurueck?: () => void;
  ueberschrift?: string;
}

/**
 * @anker ui.versorgung Diagnostik und Behandlung - in den Zelten und als zweite Stufe
 *
 * Diagnostik und Behandlung. An der Schadensstelle die zweite Stufe
 * ("Erweiterte Versorgung"), in den Zelten die reguläre Arbeitsansicht.
 */
export function Versorgung({ patient, zurueck, ueberschrift = 'Untersuchung' }: Props) {
  const { state, dispatch } = useSimulation();
  const offeneProbleme = aktiveProbleme(patient, state.zeitSek);
  const geloesteProbleme = patient.probleme.filter((problem) =>
    patient.behandelteProbleme.includes(problem.id),
  );
  const individualzeit = individualmedizinZeitSek(patient);
  const verstorben = patient.status === 'verstorben';

  return (
    <div className="stufe">
      <div className="versorgung-leiste">
        {zurueck ? (
          <button type="button" onClick={zurueck}>
            &larr; Ersteinschätzung
          </button>
        ) : (
          <span />
        )}
        <span className="zeitkonto">
          An diesem Patienten gebunden: <strong>{zeitFormat(gebundeneZeitSek(patient))}</strong>
          {individualzeit > 0 && <em> · davon {zeitFormat(individualzeit)} Individualmedizin</em>}
        </span>
      </div>

      <div className="patientseite-raster">
        <section className="karte karte-befund">
          <h3>{ueberschrift}</h3>
          {!patient.untersucht ? (
            <button
              type="button"
              className="primaer"
              disabled={verstorben}
              onClick={() => dispatch({ typ: 'patientUntersuchen', patientId: patient.id })}
            >
              Patient untersuchen
              <small>{UNTERSUCHUNGSDAUER_SEK} s</small>
            </button>
          ) : (
            <>
              <p className="detail-befund">{patient.untersuchungsbefund}</p>
              <Vitalmonitor vitalwerte={patient.vitalwerte} />
              {offeneProbleme.length > 0 && (
                <ul className="problemliste">
                  {offeneProbleme.map((problem) => (
                    <li key={problem.id}>
                      <strong>{problem.label}</strong>
                      <span>{problem.beschreibung}</span>
                    </li>
                  ))}
                </ul>
              )}
              {geloesteProbleme.length > 0 && (
                <ul className="problemliste problemliste-geloest">
                  {geloesteProbleme.map((problem) => (
                    <li key={problem.id}>
                      <strong>{problem.label}</strong>
                      <span>versorgt</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
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
          <h3>Verlegung</h3>
          <Verlegung patient={patient} />
        </section>

        <section className="karte karte-protokoll">
          <h3>Verlaufsprotokoll</h3>
          {patient.verlauf.length === 0 ? (
            <p className="hinweis">Noch keine Einträge.</p>
          ) : (
            <ul className="protokoll">
              {patient.verlauf.map((eintrag, index) => (
                <li key={`${eintrag.zeitSek}-${index}`}>
                  <time>{zeitFormat(eintrag.zeitSek)}</time>
                  <span>{eintrag.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
