import { FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import { darfFahrzeugeDisponieren } from '../domain/fuehrung';
import { verlegungsdauerSek } from '../domain/geodaten';
import { useSimulation } from '../state/useSimulation';
import { istPatientAbtransportierenAktion } from '../state/zeitkosten';
import { useZeitkostenStatus, zeitkostenHintergrund } from '../state/useZeitkostenStatus';
import type { Patient } from '../domain/types';

/**
 * @anker ui.patienttransportzuweisung Transportfahrzeug zuweisen = Abtransport freigeben
 *
 * Ersetzt an der Ausgangssichtung den alten Direktknopf, sobald ein
 * Zugführer mitspielt (→ `ui.verlegung`, `domain.zugfuehrungaktiv`). Zeigt
 * nur freie RTW/KTW, die selbst schon an der Ausgangssichtung stehen (→
 * `modell.transport`) - ein Klick weist zu **und** gibt zugleich frei, kein
 * separater Genehmigungsschritt. Gleiche Rechtestufe wie jede andere
 * Fahrzeugdisposition (→ `darfFahrzeugeDisponieren`).
 */
export function PatientTransportZuweisung({ patient }: { patient: Patient }) {
  const { state, dispatch } = useSimulation();
  const zk = useZeitkostenStatus();
  const zkBeschaeftigt = zk.aktion !== null;
  const eigeneFuehrungsrolle = state.sitzung.spieler.find(
    (s) => s.id === state.sitzung.eigeneId,
  )?.fuehrungsrolle;
  const gesperrt = !darfFahrzeugeDisponieren(
    state.sitzung.aktiv,
    state.sitzung.rolle,
    eigeneFuehrungsrolle,
  );
  const fahrzeuge = state.fahrzeuge.filter(
    (fahrzeug) =>
      (fahrzeug.typ === 'rtw' || fahrzeug.typ === 'ktw') &&
      fahrzeug.abschnitt === 'ausgangssichtung' &&
      !fahrzeug.transportierterPatientId,
  );

  if (gesperrt) {
    return (
      <p className="hinweis">Nur Übungsleitung oder Zugführer und höher dürfen Transporte freigeben.</p>
    );
  }

  if (fahrzeuge.length === 0) {
    return <p className="hinweis">Noch kein freies Transportfahrzeug an der Ausgangssichtung.</p>;
  }

  return (
    <div className="verlegung">
      {fahrzeuge.map((fahrzeug) => {
        const zkEigen =
          zk.aktion !== null && istPatientAbtransportierenAktion(zk.aktion, patient.id, fahrzeug.id);
        return (
          <button
            key={fahrzeug.id}
            type="button"
            className="verlegung-button"
            style={zkEigen ? zeitkostenHintergrund(zk.anteil) : undefined}
            disabled={zkBeschaeftigt && !zkEigen}
            aria-busy={zkEigen || undefined}
            onClick={() =>
              dispatch({
                typ: 'patientAbtransportieren',
                patientId: patient.id,
                fahrzeugId: fahrzeug.id,
                spielerId: state.sitzung.eigeneId ?? undefined,
              })
            }
          >
            <span className="verlegung-ziel">
              {FAHRZEUGTYP_INFO[fahrzeug.typ].label}
              {fahrzeug.kennung ? ` (${fahrzeug.kennung})` : ''}
            </span>
            <span className="verlegung-dauer">
              {zkEigen
                ? `noch ${zk.restSek} s`
                : `${Math.round(verlegungsdauerSek(state.routen, 'ausgangssichtung', 'transport'))} s`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
