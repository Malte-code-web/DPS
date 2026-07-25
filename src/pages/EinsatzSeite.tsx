import { Einsatzleiste } from '../components/Einsatzleiste';
import { PatientKarte } from '../components/PatientKarte';
import { findeSzenario } from '../domain/szenarien';
import { useSimulation } from '../state/useSimulation';
import { PatientSeite } from './PatientSeite';

export function EinsatzSeite() {
  const { state, dispatch } = useSimulation();
  const szenario = state.szenarioId ? findeSzenario(state.szenarioId) : undefined;
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

  return (
    <div className="einsatz">
      <Einsatzleiste szenario={szenario} />

      {ausgewaehlt ? (
        <PatientSeite patient={ausgewaehlt} />
      ) : (
        <section className="patientenliste">
          <h2>Schadensstelle</h2>
          <p className="hinweis">
            Patient auswählen, um ihn zu untersuchen, zu sichten und zu versorgen.
          </p>
          <div className="patienten-raster">
            {state.patienten.map((patient) => (
              <PatientKarte
                key={patient.id}
                patient={patient}
                onAuswahl={(patientId) => dispatch({ typ: 'patientWaehlen', patientId })}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
