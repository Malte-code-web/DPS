import { useState } from 'react';
import { EINZELFAELLE } from '../domain/einzelfaelle';
import { SZENARIEN } from '../domain/szenarien';
import { useSimulation } from '../state/useSimulation';
import type { Szenario } from '../domain/types';

/** @anker ui.setup Szenarioauswahl der digitalen Übung, inkl. Alleinspiel */
export function SetupSeite() {
  const { state, dispatch } = useSimulation();
  const [alleine, setAlleine] = useState(false);
  // Als Übungsleitung wird hier das Szenario gewählt und die Sitzung eröffnet
  // (Wartebereich), statt direkt allein zu starten.
  const host = state.sitzung.rolle === 'uebungsleiter';

  const starten = (szenario: (typeof SZENARIEN)[number]) => {
    if (host) {
      dispatch({ typ: 'szenarioFuerSitzungWaehlen', szenario });
    } else {
      dispatch({ typ: 'szenarioStarten', szenario, alleine });
    }
  };

  const gruppen: { titel: string; szenarien: Szenario[]; leer: string }[] = [
    { titel: 'Mitgelieferte Szenarien', szenarien: SZENARIEN, leer: '' },
    { titel: 'Einzelfälle', szenarien: EINZELFAELLE, leer: '' },
    {
      titel: 'Eigene Szenarien',
      szenarien: state.eigeneSzenarien,
      leer: 'Noch keine eigenen Szenarien - in der Übungsleitung anlegen.',
    },
  ];

  return (
    <main className="setup">
      <section className="setup-kopf">
        <button
          type="button"
          onClick={() =>
            dispatch(host ? { typ: 'gemeinsamOeffnen' } : { typ: 'zurueckZumStart' })
          }
        >
          &larr; {host ? 'Rolle' : 'Trainingsmodus'}
        </button>
        <h1>{host ? 'Szenario für die Sitzung' : 'Digitale Übung'}</h1>
        <p>
          {host
            ? 'Wähle die Lage, die alle gemeinsam bearbeiten. Als Nächstes stellst du die Maßnahmenrechte ein, dann geht es in den Wartebereich, wo die Spieler beitreten - dort startest du die Übung.'
            : 'Die Patienten verändern sich in Echtzeit: Wer zu spät gesichtet oder falsch priorisiert wird, verschlechtert sich - und kann versterben. Ziel ist eine vollständige Vorsichtung nach mSTaRT und eine sinnvolle Verteilung der knappen Ressourcen.'}
        </p>
      </section>

      {/* @anker ui.alleinspiel Vor dem Start wählen, ob man allein spielt */}
      {!host && (
        <section className="alleinspiel">
          <label className="alleinspiel-schalter">
            <input
              type="checkbox"
              checked={alleine}
              onChange={(event) => setAlleine(event.target.checked)}
            />
            <span>
              <strong>Alleine spielen</strong>
              <span className="alleinspiel-hinweis">
                Für eine einzelne Person: Die Verschlechterung läuft rund 25 % langsamer, weil man
                nicht alles gleichzeitig schaffen kann. Gilt auch für die volle MANV-Lage.
              </span>
            </span>
          </label>
        </section>
      )}

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
                    {host ? 'Weiter' : alleine ? 'Allein starten' : 'Einsatz starten'}
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
