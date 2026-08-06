import { useState } from 'react';
import { Abschnittsleiste } from '../components/Abschnittsleiste';
import { DelegationBenachrichtigung } from '../components/DelegationBenachrichtigung';
import { Einsatzleiste } from '../components/Einsatzleiste';
import { FahrzeugVerlegung } from '../components/FahrzeugVerlegung';
import { PatientKarte } from '../components/PatientKarte';
import { abschnittInfo } from '../domain/abschnitte';
import { FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import { formatStaerke, staerkemeldung } from '../domain/fuehrung';
import { BESTUECKUNG, MATERIAL_LABEL } from '../domain/material';
import { monitorPrioritaet } from '../domain/monitor';
import { useSimulation } from '../state/useSimulation';
import { useMonitorAlarm } from '../state/useMonitorAlarm';
import { PatientSeite } from './PatientSeite';
import type { MaterialTyp } from '../domain/types';

/** @anker ui.einsatzseite Abschnittsliste oder Patientenseite */
export function EinsatzSeite() {
  const { state, dispatch } = useSimulation();
  const szenario = state.szenario;
  const ausgewaehlt = state.patienten.find(
    (patient) => patient.id === state.ausgewaehlterPatientId,
  );
  const [materialOffen, setMaterialOffen] = useState<Set<string>>(() => new Set());
  const materialUmschalten = (fahrzeugId: string) =>
    setMaterialOffen((bisher) => {
      const naechste = new Set(bisher);
      if (naechste.has(fahrzeugId)) {
        naechste.delete(fahrzeugId);
      } else {
        naechste.add(fahrzeugId);
      }
      return naechste;
    });

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

      {state.sitzung.verbindungsfehler && (
        <p className="hinweis hinweis-fehler hinweis-verbindung" role="alert">
          Verbindung gestört: {state.sitzung.verbindungsfehler} Prüfe die Internetverbindung - die
          Seite versucht es weiter im Hintergrund.
        </p>
      )}

      <DelegationBenachrichtigung />

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
                    const sollMaterial = BESTUECKUNG[fahrzeug.typ];
                    const sollGesamt = Object.values(sollMaterial).reduce(
                      (summe, menge) => summe + menge,
                      0,
                    );
                    const istGesamt = Object.values(fahrzeug.material).reduce(
                      (summe, menge) => summe + (menge ?? 0),
                      0,
                    );
                    const materialDetailOffen = materialOffen.has(fahrzeug.id);
                    return (
                      <article key={fahrzeug.id} className="fahrzeugkarte">
                        <h3>{FAHRZEUGTYP_INFO[fahrzeug.typ].label}</h3>
                        <p className="fahrzeug-staerke">Stärke {formatStaerke(staerke)}</p>
                        <p className="hinweis">{besatzungNamen || 'keine Besatzung'}</p>
                        {sollGesamt > 0 && (
                          <>
                            <button
                              type="button"
                              className="fahrzeug-material-knopf"
                              aria-expanded={materialDetailOffen}
                              onClick={() => materialUmschalten(fahrzeug.id)}
                            >
                              Material: {istGesamt} von {sollGesamt} Posten
                            </button>
                            {materialDetailOffen && (
                              <dl className="fahrzeug-material-detail">
                                {(Object.entries(sollMaterial) as [MaterialTyp, number][]).map(
                                  ([typ, soll]) => (
                                    <div key={typ}>
                                      <dt>{MATERIAL_LABEL[typ]}</dt>
                                      <dd>
                                        {fahrzeug.material[typ] ?? 0} / {soll}
                                      </dd>
                                    </div>
                                  ),
                                )}
                              </dl>
                            )}
                          </>
                        )}
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
