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

/** Sentinel für die "nicht delegierbar"-Option - `<select>` kennt kein `null`. */
const NICHT_DELEGIERBAR = 'keine';

/**
 * @anker ui.massnahmenrechte Grundeinstellung: gleich zu Beginn, wer was darf
 *
 * Erster Schritt der Übungsleitung nach der Anmeldung, noch vor der
 * Szenariowahl - die Rechte gelten unabhängig von der Lage. Für jede Maßnahme
 * (→ `domain.massnahmenrechte`): wer sie durchführen darf ("Durchführen ab") -
 * genau diese Personen dürfen sie auch delegieren - und an welche Stufe
 * delegiert werden darf ("Delegieren an"), einschließlich "nicht delegierbar".
 * Jede Änderung wirkt sofort und wird auf diesem Gerät gespeichert, sodass sie
 * bei der nächsten Sitzung vorgeschlagen wird, aber jederzeit änderbar bleibt.
 */
export function MassnahmenrechteSeite() {
  const { state, dispatch } = useSimulation();
  const { massnahmenrechte } = state;

  const setzeQualifikation = (id: MassnahmeId, wert: Qualifikation) => {
    dispatch({
      typ: 'massnahmenrechteSetzen',
      rechte: {
        ...massnahmenrechte,
        [id]: { ...massnahmenrechte[id]!, qualifikation: wert },
      },
    });
  };

  const setzeDelegationsziel = (id: MassnahmeId, wert: string) => {
    dispatch({
      typ: 'massnahmenrechteSetzen',
      rechte: {
        ...massnahmenrechte,
        [id]: {
          ...massnahmenrechte[id]!,
          delegationsziel: wert === NICHT_DELEGIERBAR ? null : (wert as Qualifikation),
        },
      },
    });
  };

  return (
    <main className="setup">
      <section className="setup-kopf">
        <button type="button" onClick={() => dispatch({ typ: 'gemeinsamOeffnen' })}>
          &larr; Rolle
        </button>
        <h1>Maßnahmenrechte</h1>
        <p>
          Grundeinstellung für die Sitzung, unabhängig vom Szenario: Wer eine Maßnahme durchführen
          darf ("Durchführen ab"), darf sie auch delegieren - an die hier gewählte Stufe
          ("Delegieren an"). Wer diese Stufe erreicht, darf die Maßnahme danach für den
          freigegebenen Patienten durchführen, auch ohne selbst durchführungsberechtigt zu sein.
          "Nicht delegierbar" schließt das für diese Maßnahme ganz aus. Voreingestellt ist der
          Maßnahmenkatalog (Standardarbeitsanweisungen Rettungsdienst); die Einstellung wird auf
          diesem Gerät gespeichert und beim nächsten Mal vorgeschlagen, bleibt aber jederzeit
          änderbar.
        </p>
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
                          setzeQualifikation(massnahme.id, event.target.value as Qualifikation)
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
                      Delegieren an
                      <select
                        value={recht.delegationsziel ?? NICHT_DELEGIERBAR}
                        onChange={(event) => setzeDelegationsziel(massnahme.id, event.target.value)}
                      >
                        {QUALIFIKATIONEN.map((q) => (
                          <option key={q} value={q}>
                            {QUALIFIKATION_VOLLNAME[q]}
                          </option>
                        ))}
                        <option value={NICHT_DELEGIERBAR}>Nicht delegierbar</option>
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
          onClick={() => dispatch({ typ: 'massnahmenrechteAbgeschlossen' })}
        >
          Weiter zur Szenariowahl
        </button>
      </section>
    </main>
  );
}
