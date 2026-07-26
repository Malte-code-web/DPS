import { Abschnittsleiste } from '../components/Abschnittsleiste';
import { Einsatzleiste } from '../components/Einsatzleiste';
import { PatientKarte } from '../components/PatientKarte';
import { abschnittInfo } from '../domain/abschnitte';
import { useSimulation } from '../state/useSimulation';
import { PatientSeite } from './PatientSeite';

/** @anker ui.einsatzseite Abschnittsliste oder Patientenseite */
export function EinsatzSeite() {
  const { state, dispatch } = useSimulation();
  const szenario = state.szenario;
  const ausgewaehlt = state.patienten.find(
    (patient) => patient.id === state.ausgewaehlterPatientId,
  );

  if (!szenario) {
    return (
      <main className="einsatz">
        <p className="hinweis">Kein Szenario geladen.</p>
      </main>
    );
  }

  const abschnitt = abschnittInfo(state.ausgewaehlterAbschnitt);
  const patienten = state.patienten.filter(
    (patient) => patient.abschnitt === state.ausgewaehlterAbschnitt,
  );

  return (
    <div className="einsatz">
      <Einsatzleiste szenario={szenario} />

      {ausgewaehlt ? (
        // key: beim Wechsel des Patienten wieder mit der Einstiegsansicht beginnen
        <PatientSeite key={ausgewaehlt.id} patient={ausgewaehlt} />
      ) : (
        <>
          <Abschnittsleiste />
          <section className="patientenliste">
            <h2>{abschnitt.name}</h2>
            <p className="hinweis">{abschnitt.aufgabe}</p>
            {patienten.length === 0 ? (
              <p className="leerer-abschnitt">Zurzeit kein Patient in diesem Abschnitt.</p>
            ) : (
              <div className="patienten-raster">
                {patienten.map((patient) => (
                  <PatientKarte
                    key={patient.id}
                    patient={patient}
                    onAuswahl={(patientId) => dispatch({ typ: 'patientWaehlen', patientId })}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
