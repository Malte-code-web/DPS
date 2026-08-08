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

/**
 * @anker ui.gesamtlagebild Regie-Startbildschirm: eine Ansicht statt verstreuter Panels
 *
 * Ersetzt für Übungsleitung/Beobachter (→ `domain.regiefuehrend`) die
 * Abschnitt-für-Abschnitt-Ansicht als ersten Bildschirm im Einsatz - ein
 * Kärtchen je Abschnitt öffnet weiterhin die gewohnte Detailsicht
 * (→ `ui.einsatzseite`) zum eigentlichen Behandeln.
 *
 * Ablaufsteuerung, Freigabe, Gebundene Kräfte, Offene Anfragen und
 * Funkkanäle stehen gestapelt in einer Seitenleiste neben der Kacheln-/
 * Kartenansicht - dieselben fünf Panels wie zuvor, jetzt aber komplett
 * ein-/ausklappbar über einen einzigen Knopf, statt einzeln als eigene
 * Vollbildseite angesteuert zu werden. Kein neuer Datenpfad - jede Kachel
 * und jedes Panel liest dieselben Felder, die anderswo schon existieren.
 */
export function GesamtlagebildSeite({ onAbschnittWaehlen }: Props) {
  const { state } = useSimulation();
  const [ansicht, setAnsicht] = useState<'kacheln' | 'karte'>('kacheln');
  const [eingeklappt, setEingeklappt] = useState(false);
  const hatGeodaten = Boolean(state.szenario?.geodaten);

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

      <div className="gesamtlagebild-flaeche">
        <div className="gesamtlagebild-haupt">
          {ansicht === 'karte' && hatGeodaten ? (
            <>
              <Kartenansicht />
              <KartenOrtePanel />
            </>
          ) : (
            <AbschnitteUebersicht onAbschnittWaehlen={onAbschnittWaehlen} />
          )}
        </div>

        <aside
          className={`regie-seitenleiste${eingeklappt ? ' regie-seitenleiste-eingeklappt' : ''}`}
        >
          <div className="regie-seitenleiste-kopf">
            {!eingeklappt && <h2>Regie</h2>}
            <button
              type="button"
              className="regie-seitenleiste-knopf"
              aria-expanded={!eingeklappt}
              aria-label={eingeklappt ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'}
              title={eingeklappt ? 'Seitenleiste ausklappen' : 'Seitenleiste einklappen'}
              onClick={() => setEingeklappt((bisher) => !bisher)}
            >
              {eingeklappt ? '◂' : '▸'}
            </button>
          </div>
          {!eingeklappt && (
            <>
              <AblaufsteuerungPanel />
              <AblageFreigabePanel />
              <GebundeneKraeftePanel />
              <OffeneAnfragenPanel />
              <FunkkanaelePanel />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
