import { VITAL_META, VITAL_REIHENFOLGE, vitalFormat, vitalStufe } from '../lib/format';
import type { Vitalwerte } from '../domain/types';

export function Vitalmonitor({ vitalwerte }: { vitalwerte: Vitalwerte }) {
  return (
    <div className="vitalmonitor">
      {VITAL_REIHENFOLGE.map((key) => {
        const meta = VITAL_META[key];
        const stufe = vitalStufe(key, vitalwerte[key]);
        return (
          <div key={key} className={`vital vital-${stufe}`} title={meta.label}>
            <span className="vital-kurz">{meta.kurz}</span>
            <span className="vital-wert">
              {vitalFormat(key, vitalwerte)}
              <small>{meta.einheit}</small>
            </span>
          </div>
        );
      })}
    </div>
  );
}
