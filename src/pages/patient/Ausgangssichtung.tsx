import { Massnahmenuebersicht } from '../../components/Massnahmenuebersicht';
import { Sichtungsauswahl } from '../../components/Sichtungsauswahl';
import { Verlegung } from '../../components/Verlegung';
import { Vitalmonitor } from '../../components/Vitalmonitor';
import { SCHNELLE_MASSNAHMEN } from '../../domain/massnahmen';
import { aktiveProbleme } from '../../domain/simulation';
import { zeitFormat } from '../../lib/format';
import { useSimulation } from '../../state/useSimulation';
import type { Patient } from '../../domain/types';

/**
 * @anker ui.ausgangssichtung Übergabe, schnelle Maßnahmen, Abschlusssichtung
 *
 * Ausgangssichtung und Transportorganisation: alles Bekannte auf einen Blick,
 * kurze Maßnahmen für den Transport und die abschließende Sichtungskategorie,
 * die zugleich die Transportpriorität festlegt.
 */
export function Ausgangssichtung({ patient }: { patient: Patient }) {
  const { state, dispatch } = useSimulation();
  const offeneProbleme = aktiveProbleme(patient, state.zeitSek);
  const gesperrt = patient.status === 'verstorben' || patient.status === 'transportiert';

  return (
    <div className="stufe stufe-erst">
      <section className="karte karte-eindruck">
        <h3>Übergabe</h3>
        <p className="detail-befund">{patient.kurzbefund}</p>
        {patient.untersucht ? (
          <>
            <p className="detail-befund">{patient.untersuchungsbefund}</p>
            <Vitalmonitor vitalwerte={patient.vitalwerte} />
          </>
        ) : (
          <p className="hinweis">Der Patient wurde bisher nicht körperlich untersucht.</p>
        )}
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
      </section>

      <section className="karte karte-massnahmen">
        <h3>Bisheriger Verlauf</h3>
        <Massnahmenuebersicht patient={patient} />

        <h3>Schnelle Maßnahmen</h3>
        <div className="gruppe-inhalt gruppe-inhalt-frei">
          {SCHNELLE_MASSNAHMEN.map((massnahme) => {
            const erledigt = patient.durchgefuehrteMassnahmen.includes(massnahme.id);
            return (
              <button
                key={massnahme.id}
                type="button"
                className={`massnahme${erledigt ? ' massnahme-erledigt' : ''}`}
                disabled={gesperrt || erledigt}
                onClick={() =>
                  dispatch({
                    typ: 'massnahmeDurchfuehren',
                    patientId: patient.id,
                    massnahmeId: massnahme.id,
                  })
                }
              >
                <span className="massnahme-label">{massnahme.label}</span>
                <span className="massnahme-dauer">
                  {erledigt ? 'durchgeführt' : `${massnahme.dauerSek} s`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="karte karte-sichtung">
        <h3>Abschlusssichtung</h3>
        <Sichtungsauswahl patient={patient} />
        <h3>Transport</h3>
        <Verlegung patient={patient} />
      </section>

      <section className="karte karte-voll">
        <h3>Verlaufsprotokoll</h3>
        <ul className="protokoll">
          {patient.verlauf.map((eintrag, index) => (
            <li key={`${eintrag.zeitSek}-${index}`}>
              <time>{zeitFormat(eintrag.zeitSek)}</time>
              <span>{eintrag.text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
