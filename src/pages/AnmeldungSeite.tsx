import { useState } from 'react';
import { erzeugeId } from '../domain/sitzung';
import { useSimulation } from '../state/useSimulation';

/** @anker ui.anmeldung Übungsleiter-Anmeldung (Login folgt mit dem Server) */
export function AnmeldungSeite() {
  const { dispatch } = useSimulation();
  const [name, setName] = useState('');

  const anmelden = () => {
    dispatch({ typ: 'anmeldungAbschliessen', name: name.trim() || 'Übungsleitung', eigeneId: erzeugeId() });
  };

  return (
    <main className="setup">
      <section className="setup-kopf">
        <button type="button" onClick={() => dispatch({ typ: 'gemeinsamOeffnen' })}>
          &larr; Rolle
        </button>
        <h1>Anmeldung der Übungsleitung</h1>
        <p>
          Richtige Konten mit E-Mail und Passwort folgen mit der Server-Anbindung (Supabase). Bis
          dahin genügt ein Anzeigename für die Sitzung.
        </p>
      </section>

      <section className="anmeldung-form">
        <label>
          Anzeigename
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. OrgL Müller"
          />
        </label>
        <button type="button" className="primaer" onClick={anmelden}>
          Anmelden
        </button>
      </section>
    </main>
  );
}
