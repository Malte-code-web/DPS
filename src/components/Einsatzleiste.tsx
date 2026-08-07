import { SICHTUNGSKATEGORIEN } from '../domain/types';
import { ZAEHL_REIHENFOLGE, zaehleSichtung } from '../lib/auswertung';
import { zeitFormat } from '../lib/format';
import { useSimulation } from '../state/useSimulation';
import type { Szenario } from '../domain/types';

/**
 * @anker ui.einsatzleiste Kopfzeile: Uhr, Status, Sichtungszähler
 *
 * Pause/Tempo/Einsatz-beenden stehen nicht mehr hier, sondern im Regie-Panel
 * (→ `ui.regiepanel`) - diese Leiste zeigt für alle Rollen nur noch den
 * reinen Status ("läuft"/"pausiert"), Spieler zusätzlich ihren eigenen
 * Verlassen-Knopf (kein Reducer-Wechsel wie bei der Übungsleitung, die die
 * Sitzung als Ganzes beendet statt sie zu verlassen).
 */
export function Einsatzleiste({ szenario }: { szenario: Szenario }) {
  const { state, dispatch } = useSimulation();
  const zaehler = zaehleSichtung(state.patienten);
  const spieler = state.sitzung.rolle === 'spieler';

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
        <div className="steuerung steuerung-status">
          <span className="spieler-hinweis">{state.laufend ? 'läuft' : 'pausiert'}</span>
          {spieler && (
            <button type="button" onClick={() => dispatch({ typ: 'sitzungVerlassen' })}>
              Verlassen
            </button>
          )}
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
