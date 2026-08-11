import { ABSCHNITTE } from '../domain/abschnitte';
import { istAbschnittEroeffnet } from '../domain/flaechen';
import { zugfuehrungAktiv } from '../domain/fuehrung';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.abschnittsleiste Reiter mit der Belegung je Abschnitt
 *
 * Wegweiser durch die Einsatzabschnitte mit der Zahl der Patienten je
 * Abschnitt - zugleich die Lageübersicht des Behandlungsplatzes. Die eigene
 * Position wird nebenbei synchron mitgeführt (→ `state.provider`,
 * `ui.delegationsanfrage`), ohne dass diese Ansicht davon etwas wissen muss.
 *
 * Zu Beginn steht nur die Schadensstelle - jeder weitere Bereich erscheint
 * erst, wenn dafür eine Fläche oder ein Zelt gesetzt wurde
 * (→ `domain.istAbschnittEroeffnet`). So wächst die Einsatzstelle sichtbar
 * mit der Führungsleistung, statt von Anfang an fertig dazustehen. Dieselbe
 * Blast-Radius-Begrenzung wie bei der Verlegung (→ `domain.zugfuehrungaktiv`):
 * ohne Zugführer in der Sitzung (Alleinspiel, Einzelfälle) bleibt die Leiste
 * ungefiltert, sonst gäbe es dort nie mehr als einen Reiter.
 */
export function Abschnittsleiste() {
  const { state, dispatch } = useSimulation();
  const gateAktiv = zugfuehrungAktiv(state.sitzung.aktiv, state.sitzung.spieler);
  const sichtbareAbschnitte = ABSCHNITTE.filter(
    (abschnitt) =>
      !gateAktiv ||
      abschnitt.id === state.ausgewaehlterAbschnitt ||
      istAbschnittEroeffnet(abschnitt.id, state.flaechen),
  );

  return (
    <nav className="abschnittsleiste" aria-label="Einsatzabschnitte">
      {sichtbareAbschnitte.map((abschnitt) => {
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
