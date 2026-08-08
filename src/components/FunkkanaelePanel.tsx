import { RUFGRUPPEN } from '../domain/rufgruppen';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.funkkanaelepanel Wer steht gerade auf welchem Kanal
 *
 * Ersetzt keinen Allkanal-Mithör-Mechanismus (bewusst zurückgestellt, → die
 * Kanal-Zugehörigkeit selbst reicht der Regie) - reine Übersicht über
 * `state.rufgruppen`, dieselbe Kanal-Zugehörigkeit, die jede Person auch im
 * eigenen Sprechfunk-Panel (→ `ui.sprechfunk`) sieht, hier nur gebündelt für
 * alle Kanäle auf einmal. Reiner Inhalt ohne eigenen Titel/Rahmen - läuft als
 * Bereich im Gesamtlagebild (→ `ui.regiebereichsseite`).
 */
export function FunkkanaelePanel() {
  const { state } = useSimulation();

  const kanaeleMitMitgliedern = RUFGRUPPEN.map((kanal) => ({
    kanal,
    mitglieder: state.rufgruppen.filter((mitglied) => mitglied.kanal === kanal.id),
  })).filter((eintrag) => eintrag.mitglieder.length > 0);

  if (kanaeleMitMitgliedern.length === 0) {
    return <p className="hinweis hinweis-knapp">Niemand auf einem Kanal.</p>;
  }

  return (
    <ul className="funk-liste">
      {kanaeleMitMitgliedern.map(({ kanal, mitglieder }) => (
        <li key={kanal.id} className="funk-zeile">
          <span>{mitglieder.map((mitglied) => mitglied.teilnehmerName).join(', ')}</span>
          <span className="funk-kanal">{kanal.name}</span>
        </li>
      ))}
    </ul>
  );
}
