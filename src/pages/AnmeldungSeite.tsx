import { useState } from 'react';
import { erzeugeId } from '../domain/sitzung';
import { meldeUebungsleitungAn } from '../net/supabaseAuth';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.anmeldung Übungsleiter-Anmeldung mit Konto (Supabase Auth)
 *
 * Erst die Anmeldung mit dem vorab angelegten Konto (→ `net.supabaseAuth`),
 * danach der Anzeigename für die Sitzung - getrennt von der E-Mail, weil ein
 * Funkrufname ("OrgL Müller") auf dem Wartebereichs-Bildschirm passender ist
 * als eine E-Mail-Adresse.
 */
export function AnmeldungSeite() {
  const { dispatch } = useSimulation();
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [name, setName] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const bereit = email.trim().length > 0 && passwort.length > 0 && name.trim().length > 0;

  const anmelden = async () => {
    if (!bereit || laeuft) return;
    setLaeuft(true);
    setFehler(null);
    const ergebnis = await meldeUebungsleitungAn(email.trim(), passwort);
    setLaeuft(false);
    if (!ergebnis.erfolg) {
      setFehler(ergebnis.fehler ?? 'Anmeldung fehlgeschlagen.');
      return;
    }
    dispatch({ typ: 'anmeldungAbschliessen', name: name.trim(), eigeneId: erzeugeId() });
  };

  return (
    <main className="setup">
      <section className="setup-kopf">
        <button type="button" onClick={() => dispatch({ typ: 'gemeinsamOeffnen' })}>
          &larr; Rolle
        </button>
        <h1>Anmeldung der Übungsleitung</h1>
        <p>Mit dem vorab angelegten Konto anmelden, danach den Anzeigenamen für diese Sitzung wählen.</p>
      </section>

      <section className="anmeldung-form">
        <label>
          E-Mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="z. B. orgl@rettungsdienst.de"
            autoComplete="username"
          />
        </label>
        <label>
          Passwort
          <input
            type="password"
            value={passwort}
            onChange={(event) => setPasswort(event.target.value)}
            autoComplete="current-password"
            onKeyDown={(event) => {
              if (event.key === 'Enter') anmelden();
            }}
          />
        </label>
        <label>
          Anzeigename für die Sitzung
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. OrgL Müller"
            onKeyDown={(event) => {
              if (event.key === 'Enter') anmelden();
            }}
          />
        </label>

        {fehler && (
          <p className="hinweis hinweis-fehler" role="alert">
            {fehler}
          </p>
        )}

        <button type="button" className="primaer" disabled={!bereit || laeuft} onClick={anmelden}>
          {laeuft ? 'Meldet an …' : 'Anmelden'}
        </button>
      </section>
    </main>
  );
}
