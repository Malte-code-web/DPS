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

/**
 * Ein reales Zeltprodukt steht zusätzlich zur reinen Fläche zur Wahl, wo ein
 * echtes Zelt fachlich Sinn ergibt (die drei Behandlungszelte, Ein-/
 * Ausgangssichtung) - Ablage/Bereitstellungsraum/Rettungsmittelhalteplatz/
 * Transport bleiben bei der reinen markierten Fläche, dort gibt es kein
 * reales Zeltprodukt dafür.
 * Die Fläche steht überall zur Wahl - nicht jede Lage braucht ein echtes
 * Zelt, auch bei den Behandlungszelten nicht.
 */
function katalogeFuer(abschnitt: FlaechenAbschnitt): { zelte: boolean; flaechen: boolean } {
  const zeltMoeglich =
    abschnitt === 'zelt_rot' ||
    abschnitt === 'zelt_gelb' ||
    abschnitt === 'zelt_gruen' ||
    abschnitt === 'eingangssichtung' ||
    abschnitt === 'ausgangssichtung';
  return { zelte: zeltMoeglich, flaechen: true };
}

/**
 * @anker ui.zelttypauswahl Größenauswahl für ein neues Zelt oder eine Fläche
 *
 * Vier Zeltkacheln mit den realen DRK-Maßen (→ `domain.flaechen`) - der
 * Richtwert-Patientenwert ist reine Anzeige, in dieser Ausbaustufe keine
 * erzwungene Kapazitätsgrenze für die Patientenkette. Die drei
 * Behandlungszelte und Ein-/Ausgangssichtung dürfen zusätzlich zum echten
 * Zelt auch eine reine Fläche ohne Zeltprodukt wählen (→ `katalogeFuer`) -
 * nicht jede Lage braucht ein echtes Zelt. Ablage/Bereitstellungsraum/
 * Rettungsmittelhalteplatz/Transport bieten von vornherein nur die reine
 * Fläche an, dafür gibt es kein passendes Zeltprodukt.
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
