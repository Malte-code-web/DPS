import { useState } from 'react';
import { AblageFreigabePanel } from '../components/AblageFreigabePanel';
import { AbschnitteUebersicht } from '../components/AbschnitteUebersicht';
import { EreignissePanel } from '../components/EreignissePanel';
import { FunkkanaelePanel } from '../components/FunkkanaelePanel';
import { GebundeneKraeftePanel } from '../components/GebundeneKraeftePanel';
import { KartenOrtePanel } from '../components/KartenOrtePanel';
import { Kennzahlenleiste } from '../components/Kennzahlenleiste';
import { Lagekarte } from '../components/Lagekarte';
import { OffeneAnfragenPanel } from '../components/OffeneAnfragenPanel';
import { RegieMenueIcon } from '../components/RegieMenueIcons';
import { useSimulation } from '../state/useSimulation';
import type { Einsatzabschnitt } from '../domain/types';

interface Props {
  onAbschnittWaehlen: (abschnitt: Einsatzabschnitt) => void;
}

type AnsichtId = 'kacheln' | 'karte' | 'freigabe' | 'gebunden' | 'anfragen' | 'funk' | 'ereignisse';

interface AnsichtEintrag {
  id: AnsichtId;
  label: string;
  marke?: string;
  wartet?: boolean;
}

/**
 * @anker ui.gesamtlagebild Regie-Startbildschirm: eine Seitenleiste als Ansichts-Menü
 *
 * Ersetzt für Übungsleitung/Beobachter (→ `domain.regiefuehrend`) die
 * Abschnitt-für-Abschnitt-Ansicht als ersten Bildschirm im Einsatz - ein
 * Kärtchen je Abschnitt öffnet weiterhin die gewohnte Detailsicht
 * (→ `ui.einsatzseite`) zum eigentlichen Behandeln.
 *
 * Die Seitenleiste wirkt als Menü über alle sieben Ansichten (Kacheln,
 * Karte, Freigabe, Gebundene Kräfte, Offene Anfragen, Funkkanäle,
 * Ereignisse) - immer nur eine Ansicht gleichzeitig sichtbar in der
 * Hauptfläche, ein Klick im
 * Menü wechselt sie. Ablaufsteuerung (Pause/Tempo/Einsatz beenden) steht
 * nicht mehr hier, sondern wieder in der Einsatzleiste
 * (→ `ui.einsatzleiste`). Anders als ein reines Aufklapp-Panel bleibt das
 * Menü auch eingeklappt vollständig erreichbar (schmale Leiste mit
 * denselben Knöpfen, jetzt nur noch als Icon statt komplett
 * verschwundenem Inhalt, → `ui.regiemenueicons`) - ähnlich einer
 * Activity-Bar, die immer zwischen Ansichten wechseln lässt. Auf schmalen
 * Bildschirmen bleibt die Leiste am linken Rand stehen (per `order` vor
 * die Hauptfläche gestellt) statt darunter angehängt zu werden. Kein neuer
 * Datenpfad - jede Ansicht liest dieselben Felder, die anderswo schon
 * existieren.
 */
export function GesamtlagebildSeite({ onAbschnittWaehlen }: Props) {
  const { state } = useSimulation();
  const [aktiv, setAktiv] = useState<AnsichtId>('kacheln');
  const [eingeklappt, setEingeklappt] = useState(false);

  const verdecktAnzahl = state.patienten.filter((patient) => patient.abschnitt === 'verdeckt').length;
  const gebundenAnzahl = state.sitzung.spieler.filter(
    (spieler) => spieler.gebundenBis !== undefined && spieler.gebundenBis > state.zeitSek,
  ).length;
  const anfragenAnzahl = state.delegationsanfragen.length + state.kollegenanfragen.length;
  const funkAnzahl = state.rufgruppen.length;
  const ausgefalleneAnzahl = state.fahrzeuge.filter((fahrzeug) => fahrzeug.ausgefallen).length;

  const eintraege: AnsichtEintrag[] = [
    { id: 'kacheln', label: 'Kacheln' },
    { id: 'karte', label: 'Karte' },
    {
      id: 'freigabe',
      label: 'Freigabe',
      marke: verdecktAnzahl > 0 ? `${verdecktAnzahl} wartend` : 'alle frei',
      wartet: verdecktAnzahl > 0,
    },
    {
      id: 'gebunden',
      label: 'Gebundene Kräfte',
      marke: gebundenAnzahl > 0 ? String(gebundenAnzahl) : 'niemand',
    },
    {
      id: 'anfragen',
      label: 'Offene Anfragen',
      marke: anfragenAnzahl > 0 ? String(anfragenAnzahl) : 'keine',
      wartet: anfragenAnzahl > 0,
    },
    { id: 'funk', label: 'Funkkanäle', marke: funkAnzahl > 0 ? String(funkAnzahl) : 'niemand' },
    {
      id: 'ereignisse',
      label: 'Ereignisse',
      marke: ausgefalleneAnzahl > 0 ? `${ausgefalleneAnzahl} ausgefallen` : 'bereit',
      wartet: ausgefalleneAnzahl > 0,
    },
  ];

  return (
    <div className="gesamtlagebild">
      <Kennzahlenleiste />

      <div className="gesamtlagebild-flaeche">
        <div className="gesamtlagebild-haupt">
          {aktiv === 'kacheln' && <AbschnitteUebersicht onAbschnittWaehlen={onAbschnittWaehlen} />}
          {aktiv === 'karte' && (
            <>
              <Lagekarte interaktiv={false} />
              <KartenOrtePanel />
            </>
          )}
          {aktiv === 'freigabe' && <AblageFreigabePanel />}
          {aktiv === 'gebunden' && <GebundeneKraeftePanel />}
          {aktiv === 'anfragen' && <OffeneAnfragenPanel />}
          {aktiv === 'funk' && <FunkkanaelePanel />}
          {aktiv === 'ereignisse' && <EreignissePanel />}
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
          <nav
            className="regie-menue"
            role="tablist"
            aria-orientation="vertical"
            aria-label="Ansicht wählen"
          >
            {eintraege.map((eintrag) => (
              <button
                key={eintrag.id}
                type="button"
                role="tab"
                aria-selected={aktiv === eintrag.id}
                title={eintrag.label}
                className={`${aktiv === eintrag.id ? 'regie-menue-aktiv' : ''}${
                  eintrag.wartet ? ' regie-menue-wartet' : ''
                }`}
                onClick={() => setAktiv(eintrag.id)}
              >
                <span className="regie-menue-inhalt">
                  <RegieMenueIcon ansicht={eintrag.id} />
                  <span className="regie-menue-label">{eintrag.label}</span>
                </span>
                {eintrag.marke && <span className="bereich-marke">{eintrag.marke}</span>}
              </button>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
