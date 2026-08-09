import { useState } from 'react';
import { erzeugeId } from '../domain/sitzung';
import type { MeldebuchBereich } from '../domain/types';
import { zeitFormat } from '../lib/format';
import { useSimulation } from '../state/useSimulation';

interface Props {
  bereich: MeldebuchBereich;
  titel: string;
  platzhalter: string;
}

/**
 * @anker ui.meldebuch Freitext-Meldebuch: was der Zugführer per Funk erfragt hat
 *
 * Ersetzt die früher live gezeigten Panels (`FahrzeugStatusPanel`,
 * `KraefteStatusPanel`, `Kennzahlenleiste`) in der Zugführer-Ansicht (→
 * `ui.zugfuehrerseite`) - die App kennt den Inhalt eines echten Funkspruchs
 * nicht, also trägt der Zugführer ihn nach der Rückfrage bei seinen
 * Gruppenführern selbst ein (→ `modell.meldebucheintrag`). Bewusst Freitext
 * statt strukturierter Felder je Fahrzeug/Kraft/Kennzahl, denn eine
 * Funkmeldung ist genau das: eine Aussage, keine Datenbankzeile. Einträge
 * bleiben bis zum Debriefing (→ `ui.debriefing`) erhalten, damit sich das
 * eingetragene Lagebild dort mit der echten Lage vergleichen lässt.
 */
export function Meldebuch({ bereich, titel, platzhalter }: Props) {
  const { state, dispatch } = useSimulation();
  const [text, setText] = useState('');

  const eintraege = state.meldebuch
    .filter((eintrag) => eintrag.bereich === bereich)
    .slice()
    .reverse();

  const eintragen = () => {
    const inhalt = text.trim();
    if (!inhalt) return;
    dispatch({
      typ: 'meldebuchEintragen',
      id: erzeugeId(),
      bereich,
      text: inhalt,
      spielerId: state.sitzung.eigeneId ?? '',
    });
    setText('');
  };

  return (
    <div className="panel meldebuch">
      <div className="panel-titel">
        <h2>{titel}</h2>
      </div>
      <p className="hinweis">
        Frag deine Gruppenführer per Funk nach dem aktuellen Stand und trage die Antwort hier ein.
      </p>
      <div className="meldebuch-eingabe">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={platzhalter}
          rows={2}
        />
        <button type="button" className="primaer" disabled={!text.trim()} onClick={eintragen}>
          Eintragen
        </button>
      </div>

      {eintraege.length === 0 ? (
        <p className="hinweis hinweis-knapp">Noch keine Meldung eingetragen.</p>
      ) : (
        <ol className="protokoll protokoll-karte meldebuch-liste">
          {eintraege.map((eintrag) => (
            <li key={eintrag.id}>
              <time>{zeitFormat(eintrag.zeitSek)}</time>
              <span>{eintrag.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
