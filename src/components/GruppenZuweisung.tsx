import { useState } from 'react';
import { darfFahrzeugeDisponieren, gruppenfuehrerListe, gruppeVon } from '../domain/fuehrung';
import { erzeugeId } from '../domain/sitzung';
import { FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import { geoPunktName } from '../domain/geodaten';
import { useSimulation } from '../state/useSimulation';
import type { Einsatzabschnitt } from '../domain/types';

/**
 * @anker ui.gruppenzuweisung Der Zugführer weist Fahrzeuge samt Besatzung einem Gruppenführer zu
 *
 * Grundlage für Einsatzaufträge an eine Gruppe (→ `modell.gruppe`) - eine
 * Tabelle mit einer Zeile je Fahrzeug, Dropdown zur Gruppenführer-Wahl. Die
 * Besatzung wird nicht gesondert zugewiesen, sie reist immer schon mit
 * ihrem Fahrzeug (→ `Fahrzeug.besatzung`). Gesperrt für alle unterhalb
 * Zugführer-Rang, wie `ui.fahrzeugverlegung` (→ `darfFahrzeugeDisponieren`).
 * Sobald ein Gruppenführer mindestens ein Fahrzeug zugewiesen bekommen hat,
 * kann der Zugführer dieser Gruppe einen Einsatzauftrag "Abschnitt führen"
 * geben (→ `modell.abschnittfuehrenbefehl`, `ui.abschnittfuehrenbefehl`) -
 * als Ziel stehen nur schon gebaute Abschnitte zur Wahl, ein Auftrag baut
 * selbst keine Fläche (das bleibt der bestehende Zeltbefehl).
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
  const [zielWahl, setZielWahl] = useState<Record<string, string>>({});

  const zuweisen = (fahrzeugId: string, wert: string) =>
    dispatch({
      typ: 'fahrzeugGruppeZuweisen',
      fahrzeugId,
      gruppenfuehrerId: wert === '' ? null : wert,
    });

  const gebauteAbschnitte = [...new Set(state.flaechen.map((flaeche) => flaeche.abschnitt))];

  const befehlGeben = (gruppenfuehrerId: string) => {
    const ziel = zielWahl[gruppenfuehrerId] as Einsatzabschnitt | undefined;
    if (!ziel) return;
    dispatch({
      typ: 'abschnittFuehrenBefehlErteilen',
      id: erzeugeId(),
      ziel,
      zugfuehrerId: state.sitzung.eigeneId ?? '',
      gruppenfuehrerId,
    });
  };

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

      {gruppenfuehrer.some((gf) => gruppeVon(state.fahrzeuge, gf.id).length > 0) && (
        <div className="gruppen-auftraege">
          <h3>Einsatzaufträge</h3>
          {gruppenfuehrer
            .filter((gf) => gruppeVon(state.fahrzeuge, gf.id).length > 0)
            .map((gf) => {
              const gruppe = gruppeVon(state.fahrzeuge, gf.id);
              const offenerBefehl = state.abschnittFuehrenBefehle.find(
                (befehl) => befehl.gruppenfuehrerId === gf.id,
              );
              return (
                <div key={gf.id} className="gruppen-auftrag-zeile">
                  <span className="gruppen-auftrag-name">
                    {gf.name} ({gruppe.length} Fahrzeug{gruppe.length === 1 ? '' : 'e'})
                  </span>
                  {offenerBefehl ? (
                    <span className="gruppen-auftrag-status">
                      Befehl: {geoPunktName(offenerBefehl.ziel)} führen - wartet auf Ausführung
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({ typ: 'abschnittFuehrenBefehlAblehnen', id: offenerBefehl.id })
                        }
                      >
                        Zurückziehen
                      </button>
                    </span>
                  ) : gebauteAbschnitte.length === 0 ? (
                    <span className="hinweis">Noch kein Abschnitt gebaut.</span>
                  ) : (
                    <span className="gruppen-auftrag-status">
                      <select
                        value={zielWahl[gf.id] ?? ''}
                        disabled={gesperrt}
                        onChange={(event) =>
                          setZielWahl((bisher) => ({ ...bisher, [gf.id]: event.target.value }))
                        }
                      >
                        <option value="">Abschnitt wählen …</option>
                        {gebauteAbschnitte.map((abschnitt) => (
                          <option key={abschnitt} value={abschnitt}>
                            {geoPunktName(abschnitt)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={gesperrt || !zielWahl[gf.id]}
                        onClick={() => befehlGeben(gf.id)}
                      >
                        Befehl geben
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
