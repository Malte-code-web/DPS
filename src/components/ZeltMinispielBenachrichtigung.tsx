import { MINISPIEL_AKTIV } from '../domain/zeltMinispiel';
import { useSimulation } from '../state/useSimulation';
import { ZeltMinispielGruppenfuehrerAnsicht } from './ZeltMinispielGruppenfuehrerAnsicht';
import { ZeltMinispielTeilnehmerAnsicht } from './ZeltMinispielTeilnehmerAnsicht';

/**
 * @anker ui.zeltminispielbenachrichtigung Toast fürs Zeltaufbau-Minispiel "Kommando-Aufbau"
 *
 * Dünne Weiche zwischen den beiden Rollen-Ansichten (→
 * `ui.zeltminispielbenachrichtigung.gruppenfuehrer`,
 * `ui.zeltminispielbenachrichtigung.teilnehmer`) - wie
 * `ZeltBefehlBenachrichtigung`/`AbschnittFuehrenBefehlBenachrichtigung`
 * unabhängig vom aktuell betrachteten Abschnitt sichtbar. Rendert `null`,
 * sobald das Minispiel per `MINISPIEL_AKTIV` abgeschaltet ist (→
 * `domain.zeltminispiel`) - der einzige UI-seitige Prüfpunkt des Schalters.
 */
export function ZeltMinispielBenachrichtigung() {
  const { state } = useSimulation();
  if (!MINISPIEL_AKTIV) return null;

  const eigeneId = state.sitzung.eigeneId;
  if (!eigeneId) return null;

  const alsGruppenfuehrer = state.zeltMinispiele.find((lauf) => lauf.gruppenfuehrerId === eigeneId);
  if (alsGruppenfuehrer) return <ZeltMinispielGruppenfuehrerAnsicht lauf={alsGruppenfuehrer} />;

  const alsTeilnehmer = state.zeltMinispiele.find((lauf) => lauf.teilnehmerIds.includes(eigeneId));
  if (alsTeilnehmer) return <ZeltMinispielTeilnehmerAnsicht lauf={alsTeilnehmer} eigeneId={eigeneId} />;

  return null;
}
