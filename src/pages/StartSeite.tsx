import { useState } from 'react';
import { TRAININGSMODI, modusInfo } from '../domain/modi';
import { erzeugeId, istGueltigerCode, normalisiereCode } from '../domain/sitzung';
import { meldeUebungsleitungAn } from '../net/supabaseAuth';
import { supabaseKonfiguriert } from '../net/supabaseClient';
import { useSimulation } from '../state/useSimulation';

type AnmeldeArt = 'spieler' | 'uebungsleitung';

/**
 * @anker ui.start Direkter Einstieg als Spieler oder Übungsleitung
 *
 * Spieler treten hier direkt mit Code und Namen bei, ohne Zwischenschritt -
 * die Übungsleitung schaltet per Knopf auf den Login um (→ `net.supabaseAuth`).
 * Solo-/Team-Modus und der Szenario-Editor bleiben erreichbar, stehen aber
 * zweitrangig darunter, da der geteilte Einstieg der Regelfall ist.
 */
export function StartSeite() {
  const { state, dispatch } = useSimulation();
  const gewaehlt = state.modus ? modusInfo(state.modus) : null;
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

      <section className="modusliste modusliste-zweitrangig">
        <h2>Alleine oder im Team üben</h2>
        <div className="modus-raster">
          {TRAININGSMODI.map((modus) => {
            const verfuegbar = modus.stand === 'verfuegbar';
            const aktiv = state.modus === modus.id;
            return (
              <button
                key={modus.id}
                type="button"
                className={`modus-karte${aktiv ? ' modus-aktiv' : ''}${
                  verfuegbar ? '' : ' modus-vorbereitung'
                }`}
                onClick={() => dispatch({ typ: 'modusWaehlen', modus: modus.id })}
              >
                <span className="modus-kopf">
                  <span className="modus-name">{modus.name}</span>
                  <span className={`modus-stand${verfuegbar ? ' modus-stand-frei' : ''}`}>
                    {verfuegbar ? 'verfügbar' : 'in Vorbereitung'}
                  </span>
                </span>
                <span className="modus-text">{modus.kurzbeschreibung}</span>
              </button>
            );
          })}
        </div>
      </section>

      {gewaehlt && gewaehlt.stand === 'in_vorbereitung' && (
        <section className="karte">
          <h3>{gewaehlt.name}</h3>
          <p className="detail-befund">{gewaehlt.kurzbeschreibung}</p>
          <p className="hinweis">
            <strong>Zielgruppe:</strong> {gewaehlt.zielgruppe}
          </p>
          <h4>Vorgesehen ist</h4>
          <ul className="aufzaehlung">
            {gewaehlt.geplant.map((punkt) => (
              <li key={punkt}>{punkt}</li>
            ))}
          </ul>
          <p className="hinweis">
            Dieser Modus ist noch nicht gebaut. Bis dahin führt die digitale Übung durch die
            vollständige Lage.
          </p>
        </section>
      )}

      <section className="szenarioliste szenarioliste-zweitrangig">
        <h2>Szenarien bauen</h2>
        <article className="szenario-karte">
          <p className="lagemeldung">
            Eigene Lagen anlegen, Patienten und ihre Verläufe festlegen, Szenarien als Datei
            weitergeben - oder von einer KI entwerfen lassen und hier prüfen.
          </p>
          <div className="szenario-fuss">
            <span>
              {state.eigeneSzenarien.length === 0
                ? 'noch keine eigenen Szenarien'
                : `${state.eigeneSzenarien.length} eigene Szenarien`}
            </span>
            <button type="button" onClick={() => dispatch({ typ: 'uebungsleitungOeffnen' })}>
              Übungsleitung öffnen
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
