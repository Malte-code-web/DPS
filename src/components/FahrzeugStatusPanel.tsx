import { FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import { formatStaerke, staerkemeldung } from '../domain/fuehrung';
import { geoPunktName } from '../domain/geodaten';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.fahrzeugstatuspanel Fahrzeugstand je Abschnitt, nur nach Abfrage sichtbar
 *
 * Derselbe Fahrzeugstand, den die Regie in `ui.abschnitteuebersicht`
 * beiläufig je Kachel sieht - hier als flache Liste, die der Zugführer erst
 * über einen bewussten Klick einblendet (→ `ui.zugfuehrerseite`). `geoPunktName`
 * statt `abschnittInfo` beschriftet auch den Bereitstellungsraum, der in der
 * normalen Abschnittsliste bewusst fehlt (→ `abschnitte.liste`).
 */
export function FahrzeugStatusPanel() {
  const { state } = useSimulation();

  if (state.fahrzeuge.length === 0) {
    return (
      <div className="panel">
        <p className="hinweis">Zurzeit kein Fahrzeug im Einsatz.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <ul className="fahrzeug-liste">
        {state.fahrzeuge.map((fahrzeug) => (
          <li key={fahrzeug.id} className="fahrzeug-zeile">
            <b>{FAHRZEUGTYP_INFO[fahrzeug.typ].label}</b>
            <span>
              {geoPunktName(fahrzeug.abschnitt)} · Stärke{' '}
              {formatStaerke(staerkemeldung(fahrzeug.besatzung, state.sitzung.spieler))}
              {fahrzeug.ausgefallen && ' · ausgefallen'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
