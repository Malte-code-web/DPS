import { aktiveProbleme } from '../domain/simulation';
import { SICHTUNGSKATEGORIEN } from '../domain/types';
import { useSimulation } from '../state/useSimulation';
import { zeitFormat } from '../lib/format';
import { Massnahmenliste } from './Massnahmenliste';
import { MstartAssistent } from './MstartAssistent';
import { SichtungsBadge } from './SichtungsBadge';
import { Vitalmonitor } from './Vitalmonitor';
import type { Patient, Sichtungskategorie } from '../domain/types';

const SICHTUNGSAUSWAHL: Sichtungskategorie[] = ['SK1', 'SK2', 'SK3', 'SK4'];

export function Patientendetail({ patient }: { patient: Patient }) {
  const { state, dispatch } = useSimulation();
  const offeneProbleme = aktiveProbleme(patient, state.zeitSek);
  const geloesteProbleme = patient.probleme.filter((problem) =>
    patient.behandelteProbleme.includes(problem.id),
  );
  const verstorben = patient.status === 'verstorben';

  return (
    <aside className="detail">
      <header className="detail-kopf">
        <div>
          <span className="patient-id">{patient.id}</span>
          <h2>
            {patient.name}, {patient.alter} J. ({patient.geschlecht})
          </h2>
        </div>
        {verstorben ? (
          <SichtungsBadge kategorie="EX" />
        ) : patient.gesichtetAls ? (
          <SichtungsBadge kategorie={patient.gesichtetAls} />
        ) : (
          <span className="sk-badge sk-offen">nicht gesichtet</span>
        )}
      </header>

      <p className="detail-befund">{patient.kurzbefund}</p>

      {!patient.untersucht ? (
        <div className="detail-block">
          <p className="hinweis">
            Vitalparameter sind erst nach körperlicher Untersuchung verfügbar. Die Vorsichtung
            nach mSTaRT ist auch ohne Messwerte möglich.
          </p>
          <button
            type="button"
            className="primaer"
            onClick={() => dispatch({ typ: 'patientUntersuchen', patientId: patient.id })}
          >
            Patient untersuchen
          </button>
        </div>
      ) : (
        <div className="detail-block">
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
        </div>
      )}

      <div className="detail-block">
        <h3>Sichtungskategorie vergeben</h3>
        <div className="sichtung-buttons">
          {SICHTUNGSAUSWAHL.map((kategorie) => (
            <button
              key={kategorie}
              type="button"
              className={`sichtung-button sk-${kategorie}${
                patient.gesichtetAls === kategorie ? ' sichtung-gewaehlt' : ''
              }`}
              disabled={verstorben}
              title={SICHTUNGSKATEGORIEN[kategorie].behandlung}
              onClick={() => dispatch({ typ: 'patientSichten', patientId: patient.id, kategorie })}
            >
              SK {SICHTUNGSKATEGORIEN[kategorie].kuerzel}
              <small>{SICHTUNGSKATEGORIEN[kategorie].bezeichnung}</small>
            </button>
          ))}
        </div>
        <MstartAssistent patient={patient} />
      </div>

      <div className="detail-block">
        <h3>Maßnahmen</h3>
        <Massnahmenliste
          patient={patient}
          onMassnahme={(massnahmeId) =>
            dispatch({ typ: 'massnahmeDurchfuehren', patientId: patient.id, massnahmeId })
          }
        />
      </div>

      <div className="detail-block">
        <button
          type="button"
          className="primaer"
          disabled={verstorben || patient.status === 'transportiert'}
          onClick={() => dispatch({ typ: 'patientTransportieren', patientId: patient.id })}
        >
          An Transport übergeben
        </button>
      </div>

      <div className="detail-block">
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
      </div>
    </aside>
  );
}
