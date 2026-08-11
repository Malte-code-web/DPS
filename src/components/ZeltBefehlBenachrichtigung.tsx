import { geoPunktName } from '../domain/geodaten';
import { groesseVon } from '../domain/flaechen';
import {
  istZeltTyp,
  rundenanzahlFuer,
  rundenplanErzeugen,
  sollMinispielStarten,
  teilnehmerVon,
} from '../domain/zeltMinispiel';
import { useSimulation } from '../state/useSimulation';
import { useZeitkostenStatus } from '../state/useZeitkostenStatus';

/**
 * @anker ui.zeltbefehlbenachrichtigung Benachrichtigung: der Zugführer befiehlt ein Zelt oder eine Fläche
 *
 * Wie `ui.delegationsbenachrichtigung` eine nicht blockierende Meldung am
 * unteren Bildschirmrand, aber mit echter Wirkung statt reiner Freigabe:
 * "Befehl ausführen" löst dieselbe `zeltPlatzieren`-Aktion aus, die der
 * Zugführer früher selbst ausgelöst hätte (→ `modell.flaechenbefehl`) -
 * inklusive des echten Bau-Countdowns, jetzt bei der ausführenden Person.
 * Ist gerade schon eine andere zeitkostende Handlung im Gange, bleibt der
 * Knopf gesperrt, statt die Ausführung stillschweigend zu verwerfen.
 */
export function ZeltBefehlBenachrichtigung() {
  const { state, dispatch } = useSimulation();
  const zk = useZeitkostenStatus();
  const eigeneId = state.sitzung.eigeneId;
  const befehl = eigeneId
    ? state.flaechenBefehle.find((eintrag) => eintrag.gruppenfuehrerId === eigeneId)
    : undefined;

  if (!befehl) return null;

  const zugfuehrer = state.sitzung.spieler.find((eintrag) => eintrag.id === befehl.zugfuehrerId);
  const info = groesseVon(befehl.typ);
  const zkBeschaeftigt = zk.aktion !== null;

  const ausfuehren = () => {
    // Minispiel statt Direktbau, wenn eingeschaltet, ein echtes Zelt (kein
    // reines Fläche) und eine Gruppe zum Mitspielen da ist (→
    // `domain.zeltminispiel`) - sonst unverändert der bisherige Direktbau.
    if (eigeneId && istZeltTyp(befehl.typ)) {
      const flaechenTyp = befehl.typ;
      if (sollMinispielStarten(state.fahrzeuge, state.sitzung.spieler, flaechenTyp, eigeneId)) {
        const teilnehmerIds = teilnehmerVon(state.fahrzeuge, eigeneId);
        dispatch({
          typ: 'zeltMinispielStarten',
          id: befehl.id,
          gruppenfuehrerId: eigeneId,
          abschnitt: befehl.abschnitt,
          flaechenTyp,
          xM: befehl.xM,
          yM: befehl.yM,
          befehlId: befehl.id,
          teilnehmerIds,
          rundenplan: rundenplanErzeugen(teilnehmerIds, rundenanzahlFuer(groesseVon(flaechenTyp).aufbauSek)),
        });
        return;
      }
    }
    dispatch({
      typ: 'zeltPlatzieren',
      id: befehl.id,
      flaechenTyp: befehl.typ,
      abschnitt: befehl.abschnitt,
      xM: befehl.xM,
      yM: befehl.yM,
      spielerId: eigeneId ?? undefined,
      befehlId: befehl.id,
    });
  };

  const ablehnen = () => dispatch({ typ: 'zeltBefehlAblehnen', id: befehl.id });

  return (
    <div className="delegation-toast" role="alert" aria-label="Zeltbefehl">
      <p>
        <strong>{zugfuehrer?.name ?? 'Der Zugführer'}</strong> befiehlt: <strong>{info.bezeichnung}</strong>
        {' '}für <strong>{geoPunktName(befehl.abschnitt)}</strong> bauen (
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
