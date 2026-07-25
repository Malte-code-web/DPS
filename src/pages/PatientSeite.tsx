import { useEffect } from 'react';
import { Massnahmenliste } from '../components/Massnahmenliste';
import { MstartAssistent } from '../components/MstartAssistent';
import { SichtungsBadge } from '../components/SichtungsBadge';
import { Vitalmonitor } from '../components/Vitalmonitor';
import { aktiveProbleme } from '../domain/simulation';
import { SICHTUNGSKATEGORIEN } from '../domain/types';
import { zeitFormat } from '../lib/format';
import { useSimulation } from '../state/useSimulation';
import type { Patient, Sichtungskategorie } from '../domain/types';

const SICHTUNGSAUSWAHL: Sichtungskategorie[] = ['SK1', 'SK2', 'SK3', 'SK4'];

/**
 * Vollflaechige Patientenseite: alles, was am einzelnen Patienten getan wird,
 * ohne dass die Einsatzuhr im Kopf der Seite verschwindet.
 */
export function PatientSeite({ patient }: { patient: Patient }) {
  const { state, dispatch } = useSimulation();
  const offeneProbleme = aktiveProbleme(patient, state.zeitSek);
  const geloesteProbleme = patient.probleme.filter((problem) =>
    patient.behandelteProbleme.includes(problem.id),
  );
  const verstorben = patient.status === 'verstorben';
  const randKlasse = verstorben
    ? 'rand-EX'
    : patient.gesichtetAls
      ? `rand-${patient.gesichtetAls}`
      : 'rand-offen';

  const position = state.patienten.findIndex((eintrag) => eintrag.id === patient.id);
  const vorheriger = state.patienten[position - 1];
  const naechster = state.patienten[position + 1];

  const zurueck = () => dispatch({ typ: 'patientWaehlen', patientId: null });

  // Escape fuehrt zurueck zur Schadensstelle - im Einsatz zaehlt jeder Griff.
  useEffect(() => {
    const beiTaste = (ereignis: KeyboardEvent) => {
      if (ereignis.key === 'Escape') {
        dispatch({ typ: 'patientWaehlen', patientId: null });
      }
    };
    window.addEventListener('keydown', beiTaste);
    return () => window.removeEventListener('keydown', beiTaste);
  }, [dispatch]);

  return (
    <div className="patientseite">
      <nav className="patientseite-nav">
        <button type="button" onClick={zurueck}>
          &larr; Zurück zur Schadensstelle
        </button>
        <div className="patientseite-blaettern">
          <button
            type="button"
            disabled={!vorheriger}
            title={vorheriger ? `${vorheriger.id} ${vorheriger.name}` : undefined}
            onClick={() =>
              vorheriger && dispatch({ typ: 'patientWaehlen', patientId: vorheriger.id })
            }
          >
            &larr; Vorheriger
          </button>
          <span className="patientseite-zaehler">
            {position + 1} von {state.patienten.length}
          </span>
          <button
            type="button"
            disabled={!naechster}
            title={naechster ? `${naechster.id} ${naechster.name}` : undefined}
            onClick={() =>
              naechster && dispatch({ typ: 'patientWaehlen', patientId: naechster.id })
            }
          >
            Nächster &rarr;
          </button>
        </div>
      </nav>

      <header
        className={`patientseite-kopf ${randKlasse}${
          verstorben ? ' patientseite-kopf-verstorben' : ''
        }`}
      >
        <div>
          <span className="patient-id">{patient.id}</span>
          <h2>
            {patient.name}, {patient.alter} J. ({patient.geschlecht})
          </h2>
          <p className="detail-befund">{patient.kurzbefund}</p>
        </div>
        {verstorben ? (
          <SichtungsBadge kategorie="EX" />
        ) : patient.gesichtetAls ? (
          <SichtungsBadge kategorie={patient.gesichtetAls} />
        ) : (
          <span className="sk-badge sk-offen">nicht gesichtet</span>
        )}
      </header>

      <div className="patientseite-raster">
        <section className="karte karte-befund">
          <h3>Befund</h3>
          {!patient.untersucht ? (
            <>
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
            </>
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

        <section className="karte karte-sichtung">
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
        </section>

        <section className="karte karte-massnahmen">
          <h3>Maßnahmen</h3>
          <Massnahmenliste
            patient={patient}
            onMassnahme={(massnahmeId) =>
              dispatch({ typ: 'massnahmeDurchfuehren', patientId: patient.id, massnahmeId })
            }
          />
          <button
            type="button"
            className="primaer"
            disabled={verstorben || patient.status === 'transportiert'}
            onClick={() => dispatch({ typ: 'patientTransportieren', patientId: patient.id })}
          >
            An Transport übergeben
          </button>
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
