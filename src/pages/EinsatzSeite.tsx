import { Abschnittsleiste } from '../components/Abschnittsleiste';
import { Einsatzleiste } from '../components/Einsatzleiste';
import { FahrzeugVerlegung } from '../components/FahrzeugVerlegung';
import { PatientKarte } from '../components/PatientKarte';
import { abschnittInfo } from '../domain/abschnitte';
import { FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import { formatStaerke, staerkemeldung } from '../domain/fuehrung';
import { monitorPrioritaet } from '../domain/monitor';
import { useSimulation } from '../state/useSimulation';
import { useMonitorAlarm } from '../state/useMonitorAlarm';
import { PatientSeite } from './PatientSeite';

/** @anker ui.einsatzseite Abschnittsliste oder Patientenseite */
export function EinsatzSeite() {
  const { state, dispatch } = useSimulation();
  const szenario = state.szenario;
  const ausgewaehlt = state.patienten.find(
    (patient) => patient.id === state.ausgewaehlterPatientId,
  );

  // Der Alarmton ist an den Aufenthaltsort gebunden: es zählt die höchste Stufe,
  // die im gerade gezeigten Abschnitt ansteht (→ `ui.monitoralarm`). Ein
  // kritischer Wert (rot) setzt sich gegen jeden gelben durch.
  const stufenImBereich = state.laufend
    ? state.patienten
        .filter((patient) => patient.abschnitt === state.ausgewaehlterAbschnitt)
        .map(monitorPrioritaet)
    : [];
  const alarmStufe = stufenImBereich.includes('hoch')
    ? 'hoch'
    : stufenImBereich.includes('mittel')
      ? 'mittel'
      : null;
  useMonitorAlarm(alarmStufe);

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
  const fahrzeuge = state.fahrzeuge.filter(
    (fahrzeug) => fahrzeug.abschnitt === state.ausgewaehlterAbschnitt,
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

          {state.fahrzeuge.length > 0 && (
            <section className="fahrzeugliste-abschnitt">
              <h2>Fahrzeuge in diesem Abschnitt ({fahrzeuge.length})</h2>
              {fahrzeuge.length === 0 ? (
                <p className="leerer-abschnitt">Zurzeit kein Fahrzeug in diesem Abschnitt.</p>
              ) : (
                <div className="fahrzeugkarten">
                  {fahrzeuge.map((fahrzeug) => {
                    const besatzungNamen = fahrzeug.besatzung
                      .map((id) => state.sitzung.spieler.find((s) => s.id === id)?.name)
                      .filter(Boolean)
                      .join(', ');
                    const staerke = staerkemeldung(fahrzeug.besatzung, state.sitzung.spieler);
                    return (
                      <article key={fahrzeug.id} className="fahrzeugkarte">
                        <h3>{FAHRZEUGTYP_INFO[fahrzeug.typ].label}</h3>
                        <p className="fahrzeug-staerke">Stärke {formatStaerke(staerke)}</p>
                        <p className="hinweis">{besatzungNamen || 'keine Besatzung'}</p>
                        <FahrzeugVerlegung fahrzeug={fahrzeug} />
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
