import { useState } from 'react';
import { istRegiefuehrend } from '../domain/fuehrung';
import { RUFGRUPPEN } from '../domain/rufgruppen';
import { useSimulation } from '../state/useSimulation';
import { useSprechfunk } from '../state/useSprechfunk';
import type { Verbindungsstatus } from '../state/useSprechfunk';

const STATUS_LABEL: Record<Verbindungsstatus, string> = {
  verbindet: 'verbindet …',
  verbunden: 'verbunden',
  getrennt: 'getrennt',
};

/**
 * @anker ui.sprechfunk Sprechfunk: echte Live-Sprachverbindung in freien Rufgruppen
 *
 * Ersetzt den früheren Text-Funkkanal vollständig. Wer einen Kanal wählt,
 * verbindet sich per WebRTC direkt (Mesh, kein eigener Medienserver) mit
 * jeder anderen Person auf demselben Kanal (→ `state.sprechfunk`) - echte
 * Sprache statt Chat. Eine Sprechen-Umschalttaste hält das Mikrofon
 * standardmäßig stumm, wie bei einem echten Funkgerät. Ohne TURN-Server
 * (nur öffentliches STUN) kann die Verbindung in restriktiven Netzen
 * scheitern - bewusst dokumentierte Grenze (→ ROADMAP.md, Baustein 5).
 */
export function Sprechfunk() {
  const { state, dispatch } = useSimulation();
  const eigeneId = state.sitzung.eigeneId;
  const eigenerKanal = state.rufgruppen.find((m) => m.teilnehmerId === eigeneId)?.kanal ?? null;

  const [offen, setOffen] = useState(false);
  const [diagnoseOffenFuer, setDiagnoseOffenFuer] = useState<string | null>(null);
  const [diagnoseKopiert, setDiagnoseKopiert] = useState(false);
  const { mitglieder, sprechenAktiv, sprechenUmschalten, mikrofonFehler } = useSprechfunk(eigenerKanal);

  if (!state.sitzung.aktiv) return null;

  // Der Regie-Kanal ist nur für Übungsleitung und Beobachter wählbar
  // (→ `domain.regiefuehrend`) - für alle anderen taucht er in der
  // Kanalwahl gar nicht erst auf.
  const waehlbareKanaele = RUFGRUPPEN.filter(
    (kanal) => !kanal.nurRegie || istRegiefuehrend(state.sitzung.rolle),
  );

  const kanalWaehlen = (kanal: string | null) => {
    if (!eigeneId) return;
    dispatch({
      typ: 'rufgruppeWaehlen',
      teilnehmerId: eigeneId,
      teilnehmerName: state.sitzung.eigenerName ?? 'Unbekannt',
      kanal,
    });
  };

  return (
    <>
      <button
        type="button"
        className="sprechfunk-knopf"
        onClick={() => setOffen((bisher) => !bisher)}
        aria-expanded={offen}
      >
        Sprechfunk
        {eigenerKanal && <span className="sprechfunk-aktiv-punkt" aria-hidden="true" />}
      </button>

      {offen && (
        <div className="sprechfunk-panel" role="dialog" aria-label="Sprechfunk">
          <div className="sprechfunk-kopf">
            <h2>Sprechfunk</h2>
            <button type="button" onClick={() => setOffen(false)} aria-label="Sprechfunk-Panel schließen">
              Schließen
            </button>
          </div>

          <div className="sprechfunk-kanaele" role="radiogroup" aria-label="Kanal wählen">
            <button
              type="button"
              className={eigenerKanal === null ? 'sprechfunk-kanal-aktiv' : ''}
              aria-pressed={eigenerKanal === null}
              onClick={() => kanalWaehlen(null)}
            >
              Kein Kanal
            </button>
            {waehlbareKanaele.map((kanal) => (
              <button
                key={kanal.id}
                type="button"
                className={eigenerKanal === kanal.id ? 'sprechfunk-kanal-aktiv' : ''}
                aria-pressed={eigenerKanal === kanal.id}
                onClick={() => kanalWaehlen(kanal.id)}
              >
                {kanal.name}
              </button>
            ))}
          </div>

          {eigenerKanal && (
            <>
              {mikrofonFehler && (
                <p className="hinweis hinweis-fehler" role="alert">
                  {mikrofonFehler}
                </p>
              )}
              <button
                type="button"
                className={sprechenAktiv ? 'sprechfunk-sprechen sprechfunk-sprechen-aktiv' : 'sprechfunk-sprechen'}
                onClick={sprechenUmschalten}
                aria-pressed={sprechenAktiv}
                disabled={!!mikrofonFehler}
              >
                {sprechenAktiv ? 'Sprechen (an)' : 'Stumm'}
              </button>

              <ul className="sprechfunk-mitglieder">
                {mitglieder.length === 0 ? (
                  <li className="hinweis">Noch niemand sonst auf diesem Kanal.</li>
                ) : (
                  mitglieder.map((mitglied) => (
                    <li key={mitglied.teilnehmerId} className={`sprechfunk-mitglied sprechfunk-${mitglied.verbindung}`}>
                      <div className="sprechfunk-mitglied-zeile">
                        <span className="sprechfunk-status-punkt" aria-hidden="true" />
                        {mitglied.name}
                        <span className="sprechfunk-status-text">{STATUS_LABEL[mitglied.verbindung]}</span>
                        <button
                          type="button"
                          className="sprechfunk-diagnose-knopf"
                          onClick={() =>
                            setDiagnoseOffenFuer((bisher) =>
                              bisher === mitglied.teilnehmerId ? null : mitglied.teilnehmerId,
                            )
                          }
                        >
                          Diagnose
                        </button>
                      </div>
                      {diagnoseOffenFuer === mitglied.teilnehmerId && (
                        <div className="sprechfunk-diagnose">
                          <pre>{mitglied.diagnose}</pre>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(mitglied.diagnose).then(() => {
                                setDiagnoseKopiert(true);
                                setTimeout(() => setDiagnoseKopiert(false), 2000);
                              });
                            }}
                          >
                            {diagnoseKopiert ? 'Kopiert!' : 'Diagnose kopieren'}
                          </button>
                        </div>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>
      )}
    </>
  );
}
