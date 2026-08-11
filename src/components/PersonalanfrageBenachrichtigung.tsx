import { geoPunktName } from '../domain/geodaten';
import { useSimulation } from '../state/useSimulation';
import type { Personalanfrage } from '../domain/types';
import type { Spieler } from '../domain/sitzung';

/**
 * @anker ui.personalanfrage Benachrichtigung: Rückfrage, bevor jemand umgeteilt wird
 *
 * Gegenstück zu `modell.personalanfrage` - Personal wird nicht über die Köpfe
 * hinweg verschoben. Drei Texte, weil dieselbe Anfrage je nach Anlass und
 * Stufe an unterschiedliche Personen geht:
 * - Freigabe: der Gruppenführer vor Ort wird gefragt, ob er jemanden ziehen
 *   lässt, den seine eigene Gruppe gerade abgeordnet hat.
 * - Mitkommen: die betroffene Person entscheidet selbst, ob sie ihrer Gruppe
 *   folgt.
 * - Gruppenwechsel: die betroffene Person bestätigt den Wechsel in eine
 *   andere Gruppe.
 *
 * Immer nur die älteste offene Anfrage zeigen: mehrere gleichzeitige
 * Toasts würden einander überdecken (sie liegen alle an derselben fixen
 * Position, → `.delegation-toast`), und jede Antwort holt die nächste
 * ohnehin sofort nach.
 */
function anfrageText(
  anfrage: Personalanfrage,
  person: Spieler | undefined,
  ausloeser: Spieler | undefined,
  zielGruppenfuehrer: Spieler | undefined,
) {
  const name = person?.name ?? 'Eine Person';
  if (anfrage.grund === 'gruppenwechsel') {
    return (
      <>
        <strong>{ausloeser?.name ?? 'Die Führung'}</strong> möchte dich in die Gruppe von{' '}
        <strong>{zielGruppenfuehrer?.name ?? 'einem Gruppenführer'}</strong> umteilen.
      </>
    );
  }
  if (anfrage.stufe === 'freigabe') {
    return (
      <>
        <strong>{name}</strong> arbeitet bei dir, wird aber von der eigenen Gruppe nach{' '}
        <strong>{anfrage.ziel ? geoPunktName(anfrage.ziel) : 'einem anderen Abschnitt'}</strong>{' '}
        gerufen. Freigeben?
      </>
    );
  }
  return (
    <>
      Deine Gruppe verlegt nach{' '}
      <strong>{anfrage.ziel ? geoPunktName(anfrage.ziel) : 'einen anderen Abschnitt'}</strong> - du
      bist aber einzeln eingeteilt. Mitkommen?
    </>
  );
}

export function PersonalanfrageBenachrichtigung() {
  const { state, dispatch } = useSimulation();
  const eigeneId = state.sitzung.eigeneId;
  const anfrage = eigeneId
    ? state.personalanfragen.find((eintrag) => eintrag.anEmpfaengerId === eigeneId)
    : undefined;

  if (!anfrage) return null;

  const person = state.sitzung.spieler.find((eintrag) => eintrag.id === anfrage.spielerId);
  const ausloeser = state.sitzung.spieler.find((eintrag) => eintrag.id === anfrage.ausgeloestVonId);
  const zielGruppenfuehrer = state.sitzung.spieler.find(
    (eintrag) => eintrag.id === anfrage.neuerGruppenfuehrerId,
  );
  const freigabe = anfrage.grund === 'abschnittswechsel' && anfrage.stufe === 'freigabe';

  const beantworten = (angenommen: boolean) =>
    dispatch({ typ: 'personalanfrageBeantworten', id: anfrage.id, angenommen });

  return (
    <div className="delegation-toast" role="alert" aria-label="Personalanfrage">
      <p>{anfrageText(anfrage, person, ausloeser, zielGruppenfuehrer)}</p>
      <div className="delegation-toast-knoepfe">
        <button type="button" className="primaer" onClick={() => beantworten(true)}>
          {freigabe ? 'Freigeben' : 'Ja, wechseln'}
        </button>
        <button type="button" onClick={() => beantworten(false)}>
          {freigabe ? 'Behalten' : 'Bleiben'}
        </button>
      </div>
    </div>
  );
}
