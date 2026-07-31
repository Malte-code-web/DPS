import { useState } from 'react';
import { FAHRZEUGTYPEN, FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import { MANV_STUFEN_LISTE } from '../domain/manvStufen';
import { useSimulation } from '../state/useSimulation';
import type { FahrzeugTyp } from '../domain/types';

/**
 * @anker ui.fahrzeugkonfiguration Fahrzeuge vor Sitzungsbeginn: MANV-Stufe oder einzeln
 *
 * Zweiter Schritt der Übungsleitung, nach der Szenariowahl und vor dem
 * Wartebereich (→ `domain.manvstufen`): eine MANV-Stufe füllt den
 * Fahrzeugbestand mit einem Klick nach dem Kreis-Steinfurt-Konzept, danach -
 * oder unabhängig davon - lässt sich die Liste von Hand nachjustieren. Die
 * Sitzung (Code, Teilnehmerliste) öffnet sich erst mit "Weiter zum
 * Wartebereich".
 */
export function FahrzeugkonfigurationSeite() {
  const { state, dispatch } = useSimulation();
  const [neuerTyp, setNeuerTyp] = useState<FahrzeugTyp>('rtw');

  return (
    <main className="setup">
      <section className="setup-kopf">
        <button type="button" onClick={() => dispatch({ typ: 'zurueckZumSetup' })}>
          &larr; Szenariowahl
        </button>
        <h1>Fahrzeuge zuweisen</h1>
        <p>
          Wähle eine MANV-Stufe für einen kumulativen Fahrzeugbestand nach dem
          MANV-Konzept Kreis Steinfurt, oder stelle die Fahrzeuge einzeln
          zusammen - beides lässt sich danach von Hand nachjustieren. Besatzung
          und Führungsrolle werden gleich im Wartebereich zugeteilt.
        </p>
      </section>

      <section className="manvstufen">
        <h2>MANV-Stufe</h2>
        <div className="manvstufen-liste">
          {MANV_STUFEN_LISTE.map((stufe) => (
            <button
              key={stufe.id}
              type="button"
              onClick={() => dispatch({ typ: 'manvStufeGewaehlt', stufe: stufe.id })}
            >
              <span className="manvstufe-label">{stufe.label}</span>
              <span className="manvstufe-bereich">{stufe.patientenBereich}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="fahrzeug-manuell">
        <h2>Einzeln hinzufügen</h2>
        <div className="fahrzeug-hinzufuegen">
          <select value={neuerTyp} onChange={(event) => setNeuerTyp(event.target.value as FahrzeugTyp)}>
            {FAHRZEUGTYPEN.map((typ) => (
              <option key={typ} value={typ}>
                {FAHRZEUGTYP_INFO[typ].label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => dispatch({ typ: 'fahrzeugHinzugefuegt', fahrzeugTyp: neuerTyp })}
          >
            Hinzufügen
          </button>
        </div>
      </section>

      <section className="fahrzeug-bestand">
        <h2>Aktueller Bestand ({state.fahrzeugWunsch.length})</h2>
        {state.fahrzeugWunsch.length === 0 ? (
          <p className="hinweis">Noch keine Fahrzeuge zugewiesen.</p>
        ) : (
          <ul className="fahrzeug-liste">
            {state.fahrzeugWunsch.map((fahrzeug) => (
              <li key={fahrzeug.id} className="fahrzeug-zeile">
                <span>{FAHRZEUGTYP_INFO[fahrzeug.typ].label}</span>
                <span className="fahrzeug-info">{FAHRZEUGTYP_INFO[fahrzeug.typ].info}</span>
                <button
                  type="button"
                  onClick={() => dispatch({ typ: 'fahrzeugEntfernt', fahrzeugId: fahrzeug.id })}
                >
                  Entfernen
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="setup-hinweise">
        <button
          type="button"
          className="primaer"
          onClick={() => dispatch({ typ: 'fahrzeugkonfigurationAbgeschlossen' })}
        >
          Weiter zum Wartebereich
        </button>
      </section>
    </main>
  );
}
