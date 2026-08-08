import { useState } from 'react';
import { Abschnittsleiste } from '../components/Abschnittsleiste';
import { DelegationBenachrichtigung } from '../components/DelegationBenachrichtigung';
import { Einsatzleiste } from '../components/Einsatzleiste';
import { FahrzeugVerlegung } from '../components/FahrzeugVerlegung';
import { KollegenanfrageBenachrichtigung } from '../components/KollegenanfrageBenachrichtigung';
import { PatientKarte } from '../components/PatientKarte';
import { Sprechfunk } from '../components/Sprechfunk';
import { abschnittInfo } from '../domain/abschnitte';
import { FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import { formatStaerke, istRegiefuehrend, istZugfuehrend, staerkemeldung } from '../domain/fuehrung';
import { BESTUECKUNG, MATERIAL_LABEL } from '../domain/material';
import { monitorPrioritaet } from '../domain/monitor';
import { useSimulation } from '../state/useSimulation';
import { useMonitorAlarm } from '../state/useMonitorAlarm';
import { GesamtlagebildSeite } from './GesamtlagebildSeite';
import { PatientSeite } from './PatientSeite';
import { ZugfuehrerSeite } from './ZugfuehrerSeite';
import type { Einsatzabschnitt, MaterialTyp } from '../domain/types';

/** @anker ui.einsatzseite Gesamtlagebild (Regie), Zugführer-Übersicht, Abschnittsliste oder Patientenseite */
export function EinsatzSeite() {
  const { state, dispatch } = useSimulation();
  const szenario = state.szenario;
  const ausgewaehlt = state.patienten.find(
    (patient) => patient.id === state.ausgewaehlterPatientId,
  );
  const regiefuehrend = istRegiefuehrend(state.sitzung.rolle);
  const eigeneFuehrungsrolle = state.sitzung.spieler.find(
    (spieler) => spieler.id === state.sitzung.eigeneId,
  )?.fuehrungsrolle;
  const zugfuehrend = istZugfuehrend(state.sitzung.rolle, eigeneFuehrungsrolle);
  // Für Regie und Zugführer: Startbildschirm ist eine Übersicht
  // (→ `ui.gesamtlagebild`, `ui.zugfuehrerseite`), ein Abschnitt-Kärtchen
  // wechselt in die gewohnte Detailsicht darunter. Andere Spieler kennen
  // diese Umschaltung nicht.
  const [uebersicht, setUebersicht] = useState(true);
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
      <KollegenanfrageBenachrichtigung />
      <Sprechfunk />

      {!ausgewaehlt && regiefuehrend && uebersicht ? (
        <GesamtlagebildSeite
          onAbschnittWaehlen={(zielAbschnitt: Einsatzabschnitt) => {
            dispatch({ typ: 'abschnittWaehlen', abschnitt: zielAbschnitt });
            setUebersicht(false);
          }}
        />
      ) : !ausgewaehlt && zugfuehrend && uebersicht ? (
        <ZugfuehrerSeite
          onAbschnittWaehlen={(zielAbschnitt: Einsatzabschnitt) => {
            dispatch({ typ: 'abschnittWaehlen', abschnitt: zielAbschnitt });
            setUebersicht(false);
          }}
        />
      ) : ausgewaehlt ? (
        // key: beim Wechsel des Patienten wieder mit der Einstiegsansicht beginnen
        <PatientSeite key={ausgewaehlt.id} patient={ausgewaehlt} />
      ) : (
        <>
          {(regiefuehrend || zugfuehrend) && (
            <button type="button" className="zurueck-gesamtlagebild" onClick={() => setUebersicht(true)}>
              &larr; {regiefuehrend ? 'Gesamtlagebild' : 'Übersicht'}
            </button>
          )}
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
                        <h3>
                          {FAHRZEUGTYP_INFO[fahrzeug.typ].label}
                          {fahrzeug.ausgefallen && (
                            <span className="fahrzeug-ausgefallen-marke" title="Als ausgefallen gemeldet">
                              ausgefallen
                            </span>
                          )}
                        </h3>
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
