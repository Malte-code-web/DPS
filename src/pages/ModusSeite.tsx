import { TRAININGSMODI, modusInfo } from '../domain/modi';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.modus Modus wählen - entscheidet, auf welche Art gespielt wird
 *
 * Erster Schritt nach dem Login: der Modus legt fest, wie das Szenario
 * gespielt wird (digital, Führung, real) - unabhängig davon, welches
 * Szenario später gewählt oder gebaut wird. Nur die digitale Übung ist
 * bislang ausgebaut und führt weiter zu den Maßnahmenrechten; die übrigen
 * zeigen an derselben Stelle, was für sie vorgesehen ist.
 */
export function ModusSeite() {
  const { state, dispatch } = useSimulation();
  const gewaehlt = state.modus ? modusInfo(state.modus) : null;

  return (
    <main className="setup">
      <section className="setup-kopf">
        <button type="button" onClick={() => dispatch({ typ: 'zurueckZumStart' })}>
          &larr; Start
        </button>
        <h1>Trainingsmodus</h1>
        <p>Wähle, auf welche Art die Übung gespielt wird - das Szenario folgt danach.</p>
      </section>

      <section className="modusliste">
        <div className="modus-raster">
          {TRAININGSMODI.map((modus) => {
            const verfuegbar = modus.stand === 'verfuegbar';
            const aktiv = state.modus === modus.id;
            return (
              <button
                key={modus.id}
                type="button"
                className={`modus-karte${aktiv ? ' modus-aktiv' : ''}${
                  verfuegbar ? '' : ' modus-vorbereitung'
                }`}
                onClick={() => dispatch({ typ: 'modusWaehlen', modus: modus.id })}
              >
                <span className="modus-kopf">
                  <span className="modus-name">{modus.name}</span>
                  <span className={`modus-stand${verfuegbar ? ' modus-stand-frei' : ''}`}>
                    {verfuegbar ? 'verfügbar' : 'in Vorbereitung'}
                  </span>
                </span>
                <span className="modus-text">{modus.kurzbeschreibung}</span>
              </button>
            );
          })}
        </div>
      </section>

      {gewaehlt && gewaehlt.stand === 'in_vorbereitung' && (
        <section className="karte">
          <h3>{gewaehlt.name}</h3>
          <p className="detail-befund">{gewaehlt.kurzbeschreibung}</p>
          <p className="hinweis">
            <strong>Zielgruppe:</strong> {gewaehlt.zielgruppe}
          </p>
          <h4>Vorgesehen ist</h4>
          <ul className="aufzaehlung">
            {gewaehlt.geplant.map((punkt) => (
              <li key={punkt}>{punkt}</li>
            ))}
          </ul>
          <p className="hinweis">
            Dieser Modus ist noch nicht gebaut. Bis dahin führt die digitale Übung durch die
            vollständige Lage.
          </p>
        </section>
      )}
    </main>
  );
}
