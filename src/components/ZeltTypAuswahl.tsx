import { abschnittInfo } from '../domain/abschnitte';
import { ZELTTYPEN } from '../domain/zelte';
import type { ZeltAbschnitt, ZeltTypId } from '../domain/types';

interface Props {
  abschnitt: ZeltAbschnitt;
  onWaehlen: (typ: ZeltTypId) => void;
  onAbbrechen: () => void;
}

const ZELT_TYP_REIHENFOLGE: ZeltTypId[] = ['SG20', 'SG30', 'SG40', 'SG50'];

/**
 * @anker ui.zelttypauswahl Größenauswahl für ein neues Zelt
 *
 * Vier Kacheln mit den realen DRK-Maßen (→ `domain.zelte`) - der
 * Richtwert-Patientenwert ist reine Anzeige, in dieser Ausbaustufe keine
 * erzwungene Kapazitätsgrenze für die Patientenkette.
 */
export function ZeltTypAuswahl({ abschnitt, onWaehlen, onAbbrechen }: Props) {
  return (
    <div className="panel zelttyp-auswahl">
      <div className="panel-titel">
        <h2>Zeltgröße für {abschnittInfo(abschnitt).name}</h2>
      </div>
      <div className="zelttyp-grid">
        {ZELT_TYP_REIHENFOLGE.map((typId) => {
          const info = ZELTTYPEN[typId];
          return (
            <button
              key={typId}
              type="button"
              className="zelttyp-kachel"
              onClick={() => onWaehlen(typId)}
            >
              <b>{info.bezeichnung}</b>
              <span>
                {info.breiteM.toFixed(2)} × {info.tiefeM.toFixed(2)} m
              </span>
              <span>{info.flaecheQm} m²</span>
              <span>Richtwert ≤ {info.richtwertPatientenSk1} SK I</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="zelttyp-abbrechen" onClick={onAbbrechen}>
        Abbrechen
      </button>
    </div>
  );
}
