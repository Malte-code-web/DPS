import { useState } from 'react';
import { AblageFreigabePanel } from '../components/AblageFreigabePanel';
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
 * @anker ui.gesamtlagebild Regie-Startbildschirm: Kennzahlen, Abschnitte, Seitenleiste
 *
 * Ersetzt für Übungsleitung/Beobachter (→ `domain.regiefuehrend`) die
 * Abschnitt-für-Abschnitt-Ansicht als ersten Bildschirm im Einsatz - ein
 * Kärtchen je Abschnitt öffnet weiterhin die gewohnte Detailsicht
 * (→ `ui.einsatzseite`) zum eigentlichen Behandeln. Kein neuer Datenpfad:
 * jede Kachel liest dieselben Felder, die anderswo schon existieren, nur
 * an einer Stelle gebündelt statt verstreut.
 *
 * Zweite, umschaltbare Sicht auf dieselbe Lage: die Kartenansicht
 * (→ `ui.kartenansicht`) nur, wenn das Szenario Geodaten mitbringt - sonst
 * bleibt es bei den Kacheln, ohne einen Umschalter ins Leere anzubieten.
 */
export function GesamtlagebildSeite({ onAbschnittWaehlen }: Props) {
  const { state } = useSimulation();
  const [ansicht, setAnsicht] = useState<'kacheln' | 'karte'>('kacheln');
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

      <div className="arbeitsflaeche">
        {ansicht === 'karte' && hatGeodaten ? (
          <Kartenansicht />
        ) : (
          <AbschnitteUebersicht onAbschnittWaehlen={onAbschnittWaehlen} />
        )}
        <aside className="seitenleiste">
          {ansicht === 'karte' && hatGeodaten && <KartenOrtePanel />}
          <AblageFreigabePanel />
          <GebundeneKraeftePanel />
          <OffeneAnfragenPanel />
          <FunkkanaelePanel />
        </aside>
      </div>
    </div>
  );
}
