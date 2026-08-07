import { FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import {
  FUEHRUNGSROLLE_LABEL,
  FUEHRUNGSROLLEN,
  darfFahrzeugeDisponieren,
  formatStaerke,
  staerkemeldung,
} from '../domain/fuehrung';
import { QUALIFIKATION_VOLLNAME } from '../domain/massnahmen';
import { beobachterCode } from '../domain/sitzung';
import { useSimulation } from '../state/useSimulation';
import type { Fuehrungsrolle, Qualifikation } from '../domain/types';

const QUALIFIKATIONEN: Qualifikation[] = [
  'basis',
  'rettungshelfer',
  'rettungssanitaeter',
  'notsan',
  'notarzt',
];

const LEERER_PLATZ = '';

/** @anker ui.wartebereich Lobby vor dem Start - Code, Teilnehmende, Startknopf */
export function WartebereichSeite() {
  const { state, dispatch } = useSimulation();
  const { sitzung, szenario, fahrzeuge } = state;
  const host = sitzung.rolle === 'uebungsleiter';
  const eigeneFuehrungsrolle = sitzung.spieler.find((s) => s.id === sitzung.eigeneId)?.fuehrungsrolle;
  const darfDisponieren = darfFahrzeugeDisponieren(sitzung.aktiv, sitzung.rolle, eigeneFuehrungsrolle);
  const gesamtStaerke = staerkemeldung(fahrzeuge.flatMap((fahrzeug) => fahrzeug.besatzung), sitzung.spieler);
  const gesamtSoll = fahrzeuge.reduce(
    (summe, fahrzeug) => summe + FAHRZEUGTYP_INFO[fahrzeug.typ].sollbesatzung,
    0,
  );

  const platzSetzen = (fahrzeugId: string, platz: number, spielerId: string) => {
    const fahrzeug = fahrzeuge.find((f) => f.id === fahrzeugId);
    if (!fahrzeug) return;
    // Positionell (Index = Platz) statt kompaktiert, damit das Leeren eines
    // Platzes die übrigen Plätze nicht verschiebt (→ `modell.fahrzeug`).
    const plaetze = Array.from(
      { length: FAHRZEUGTYP_INFO[fahrzeug.typ].sollbesatzung },
      (_, index) => fahrzeug.besatzung[index] ?? LEERER_PLATZ,
    );
    plaetze[platz] = spielerId;
    dispatch({ typ: 'fahrzeugBesatzungGesetzt', fahrzeugId, besatzung: plaetze });
  };

  return (
    <main className="setup">
      <section className="setup-kopf">
        <button type="button" onClick={() => dispatch({ typ: 'sitzungVerlassen' })}>
          &larr; Verlassen
        </button>
        <h1>Wartebereich</h1>
        <p>
          {host
            ? 'Gib den Code weiter. Sobald alle da sind, startest du die Übung.'
            : 'Warte, bis die Übungsleitung die Übung startet.'}
        </p>
      </section>

      <section className="wartebereich">
        <div className="warte-code">
          <span className="warte-code-label">Sitzungscode</span>
          <span className="warte-code-wert">{sitzung.code}</span>
        </div>

        {host && sitzung.code && (
          <div className="warte-code warte-code-beobachter">
            <span className="warte-code-label">Beobachter-Code</span>
            <span className="warte-code-wert">{beobachterCode(sitzung.code)}</span>
            <p className="hinweis">
              Nur gezielt weitergeben - wer diesen Code eingibt, sieht und steuert wie die
              Übungsleitung.
            </p>
          </div>
        )}

        {sitzung.verbindungsfehler && (
          <p className="hinweis hinweis-fehler" role="alert">
            Verbindung gestört: {sitzung.verbindungsfehler} Prüfe die Internetverbindung - die Seite
            versucht es weiter im Hintergrund.
          </p>
        )}

        {host && szenario && (
          <p className="hinweis">
            Szenario: <strong>{szenario.titel}</strong> · {szenario.patienten.length} Betroffene
          </p>
        )}

        {host && (
          <div className="freigabemodus-wahl">
            <span className="freigabemodus-label">Patientenfreigabe</span>
            <label className="freigabemodus-option">
              <input
                type="radio"
                name="freigabemodus"
                checked={state.freigabemodus === 'sofort'}
                onChange={() => dispatch({ typ: 'freigabemodusSetzen', modus: 'sofort' })}
              />
              <span>
                <strong>Sofort</strong> – alle Patienten sofort an der Schadensstelle sichtbar
              </span>
            </label>
            <label className="freigabemodus-option">
              <input
                type="radio"
                name="freigabemodus"
                checked={state.freigabemodus === 'gestaffelt'}
                onChange={() => dispatch({ typ: 'freigabemodusSetzen', modus: 'gestaffelt' })}
              />
              <span>
                <strong>Gestaffelt</strong> – Patienten beginnen verdeckt in einer Ablage; die Regie
                gibt sie im Einsatz gezielt frei (manuell oder zeitgesteuert)
              </span>
            </label>
          </div>
        )}

        <h2>Teilnehmende ({sitzung.spieler.length})</h2>
        {sitzung.spieler.length > 0 && (
          <p className="hinweis">
            Stelle deine eigene fachliche Qualifikation ein - sichtbar für alle. Maßnahmen darüber
            sind im Einsatz gesperrt, bis jemand mit ausreichender Qualifikation sie für den
            Patienten freigibt. Die Führungsrolle teilt die Übungsleitung zu, nicht jede Person
            selbst.
          </p>
        )}
        {sitzung.spieler.length === 0 ? (
          <p className="hinweis">Noch niemand beigetreten.</p>
        ) : (
          <ul className="spielerliste">
            {sitzung.spieler.map((spieler) => {
              const eigeneZeile = spieler.id === sitzung.eigeneId;
              return (
                <li key={spieler.id} className={`spieler spieler-${spieler.rolle}`}>
                  <span className="spieler-name">{spieler.name}</span>
                  <span className="spieler-rolle">
                    {spieler.rolle === 'uebungsleiter' ? 'Übungsleitung' : 'Spieler'}
                  </span>
                  {eigeneZeile ? (
                    <select
                      className="spieler-qualifikation-wahl"
                      aria-label="Deine Qualifikation"
                      value={spieler.qualifikation}
                      onChange={(event) =>
                        dispatch({
                          typ: 'spielerQualifikationSetzen',
                          spielerId: spieler.id,
                          qualifikation: event.target.value as Qualifikation,
                        })
                      }
                    >
                      {QUALIFIKATIONEN.map((qualifikation) => (
                        <option key={qualifikation} value={qualifikation}>
                          {QUALIFIKATION_VOLLNAME[qualifikation]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="spieler-qualifikation">
                      {QUALIFIKATION_VOLLNAME[spieler.qualifikation]}
                    </span>
                  )}
                  {host ? (
                    <select
                      className="spieler-fuehrungsrolle-wahl"
                      aria-label={`Führungsrolle von ${spieler.name}`}
                      value={spieler.fuehrungsrolle ?? 'keine'}
                      onChange={(event) =>
                        dispatch({
                          typ: 'spielerFuehrungsrolleSetzen',
                          spielerId: spieler.id,
                          rolle: event.target.value as Fuehrungsrolle,
                        })
                      }
                    >
                      {FUEHRUNGSROLLEN.map((rolle) => (
                        <option key={rolle} value={rolle}>
                          {FUEHRUNGSROLLE_LABEL[rolle]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    (spieler.fuehrungsrolle ?? 'keine') !== 'keine' && (
                      <span className="spieler-fuehrungsrolle">
                        {FUEHRUNGSROLLE_LABEL[spieler.fuehrungsrolle ?? 'keine']}
                      </span>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {fahrzeuge.length > 0 && (
          <>
            <h2>Fahrzeuge &amp; Besatzung ({fahrzeuge.length})</h2>
            <p className="hinweis fahrzeug-staerke-gesamt">
              Stärkemeldung gesamt: <strong>{formatStaerke(gesamtStaerke)}</strong> (Soll {gesamtSoll})
            </p>
            {!darfDisponieren && (
              <p className="hinweis">
                Besatzung zuweisen dürfen die Übungsleitung oder eine Person mit Führungsrolle ab
                Zugführer.
              </p>
            )}
            <ul className="fahrzeugliste">
              {fahrzeuge.map((fahrzeug) => {
                const sollbesatzung = FAHRZEUGTYP_INFO[fahrzeug.typ].sollbesatzung;
                const staerke = staerkemeldung(fahrzeug.besatzung, sitzung.spieler);
                const besatzungNamen = fahrzeug.besatzung
                  .map((id) => sitzung.spieler.find((s) => s.id === id)?.name)
                  .filter(Boolean)
                  .join(', ');
                return (
                  <li key={fahrzeug.id} className="fahrzeug-besatzung-zeile">
                    <div className="fahrzeug-besatzung-kopf">
                      <span className="fahrzeug-typ">{FAHRZEUGTYP_INFO[fahrzeug.typ].label}</span>
                      <span
                        className={
                          staerke.gesamt < sollbesatzung
                            ? 'fahrzeug-staerke fahrzeug-staerke-unvollstaendig'
                            : 'fahrzeug-staerke'
                        }
                      >
                        Stärke {formatStaerke(staerke)} (Soll {sollbesatzung})
                      </span>
                    </div>
                    {darfDisponieren ? (
                      <div className="besatzung-plaetze">
                        {Array.from({ length: sollbesatzung }, (_, platz) => {
                          const besetztMit = fahrzeug.besatzung[platz] ?? LEERER_PLATZ;
                          return (
                            <select
                              key={platz}
                              className="besatzung-platz-wahl"
                              aria-label={`Besatzung Platz ${platz + 1} von ${FAHRZEUGTYP_INFO[fahrzeug.typ].label}`}
                              value={besetztMit}
                              onChange={(event) => platzSetzen(fahrzeug.id, platz, event.target.value)}
                            >
                              <option value={LEERER_PLATZ}>– frei –</option>
                              {sitzung.spieler
                                .filter(
                                  (spieler) =>
                                    spieler.id === besetztMit || !fahrzeug.besatzung.includes(spieler.id),
                                )
                                .map((spieler) => (
                                  <option key={spieler.id} value={spieler.id}>
                                    {spieler.name}
                                  </option>
                                ))}
                            </select>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="fahrzeug-besatzung-namen">
                        {besatzungNamen || 'keine Besatzung'}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {host ? (
          <button
            type="button"
            className="primaer"
            disabled={!szenario}
            onClick={() => dispatch({ typ: 'sitzungStarten' })}
          >
            Übung starten
          </button>
        ) : (
          <p className="warte-hinweis">Bereit – warten auf den Start …</p>
        )}
      </section>
    </main>
  );
}
