import { supabaseKonfiguriert } from '../net/supabaseClient';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.rolle Übungsleiter oder Spieler wählen
 *
 * Die Übungsleitung braucht ein vorab angelegtes Konto (→ `net.supabaseAuth`)
 * und damit ein konfiguriertes Supabase-Projekt - ohne das bleibt die Rolle
 * gesperrt, Spieler treten weiterhin ohne Konto per Code bei.
 */
export function RolleSeite() {
  const { dispatch } = useSimulation();

  return (
    <main className="setup">
      <section className="setup-kopf">
        <button type="button" onClick={() => dispatch({ typ: 'zurueckZumStart' })}>
          &larr; Start
        </button>
        <h1>Gemeinsame Übung</h1>
        <p>
          Mehrere spielen dieselbe Lage. Die Übungsleitung eröffnet eine Sitzung, die Spieler treten
          mit einem Code bei und warten im Wartebereich, bis die Übung startet.
        </p>
      </section>

      <section className="rollenwahl">
        <button
          type="button"
          className="rollen-karte"
          disabled={!supabaseKonfiguriert}
          onClick={() => dispatch({ typ: 'rolleWaehlen', rolle: 'uebungsleiter' })}
        >
          <h2>Als Übungsleitung</h2>
          <p>
            {supabaseKonfiguriert
              ? 'Anmelden, Szenario wählen, Sitzung eröffnen und die Übung starten.'
              : 'Erfordert ein eingerichtetes Übungsleitungs-Konto (Supabase) - ohne Server-Anbindung nicht verfügbar.'}
          </p>
        </button>
        <button
          type="button"
          className="rollen-karte"
          onClick={() => dispatch({ typ: 'rolleWaehlen', rolle: 'spieler' })}
        >
          <h2>Als Spieler beitreten</h2>
          <p>Mit Code und Namen einsteigen und im Wartebereich auf den Start warten.</p>
        </button>
      </section>
    </main>
  );
}
