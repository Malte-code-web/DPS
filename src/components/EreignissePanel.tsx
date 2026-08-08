import { FAHRZEUGTYPEN, FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.ereignissepanel Ereignis-Injektion: Fahrzeugausfall, Nachforderung, Lageänderung
 *
 * Drei von der Übungsleitung/Beobachter live auslösbare Ereignisse
 * (→ `modell.ereignis`), reiner Regie-Bereich ohne eigene Rollenprüfung im
 * Reducer:
 * - **Fahrzeugausfall** markiert ein vorhandenes Fahrzeug als ausgefallen -
 *   Besatzung und Material bleiben zugeordnet, liefern aber kein Material
 *   mehr (→ `domain.material`), bis die Übungsleitung den Ausfall wieder
 *   aufhebt.
 * - **Nachforderung** fügt ein neues Fahrzeug hinzu, das im
 *   Bereitstellungsraum eintrifft und von dort per normaler
 *   Fahrzeugverlegung mit echter Anfahrtszeit weiter muss.
 * - **Lageänderung** setzt vordefinierte Nachzügler-Patienten aus dem
 *   Szenario frei (`szenario.ereignisse`) - anders als die gestaffelte
 *   Freigabe existieren diese bis zum Auslösen gar nicht in `state.patienten`.
 *   Jedes Ereignis ist nur einmal auslösbar.
 */
export function EreignissePanel() {
  const { state, dispatch } = useSimulation();
  const lageereignisse = state.szenario?.ereignisse ?? [];

  return (
    <div className="panel">
      <div className="panel-titel">
        <h2>Ereignisse</h2>
      </div>

      <section className="ereignis-abschnitt">
        <h3>Fahrzeugausfall</h3>
        {state.fahrzeuge.length === 0 ? (
          <p className="hinweis hinweis-knapp">Keine Fahrzeuge im Einsatz.</p>
        ) : (
          <ul className="ereignis-fahrzeugliste">
            {state.fahrzeuge.map((fahrzeug) => (
              <li key={fahrzeug.id} className="ereignis-fahrzeugzeile">
                <span className="ereignis-fahrzeugname">
                  {FAHRZEUGTYP_INFO[fahrzeug.typ].label}
                  {fahrzeug.kennung ? ` (${fahrzeug.kennung})` : ''}
                  {fahrzeug.ausgefallen && <span className="ereignis-ausgefallen-marke">ausgefallen</span>}
                </span>
                <button
                  type="button"
                  className={fahrzeug.ausgefallen ? 'btn-nebenlinie' : 'btn-warnend'}
                  onClick={() =>
                    dispatch({
                      typ: 'fahrzeugAusfallSetzen',
                      fahrzeugId: fahrzeug.id,
                      ausgefallen: !fahrzeug.ausgefallen,
                    })
                  }
                >
                  {fahrzeug.ausgefallen ? 'Wieder einsatzbereit' : 'Ausfall melden'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ereignis-abschnitt">
        <h3>Nachforderung</h3>
        <p className="hinweis hinweis-knapp">
          Trifft im Bereitstellungsraum ein und muss von dort verlegt werden.
        </p>
        <div className="ereignis-nachforderung-liste">
          {FAHRZEUGTYPEN.map((typ) => (
            <button
              key={typ}
              type="button"
              className="btn-nebenlinie"
              onClick={() => dispatch({ typ: 'fahrzeugNachfordern', fahrzeugTyp: typ })}
            >
              {FAHRZEUGTYP_INFO[typ].label}
            </button>
          ))}
        </div>
      </section>

      <section className="ereignis-abschnitt">
        <h3>Lageänderung</h3>
        {lageereignisse.length === 0 ? (
          <p className="hinweis hinweis-knapp">
            Für dieses Szenario sind keine Lageänderungen hinterlegt.
          </p>
        ) : (
          <ul className="ereignis-lageliste">
            {lageereignisse.map((ereignis) => {
              const ausgeloest = state.ausgeloesteEreignisse.includes(ereignis.id);
              return (
                <li key={ereignis.id} className="ereignis-lagezeile">
                  <span className="ereignis-lagetext">
                    <b>{ereignis.titel}</b>
                    <span>{ereignis.beschreibung}</span>
                  </span>
                  <button
                    type="button"
                    className="btn-warnend"
                    disabled={ausgeloest}
                    onClick={() => dispatch({ typ: 'ereignisAusloesen', ereignisId: ereignis.id })}
                  >
                    {ausgeloest ? 'Ausgelöst' : 'Auslösen'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
