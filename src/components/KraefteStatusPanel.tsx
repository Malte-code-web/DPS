import { geoPunktName } from '../domain/geodaten';
import { QUALIFIKATION_LABEL } from '../domain/massnahmen';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.kraeftestatuspanel Wer wo steht, nur nach Abfrage sichtbar
 *
 * Dieselbe Kräfte-Übersicht wie in `ui.abschnitteuebersicht`, aber als eine
 * flache Liste über alle Abschnitte statt je Kachel verstreut - erst nach
 * bewusster Abfrage sichtbar (→ `ui.zugfuehrerseite`).
 */
export function KraefteStatusPanel() {
  const { state } = useSimulation();
  const kraefte = state.sitzung.spieler.filter((spieler) => spieler.rolle === 'spieler');

  if (kraefte.length === 0) {
    return (
      <div className="panel">
        <p className="hinweis">Zurzeit keine Kräfte in der Sitzung.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <ul className="kraefte-liste">
        {kraefte.map((spieler) => {
          const gebunden = spieler.gebundenBis !== undefined && spieler.gebundenBis > state.zeitSek;
          return (
            <li key={spieler.id} className="kraft-zeile">
              <span>
                <span className="kraft-name">{spieler.name}</span>{' '}
                <span className="kraft-qual">{QUALIFIKATION_LABEL[spieler.qualifikation]}</span>
                {' · '}
                {spieler.aktuellerAbschnitt ? geoPunktName(spieler.aktuellerAbschnitt) : 'noch nicht verortet'}
              </span>
              {gebunden && <span className="gebunden-marker">{spieler.gebundenGrund}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
