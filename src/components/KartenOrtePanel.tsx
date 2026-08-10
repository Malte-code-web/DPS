import { geoPunktName } from '../domain/geodaten';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.kartenortepanel Vom Zugführer angelegte Wegstrecken als Liste in der Seitenleiste
 *
 * Dieselben Wegstrecken wie auf der Karte selbst (→ `ui.lagekarte.wegstrecke`), nur als Text -
 * für schnelles Überfliegen ohne auf einzelne Linien zu zielen. Keine Mindestdistanz mehr: jede
 * Route entsteht durch eine bewusste Führungsentscheidung des Zugführers (nicht mehr automatisch
 * aus Nachbarschaft), also gehört auch eine kurze Verbindung in die Liste.
 */
export function KartenOrtePanel() {
  const { state } = useSimulation();
  const routen = state.routen;

  if (routen.length === 0) return null;

  return (
    <div className="panel">
      <div className="panel-titel">
        <h2>Angelegte Wegstrecken</h2>
      </div>
      <ul className="ort-liste">
        {routen.map((route) => (
          <li key={route.id} className="ort-zeile">
            <span>
              {geoPunktName(route.von)} &harr; {geoPunktName(route.nach)}
            </span>
            <span className="entfernung">≈ {Math.round(route.distanzMeter)} m</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
