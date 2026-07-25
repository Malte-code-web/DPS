import { VERLEGUNGSDAUER_SEK, moeglicheZiele, zeltFuerKategorie } from '../domain/abschnitte';
import { useSimulation } from '../state/useSimulation';
import type { Patient } from '../domain/types';

/**
 * @anker ui.verlegung Schaltflächen zum Verlegen, passendes Zelt hervorgehoben
 *
 * Verlegung in den nächsten Einsatzabschnitt. Passt ein Ziel zur vergebenen
 * Sichtungskategorie, wird es hervorgehoben - abweichend verlegen bleibt aber
 * jederzeit möglich.
 */
export function Verlegung({ patient }: { patient: Patient }) {
  const { dispatch } = useSimulation();
  const ziele = moeglicheZiele(patient.abschnitt);
  const verstorben = patient.status === 'verstorben';

  if (ziele.length === 0) {
    return <p className="hinweis">Der Patient hat den Behandlungsplatz verlassen.</p>;
  }

  const empfohlen = patient.gesichtetAls ? zeltFuerKategorie(patient.gesichtetAls) : null;

  return (
    <div className="verlegung">
      {ziele.map((ziel) => {
        const passend = ziel.id === empfohlen;
        return (
          <button
            key={ziel.id}
            type="button"
            className={`verlegung-button${passend ? ' verlegung-empfohlen' : ''}${
              ziel.kategorie ? ` rand-${ziel.kategorie}` : ''
            }`}
            disabled={verstorben}
            onClick={() => dispatch({ typ: 'patientVerlegen', patientId: patient.id, ziel: ziel.id })}
          >
            <span className="verlegung-ziel">{ziel.name}</span>
            <span className="verlegung-dauer">{VERLEGUNGSDAUER_SEK} s</span>
          </button>
        );
      })}
    </div>
  );
}
