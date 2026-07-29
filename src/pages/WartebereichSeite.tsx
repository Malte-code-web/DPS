import { QUALIFIKATION_VOLLNAME } from '../domain/massnahmen';
import { useSimulation } from '../state/useSimulation';
import type { Qualifikation } from '../domain/types';

const QUALIFIKATIONEN: Qualifikation[] = ['basis', 'notsan', 'notarzt'];

/** @anker ui.wartebereich Lobby vor dem Start - Code, Teilnehmende, Startknopf */
export function WartebereichSeite() {
  const { state, dispatch } = useSimulation();
  const { sitzung, szenario } = state;
  const host = sitzung.rolle === 'uebungsleiter';

  return (
    <main className="setup">
      <section className="setup-kopf">
        <button type="button" onClick={() => dispatch({ typ: 'sitzungVerlassen' })}>
          &larr; Verlassen
        </button>
        <h1>Wartebereich</h1>
        <p>
          {host
            ? 'Gib den Code weiter. Sobald alle da sind, startest du die Übung.'
            : 'Warte, bis die Übungsleitung die Übung startet.'}
        </p>
      </section>

      <section className="wartebereich">
        <div className="warte-code">
          <span className="warte-code-label">Sitzungscode</span>
          <span className="warte-code-wert">{sitzung.code}</span>
        </div>

        {host && szenario && (
          <p className="hinweis">
            Szenario: <strong>{szenario.titel}</strong> · {szenario.patienten.length} Betroffene
          </p>
        )}

        <h2>Teilnehmende ({sitzung.spieler.length})</h2>
        {sitzung.spieler.length > 0 && (
          <p className="hinweis">
            Stelle deine eigene fachliche Qualifikation ein - sichtbar für alle. Maßnahmen darüber
            sind im Einsatz gesperrt, bis jemand mit ausreichender Qualifikation sie für den
            Patienten freigibt.
          </p>
        )}
        {sitzung.spieler.length === 0 ? (
          <p className="hinweis">Noch niemand beigetreten.</p>
        ) : (
          <ul className="spielerliste">
            {sitzung.spieler.map((spieler) => {
              const eigeneZeile = spieler.id === sitzung.eigeneId;
              return (
                <li key={spieler.id} className={`spieler spieler-${spieler.rolle}`}>
                  <span className="spieler-name">{spieler.name}</span>
                  <span className="spieler-rolle">
                    {spieler.rolle === 'uebungsleiter' ? 'Übungsleitung' : 'Spieler'}
                  </span>
                  {eigeneZeile ? (
                    <select
                      className="spieler-qualifikation-wahl"
                      aria-label="Deine Qualifikation"
                      value={spieler.qualifikation}
                      onChange={(event) =>
                        dispatch({
                          typ: 'spielerQualifikationSetzen',
                          spielerId: spieler.id,
                          qualifikation: event.target.value as Qualifikation,
                        })
                      }
                    >
                      {QUALIFIKATIONEN.map((qualifikation) => (
                        <option key={qualifikation} value={qualifikation}>
                          {QUALIFIKATION_VOLLNAME[qualifikation]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="spieler-qualifikation">
                      {QUALIFIKATION_VOLLNAME[spieler.qualifikation]}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {host ? (
          <button
            type="button"
            className="primaer"
            disabled={!szenario}
            onClick={() => dispatch({ typ: 'sitzungStarten' })}
          >
            Übung starten
          </button>
        ) : (
          <p className="warte-hinweis">Bereit – warten auf den Start …</p>
        )}
      </section>
    </main>
  );
}
