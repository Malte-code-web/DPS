import { AblageFreigabePanel } from '../components/AblageFreigabePanel';
import { AbschnitteUebersicht } from '../components/AbschnitteUebersicht';
import { FunkkanaelePanel } from '../components/FunkkanaelePanel';
import { GebundeneKraeftePanel } from '../components/GebundeneKraeftePanel';
import { Kennzahlenleiste } from '../components/Kennzahlenleiste';
import { OffeneAnfragenPanel } from '../components/OffeneAnfragenPanel';
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
 */
export function GesamtlagebildSeite({ onAbschnittWaehlen }: Props) {
  return (
    <div className="gesamtlagebild">
      <Kennzahlenleiste />
      <div className="arbeitsflaeche">
        <AbschnitteUebersicht onAbschnittWaehlen={onAbschnittWaehlen} />
        <aside className="seitenleiste">
          <AblageFreigabePanel />
          <GebundeneKraeftePanel />
          <OffeneAnfragenPanel />
          <FunkkanaelePanel />
        </aside>
      </div>
    </div>
  );
}
