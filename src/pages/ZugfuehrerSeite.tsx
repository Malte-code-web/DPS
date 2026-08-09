import { useState } from 'react';
import { AbschnitteKurzuebersicht } from '../components/AbschnitteKurzuebersicht';
import { AnsichtsmenueIcon } from '../components/AnsichtsmenueIcons';
import { KartenOrtePanel } from '../components/KartenOrtePanel';
import { Lagekarte } from '../components/Lagekarte';
import { Meldebuch } from '../components/Meldebuch';
import type { Einsatzabschnitt } from '../domain/types';

interface Props {
  onAbschnittWaehlen: (abschnitt: Einsatzabschnitt) => void;
}

type AnsichtId = 'kacheln' | 'karte' | 'fahrzeuge' | 'kraefte' | 'kennzahlen';

interface AnsichtEintrag {
  id: AnsichtId;
  label: string;
}

const ANSICHTEN: AnsichtEintrag[] = [
  { id: 'kacheln', label: 'Kacheln' },
  { id: 'karte', label: 'Karte' },
  { id: 'fahrzeuge', label: 'Fahrzeuge' },
  { id: 'kraefte', label: 'Kräfte' },
  { id: 'kennzahlen', label: 'Kennzahlen' },
];

/**
 * @anker ui.zugfuehrerseite Startbildschirm des Zugführers: dieselbe Seitenleiste wie im Gesamtlagebild
 *
 * Für dieses Übungskonzept übernimmt der Zugführer die Leitung des gesamten
 * Abschnitts Medizinische Rettung - abweichend vom realen Vorbild, in dem er
 * nur Bereitstellungsraum und Rettungsmittelhalteplatz führt
 * (→ `domain.zugfuehrend`). Optisch dasselbe Seitenleisten-Ansichtsmenü wie
 * im Gesamtlagebild der Regie (→ `ui.gesamtlagebild`, geteilte Klassen und
 * Icons → `ui.ansichtsmenueicons`) - fünf Ansichten (Kacheln, Karte,
 * Fahrzeuge, Kräfte, Kennzahlen) statt der sieben dort, sonst dieselbe
 * Mechanik: immer nur eine Ansicht sichtbar, ein Klick im Menü wechselt sie,
 * eingeklappt bleibt die Leiste als schmaler Icon-Streifen bedienbar. Anders
 * als bei der Regie bleibt hier keine Kennzahlenleiste dauerhaft sichtbar und
 * live - Fahrzeuge, Kräfte und Kennzahlen sind je ein Freitext-Meldebuch (→
 * `ui.meldebuch`, `Meldebuch`): der Zugführer muss seine Gruppenführer real
 * per Funk fragen (außerhalb der App) und trägt das Ergebnis selbst ein,
 * statt es automatisch vorgesetzt zu bekommen - passend zur realen
 * Meldepflicht, bei der eine Führungskraft sich aktiv ein Lagebild
 * verschafft. Die Kacheln (→ `ui.abschnittekurzuebersicht`)
 * bleiben immer der einzige Weg in die Abschnitt-Detailsicht - die Lagekarte
 * (→ `ui.lagekarte`) selbst nimmt keinen Klick zum Wechseln entgegen, sie
 * steht jetzt als eigene Ansicht neben statt zusätzlich über den Kacheln.
 * Auf ihr platziert der Zugführer maßstabsgetreu alle acht Abschnitte - die
 * drei Behandlungszelte plus Ablage, Bereitstellungsraum, Ein-/
 * Ausgangssichtung, Transport; das "Eröffnen" eines Abschnitts läuft über
 * die Platzierung selbst, Schadensstelle ist vom Szenario vorgegeben und
 * immer offen (→ `domain.istAbschnittEroeffnet`).
 */
export function ZugfuehrerSeite({ onAbschnittWaehlen }: Props) {
  const [aktiv, setAktiv] = useState<AnsichtId>('kacheln');
  const [eingeklappt, setEingeklappt] = useState(false);

  return (
    <div className="zugfuehrerseite">
      <div className="ansicht-flaeche">
        <div className="ansicht-haupt">
          {aktiv === 'kacheln' && <AbschnitteKurzuebersicht onAbschnittWaehlen={onAbschnittWaehlen} />}
          {aktiv === 'karte' && (
            <>
              <Lagekarte interaktiv />
              <KartenOrtePanel />
            </>
          )}
          {aktiv === 'fahrzeuge' && (
            <Meldebuch
              bereich="fahrzeuge"
              titel="Fahrzeuge"
              platzhalter="z. B. RTW 1 an der Ablage, RTW 2 unterwegs zur Schadensstelle …"
            />
          )}
          {aktiv === 'kraefte' && (
            <Meldebuch
              bereich="kraefte"
              titel="Kräfte"
              platzhalter="z. B. Behandlungsplatz 20 mit vier Kräften besetzt …"
            />
          )}
          {aktiv === 'kennzahlen' && (
            <Meldebuch
              bereich="kennzahlen"
              titel="Kennzahlen"
              platzhalter="z. B. 12 Patienten gesichtet, davon 3× SK1 …"
            />
          )}
        </div>

        <aside
          className={`ansichtsmenue-seitenleiste${eingeklappt ? ' ansichtsmenue-seitenleiste-eingeklappt' : ''}`}
        >
          <div className="ansichtsmenue-seitenleiste-kopf">
            {!eingeklappt && <h2>Ansicht</h2>}
            <button
              type="button"
              className="ansichtsmenue-seitenleiste-knopf"
              aria-expanded={!eingeklappt}
              aria-label={eingeklappt ? 'Menü ausklappen' : 'Menü einklappen'}
              title={eingeklappt ? 'Menü ausklappen' : 'Menü einklappen'}
              onClick={() => setEingeklappt((bisher) => !bisher)}
            >
              {eingeklappt ? '◂' : '▸'}
            </button>
          </div>
          <nav
            className="ansichtsmenue"
            role="tablist"
            aria-orientation="vertical"
            aria-label="Ansicht wählen"
          >
            {ANSICHTEN.map((eintrag) => (
              <button
                key={eintrag.id}
                type="button"
                role="tab"
                aria-selected={aktiv === eintrag.id}
                title={eintrag.label}
                className={aktiv === eintrag.id ? 'ansichtsmenue-aktiv' : ''}
                onClick={() => setAktiv(eintrag.id)}
              >
                <span className="ansichtsmenue-inhalt">
                  <AnsichtsmenueIcon ansicht={eintrag.id} />
                  <span className="ansichtsmenue-label">{eintrag.label}</span>
                </span>
              </button>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
