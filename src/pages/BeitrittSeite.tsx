import { useState } from 'react';
import { erzeugeId, istGueltigerCode, normalisiereCode } from '../domain/sitzung';
import { useSimulation } from '../state/useSimulation';

/** @anker ui.beitritt Spieler tritt mit Code und Name bei */
export function BeitrittSeite() {
  const { dispatch } = useSimulation();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  const codeSauber = normalisiereCode(code);
  const bereit = istGueltigerCode(codeSauber) && name.trim().length > 0;

  const beitreten = () => {
    if (!bereit) return;
    dispatch({ typ: 'spielerBeitreten', code: codeSauber, name: name.trim(), eigeneId: erzeugeId() });
  };

  return (
    <main className="setup">
      <section className="setup-kopf">
        <button type="button" onClick={() => dispatch({ typ: 'gemeinsamOeffnen' })}>
          &larr; Rolle
        </button>
        <h1>Als Spieler beitreten</h1>
        <p>Den Sitzungscode bekommst du von der Übungsleitung.</p>
      </section>

      <section className="beitritt-form">
        <label>
          Sitzungscode
          <input
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="z. B. K7QP2"
            autoCapitalize="characters"
            autoComplete="off"
          />
        </label>
        <label>
          Dein Name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. San Meier"
          />
        </label>
        <button type="button" className="primaer" disabled={!bereit} onClick={beitreten}>
          Beitreten
        </button>
      </section>
    </main>
  );
}
