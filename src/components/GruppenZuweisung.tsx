import { useState } from 'react';
import { ABSCHNITTE } from '../domain/abschnitte';
import { istAbschnittEroeffnet } from '../domain/flaechen';
import {
  darfFahrzeugeDisponieren,
  gruppenMitglieder,
  gruppenfuehrerListe,
  gruppeVon,
  zugfuehrungAktiv,
} from '../domain/fuehrung';
import { erzeugeId } from '../domain/sitzung';
import { FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import { geoPunktName } from '../domain/geodaten';
import { useSimulation } from '../state/useSimulation';
import type { Einsatzabschnitt } from '../domain/types';

/**
 * @anker ui.gruppenzuweisung Der Zugführer stellt Gruppen zusammen und gibt ihnen Aufträge
 *
 * Eine Gruppe besteht aus **Personen** (→ `modell.gruppe.person`) - zusammen-
 * gestellt wird sie im Wartebereich (→ `ui.wartebereich`, die "Dienststelle"),
 * hier lässt sie sich im laufenden Einsatz nachjustieren. Fahrzeuge sind
 * optionales Beiwerk: sie können einer Gruppe zugeordnet sein (dann ziehen sie
 * bei einem Auftrag mit), lassen sich aber genauso einzeln einem Abschnitt
 * zuweisen, damit dort Material steht (→ `ui.fahrzeugverlegung`).
 *
 * Drei Blöcke: **Personal** (Gruppenzugehörigkeit und einzelne Einteilung),
 * **Fahrzeuge** und **Einsatzaufträge**. Der Auftrag "Abschnitt führen" steht
 * jeder Gruppe offen, die überhaupt jemanden oder etwas hat - früher hing er
 * fälschlich allein an zugewiesenen Fahrzeugen, wodurch eine reine
 * Personen-Gruppe nie einen Auftrag bekommen konnte. Gesperrt für alle
 * unterhalb Zugführer-Rang (→ `darfFahrzeugeDisponieren`).
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

  // Einzelne Personen lassen sich nur in schon eröffnete Abschnitte schicken
  // (→ `domain.istAbschnittEroeffnet`) - dieselbe Blast-Radius-Begrenzung wie
  // bei Patienten- und Fahrzeugverlegung (→ `domain.zugfuehrungaktiv`).
  const gateAktiv = zugfuehrungAktiv(state.sitzung.aktiv, state.sitzung.spieler);
  const personalZiele = ABSCHNITTE.filter(
    (abschnitt) => !gateAktiv || istAbschnittEroeffnet(abschnitt.id, state.flaechen),
  );

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

  // Nur echte Spieler - die Übungsleitung führt keine Gruppe und steht nicht
  // in der Personalplanung.
  const personal = state.sitzung.spieler.filter((spieler) => spieler.rolle === 'spieler');

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
      ) : (
        <>
          <h3>Personal</h3>
          <p className="hinweis">
            Ein Wechsel im laufenden Einsatz wird der betroffenen Person angefragt, statt sie
            stillschweigend umzuteilen. Wer einzeln eingeteilt ist, zieht bei einem Gruppenauftrag
            nicht automatisch mit - auch das wird gefragt.
          </p>
          {personal.length === 0 ? (
            <p className="hinweis">Noch niemand in der Sitzung.</p>
          ) : (
            <div className="gruppen-tabelle">
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Gruppe</th>
                    <th>Einzeln eingeteilt</th>
                  </tr>
                </thead>
                <tbody>
                  {personal.map((spieler) => {
                    const istGruppenfuehrer = spieler.fuehrungsrolle === 'gruppenfuehrer';
                    const offeneAnfrage = state.personalanfragen.find(
                      (eintrag) => eintrag.spielerId === spieler.id,
                    );
                    return (
                      <tr key={spieler.id}>
                        <td>{spieler.name}</td>
                        <td>
                          {istGruppenfuehrer ? (
                            <span className="hinweis">führt eigene Gruppe</span>
                          ) : (
                            <select
                              aria-label={`Gruppe von ${spieler.name}`}
                              value={spieler.gruppenfuehrerId ?? ''}
                              disabled={gesperrt}
                              onChange={(event) =>
                                dispatch({
                                  typ: 'spielerGruppeZuweisen',
                                  spielerId: spieler.id,
                                  gruppenfuehrerId:
                                    event.target.value === '' ? null : event.target.value,
                                })
                              }
                            >
                              <option value="">— ohne Gruppe —</option>
                              {gruppenfuehrer.map((eintrag) => (
                                <option key={eintrag.id} value={eintrag.id}>
                                  Gruppe {eintrag.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td>
                          <select
                            aria-label={`Einteilung von ${spieler.name}`}
                            value={spieler.einsatzabschnitt ?? ''}
                            disabled={gesperrt}
                            onChange={(event) =>
                              dispatch({
                                typ: 'spielerEinsatzabschnittSetzen',
                                spielerId: spieler.id,
                                abschnitt:
                                  event.target.value === ''
                                    ? null
                                    : (event.target.value as Einsatzabschnitt),
                              })
                            }
                          >
                            <option value="">— mit der Gruppe —</option>
                            {personalZiele.map((abschnitt) => (
                              <option key={abschnitt.id} value={abschnitt.id}>
                                {abschnitt.name}
                              </option>
                            ))}
                          </select>
                          {offeneAnfrage && (
                            <span className="hinweis"> wartet auf Rückmeldung</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {state.fahrzeuge.length > 0 && (
            <>
              <h3>Fahrzeuge</h3>
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
            </>
          )}

          <div className="gruppen-auftraege">
            <h3>Einsatzaufträge</h3>
            {gruppenfuehrer.map((gf) => {
              const mitglieder = gruppenMitglieder(state.sitzung.spieler, gf.id);
              const fahrzeuge = gruppeVon(state.fahrzeuge, gf.id);
              const offenerBefehl = state.abschnittFuehrenBefehle.find(
                (befehl) => befehl.gruppenfuehrerId === gf.id,
              );
              return (
                <div key={gf.id} className="gruppen-auftrag-zeile">
                  <span className="gruppen-auftrag-name">
                    Gruppe {gf.name} ({mitglieder.length} Person
                    {mitglieder.length === 1 ? '' : 'en'}, {fahrzeuge.length} Fahrzeug
                    {fahrzeuge.length === 1 ? '' : 'e'})
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
        </>
      )}
    </div>
  );
}
