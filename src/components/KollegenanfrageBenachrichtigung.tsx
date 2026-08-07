import { useState } from 'react';
import { erfuelltQualifikation } from '../domain/qualifikation';
import { MASSNAHMEN } from '../domain/massnahmen';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.kollegenanfragebenachrichtigung Benachrichtigung: ein Team braucht Unterstützung
 *
 * Anders als die gezielte Delegationsanfrage (→ `ui.delegationsbenachrichtigung`)
 * ist eine Kollegenanfrage (→ `modell.kollegenanfrage`) offen für jede
 * passende, verfügbare Person im selben Abschnitt - kein Ablehnen nötig
 * (nichts Persönliches wie bei einer gezielten Anfrage), nur ein "Ignorieren"
 * für die eigene Ansicht, falls gerade jemand anderes einspringt. Wer selbst
 * schon gebunden ist (→ `modell.gebunden`), sieht gar keine Anfrage.
 */
export function KollegenanfrageBenachrichtigung() {
  const { state, dispatch } = useSimulation();
  const [ignoriert, setIgnoriert] = useState<Set<string>>(new Set());
  const eigeneId = state.sitzung.eigeneId;
  const eigenerSpieler = state.sitzung.spieler.find((spieler) => spieler.id === eigeneId);
  const eigenGebunden = Boolean(
    eigenerSpieler?.gebundenBis !== undefined && eigenerSpieler.gebundenBis > state.zeitSek,
  );

  const anfrage =
    eigeneId && eigenerSpieler && !eigenGebunden
      ? state.kollegenanfragen.find((eintrag) => {
          if (ignoriert.has(eintrag.id)) return false;
          if (eintrag.anfragendeId === eigeneId || eintrag.angenommenVon.includes(eigeneId)) return false;
          if (
            eintrag.benoetigteQualifikation &&
            !erfuelltQualifikation(eigenerSpieler.qualifikation, eintrag.benoetigteQualifikation)
          ) {
            return false;
          }
          const patient = state.patienten.find((eintrag2) => eintrag2.id === eintrag.patientId);
          return Boolean(patient) && eigenerSpieler.aktuellerAbschnitt === patient?.abschnitt;
        })
      : undefined;

  if (!anfrage || !eigeneId) return null;

  const patient = state.patienten.find((eintrag) => eintrag.id === anfrage.patientId);
  const anfragender = state.sitzung.spieler.find((eintrag) => eintrag.id === anfrage.anfragendeId);
  const massnahme = anfrage.massnahmeId ? MASSNAHMEN[anfrage.massnahmeId] : undefined;
  const grundText = massnahme ? massnahme.label : 'Rettung';

  return (
    <div className="delegation-toast" role="alert" aria-label="Kollegenanfrage">
      <p>
        <strong>{anfragender?.name ?? 'Jemand'}</strong> braucht Unterstützung ({grundText})
        {patient && (
          <>
            {' '}
            bei <strong>{patient.name}</strong>
          </>
        )}
        .
      </p>
      <div className="delegation-toast-knoepfe">
        <button
          type="button"
          className="primaer"
          onClick={() => dispatch({ typ: 'kollegenanfrageAnnehmen', anfrageId: anfrage.id, spielerId: eigeneId })}
        >
          Annehmen
        </button>
        <button type="button" onClick={() => setIgnoriert((bisher) => new Set(bisher).add(anfrage.id))}>
          Ignorieren
        </button>
      </div>
    </div>
  );
}
