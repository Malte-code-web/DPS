import { SICHTUNGSKATEGORIEN } from '../domain/types';
import { ZAEHL_REIHENFOLGE, zaehleSichtung } from '../lib/auswertung';
import { zeitFormat } from '../lib/format';
import { useSimulation } from '../state/useSimulation';
import type { Szenario } from '../domain/types';

const GESCHWINDIGKEITEN = [1, 2, 4, 10];

export function Einsatzleiste({ szenario }: { szenario: Szenario }) {
  const { state, dispatch } = useSimulation();
  const zaehler = zaehleSichtung(state.patienten);

  return (
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
        <div className="steuerung">
          <button type="button" className="primaer" onClick={() => dispatch({ typ: 'pauseUmschalten' })}>
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
      </div>

      <div className="einsatzleiste-rechts">
        {ZAEHL_REIHENFOLGE.map((schluessel) => (
          <div key={schluessel} className={`zaehler zaehler-${schluessel}`}>
            <span className="zaehler-wert">{zaehler[schluessel]}</span>
            <span className="zaehler-label">
              {schluessel === 'offen' ? 'offen' : `SK ${SICHTUNGSKATEGORIEN[schluessel].kuerzel}`}
            </span>
          </div>
        ))}
      </div>
    </header>
  );
}
