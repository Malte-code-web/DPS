import { EINZELFAELLE } from '../domain/einzelfaelle';
import { SZENARIEN } from '../domain/szenarien';
import { useSimulation } from '../state/useSimulation';
import type { Szenario } from '../domain/types';

/**
 * @anker ui.setup Szenarioauswahl für die Sitzung
 *
 * Nur die Übungsleitung erreicht diese Seite (→ `ui.modus`, digitaler Modus) -
 * das Szenario beschreibt nur, was wo passiert; die Sitzung öffnet sich erst
 * nach der Fahrzeugkonfiguration (→ `ui.fahrzeugkonfiguration`).
 */
export function SetupSeite() {
  const { state, dispatch } = useSimulation();

  const starten = (szenario: (typeof SZENARIEN)[number]) => {
    dispatch({ typ: 'szenarioFuerSitzungWaehlen', szenario });
  };

  const gruppen: { titel: string; szenarien: Szenario[]; leer: string }[] = [
    { titel: 'Mitgelieferte Szenarien', szenarien: SZENARIEN, leer: '' },
    { titel: 'Einzelfälle', szenarien: EINZELFAELLE, leer: '' },
    { titel: 'Eigene Szenarien', szenarien: state.eigeneSzenarien, leer: 'Noch keine eigenen Szenarien.' },
  ];

  return (
    <main className="setup">
      <section className="setup-kopf">
        <button type="button" onClick={() => dispatch({ typ: 'zurueckZumStart' })}>
          &larr; Start
        </button>
        <h1>Szenario für die Sitzung</h1>
        <p>
          Wähle die Lage, die alle gemeinsam bearbeiten. Anschließend geht es in den Wartebereich,
          wo die Spieler beitreten - dort startest du die Übung.
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
                  <button type="button" className="primaer" onClick={() => starten(szenario)}>
                    Weiter: Fahrzeuge zuweisen
                  </button>
                </div>
              </article>
            ))
          )}
          {gruppe.titel === 'Eigene Szenarien' && (
            <button type="button" onClick={() => dispatch({ typ: 'uebungsleitungOeffnen' })}>
              Szenarien bauen
            </button>
          )}
        </section>
      ))}

      <section className="setup-hinweise">
        <h2>Ablauf einer Übung</h2>
        <ol>
          <li>Lagemeldung lesen und die Patienten in der Übersicht sichten.</li>
          <li>
            Jeden Patienten nach tacSTART vorsichten: gehfähig, kritische Blutung, Atmung,
            Atemfrequenz, Kreislauf, Bewusstsein.
          </li>
          <li>Lebensrettende Sofortmaßnahmen durchführen - jede Maßnahme kostet Zeit.</li>
          <li>Patienten über den Behandlungsplatz führen und den Einsatz zum Debriefing beenden.</li>
        </ol>
      </section>
    </main>
  );
}
