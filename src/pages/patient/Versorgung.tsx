import { Befundtafel } from '../../components/Befundtafel';
import { Massnahmenliste } from '../../components/Massnahmenliste';
import { Verlegung } from '../../components/Verlegung';
import { diagnostikZeitSek, istBekannt } from '../../domain/diagnostik';
import { aktiveProbleme } from '../../domain/simulation';
import { zeitFormat } from '../../lib/format';
import { useSimulation } from '../../state/useSimulation';
import type { MassnahmenKategorie, Patient } from '../../domain/types';

/**
 * In der Versorgung startet der Katalog eingeklappt. 51 Maßnahmen offen zu
 * zeigen hieß, dass alles andere aus dem Bild scrollte - die Gruppenköpfe mit
 * ihrem Zähler stehen weiterhin da, die Versuchung ist einen Klick entfernt.
 */
const OFFEN: MassnahmenKategorie[] = [];

interface Props {
  patient: Patient;
  /** Rückweg zur Ersteinschätzung - nur an der Schadensstelle vorhanden. */
  zurueck?: () => void;
  ueberschrift?: string;
}

/**
 * @anker ui.versorgung Diagnostik und Behandlung - in den Zelten und als zweite Stufe
 *
 * Zwei Spalten statt drei: links Befunde, rechts Maßnahmen. Die Diagnostik hat
 * keine eigene Spalte mehr - sie steckt in der Befundtafel, wo ein Tippen auf
 * den fehlenden Wert die passende Untersuchung startet (→ `ui.befundtafel`).
 *
 * Die Befunde nennen, was zu finden ist, nicht was zu tun ist. Was daraus folgt,
 * ist die Entscheidung des Übenden - die Anwendung sagt es ihm nicht.
 */
export function Versorgung({ patient, zurueck, ueberschrift = 'Befunde' }: Props) {
  const { state, dispatch } = useSimulation();
  const offeneProbleme = aktiveProbleme(patient, state.zeitSek);
  const geloesteProbleme = patient.probleme.filter((problem) =>
    patient.behandelteProbleme.includes(problem.id),
  );
  const koerperBekannt = istBekannt(patient, 'koerper');
  const erhoben = diagnostikZeitSek(patient);

  return (
    <div className="stufe">
      {zurueck && (
        <div className="versorgung-leiste">
          <button type="button" onClick={zurueck}>
            &larr; Ersteinschätzung
          </button>
        </div>
      )}

      <div className="patientseite-raster">
        <section className="karte karte-befund">
          <h3>
            {ueberschrift}
            {erhoben > 0 && <span className="karte-nebentitel">Diagnostik {zeitFormat(erhoben)}</span>}
          </h3>
          <p className="hinweis hinweis-knapp">
            Leeres Feld antippen, um den Wert zu erheben.
          </p>
          <Befundtafel
            patient={patient}
            onDiagnostik={(diagnostikId) =>
              dispatch({ typ: 'diagnostikDurchfuehren', patientId: patient.id, diagnostikId })
            }
          />

          {koerperBekannt ? (
            <>
              <p className="detail-befund">{patient.untersuchungsbefund}</p>
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
            </>
          ) : (
            <button
              type="button"
              className="bodycheck-knopf"
              disabled={patient.status === 'verstorben' || patient.status === 'transportiert'}
              onClick={() =>
                dispatch({
                  typ: 'diagnostikDurchfuehren',
                  patientId: patient.id,
                  diagnostikId: 'bodycheck',
                })
              }
            >
              <span>Bodycheck – Ganzkörperbefund erheben</span>
              <span className="massnahme-dauer">60 s</span>
            </button>
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
          <details>
            <summary>
              Verlaufsprotokoll
              <span className="karte-nebentitel">{patient.verlauf.length} Einträge</span>
            </summary>
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
          </details>
        </section>
      </div>
    </div>
  );
}
