import { abschnittInfo } from '../domain/abschnitte';
import { ZELTTYPEN } from '../domain/zelte';
import { useSimulation } from '../state/useSimulation';
import { useZeitkostenStatus } from '../state/useZeitkostenStatus';

/**
 * @anker ui.zeltbefehlbenachrichtigung Benachrichtigung: der Zugführer befiehlt ein Zelt
 *
 * Wie `ui.delegationsbenachrichtigung` eine nicht blockierende Meldung am
 * unteren Bildschirmrand, aber mit echter Wirkung statt reiner Freigabe:
 * "Befehl ausführen" löst dieselbe `zeltPlatzieren`-Aktion aus, die der
 * Zugführer früher selbst ausgelöst hätte (→ `modell.zeltbefehl`) - inklusive
 * des echten Bau-Countdowns, jetzt bei der ausführenden Person. Ist gerade
 * schon eine andere zeitkostende Handlung im Gange, bleibt der Knopf
 * gesperrt, statt die Ausführung stillschweigend zu verwerfen.
 */
export function ZeltBefehlBenachrichtigung() {
  const { state, dispatch } = useSimulation();
  const zk = useZeitkostenStatus();
  const eigeneId = state.sitzung.eigeneId;
  const befehl = eigeneId
    ? state.zeltBefehle.find((eintrag) => eintrag.gruppenfuehrerId === eigeneId)
    : undefined;

  if (!befehl) return null;

  const zugfuehrer = state.sitzung.spieler.find((eintrag) => eintrag.id === befehl.zugfuehrerId);
  const info = ZELTTYPEN[befehl.typ];
  const zkBeschaeftigt = zk.aktion !== null;

  const ausfuehren = () =>
    dispatch({
      typ: 'zeltPlatzieren',
      id: befehl.id,
      zeltTyp: befehl.typ,
      abschnitt: befehl.abschnitt,
      xM: befehl.xM,
      yM: befehl.yM,
      spielerId: eigeneId ?? undefined,
      befehlId: befehl.id,
    });

  const ablehnen = () => dispatch({ typ: 'zeltBefehlAblehnen', id: befehl.id });

  return (
    <div className="delegation-toast" role="alert" aria-label="Zeltbefehl">
      <p>
        <strong>{zugfuehrer?.name ?? 'Der Zugführer'}</strong> befiehlt: <strong>{info.bezeichnung}</strong>
        -Zelt für <strong>{abschnittInfo(befehl.abschnitt).name}</strong> bauen (
        {info.aufbauSek >= 60 ? `${Math.round(info.aufbauSek / 60)} min` : `${info.aufbauSek} s`}).
      </p>
      {zkBeschaeftigt && <p className="hinweis">Erst die laufende Handlung abschließen.</p>}
      <div className="delegation-toast-knoepfe">
        <button type="button" className="primaer" disabled={zkBeschaeftigt} onClick={ausfuehren}>
          Befehl ausführen
        </button>
        <button type="button" onClick={ablehnen}>
          Ablehnen
        </button>
      </div>
    </div>
  );
}
