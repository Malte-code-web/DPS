import { useState } from 'react';
import { istRegiefuehrend } from '../domain/fuehrung';
import { useSimulation } from '../state/useSimulation';

const GESCHWINDIGKEITEN = [1, 2, 4, 10];

/**
 * @anker ui.regiepanel Regie-Panel: Ablaufsteuerung + Freigabe verdeckter Patienten
 *
 * Nur für Übungsleitung und Beobachter (→ `domain.regiefuehrend`) - dieselbe
 * Toggle-Knopf-plus-Panel-Form wie der Sprechfunk (→ `ui.sprechfunk`), am
 * gegenüberliegenden unteren Rand, damit sich beide Panels nicht
 * überlappen. Bündelt zwei bislang getrennte Dinge: die Ablaufsteuerung
 * (Pause/Tempo/Einsatz beenden, vorher immer sichtbar in der Einsatzleiste)
 * und die Freigabe verdeckter Patienten (→ `modell.freigabemodus`) - bis
 * hierher gab es für Letztere trotz vollständigem Reducer noch gar keine
 * Bedienung. `verdeckt` taucht bewusst in keiner normalen Abschnittsleiste
 * auf (→ `abschnitte.liste`); dieses Panel ist der einzige Weg dorthin.
 */
export function RegiePanel() {
  const { state, dispatch } = useSimulation();
  const [offen, setOffen] = useState(false);

  if (!istRegiefuehrend(state.sitzung.rolle)) return null;

  const verdeckt = state.patienten.filter((patient) => patient.abschnitt === 'verdeckt');

  return (
    <>
      <button
        type="button"
        className="regie-panel-knopf"
        onClick={() => setOffen((bisher) => !bisher)}
        aria-expanded={offen}
      >
        Regie
        {verdeckt.length > 0 && (
          <span className="regie-panel-marke" aria-hidden="true">
            {verdeckt.length}
          </span>
        )}
      </button>

      {offen && (
        <div className="regie-panel" role="dialog" aria-label="Regie">
          <div className="regie-panel-kopf">
            <h2>Regie</h2>
            <button type="button" onClick={() => setOffen(false)} aria-label="Regie-Panel schließen">
              Schließen
            </button>
          </div>

          <section className="regie-abschnitt">
            <h3>Ablaufsteuerung</h3>
            <div className="regie-ablaufsteuerung">
              <button
                type="button"
                className="primaer"
                onClick={() => dispatch({ typ: 'pauseUmschalten' })}
              >
                {state.laufend ? 'Pause' : 'Weiter'}
              </button>
              <label>
                Tempo
                <select
                  value={state.geschwindigkeit}
                  onChange={(event) =>
                    dispatch({ typ: 'geschwindigkeitSetzen', wert: Number(event.target.value) })
                  }
                >
                  {GESCHWINDIGKEITEN.map((wert) => (
                    <option key={wert} value={wert}>
                      {wert}x
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => dispatch({ typ: 'einsatzBeenden' })}>
                Einsatz beenden
              </button>
            </div>
          </section>

          <section className="regie-abschnitt">
            <h3>Patientenfreigabe</h3>
            {state.freigabemodus === 'sofort' ? (
              <p className="hinweis hinweis-knapp">
                Freigabemodus „sofort" – alle Patienten waren von Beginn an sichtbar, keine Freigabe
                nötig.
              </p>
            ) : verdeckt.length === 0 ? (
              <p className="hinweis hinweis-knapp">Alle Patienten sind freigegeben.</p>
            ) : (
              <ul className="regie-freigabeliste">
                {verdeckt.map((patient) => (
                  <li key={patient.id} className="regie-freigabe-zeile">
                    <span className="regie-freigabe-name">
                      {patient.name}, {patient.alter} J.
                    </span>
                    <button
                      type="button"
                      onClick={() => dispatch({ typ: 'patientFreigeben', patientId: patient.id })}
                    >
                      Freigeben
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
