import { SZENARIEN } from '../domain/szenarien';
import { useSimulation } from '../state/useSimulation';

/** @anker ui.setup Szenarioauswahl und Einstieg */
export function SetupSeite() {
  const { dispatch } = useSimulation();

  return (
    <main className="setup">
      <section className="setup-kopf">
        <h1>DPS - Dynamische Patienten-Simulation</h1>
        <p>
          Trainingsumgebung für den Massenanfall von Verletzten. Die Patienten verändern sich in
          Echtzeit: Wer zu spät gesichtet oder falsch priorisiert wird, verschlechtert sich - und
          kann versterben. Ziel ist eine vollständige Vorsichtung nach mSTaRT und eine sinnvolle
          Verteilung der knappen Ressourcen.
        </p>
      </section>

      <section className="szenarioliste">
        <h2>Szenario wählen</h2>
        {SZENARIEN.map((szenario) => (
          <article key={szenario.id} className="szenario-karte">
            <h3>{szenario.titel}</h3>
            <p className="lagemeldung">{szenario.lagemeldung}</p>
            <p className="hinweis">{szenario.einsatzhinweis}</p>
            <div className="szenario-fuss">
              <span>{szenario.patienten.length} Betroffene</span>
              <button
                type="button"
                className="primaer"
                onClick={() => dispatch({ typ: 'szenarioStarten', szenarioId: szenario.id })}
              >
                Einsatz starten
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="setup-hinweise">
        <h2>Ablauf einer Übung</h2>
        <ol>
          <li>Lagemeldung lesen und die Patienten in der Übersicht sichten.</li>
          <li>
            Jeden Patienten nach mSTaRT vorsichten: gehfähig, kritische Blutung, Atmung,
            Atemfrequenz, Kreislauf, Bewusstsein.
          </li>
          <li>Lebensrettende Sofortmaßnahmen durchführen - jede Maßnahme kostet Zeit.</li>
          <li>Patienten an den Transport übergeben und den Einsatz zum Debriefing beenden.</li>
        </ol>
      </section>
    </main>
  );
}
