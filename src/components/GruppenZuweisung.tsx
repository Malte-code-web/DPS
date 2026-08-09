import { darfFahrzeugeDisponieren, gruppenfuehrerListe } from '../domain/fuehrung';
import { FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import { geoPunktName } from '../domain/geodaten';
import { useSimulation } from '../state/useSimulation';

/**
 * @anker ui.gruppenzuweisung Der Zugführer weist Fahrzeuge samt Besatzung einem Gruppenführer zu
 *
 * Grundlage für Einsatzaufträge an eine Gruppe (→ `modell.gruppe`) - eine
 * Tabelle mit einer Zeile je Fahrzeug, Dropdown zur Gruppenführer-Wahl. Die
 * Besatzung wird nicht gesondert zugewiesen, sie reist immer schon mit
 * ihrem Fahrzeug (→ `Fahrzeug.besatzung`). Gesperrt für alle unterhalb
 * Zugführer-Rang, wie `ui.fahrzeugverlegung` (→ `darfFahrzeugeDisponieren`).
 */
export function GruppenZuweisung() {
  const { state, dispatch } = useSimulation();
  const gruppenfuehrer = gruppenfuehrerListe(state.sitzung.spieler);
  const eigeneFuehrungsrolle = state.sitzung.spieler.find(
    (spieler) => spieler.id === state.sitzung.eigeneId,
  )?.fuehrungsrolle;
  const gesperrt = !darfFahrzeugeDisponieren(
    state.sitzung.aktiv,
    state.sitzung.rolle,
    eigeneFuehrungsrolle,
  );

  const zuweisen = (fahrzeugId: string, wert: string) =>
    dispatch({
      typ: 'fahrzeugGruppeZuweisen',
      fahrzeugId,
      gruppenfuehrerId: wert === '' ? null : wert,
    });

  return (
    <div className="panel gruppenzuweisung">
      <div className="panel-titel">
        <h2>Gruppen</h2>
      </div>

      {gesperrt && (
        <p className="hinweis">Nur Übungsleitung oder Zugführer und höher dürfen Gruppen zuweisen.</p>
      )}

      {gruppenfuehrer.length === 0 ? (
        <p className="hinweis">Noch kein Gruppenführer in der Sitzung.</p>
      ) : state.fahrzeuge.length === 0 ? (
        <p className="hinweis">Noch keine Fahrzeuge.</p>
      ) : (
        <div className="gruppen-tabelle">
          <table>
            <thead>
              <tr>
                <th>Fahrzeug</th>
                <th>Abschnitt</th>
                <th>Besatzung</th>
                <th>Gruppenführer</th>
              </tr>
            </thead>
            <tbody>
              {state.fahrzeuge.map((fahrzeug) => {
                const besatzungNamen = fahrzeug.besatzung
                  .map((id) => state.sitzung.spieler.find((s) => s.id === id)?.name)
                  .filter(Boolean)
                  .join(', ');
                return (
                  <tr key={fahrzeug.id}>
                    <td>
                      {FAHRZEUGTYP_INFO[fahrzeug.typ].label}
                      {fahrzeug.kennung ? ` (${fahrzeug.kennung})` : ''}
                    </td>
                    <td>{geoPunktName(fahrzeug.abschnitt)}</td>
                    <td>{besatzungNamen || 'keine Besatzung'}</td>
                    <td>
                      <select
                        value={fahrzeug.gruppenfuehrerId ?? ''}
                        disabled={gesperrt}
                        onChange={(event) => zuweisen(fahrzeug.id, event.target.value)}
                      >
                        <option value="">— keiner —</option>
                        {gruppenfuehrer.map((eintrag) => (
                          <option key={eintrag.id} value={eintrag.id}>
                            {eintrag.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
