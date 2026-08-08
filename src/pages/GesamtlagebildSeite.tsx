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
import { RegieBereichsseite } from '../components/RegieBereichsseite';
import { useSimulation } from '../state/useSimulation';
import type { Einsatzabschnitt } from '../domain/types';

interface Props {
  onAbschnittWaehlen: (abschnitt: Einsatzabschnitt) => void;
}

type Bereich = 'ablauf' | 'freigabe' | 'gebunden' | 'anfragen' | 'funk' | null;

/**
 * @anker ui.gesamtlagebild Regie-Startbildschirm: eine Ansicht statt verstreuter Panels
 *
 * Ersetzt für Übungsleitung/Beobachter (→ `domain.regiefuehrend`) die
 * Abschnitt-für-Abschnitt-Ansicht als ersten Bildschirm im Einsatz - ein
 * Kärtchen je Abschnitt öffnet weiterhin die gewohnte Detailsicht
 * (→ `ui.einsatzseite`) zum eigentlichen Behandeln.
 *
 * Ablaufsteuerung, Freigabe, Gebundene Kräfte, Offene Anfragen und
 * Funkkanäle liefen vorher als eigenständiges Floating-Panel
 * (Regie-Panel) und eine dauerhaft sichtbare Seitenleiste - dieselben fünf
 * Bereiche wechseln sich jetzt genauso wie Diagnostik/Maßnahmen/Verlegung in
 * der Patientenansicht (→ `ui.bereichsseite`): eine Bereichswahl-Leiste mit
 * Status-Marke, ein Klick öffnet den Bereich als eigene Seite
 * (→ `ui.regiebereichsseite`). Kein neuer Datenpfad - jede Kachel und jeder
 * Bereich liest dieselben Felder, die anderswo schon existieren.
 */
export function GesamtlagebildSeite({ onAbschnittWaehlen }: Props) {
  const { state } = useSimulation();
  const [ansicht, setAnsicht] = useState<'kacheln' | 'karte'>('kacheln');
  const [bereich, setBereich] = useState<Bereich>(null);
  const hatGeodaten = Boolean(state.szenario?.geodaten);

  const verdecktAnzahl = state.patienten.filter((patient) => patient.abschnitt === 'verdeckt').length;
  const gebundenAnzahl = state.sitzung.spieler.filter(
    (spieler) => spieler.gebundenBis !== undefined && spieler.gebundenBis > state.zeitSek,
  ).length;
  const anfragenAnzahl = state.delegationsanfragen.length + state.kollegenanfragen.length;
  const funkAnzahl = state.rufgruppen.length;

  const umschalten = (wahl: Exclude<Bereich, null>) =>
    setBereich((bisher) => (bisher === wahl ? null : wahl));

  return (
    <div className="gesamtlagebild">
      <div className="lagebild-kopf">
        <Kennzahlenleiste />
        {hatGeodaten && (
          <div className="umschalter" role="tablist" aria-label="Ansicht wählen">
            <button
              type="button"
              role="tab"
              aria-selected={ansicht === 'kacheln'}
              className={ansicht === 'kacheln' ? 'aktiv' : ''}
              onClick={() => setAnsicht('kacheln')}
            >
              Kacheln
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={ansicht === 'karte'}
              className={ansicht === 'karte' ? 'aktiv' : ''}
              onClick={() => setAnsicht('karte')}
            >
              Karte
            </button>
          </div>
        )}
      </div>

      {ansicht === 'karte' && hatGeodaten ? (
        <>
          <Kartenansicht />
          <KartenOrtePanel />
        </>
      ) : (
        <AbschnitteUebersicht onAbschnittWaehlen={onAbschnittWaehlen} />
      )}

      <div className="bereichswahl" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={bereich === 'ablauf'}
          className={bereich === 'ablauf' ? 'bereich-aktiv' : ''}
          onClick={() => umschalten('ablauf')}
        >
          Ablaufsteuerung
          <span className="bereich-marke">{state.laufend ? 'läuft' : 'pausiert'}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={bereich === 'freigabe'}
          className={`${bereich === 'freigabe' ? 'bereich-aktiv' : ''}${
            verdecktAnzahl > 0 ? ' bereich-wartet' : ''
          }`}
          onClick={() => umschalten('freigabe')}
        >
          Freigabe
          <span className="bereich-marke">
            {verdecktAnzahl > 0 ? `${verdecktAnzahl} wartend` : 'alle frei'}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={bereich === 'gebunden'}
          className={bereich === 'gebunden' ? 'bereich-aktiv' : ''}
          onClick={() => umschalten('gebunden')}
        >
          Gebundene Kräfte
          <span className="bereich-marke">{gebundenAnzahl > 0 ? gebundenAnzahl : 'niemand'}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={bereich === 'anfragen'}
          className={`${bereich === 'anfragen' ? 'bereich-aktiv' : ''}${
            anfragenAnzahl > 0 ? ' bereich-wartet' : ''
          }`}
          onClick={() => umschalten('anfragen')}
        >
          Offene Anfragen
          <span className="bereich-marke">{anfragenAnzahl > 0 ? anfragenAnzahl : 'keine'}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={bereich === 'funk'}
          className={bereich === 'funk' ? 'bereich-aktiv' : ''}
          onClick={() => umschalten('funk')}
        >
          Funkkanäle
          <span className="bereich-marke">{funkAnzahl > 0 ? funkAnzahl : 'niemand'}</span>
        </button>
      </div>

      {bereich === 'ablauf' && (
        <RegieBereichsseite titel="Ablaufsteuerung" onSchliessen={() => setBereich(null)}>
          <AblaufsteuerungPanel />
        </RegieBereichsseite>
      )}
      {bereich === 'freigabe' && (
        <RegieBereichsseite titel="Ablage · Freigabe" onSchliessen={() => setBereich(null)}>
          <AblageFreigabePanel />
        </RegieBereichsseite>
      )}
      {bereich === 'gebunden' && (
        <RegieBereichsseite titel="Gebundene Kräfte" onSchliessen={() => setBereich(null)}>
          <GebundeneKraeftePanel />
        </RegieBereichsseite>
      )}
      {bereich === 'anfragen' && (
        <RegieBereichsseite titel="Offene Anfragen" onSchliessen={() => setBereich(null)}>
          <OffeneAnfragenPanel />
        </RegieBereichsseite>
      )}
      {bereich === 'funk' && (
        <RegieBereichsseite titel="Funkkanäle" onSchliessen={() => setBereich(null)}>
          <FunkkanaelePanel />
        </RegieBereichsseite>
      )}
    </div>
  );
}
