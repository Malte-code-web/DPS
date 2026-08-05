import { MASSNAHMEN } from '../domain/massnahmen';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.delegationsbenachrichtigung Benachrichtigung: jemand braucht eine Freigabe
 *
 * Zeigt die älteste an die eigene Person gerichtete Delegationsanfrage als
 * Overlay - unabhängig davon, welche Unterseite gerade offen ist, ähnlich dem
 * Verbindungsfehler-Banner. Annehmen gibt die Maßnahme gezielt für die
 * anfragende Person frei (→ `modell.delegation`), Ablehnen verwirft die
 * Anfrage ohne weitere Wirkung.
 */
export function DelegationBenachrichtigung() {
  const { state, dispatch } = useSimulation();
  const eigeneId = state.sitzung.eigeneId;
  const anfrage = eigeneId
    ? state.delegationsanfragen.find((eintrag) => eintrag.angefragteId === eigeneId)
    : undefined;

  if (!anfrage) return null;

  const patient = state.patienten.find((eintrag) => eintrag.id === anfrage.patientId);
  const anfragender = state.sitzung.spieler.find((eintrag) => eintrag.id === anfrage.anfragendeId);
  const massnahme = MASSNAHMEN[anfrage.massnahmeId];

  const antworten = (angenommen: boolean) =>
    dispatch({ typ: 'delegationBeantworten', id: anfrage.id, angenommen });

  return (
    <div className="delegation-benachrichtigung-hintergrund">
      <div className="delegation-benachrichtigung" role="alertdialog" aria-label="Delegationsanfrage">
        <p>
          <strong>{anfragender?.name ?? 'Jemand'}</strong> möchte <strong>{massnahme.label}</strong>
          {patient && (
            <>
              {' '}
              bei <strong>{patient.name}</strong>
            </>
          )}{' '}
          durchführen und braucht deine Freigabe.
        </p>
        <div className="delegation-benachrichtigung-knoepfe">
          <button type="button" className="primaer" onClick={() => antworten(true)}>
            Annehmen
          </button>
          <button type="button" onClick={() => antworten(false)}>
            Ablehnen
          </button>
        </div>
      </div>
    </div>
  );
}
