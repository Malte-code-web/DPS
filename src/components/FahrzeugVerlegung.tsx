import { moeglicheZiele } from '../domain/abschnitte';
import { darfFahrzeugeDisponieren } from '../domain/fuehrung';
import { verlegungsdauerSek } from '../domain/geodaten';
import { useSimulation } from '../state/useSimulation';
import { istFahrzeugVerlegenAktion } from '../state/zeitkosten';
import { useZeitkostenStatus, zeitkostenHintergrund } from '../state/useZeitkostenStatus';
import type { Fahrzeug } from '../domain/types';

/**
 * @anker ui.fahrzeugverlegung Fahrzeuge zwischen Abschnitten verlegen - nur mit Zugführer-Rang
 *
 * Wie `ui.verlegung` für Patienten, aber ohne Sichtungssperre (Fahrzeuge
 * werden nicht gesichtet) und zusätzlich gesperrt für alle unterhalb der
 * Führungsrolle Zugführer (→ `darfFahrzeugeDisponieren`) - Übungsleitung
 * ausgenommen.
 */
export function FahrzeugVerlegung({ fahrzeug }: { fahrzeug: Fahrzeug }) {
  const { state, dispatch } = useSimulation();
  const zk = useZeitkostenStatus();
  const zkBeschaeftigt = zk.aktion !== null;
  const ziele = moeglicheZiele(fahrzeug.abschnitt);
  const eigeneFuehrungsrolle = state.sitzung.spieler.find(
    (s) => s.id === state.sitzung.eigeneId,
  )?.fuehrungsrolle;
  const gesperrt = !darfFahrzeugeDisponieren(
    state.sitzung.aktiv,
    state.sitzung.rolle,
    eigeneFuehrungsrolle,
  );

  if (ziele.length === 0) {
    return <p className="hinweis">Das Fahrzeug hat den Behandlungsplatz verlassen.</p>;
  }

  return (
    <div className="verlegung">
      {gesperrt && (
        <p className="hinweis">Nur Übungsleitung oder Zugführer und höher dürfen verlegen.</p>
      )}
      {ziele.map((ziel) => {
        const zkEigen =
          zk.aktion !== null && istFahrzeugVerlegenAktion(zk.aktion, fahrzeug.id, ziel.id);
        return (
          <button
            key={ziel.id}
            type="button"
            className={`verlegung-button${ziel.kategorie ? ` rand-${ziel.kategorie}` : ''}`}
            style={zkEigen ? zeitkostenHintergrund(zk.anteil) : undefined}
            disabled={gesperrt || (zkBeschaeftigt && !zkEigen)}
            aria-busy={zkEigen || undefined}
            onClick={() =>
              dispatch({ typ: 'fahrzeugVerlegen', fahrzeugId: fahrzeug.id, ziel: ziel.id })
            }
          >
            <span className="verlegung-ziel">{ziel.name}</span>
            <span className="verlegung-dauer">
              {zkEigen
                ? `noch ${zk.restSek} s`
                : `${Math.round(verlegungsdauerSek(state.routen, fahrzeug.abschnitt, ziel.id))} s`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
