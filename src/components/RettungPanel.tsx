import { MATERIAL_LABEL, materialTypVerfuegbar } from '../domain/material';
import { istRegiefuehrend } from '../domain/fuehrung';
import { rettungBereit } from '../domain/rettung';
import { useSimulation } from '../state/useSimulation';
import { istRettungAktion } from '../state/zeitkosten';
import { useZeitkostenStatus, zeitkostenHintergrund } from '../state/useZeitkostenStatus';
import type { Patient } from '../domain/types';

interface Props {
  patient: Patient;
}

/**
 * @anker ui.rettungpanel Rettung eingeklemmter Personen - Anfrage, Material, Auslösen
 *
 * Steht dauerhaft über der Karte, solange die Person eingeklemmt und noch
 * nicht gerettet ist (→ `modell.eingeklemmtstatus`) - dieselbe Sperre, die
 * anderswo Behandlungsknöpfe deaktiviert, erklärt sich hier. Drei Schritte,
 * unabhängig voneinander verfügbar: Unterstützung anfragen (erste Person
 * bindet sich, löst bei Bedarf eine Kollegenanfrage aus), Material
 * bereitstellen (verbraucht es am Fahrzeug im selben Abschnitt) und - nur für
 * die Regie (→ `domain.regiefuehrend`) - die Rettung selbst auslösen, sobald
 * `rettungBereit` erfüllt ist.
 */
export function RettungPanel({ patient }: Props) {
  const { state, dispatch } = useSimulation();
  const zk = useZeitkostenStatus();
  const eingeklemmt = patient.eingeklemmt;

  if (!eingeklemmt || eingeklemmt.gerettet) return null;

  const { anfragendeId, helfendeIds, benoetigtesMaterial, materialBereitgestellt, benoetigteKollegenAnzahl } =
    eingeklemmt;
  const eigeneId = state.sitzung.eigeneId;
  const zkEigen = zk.aktion !== null && istRettungAktion(zk.aktion, patient.id);
  const zkBeschaeftigt = zk.aktion !== null;
  const materialLabel = benoetigtesMaterial ? MATERIAL_LABEL[benoetigtesMaterial] : null;
  const materialVerfuegbarHier =
    benoetigtesMaterial !== null &&
    materialTypVerfuegbar(benoetigtesMaterial, patient.abschnitt, state.fahrzeuge);
  const bereit = rettungBereit(eingeklemmt);
  const anfragenderName =
    anfragendeId === null
      ? null
      : anfragendeId === eigeneId
        ? 'dir'
        : (state.sitzung.spieler.find((spieler) => spieler.id === anfragendeId)?.name ?? 'jemandem');

  return (
    <section className="rettung-panel" aria-label="Rettung eingeklemmter Person">
      <p className="rettung-titel">Eingeklemmt – Rettung erforderlich</p>
      <p className="hinweis hinweis-knapp">
        Solange die Person nicht gerettet ist, sind nur Kommunikation und Diagnostik möglich.
      </p>

      <ul className="rettung-bedarf">
        <li>Material: {materialLabel ?? 'nicht nötig'}</li>
        {materialLabel && (
          <li className={materialBereitgestellt ? 'rettung-erfuellt' : undefined}>
            {materialBereitgestellt ? 'bereitgestellt' : 'noch nicht bereitgestellt'}
          </li>
        )}
        <li className={helfendeIds.length >= benoetigteKollegenAnzahl ? 'rettung-erfuellt' : undefined}>
          Zusätzliche Kolleg:innen: {helfendeIds.length} / {benoetigteKollegenAnzahl}
        </li>
      </ul>

      {anfragendeId === null ? (
        <button
          type="button"
          className="rettung-knopf"
          disabled={!eigeneId}
          onClick={() =>
            eigeneId &&
            dispatch({ typ: 'rettungUnterstuetzungAnfragen', patientId: patient.id, anfragendeId: eigeneId })
          }
        >
          Unterstützung anfragen
        </button>
      ) : (
        <p className="hinweis hinweis-knapp">
          Angefragt von <strong>{anfragenderName}</strong>.
        </p>
      )}

      {benoetigtesMaterial !== null && !materialBereitgestellt && (
        <button
          type="button"
          className="rettung-knopf"
          disabled={!materialVerfuegbarHier}
          onClick={() =>
            dispatch({
              typ: 'rettungsmaterialBereitstellen',
              patientId: patient.id,
              fahrzeugId:
                state.fahrzeuge.find(
                  (fahrzeug) =>
                    fahrzeug.abschnitt === patient.abschnitt &&
                    (fahrzeug.material[benoetigtesMaterial] ?? 0) > 0,
                )?.id ?? '',
            })
          }
        >
          {materialVerfuegbarHier ? `${materialLabel} bereitstellen` : `${materialLabel} nicht vorrätig`}
        </button>
      )}

      {istRegiefuehrend(state.sitzung.rolle) && (
        <button
          type="button"
          className="rettung-knopf rettung-knopf-primaer"
          style={zkEigen ? zeitkostenHintergrund(zk.anteil) : undefined}
          disabled={!bereit || (zkBeschaeftigt && !zkEigen)}
          aria-busy={zkEigen || undefined}
          onClick={() => dispatch({ typ: 'rettungDurchfuehren', patientId: patient.id })}
        >
          {zkEigen ? `Rettung läuft – noch ${zk.restSek} s` : 'Rettung durchführen'}
        </button>
      )}
    </section>
  );
}
