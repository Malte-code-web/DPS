import { useState } from 'react';
import { empfohleneDosisMg } from '../domain/dosierung';
import type { MassnahmeId } from '../domain/types';

interface Props {
  massnahmeId: MassnahmeId;
  gewichtKg: number;
  onVerabreichen: (dosisMg: number) => void;
}

/**
 * @anker ui.dosiseingabe Dosis in mg eingeben, live gegen das Körpergewicht gegengelesen
 *
 * Gemeinsame Dosis-Eingabe für jede Maßnahme mit eigener Dosisreferenz
 * (→ `domain.dosierung`) - einzeln in der Maßnahmenliste wie innerhalb der
 * Analgesie-Sammelauswahl (→ `ui.analgesieauswahl`). Vorbelegt mit der
 * Zieldosis für das Patientengewicht, frei überschreibbar.
 */
export function Dosiseingabe({ massnahmeId, gewichtKg, onVerabreichen }: Props) {
  const [dosis, setDosis] = useState(() => String(empfohleneDosisMg(massnahmeId, gewichtKg)));
  const dosisNum = Number(dosis.replace(',', '.'));
  const dosisGueltig = Number.isFinite(dosisNum) && dosisNum > 0;

  return (
    <div className="dosis-eingabe">
      <label>
        Dosis in mg
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.5"
          value={dosis}
          onChange={(event) => setDosis(event.target.value)}
        />
      </label>
      <span className="dosis-eingabe-hinweis">
        {dosisGueltig
          ? `${(dosisNum / gewichtKg).toFixed(3)} mg/kg bei ${gewichtKg} kg Körpergewicht`
          : `Gewicht: ${gewichtKg} kg`}
      </span>
      <button
        type="button"
        className="dosis-verabreichen"
        disabled={!dosisGueltig}
        onClick={() => onVerabreichen(dosisNum)}
      >
        Verabreichen
      </button>
    </div>
  );
}
