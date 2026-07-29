import {
  KATEGORIEN,
  KATEGORIE_LABEL,
  QUALIFIKATION_VOLLNAME,
  massnahmenDerKategorie,
} from '../domain/massnahmen';
import { standardMassnahmenrechte } from '../domain/massnahmenrechte';
import { useSimulation } from '../state/useSimulation';
import type { MassnahmeId, Qualifikation } from '../domain/types';

const QUALIFIKATIONEN: Qualifikation[] = ['basis', 'notsan', 'notarzt'];

/**
 * @anker ui.massnahmenrechte Übungsleitung stellt vor der Sitzung ein, wer was darf
 *
 * Zwischen Szenariowahl und Wartebereich: Für jede Maßnahme zwei Schwellen -
 * wer sie durchführen und wer sie delegieren darf (→ `domain.massnahmenrechte`).
 * Jede Änderung wirkt sofort und wird auf diesem Gerät gespeichert, sodass sie
 * bei der nächsten Sitzung vorgeschlagen wird, aber jederzeit änderbar bleibt.
 */
export function MassnahmenrechteSeite() {
  const { state, dispatch } = useSimulation();
  const { szenario, massnahmenrechte } = state;

  const setzeRecht = (
    id: MassnahmeId,
    feld: 'qualifikation' | 'delegationsstufe',
    wert: Qualifikation,
  ) => {
    dispatch({
      typ: 'massnahmenrechteSetzen',
      rechte: { ...massnahmenrechte, [id]: { ...massnahmenrechte[id]!, [feld]: wert } },
    });
  };

  return (
    <main className="setup">
      <section className="setup-kopf">
        <button type="button" onClick={() => dispatch({ typ: 'zurueckZumSetup' })}>
          &larr; Szenario
        </button>
        <h1>Maßnahmenrechte</h1>
        <p>
          Wer darf welche Maßnahme durchführen, wer sie delegieren? Voreingestellt ist der
          Maßnahmenkatalog (Standardarbeitsanweisungen Rettungsdienst); passe an, was für diese
          Sitzung anders gelten soll. Die Einstellung wird auf diesem Gerät gespeichert und beim
          nächsten Mal vorgeschlagen.
        </p>
        {szenario && (
          <p className="hinweis">
            Szenario: <strong>{szenario.titel}</strong>
          </p>
        )}
      </section>

      <section className="rechte-kopfzeile">
        <button
          type="button"
          onClick={() => dispatch({ typ: 'massnahmenrechteSetzen', rechte: standardMassnahmenrechte() })}
        >
          Auf Katalog-Standard zurücksetzen
        </button>
      </section>

      {KATEGORIEN.map((kategorie) => {
        const gruppe = massnahmenDerKategorie(kategorie);
        if (gruppe.length === 0) return null;
        return (
          <section key={kategorie} className="rechte-gruppe">
            <h2>
              <span className="gruppe-kuerzel">{kategorie}</span> {KATEGORIE_LABEL[kategorie]}
            </h2>
            <ul className="rechte-liste">
              {gruppe.map((massnahme) => {
                const recht = massnahmenrechte[massnahme.id]!;
                return (
                  <li key={massnahme.id} className="recht-zeile">
                    <span className="recht-label">{massnahme.label}</span>
                    <label className="recht-feld">
                      Durchführen ab
                      <select
                        value={recht.qualifikation}
                        onChange={(event) =>
                          setzeRecht(massnahme.id, 'qualifikation', event.target.value as Qualifikation)
                        }
                      >
                        {QUALIFIKATIONEN.map((q) => (
                          <option key={q} value={q}>
                            {QUALIFIKATION_VOLLNAME[q]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="recht-feld">
                      Delegieren ab
                      <select
                        value={recht.delegationsstufe}
                        onChange={(event) =>
                          setzeRecht(
                            massnahme.id,
                            'delegationsstufe',
                            event.target.value as Qualifikation,
                          )
                        }
                      >
                        {QUALIFIKATIONEN.map((q) => (
                          <option key={q} value={q}>
                            {QUALIFIKATION_VOLLNAME[q]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section className="setup-hinweise">
        <button
          type="button"
          className="primaer"
          disabled={!szenario}
          onClick={() => dispatch({ typ: 'sitzungEroeffnen' })}
        >
          Sitzung eröffnen
        </button>
      </section>
    </main>
  );
}
