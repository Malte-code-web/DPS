import { zeitFormat } from '../lib/format';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.ablagefreigabepanel Freigabe verdeckter Patienten aus dem Gesamtlagebild
 *
 * Countdown zur nächsten zeitgesteuerten Freigabe (→ `modell.freigabemodus`)
 * und eine Sammel-Freigabe für den ganzen verdeckten Pool auf einmal
 * (`alleVerdecktenFreigeben`). Reiner Inhalt ohne eigenen Titel/Rahmen - läuft
 * als Bereich im Gesamtlagebild (→ `ui.regiebereichsseite`).
 */
export function AblageFreigabePanel() {
  const { state, dispatch } = useSimulation();
  const verdeckt = state.patienten.filter((patient) => patient.abschnitt === 'verdeckt');

  const naechsteFreigabeSek = verdeckt
    .map((patient) => patient.freigabeMinuten)
    .filter((minuten): minuten is number => minuten !== undefined)
    .map((minuten) => minuten * 60 - state.zeitSek)
    .filter((restSek) => restSek > 0)
    .sort((a, b) => a - b)[0];

  if (state.freigabemodus === 'sofort') {
    return (
      <p className="hinweis hinweis-knapp">
        Freigabemodus „sofort" – alle Patienten waren von Beginn an sichtbar.
      </p>
    );
  }

  if (verdeckt.length === 0) {
    return <p className="hinweis hinweis-knapp">Alle Patienten sind freigegeben.</p>;
  }

  return (
    <>
      <ul className="pool-liste">
        {verdeckt.map((patient) => (
          <li key={patient.id} className="pool-zeile">
            <span className="pool-info">
              <b>{patient.name}</b>
              <span>
                {patient.geschlecht === 'w' ? 'weibl.' : patient.geschlecht === 'm' ? 'männl.' : 'divers'},{' '}
                {patient.alter} J. · {patient.kurzbefund}
              </span>
            </span>
            <button
              type="button"
              className="btn-freigeben"
              onClick={() => dispatch({ typ: 'patientFreigeben', patientId: patient.id })}
            >
              Freigeben
            </button>
          </li>
        ))}
      </ul>
      <div className="pool-fuss">
        <span>
          {naechsteFreigabeSek !== undefined
            ? `Nächste automatische Freigabe in ${zeitFormat(naechsteFreigabeSek)}`
            : 'Keine zeitgesteuerte Freigabe hinterlegt'}
        </span>
        <button type="button" className="btn-nebenlinie" onClick={() => dispatch({ typ: 'alleVerdecktenFreigeben' })}>
          Alle freigeben
        </button>
      </div>
    </>
  );
}
