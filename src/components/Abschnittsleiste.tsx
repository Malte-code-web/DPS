import { ABSCHNITTE } from '../domain/abschnitte';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.abschnittsleiste Reiter mit der Belegung je Abschnitt
 *
 * Wegweiser durch die Einsatzabschnitte mit der Zahl der Patienten je
 * Abschnitt - zugleich die Lageübersicht des Behandlungsplatzes. Die eigene
 * Position wird nebenbei synchron mitgeführt (→ `state.provider`,
 * `ui.delegationsanfrage`), ohne dass diese Ansicht davon etwas wissen muss.
 */
export function Abschnittsleiste() {
  const { state, dispatch } = useSimulation();

  return (
    <nav className="abschnittsleiste" aria-label="Einsatzabschnitte">
      {ABSCHNITTE.map((abschnitt) => {
        const anzahl = state.patienten.filter(
          (patient) => patient.abschnitt === abschnitt.id,
        ).length;
        const fahrzeugAnzahl = state.fahrzeuge.filter(
          (fahrzeug) => fahrzeug.abschnitt === abschnitt.id,
        ).length;
        const aktiv = state.ausgewaehlterAbschnitt === abschnitt.id;
        const farbe = abschnitt.kategorie ? ` rand-${abschnitt.kategorie}` : '';

        return (
          <button
            key={abschnitt.id}
            type="button"
            className={`abschnitt-reiter${aktiv ? ' abschnitt-aktiv' : ''}${farbe}`}
            aria-current={aktiv ? 'page' : undefined}
            onClick={() => dispatch({ typ: 'abschnittWaehlen', abschnitt: abschnitt.id })}
          >
            <span className="abschnitt-name">{abschnitt.kurz}</span>
            <span className="abschnitt-anzahl">{anzahl}</span>
            {fahrzeugAnzahl > 0 && (
              <span className="abschnitt-fahrzeuganzahl" aria-label={`${fahrzeugAnzahl} Fahrzeuge`}>
                Fzg {fahrzeugAnzahl}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
