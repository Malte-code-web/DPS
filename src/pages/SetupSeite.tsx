import { EINZELFAELLE } from '../domain/einzelfaelle';
import { SZENARIEN } from '../domain/szenarien';
import { useSimulation } from '../state/useSimulation';
import type { Szenario } from '../domain/types';

/** @anker ui.setup Szenarioauswahl der digitalen Übung und des Ein-Person-Modus */
export function SetupSeite() {
  const { state, dispatch } = useSimulation();
  const einzeln = state.modus === 'einzelperson';

  const gruppen: { titel: string; szenarien: Szenario[]; leer: string }[] = einzeln
    ? [
        { titel: 'Einzelfälle', szenarien: EINZELFAELLE, leer: '' },
        {
          titel: 'Eigene Einzelfälle',
          szenarien: state.eigeneSzenarien.filter((szenario) => szenario.patienten.length === 1),
          leer: 'Noch keine eigenen Einzelfälle - in der Übungsleitung ein Szenario mit einer Person anlegen.',
        },
      ]
    : [
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
        <h1>{einzeln ? 'Ein-Person-Modus' : 'Digitale Übung'}</h1>
        <p>
          {einzeln
            ? 'Ein einzelner Patient, in Ruhe: vorsichten, untersuchen, versorgen, verlegen. Der Zustand verändert sich in Echtzeit wie im MANV, nur ohne das Gedränge - ideal, um den Ablauf zu lernen.'
            : 'Die Patienten verändern sich in Echtzeit: Wer zu spät gesichtet oder falsch priorisiert wird, verschlechtert sich - und kann versterben. Ziel ist eine vollständige Vorsichtung nach mSTaRT und eine sinnvolle Verteilung der knappen Ressourcen.'}
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
                  <span>
                    {szenario.patienten.length === 1
                      ? '1 Betroffene(r)'
                      : `${szenario.patienten.length} Betroffene`}
                  </span>
                  <button
                    type="button"
                    className="primaer"
                    onClick={() => dispatch({ typ: 'szenarioStarten', szenario })}
                  >
                    {einzeln ? 'Fall starten' : 'Einsatz starten'}
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      ))}

      <section className="setup-hinweise">
        <h2>Ablauf</h2>
        <ol>
          {einzeln ? (
            <>
              <li>Ersteindruck lesen und den Patienten nach mSTaRT vorsichten.</li>
              <li>Gezielt untersuchen - jeder Wert kostet Zeit, der Zustand läuft weiter.</li>
              <li>Lebensrettende Sofortmaßnahmen und Versorgung nach xABCDE durchführen.</li>
              <li>Verlegen und den Fall zum Debriefing beenden.</li>
            </>
          ) : (
            <>
              <li>Lagemeldung lesen und die Patienten in der Übersicht sichten.</li>
              <li>
                Jeden Patienten nach mSTaRT vorsichten: gehfähig, kritische Blutung, Atmung,
                Atemfrequenz, Kreislauf, Bewusstsein.
              </li>
              <li>Lebensrettende Sofortmaßnahmen durchführen - jede Maßnahme kostet Zeit.</li>
              <li>Patienten über den Behandlungsplatz führen und den Einsatz zum Debriefing beenden.</li>
            </>
          )}
        </ol>
      </section>
    </main>
  );
}
