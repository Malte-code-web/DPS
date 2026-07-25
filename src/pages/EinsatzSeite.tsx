import { Einsatzleiste } from '../components/Einsatzleiste';
import { PatientKarte } from '../components/PatientKarte';
import { Patientendetail } from '../components/Patientendetail';
import { findeSzenario } from '../domain/szenarien';
import { useSimulation } from '../state/useSimulation';

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

      <div className="einsatz-inhalt">
        <section className="patientenliste">
          <h2>Schadensstelle</h2>
          <div className="patienten-raster">
            {state.patienten.map((patient) => (
              <PatientKarte
                key={patient.id}
                patient={patient}
                aktiv={patient.id === state.ausgewaehlterPatientId}
                onAuswahl={(patientId) => dispatch({ typ: 'patientWaehlen', patientId })}
              />
            ))}
          </div>
        </section>

        {ausgewaehlt ? (
          <Patientendetail patient={ausgewaehlt} />
        ) : (
          <aside className="detail detail-leer">
            <p className="hinweis">
              Patient auswählen, um zu untersuchen, zu sichten und Maßnahmen durchzufuehren.
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}
