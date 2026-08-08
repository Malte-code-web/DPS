import { moeglicheZiele, zeltFuerKategorie } from '../domain/abschnitte';
import { zugfuehrungAktiv } from '../domain/fuehrung';
import { verlegungsdauerSek } from '../domain/geodaten';
import { sichtungOffen } from '../domain/simulation';
import { istAbschnittEroeffnet } from '../domain/flaechen';
import { useSimulation } from '../state/useSimulation';
import { istPatientVerlegenAktion } from '../state/zeitkosten';
import { useZeitkostenStatus, zeitkostenHintergrund } from '../state/useZeitkostenStatus';
import type { Patient } from '../domain/types';

/**
 * @anker ui.verlegung Schaltflächen zum Verlegen, passendes Zelt hervorgehoben
 *
 * Verlegung in den nächsten Einsatzabschnitt. Passt ein Ziel zur vergebenen
 * Sichtungskategorie, wird es hervorgehoben - abweichend verlegen bleibt aber
 * jederzeit möglich.
 *
 * Solange die Sichtung dieser Station aussteht, sind alle Ziele gesperrt
 * (→ `sim.sichtungOffen`). Der Reducer weist die Verlegung ohnehin ab; hier
 * ist sie zusätzlich sichtbar gesperrt, damit kein Klick ins Leere geht. Noch
 * nicht eröffnete Abschnitte (→ `domain.istAbschnittEroeffnet`) erscheinen
 * erst gar nicht als Ziel, sobald in der Sitzung ein Zugführer mitspielt
 * (→ `domain.zugfuehrungaktiv`).
 */
export function Verlegung({ patient }: { patient: Patient }) {
  const { state, dispatch } = useSimulation();
  const zk = useZeitkostenStatus();
  const zkBeschaeftigt = zk.aktion !== null;
  const gateAktiv = zugfuehrungAktiv(state.sitzung.aktiv, state.sitzung.spieler);
  const ziele = moeglicheZiele(patient.abschnitt).filter(
    (ziel) => !gateAktiv || istAbschnittEroeffnet(ziel.id, state.flaechen),
  );
  const verstorben = patient.status === 'verstorben';
  const wartetAufSichtung = sichtungOffen(patient);

  if (moeglicheZiele(patient.abschnitt).length === 0) {
    return <p className="hinweis">Der Patient hat den Behandlungsplatz verlassen.</p>;
  }

  if (ziele.length === 0) {
    return <p className="hinweis">Der Zugführer hat noch keinen weiteren Abschnitt eröffnet.</p>;
  }

  const empfohlen = patient.gesichtetAls ? zeltFuerKategorie(patient.gesichtetAls) : null;

  return (
    <div className="verlegung">
      {ziele.map((ziel) => {
        const passend = ziel.id === empfohlen;
        const zkEigen = zk.aktion !== null && istPatientVerlegenAktion(zk.aktion, patient.id, ziel.id);
        return (
          <button
            key={ziel.id}
            type="button"
            className={`verlegung-button${passend ? ' verlegung-empfohlen' : ''}${
              ziel.kategorie ? ` rand-${ziel.kategorie}` : ''
            }`}
            style={zkEigen ? zeitkostenHintergrund(zk.anteil) : undefined}
            disabled={verstorben || wartetAufSichtung || (zkBeschaeftigt && !zkEigen)}
            aria-busy={zkEigen || undefined}
            aria-label={passend ? `${ziel.name} - empfohlen` : ziel.name}
            onClick={() =>
              dispatch({
                typ: 'patientVerlegen',
                patientId: patient.id,
                ziel: ziel.id,
                spielerId: state.sitzung.eigeneId ?? undefined,
              })
            }
          >
            <span className="verlegung-ziel">
              {ziel.name}
              {passend && (
                <span className="verlegung-empfohlen-marke" aria-hidden="true">
                  empfohlen
                </span>
              )}
            </span>
            <span className="verlegung-dauer">
              {zkEigen
                ? `noch ${zk.restSek} s`
                : `${Math.round(verlegungsdauerSek(state.routen, patient.abschnitt, ziel.id))} s`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
