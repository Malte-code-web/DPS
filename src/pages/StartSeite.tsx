import { TRAININGSMODI, modusInfo } from '../domain/modi';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.start Auswahl des Trainingsmodus und Einstieg in die Übungsleitung
 *
 * Von den drei Modi ist bislang nur die digitale Übung ausgebaut. Die beiden
 * anderen stehen bereits hier, damit der Rahmen sichtbar ist; ein Klick zeigt,
 * was sie können sollen.
 */
export function StartSeite() {
  const { state, dispatch } = useSimulation();
  const gewaehlt = state.modus ? modusInfo(state.modus) : null;

  return (
    <main className="setup">
      <section className="setup-kopf">
        <h1>DPS - Dynamische Patienten-Simulation</h1>
        <p>
          Trainingsumgebung für den Massenanfall von Verletzten. Wähle einen Trainingsmodus oder
          baue in der Übungsleitung eigene Szenarien.
        </p>
      </section>

      <section className="modusliste">
        <h2>Trainingsmodus</h2>
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

      <section className="szenarioliste">
        <h2>Übungsleitung</h2>
        <article className="szenario-karte">
          <h3>Szenarien bauen</h3>
          <p className="lagemeldung">
            Eigene Lagen anlegen, Patienten und ihre Verläufe festlegen, Szenarien als Datei
            weitergeben - oder von einer KI entwerfen lassen und hier prüfen.
          </p>
          <div className="szenario-fuss">
            <span>
              {state.eigeneSzenarien.length === 0
                ? 'noch keine eigenen Szenarien'
                : `${state.eigeneSzenarien.length} eigene Szenarien`}
            </span>
            <button
              type="button"
              onClick={() => dispatch({ typ: 'uebungsleitungOeffnen' })}
            >
              Übungsleitung öffnen
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
