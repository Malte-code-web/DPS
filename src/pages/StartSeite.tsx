import { useState } from 'react';
import { erzeugeId, istGueltigerCode, normalisiereCode } from '../domain/sitzung';
import { meldeUebungsleitungAn } from '../net/supabaseAuth';
import { supabaseKonfiguriert } from '../net/supabaseClient';
import { useSimulation } from '../state/useSimulation';

type AnmeldeArt = 'spieler' | 'uebungsleitung';

/**
 * @anker ui.start Startseite: nur der Einstieg als Spieler oder Übungsleitung
 *
 * Spieler treten hier direkt mit Code und Namen bei, ohne Zwischenschritt -
 * die Übungsleitung schaltet per Knopf auf den Login um (→ `net.supabaseAuth`).
 * Nach dem Login folgt der Modus (→ `ui.modus`), danach das Szenario - die
 * Startseite selbst zeigt bewusst nichts anderes mehr.
 */
export function StartSeite() {
  const { dispatch } = useSimulation();
  const [art, setArt] = useState<AnmeldeArt>('spieler');

  // Spieler-Beitritt
  const [code, setCode] = useState('');
  const [spielerName, setSpielerName] = useState('');
  const codeSauber = normalisiereCode(code);
  const beitrittBereit = istGueltigerCode(codeSauber) && spielerName.trim().length > 0;
  const beitreten = () => {
    if (!beitrittBereit) return;
    dispatch({
      typ: 'spielerBeitreten',
      code: codeSauber,
      name: spielerName.trim(),
      eigeneId: erzeugeId(),
    });
  };

  // Übungsleitungs-Login
  const [email, setEmail] = useState('');
  const [passwort, setPasswort] = useState('');
  const [leitungName, setLeitungName] = useState('');
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const loginBereit = email.trim().length > 0 && passwort.length > 0 && leitungName.trim().length > 0;
  const anmelden = async () => {
    if (!loginBereit || laeuft) return;
    setLaeuft(true);
    setFehler(null);
    const ergebnis = await meldeUebungsleitungAn(email.trim(), passwort);
    setLaeuft(false);
    if (!ergebnis.erfolg) {
      setFehler(ergebnis.fehler ?? 'Anmeldung fehlgeschlagen.');
      return;
    }
    dispatch({ typ: 'anmeldungAbschliessen', name: leitungName.trim(), eigeneId: erzeugeId() });
  };

  return (
    <main className="setup">
      <section className="setup-kopf">
        <h1>DPS - Dynamische Patienten-Simulation</h1>
        <p>Trainingsumgebung für den Massenanfall von Verletzten.</p>
      </section>

      <section className="einstieg">
        <div className="einstieg-umschalter" role="tablist" aria-label="Als Spieler oder Übungsleitung">
          <button
            type="button"
            role="tab"
            aria-selected={art === 'spieler'}
            className={art === 'spieler' ? 'einstieg-tab-aktiv' : ''}
            onClick={() => setArt('spieler')}
          >
            Als Spieler beitreten
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={art === 'uebungsleitung'}
            className={art === 'uebungsleitung' ? 'einstieg-tab-aktiv' : ''}
            onClick={() => setArt('uebungsleitung')}
          >
            Als Übungsleitung anmelden
          </button>
        </div>

        {art === 'spieler' ? (
          <div className="einstieg-form">
            <p className="hinweis">Den Sitzungscode bekommst du von der Übungsleitung.</p>
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
                value={spielerName}
                onChange={(event) => setSpielerName(event.target.value)}
                placeholder="z. B. San Meier"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') beitreten();
                }}
              />
            </label>
            <button type="button" className="primaer" disabled={!beitrittBereit} onClick={beitreten}>
              Beitreten
            </button>
          </div>
        ) : !supabaseKonfiguriert ? (
          <p className="hinweis">
            Erfordert ein eingerichtetes Übungsleitungs-Konto (Supabase) - ohne Server-Anbindung
            nicht verfügbar.
          </p>
        ) : (
          <div className="einstieg-form">
            <p className="hinweis">Mit dem vorab angelegten Konto anmelden.</p>
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
                value={leitungName}
                onChange={(event) => setLeitungName(event.target.value)}
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

            <button type="button" className="primaer" disabled={!loginBereit || laeuft} onClick={anmelden}>
              {laeuft ? 'Meldet an …' : 'Anmelden'}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
