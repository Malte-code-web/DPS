import { useState } from 'react';
import { AbschnitteKurzuebersicht } from '../components/AbschnitteKurzuebersicht';
import { Baufeld } from '../components/Baufeld';
import { FahrzeugStatusPanel } from '../components/FahrzeugStatusPanel';
import { KartenOrtePanel } from '../components/KartenOrtePanel';
import { Kartenansicht } from '../components/Kartenansicht';
import { Kennzahlenleiste } from '../components/Kennzahlenleiste';
import { KraefteStatusPanel } from '../components/KraefteStatusPanel';
import { useSimulation } from '../state/useSimulation';
import type { Einsatzabschnitt } from '../domain/types';

interface Props {
  onAbschnittWaehlen: (abschnitt: Einsatzabschnitt) => void;
}

type AbfrageId = 'fahrzeuge' | 'kraefte' | 'kennzahlen';

const ABFRAGEN: { id: AbfrageId; label: string }[] = [
  { id: 'fahrzeuge', label: 'Fahrzeuge abfragen' },
  { id: 'kraefte', label: 'Kräfte abfragen' },
  { id: 'kennzahlen', label: 'Kennzahlen abfragen' },
];

/**
 * @anker ui.zugfuehrerseite Startbildschirm des Zugführers: schlanker als das Gesamtlagebild
 *
 * Für dieses Übungskonzept übernimmt der Zugführer die Leitung des gesamten
 * Abschnitts Medizinische Rettung - abweichend vom realen Vorbild, in dem er
 * nur Bereitstellungsraum und Rettungsmittelhalteplatz führt
 * (→ `domain.zugfuehrend`). Anders als das Gesamtlagebild der Regie
 * (→ `ui.gesamtlagebild`) bleibt hier keine Kennzahlenleiste dauerhaft
 * sichtbar. Die Kacheln (→ `ui.abschnittekurzuebersicht`) bleiben immer der
 * einzige Weg in die Abschnitt-Detailsicht - `Kartenansicht` selbst nimmt
 * (wie schon im Gesamtlagebild der Regie) keinen Klick zum Wechseln entgegen,
 * sie steht bei vorhandenen Geodaten nur zusätzlich obendrüber, nicht
 * anstelle der Kacheln. Direkt darunter platziert der Zugführer im Baufeld
 * (→ `ui.baufeld`) maßstabsgetreu alle acht Abschnitte - die drei
 * Behandlungszelte plus Ablage, Bereitstellungsraum, Ein-/Ausgangssichtung,
 * Transport; das "Eröffnen" eines Abschnitts läuft über die Platzierung
 * selbst, Schadensstelle ist vom Szenario vorgegeben und immer offen
 * (→ `domain.istAbschnittEroeffnet`). Fahrzeuge, Kräfte und Kennzahlen muss
 * der Zugführer bewusst abfragen: ein Klick auf einen der drei Knöpfe blendet
 * den jeweiligen Stand sofort ein (reine `useState`-Steuerung, keine
 * Zeitkosten, keine neue Reducer-Aktion) - passend zur realen Meldepflicht,
 * bei der eine Führungskraft sich aktiv ein Lagebild verschafft, statt es
 * automatisch vorgesetzt zu bekommen.
 */
export function ZugfuehrerSeite({ onAbschnittWaehlen }: Props) {
  const { state } = useSimulation();
  const [abfrage, setAbfrage] = useState<AbfrageId | null>(null);
  const hatGeodaten = Boolean(state.szenario?.geodaten);

  return (
    <div className="zugfuehrerseite">
      {hatGeodaten && (
        <>
          <Kartenansicht />
          <KartenOrtePanel />
        </>
      )}

      <Baufeld />

      <AbschnitteKurzuebersicht onAbschnittWaehlen={onAbschnittWaehlen} />

      <div className="zf-abfrage">
        <div className="zf-abfrage-leiste" role="tablist" aria-label="Abfrage">
          {ABFRAGEN.map((eintrag) => (
            <button
              key={eintrag.id}
              type="button"
              role="tab"
              aria-selected={abfrage === eintrag.id}
              className={
                abfrage === eintrag.id ? 'zf-abfrage-knopf zf-abfrage-aktiv' : 'zf-abfrage-knopf'
              }
              onClick={() => setAbfrage((bisher) => (bisher === eintrag.id ? null : eintrag.id))}
            >
              {eintrag.label}
            </button>
          ))}
        </div>

        {abfrage === 'fahrzeuge' && <FahrzeugStatusPanel />}
        {abfrage === 'kraefte' && <KraefteStatusPanel />}
        {abfrage === 'kennzahlen' && <Kennzahlenleiste />}
      </div>
    </div>
  );
}
