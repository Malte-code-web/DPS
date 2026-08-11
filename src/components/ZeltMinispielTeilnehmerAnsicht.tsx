import { RUNDEN_FENSTER_SEK } from '../domain/zeltMinispiel';
import { useSimulation } from '../state/useSimulation';
import type { ZeltMinispielLauf } from '../domain/types';

/**
 * @anker ui.zeltminispielbenachrichtigung.teilnehmer Teilnehmende erfahren nur die eigene Runde
 *
 * Bleibt still, bis die synchronisierte `aktuelleRundeIndex` (→ `case
 * 'tick'`, `domain.zeltminispiel`) auf die eigene Runde zeigt und das
 * Zeitfenster noch offen ist - kein Vorablesen des Plans, kein Timer, den
 * die Person selbst im Blick behalten müsste. Ein Treffer dispatcht direkt
 * `zeltMinispielRundeGetroffen`, ein Verpassen kostet nichts (→ Nutzerwunsch,
 * "Treffer kostet nichts, wenn es misslingt").
 */
export function ZeltMinispielTeilnehmerAnsicht({
  lauf,
  eigeneId,
}: {
  lauf: ZeltMinispielLauf;
  eigeneId: string;
}) {
  const { state, dispatch } = useSimulation();
  const runde = lauf.rundenplan[lauf.aktuelleRundeIndex];
  const dran =
    runde?.spielerId === eigeneId && state.zeitSek <= lauf.rundeBeginnZeitSek + RUNDEN_FENSTER_SEK;

  if (!dran) return null;

  const tippen = () =>
    dispatch({
      typ: 'zeltMinispielRundeGetroffen',
      laufId: lauf.id,
      spielerId: eigeneId,
      rundenIndex: lauf.aktuelleRundeIndex,
    });

  return (
    <div
      className="delegation-toast zeltminispiel-toast zeltminispiel-dran"
      role="alert"
      aria-label="Kommando-Aufbau: du bist dran"
    >
      <p>
        <strong>Jetzt!</strong> Dein Handgriff beim Zeltaufbau.
      </p>
      <div className="delegation-toast-knoepfe">
        <button type="button" className="primaer" onClick={tippen}>
          Anpacken!
        </button>
      </div>
    </div>
  );
}
