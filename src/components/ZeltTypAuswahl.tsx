import { geoPunktName } from '../domain/geodaten';
import { FLAECHENTYPEN, ZELTTYPEN } from '../domain/flaechen';
import type { FlaechenAbschnitt, FlaechenTypId, ZeltTypId } from '../domain/types';

interface Props {
  abschnitt: FlaechenAbschnitt;
  onWaehlen: (typ: ZeltTypId | FlaechenTypId) => void;
  onAbbrechen: () => void;
}

const ZELT_TYP_REIHENFOLGE: ZeltTypId[] = ['SG20', 'SG30', 'SG40', 'SG50'];
const FLAECHEN_TYP_REIHENFOLGE: FlaechenTypId[] = ['FL_S', 'FL_M', 'FL_L'];

/** Die drei Behandlungszelte bauen immer ein echtes Zelt; Ablage/Bereitstellungsraum/Transport nur eine markierte Fläche; Ein-/Ausgangssichtung dürfen zwischen beidem wählen. */
function katalogeFuer(abschnitt: FlaechenAbschnitt): { zelte: boolean; flaechen: boolean } {
  if (abschnitt === 'zelt_rot' || abschnitt === 'zelt_gelb' || abschnitt === 'zelt_gruen') {
    return { zelte: true, flaechen: false };
  }
  if (abschnitt === 'eingangssichtung' || abschnitt === 'ausgangssichtung') {
    return { zelte: true, flaechen: true };
  }
  return { zelte: false, flaechen: true };
}

/**
 * @anker ui.zelttypauswahl Größenauswahl für ein neues Zelt oder eine Fläche
 *
 * Vier Zeltkacheln mit den realen DRK-Maßen (→ `domain.flaechen`) - der
 * Richtwert-Patientenwert ist reine Anzeige, in dieser Ausbaustufe keine
 * erzwungene Kapazitätsgrenze für die Patientenkette. Für Abschnitte ohne
 * reales Zeltprodukt (Ablage, Bereitstellungsraum, Transport) stehen
 * stattdessen drei reine Flächengrößen zur Wahl; Ein-/Ausgangssichtung
 * dürfen zwischen beiden Katalogen wählen.
 */
export function ZeltTypAuswahl({ abschnitt, onWaehlen, onAbbrechen }: Props) {
  const { zelte, flaechen } = katalogeFuer(abschnitt);
  return (
    <div className="panel zelttyp-auswahl">
      <div className="panel-titel">
        <h2>Größe für {geoPunktName(abschnitt)}</h2>
      </div>
      {zelte && (
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
      )}
      {flaechen && (
        <div className="zelttyp-grid">
          {FLAECHEN_TYP_REIHENFOLGE.map((typId) => {
            const info = FLAECHENTYPEN[typId];
            return (
              <button
                key={typId}
                type="button"
                className="zelttyp-kachel"
                onClick={() => onWaehlen(typId)}
              >
                <b>{info.bezeichnung}</b>
                <span>
                  {info.breiteM} × {info.tiefeM} m
                </span>
                <span>{info.flaecheQm} m²</span>
                <span>markierte Fläche, kein Zelt</span>
              </button>
            );
          })}
        </div>
      )}
      <button type="button" className="zelttyp-abbrechen" onClick={onAbbrechen}>
        Abbrechen
      </button>
    </div>
  );
}
