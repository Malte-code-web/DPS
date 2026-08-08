import { useSimulation } from '../state/useSimulation';

const GESCHWINDIGKEITEN = [1, 2, 4, 10];

/**
 * @anker ui.ablaufsteuerungpanel Pause/Tempo/Einsatz beenden als Regie-Bereich
 *
 * Nur für Übungsleitung/Beobachter (→ `domain.regiefuehrend`) - vorher immer
 * sichtbar in der Einsatzleiste, jetzt ein Bereich neben Freigabe, Gebundene
 * Kräfte, Offene Anfragen und Funkkanälen (→ `ui.gesamtlagebild`).
 */
export function AblaufsteuerungPanel() {
  const { state, dispatch } = useSimulation();

  return (
    <div className="regie-ablaufsteuerung">
      <button type="button" className="primaer" onClick={() => dispatch({ typ: 'pauseUmschalten' })}>
        {state.laufend ? 'Pause' : 'Weiter'}
      </button>
      <label>
        Tempo
        <select
          value={state.geschwindigkeit}
          onChange={(event) =>
            dispatch({ typ: 'geschwindigkeitSetzen', wert: Number(event.target.value) })
          }
        >
          {GESCHWINDIGKEITEN.map((wert) => (
            <option key={wert} value={wert}>
              {wert}x
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => dispatch({ typ: 'einsatzBeenden' })}>
        Einsatz beenden
      </button>
    </div>
  );
}
