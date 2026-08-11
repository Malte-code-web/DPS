import { geoPunktName } from '../domain/geodaten';
import { groesseVon } from '../domain/flaechen';
import { useSimulation } from '../state/useSimulation';
import type { ZeltMinispielLauf } from '../domain/types';

function formatRestSek(restSek: number): string {
  return restSek >= 60 ? `${Math.ceil(restSek / 60)} min` : `${restSek} s`;
}

/**
 * @anker ui.zeltminispielbenachrichtigung.gruppenfuehrer Gruppenführer sieht den vollen Rundenplan
 *
 * Nur hier - nicht bei Teilnehmenden (→ `ZeltMinispielTeilnehmerAnsicht`) -
 * erscheint der volle `rundenplan` (→ `domain.zeltminispiel`,
 * Sichtbarkeits-Konvention: der Plan liegt zwar im geteilten Zustand, wird
 * aber nur hier gerendert). Rein lesend: die Weitergabe der Zeitpunkte an
 * die Gruppe läuft bewusst über echten Sprechfunk statt über automatisierte
 * UI (→ Nutzerwunsch).
 */
export function ZeltMinispielGruppenfuehrerAnsicht({ lauf }: { lauf: ZeltMinispielLauf }) {
  const { state } = useSimulation();
  const info = groesseVon(lauf.flaechenTyp);
  const restSek = Math.max(0, Math.round(lauf.zielZeitSek - state.zeitSek));
  const namenVon = (spielerId: string) =>
    state.sitzung.spieler.find((eintrag) => eintrag.id === spielerId)?.name ?? spielerId;

  return (
    <div className="delegation-toast zeltminispiel-toast" role="status" aria-label="Zeltaufbau-Minispiel">
      <p>
        <strong>Kommando-Aufbau:</strong> {info.bezeichnung} für <strong>{geoPunktName(lauf.abschnitt)}</strong>{' '}
        - noch {formatRestSek(restSek)}.
      </p>
      <p className="hinweis">Rundenplan per Funk weitergeben, nicht selbst zeigen:</p>
      <ol className="zeltminispiel-rundenplan">
        {lauf.rundenplan.map((runde, index) => (
          <li
            key={index}
            className={index === lauf.aktuelleRundeIndex ? 'zeltminispiel-runde-aktuell' : undefined}
          >
            {namenVon(runde.spielerId)}
          </li>
        ))}
      </ol>
    </div>
  );
}
