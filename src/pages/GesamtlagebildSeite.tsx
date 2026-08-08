import { useState } from 'react';
import { AblageFreigabePanel } from '../components/AblageFreigabePanel';
import { AblaufsteuerungPanel } from '../components/AblaufsteuerungPanel';
import { AbschnitteUebersicht } from '../components/AbschnitteUebersicht';
import { FunkkanaelePanel } from '../components/FunkkanaelePanel';
import { GebundeneKraeftePanel } from '../components/GebundeneKraeftePanel';
import { KartenOrtePanel } from '../components/KartenOrtePanel';
import { Kartenansicht } from '../components/Kartenansicht';
import { Kennzahlenleiste } from '../components/Kennzahlenleiste';
import { OffeneAnfragenPanel } from '../components/OffeneAnfragenPanel';
import { useSimulation } from '../state/useSimulation';
import type { Einsatzabschnitt } from '../domain/types';

interface Props {
  onAbschnittWaehlen: (abschnitt: Einsatzabschnitt) => void;
}

type AnsichtId = 'kacheln' | 'karte' | 'ablauf' | 'freigabe' | 'gebunden' | 'anfragen' | 'funk';

/**
 * @anker ui.gesamtlagebild Regie-Startbildschirm: eine Seitenleiste als Ansichts-Menü
 *
 * Ersetzt für Übungsleitung/Beobachter (→ `domain.regiefuehrend`) die
 * Abschnitt-für-Abschnitt-Ansicht als ersten Bildschirm im Einsatz - ein
 * Kärtchen je Abschnitt öffnet weiterhin die gewohnte Detailsicht
 * (→ `ui.einsatzseite`) zum eigentlichen Behandeln.
 *
 * Eine ein-/ausklappbare Seitenleiste wirkt als Menü über alle sieben
 * Ansichten (Kacheln, Karte, Ablaufsteuerung, Freigabe, Gebundene Kräfte,
 * Offene Anfragen, Funkkanäle) - immer nur eine Ansicht gleichzeitig
 * sichtbar in der Hauptfläche, ein Klick im Menü wechselt sie. Kein neuer
 * Datenpfad - jede Ansicht liest dieselben Felder, die anderswo schon
 * existieren.
 */
export function GesamtlagebildSeite({ onAbschnittWaehlen }: Props) {
  const { state } = useSimulation();
  const [aktiv, setAktiv] = useState<AnsichtId>('kacheln');
  const [eingeklappt, setEingeklappt] = useState(false);
  const hatGeodaten = Boolean(state.szenario?.geodaten);

  const verdecktAnzahl = state.patienten.filter((patient) => patient.abschnitt === 'verdeckt').length;
  const gebundenAnzahl = state.sitzung.spieler.filter(
    (spieler) => spieler.gebundenBis !== undefined && spieler.gebundenBis > state.zeitSek,
  ).length;
  const anfragenAnzahl = state.delegationsanfragen.length + state.kollegenanfragen.length;
  const funkAnzahl = state.rufgruppen.length;

  return (
    <div className="gesamtlagebild">
      <Kennzahlenleiste />

      <div className="gesamtlagebild-flaeche">
        <div className="gesamtlagebild-haupt">
          {aktiv === 'kacheln' && <AbschnitteUebersicht onAbschnittWaehlen={onAbschnittWaehlen} />}
          {aktiv === 'karte' && hatGeodaten && (
            <>
              <Kartenansicht />
              <KartenOrtePanel />
            </>
          )}
          {aktiv === 'ablauf' && <AblaufsteuerungPanel />}
          {aktiv === 'freigabe' && <AblageFreigabePanel />}
          {aktiv === 'gebunden' && <GebundeneKraeftePanel />}
          {aktiv === 'anfragen' && <OffeneAnfragenPanel />}
          {aktiv === 'funk' && <FunkkanaelePanel />}
        </div>

        <aside
          className={`regie-seitenleiste${eingeklappt ? ' regie-seitenleiste-eingeklappt' : ''}`}
        >
          <div className="regie-seitenleiste-kopf">
            {!eingeklappt && <h2>Ansicht</h2>}
            <button
              type="button"
              className="regie-seitenleiste-knopf"
              aria-expanded={!eingeklappt}
              aria-label={eingeklappt ? 'Menü ausklappen' : 'Menü einklappen'}
              title={eingeklappt ? 'Menü ausklappen' : 'Menü einklappen'}
              onClick={() => setEingeklappt((bisher) => !bisher)}
            >
              {eingeklappt ? '◂' : '▸'}
            </button>
          </div>
          {!eingeklappt && (
            <nav className="regie-menue" role="tablist" aria-orientation="vertical" aria-label="Ansicht wählen">
              <button
                type="button"
                role="tab"
                aria-selected={aktiv === 'kacheln'}
                className={aktiv === 'kacheln' ? 'regie-menue-aktiv' : ''}
                onClick={() => setAktiv('kacheln')}
              >
                Kacheln
              </button>
              {hatGeodaten && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={aktiv === 'karte'}
                  className={aktiv === 'karte' ? 'regie-menue-aktiv' : ''}
                  onClick={() => setAktiv('karte')}
                >
                  Karte
                </button>
              )}
              <button
                type="button"
                role="tab"
                aria-selected={aktiv === 'ablauf'}
                className={aktiv === 'ablauf' ? 'regie-menue-aktiv' : ''}
                onClick={() => setAktiv('ablauf')}
              >
                Ablaufsteuerung
                <span className="bereich-marke">{state.laufend ? 'läuft' : 'pausiert'}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={aktiv === 'freigabe'}
                className={`${aktiv === 'freigabe' ? 'regie-menue-aktiv' : ''}${
                  verdecktAnzahl > 0 ? ' regie-menue-wartet' : ''
                }`}
                onClick={() => setAktiv('freigabe')}
              >
                Freigabe
                <span className="bereich-marke">
                  {verdecktAnzahl > 0 ? `${verdecktAnzahl} wartend` : 'alle frei'}
                </span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={aktiv === 'gebunden'}
                className={aktiv === 'gebunden' ? 'regie-menue-aktiv' : ''}
                onClick={() => setAktiv('gebunden')}
              >
                Gebundene Kräfte
                <span className="bereich-marke">{gebundenAnzahl > 0 ? gebundenAnzahl : 'niemand'}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={aktiv === 'anfragen'}
                className={`${aktiv === 'anfragen' ? 'regie-menue-aktiv' : ''}${
                  anfragenAnzahl > 0 ? ' regie-menue-wartet' : ''
                }`}
                onClick={() => setAktiv('anfragen')}
              >
                Offene Anfragen
                <span className="bereich-marke">{anfragenAnzahl > 0 ? anfragenAnzahl : 'keine'}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={aktiv === 'funk'}
                className={aktiv === 'funk' ? 'regie-menue-aktiv' : ''}
                onClick={() => setAktiv('funk')}
              >
                Funkkanäle
                <span className="bereich-marke">{funkAnzahl > 0 ? funkAnzahl : 'niemand'}</span>
              </button>
            </nav>
          )}
        </aside>
      </div>
    </div>
  );
}
