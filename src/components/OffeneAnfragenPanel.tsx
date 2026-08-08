import { MASSNAHMEN } from '../domain/massnahmen';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.offeneanfragenpanel Regie-weite Übersicht aller offenen Anfragen
 *
 * Sowohl gezielte Delegationsanfragen als auch offene Kollegenanfragen
 * (→ `modell.kollegenanfrage`) landen bislang nur als Toast bei den
 * jeweils betroffenen Personen selbst - hier zusätzlich für die Regie an
 * einer Stelle, ohne eigenen Datenpfad, nur eine andere Sicht auf dieselben
 * beiden Listen. Reiner Inhalt ohne eigenen Titel/Rahmen - läuft als Bereich
 * im Gesamtlagebild (→ `ui.regiebereichsseite`).
 */
export function OffeneAnfragenPanel() {
  const { state } = useSimulation();
  const nameVon = (spielerId: string) =>
    state.sitzung.spieler.find((spieler) => spieler.id === spielerId)?.name ?? 'Jemand';

  const gesamt = state.delegationsanfragen.length + state.kollegenanfragen.length;

  if (gesamt === 0) {
    return <p className="hinweis hinweis-knapp">Keine offenen Anfragen.</p>;
  }

  return (
    <ul className="anfragen-liste">
      {state.delegationsanfragen.map((anfrage) => (
        <li key={anfrage.id} className="anfrage-zeile">
          <b>{nameVon(anfrage.anfragendeId)}</b> fragt <b>{nameVon(anfrage.angefragteId)}</b> nach{' '}
          {MASSNAHMEN[anfrage.massnahmeId].label} bei {anfrage.patientId}
          <span className="anfrage-status">Offen</span>
        </li>
      ))}
      {state.kollegenanfragen.map((anfrage) => (
        <li key={anfrage.id} className="anfrage-zeile">
          <b>{nameVon(anfrage.anfragendeId)}</b> sucht Unterstützung (
          {anfrage.massnahmeId ? MASSNAHMEN[anfrage.massnahmeId].label : 'Rettung'}) bei {anfrage.patientId}
          <span className="anfrage-status">
            {anfrage.angenommenVon.length > 0 ? `${anfrage.angenommenVon.length} angenommen` : 'Offen'}
          </span>
        </li>
      ))}
    </ul>
  );
}
