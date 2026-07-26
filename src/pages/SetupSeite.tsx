import { SZENARIEN } from '../domain/szenarien';
import { useSimulation } from '../state/useSimulation';
import type { Szenario } from '../domain/types';

/** @anker ui.setup Szenarioauswahl der digitalen Übung */
export function SetupSeite() {
  const { state, dispatch } = useSimulation();

  const gruppen: { titel: string; szenarien: Szenario[]; leer: string }[] = [
    { titel: 'Mitgelieferte Szenarien', szenarien: SZENARIEN, leer: '' },
    {
      titel: 'Eigene Szenarien',
      szenarien: state.eigeneSzenarien,
      leer: 'Noch keine eigenen Szenarien - in der Übungsleitung anlegen.',
    },
  ];

  return (
    <main className="setup">
      <section className="setup-kopf">
        <button type="button" onClick={() => dispatch({ typ: 'zurueckZumStart' })}>
          &larr; Trainingsmodus
        </button>
        <h1>Digitale Übung</h1>
        <p>
          Die Patienten verändern sich in Echtzeit: Wer zu spät gesichtet oder falsch priorisiert
          wird, verschlechtert sich - und kann versterben. Ziel ist eine vollständige Vorsichtung
          nach mSTaRT und eine sinnvolle Verteilung der knappen Ressourcen.
        </p>
      </section>

      {gruppen.map((gruppe) => (
        <section key={gruppe.titel} className="szenarioliste">
          <h2>{gruppe.titel}</h2>
          {gruppe.szenarien.length === 0 ? (
            <p className="hinweis">{gruppe.leer}</p>
          ) : (
            gruppe.szenarien.map((szenario) => (
              <article key={szenario.id} className="szenario-karte">
                <h3>{szenario.titel}</h3>
                <p className="lagemeldung">{szenario.lagemeldung}</p>
                <p className="hinweis">{szenario.einsatzhinweis}</p>
                <div className="szenario-fuss">
                  <span>{szenario.patienten.length} Betroffene</span>
                  <button
                    type="button"
                    className="primaer"
                    onClick={() => dispatch({ typ: 'szenarioStarten', szenario })}
                  >
                    Einsatz starten
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      ))}

      <section className="setup-hinweise">
        <h2>Ablauf einer Übung</h2>
        <ol>
          <li>Lagemeldung lesen und die Patienten in der Übersicht sichten.</li>
          <li>
            Jeden Patienten nach mSTaRT vorsichten: gehfähig, kritische Blutung, Atmung,
            Atemfrequenz, Kreislauf, Bewusstsein.
          </li>
          <li>Lebensrettende Sofortmaßnahmen durchführen - jede Maßnahme kostet Zeit.</li>
          <li>Patienten über den Behandlungsplatz führen und den Einsatz zum Debriefing beenden.</li>
        </ol>
      </section>
    </main>
  );
}
