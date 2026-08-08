import { istRegiefuehrend } from '../domain/fuehrung';
import { SICHTUNGSKATEGORIEN } from '../domain/types';
import { ZAEHL_REIHENFOLGE, zaehleSichtung } from '../lib/auswertung';
import { zeitFormat } from '../lib/format';
import { useSimulation } from '../state/useSimulation';
import type { Szenario } from '../domain/types';

const GESCHWINDIGKEITEN = [1, 2, 4, 10];

/**
 * @anker ui.einsatzleiste Kopfzeile: Sichtungszähler, Uhr, Status, Ablaufsteuerung
 *
 * Zwei übereinander angeheftete Zeilen (beide `position: sticky`): oben die
 * Sichtungskategorien-Übersicht über die volle Breite (`.sichtungsleiste`),
 * darunter Titel/Lagemeldung links sowie Uhr und Status. Pause/Tempo/
 * Einsatz-beenden stehen wieder hier statt in der Regie-Seitenleiste
 * (→ `ui.gesamtlagebild`) - nur für Übungsleitung/Beobachter
 * (→ `domain.regiefuehrend`); Spieler sehen an derselben Stelle nur den
 * reinen Status und ihren eigenen Verlassen-Knopf (kein Reducer-Wechsel
 * wie bei der Übungsleitung, die die Sitzung als Ganzes beendet statt sie
 * zu verlassen).
 */
export function Einsatzleiste({ szenario }: { szenario: Szenario }) {
  const { state, dispatch } = useSimulation();
  const zaehler = zaehleSichtung(state.patienten);
  const spieler = state.sitzung.rolle === 'spieler';
  const regiefuehrend = istRegiefuehrend(state.sitzung.rolle);

  return (
    <>
      <div className="sichtungsleiste" aria-label="Sichtungskategorien-Übersicht">
        {ZAEHL_REIHENFOLGE.map((schluessel) => (
          <div key={schluessel} className={`zaehler zaehler-${schluessel}`}>
            <span className="zaehler-wert">{zaehler[schluessel]}</span>
            <span className="zaehler-label">
              {schluessel === 'offen' ? 'offen' : `SK ${SICHTUNGSKATEGORIEN[schluessel].kuerzel}`}
            </span>
          </div>
        ))}
      </div>

      <header className="einsatzleiste">
        <div className="einsatzleiste-links">
          <h1>
            {szenario.titel}
            {state.alleine && (
              <span className="allein-marke" title="Alleinspiel: langsamere Verschlechterung">
                Allein
              </span>
            )}
          </h1>
          <p className="lagemeldung">{szenario.lagemeldung}</p>
        </div>

        <div className="einsatzleiste-mitte">
          <div className="uhr" aria-label="Einsatzzeit">
            {zeitFormat(state.zeitSek)}
          </div>
          {regiefuehrend ? (
            <div className="steuerung regie-ablaufsteuerung">
              <button
                type="button"
                className="primaer"
                onClick={() => dispatch({ typ: 'pauseUmschalten' })}
              >
                {state.laufend ? 'Pause' : 'Weiter'}
              </button>
              <label>
                Tempo
                <select
                  value={state.geschwindigkeit}
                  onChange={(event) =>
                    dispatch({ typ: 'geschwindigkeitSetzen', wert: Number(event.target.value) })
                  }
                >
                  {GESCHWINDIGKEITEN.map((wert) => (
                    <option key={wert} value={wert}>
                      {wert}x
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => dispatch({ typ: 'einsatzBeenden' })}>
                Einsatz beenden
              </button>
            </div>
          ) : (
            <div className="steuerung steuerung-status">
              <span className="spieler-hinweis">{state.laufend ? 'läuft' : 'pausiert'}</span>
              {spieler && (
                <button type="button" onClick={() => dispatch({ typ: 'sitzungVerlassen' })}>
                  Verlassen
                </button>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
