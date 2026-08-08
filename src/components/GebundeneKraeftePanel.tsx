import { zeitFormat } from '../lib/format';
import { useSimulation } from '../state/useSimulation';

interface Bindungsgruppe {
  grund: string;
  mitglieder: { name: string; restSek: number }[];
}

/**
 * Deutlich unter der vollen Stunde (`VORLAEUFIGE_BINDUNG_SEK`), aber über
 * jeder real vorkommenden Bindungsdauer (Narkose max. 240s, Rettung löst
 * sich beim Abschluss sofort auf, → `modell.gebunden`) - wer noch (nahe)
 * diese volle Stunde vor sich hat, wartet erkennbar noch auf sein Team.
 */
const ECHTE_BINDUNG_SCHWELLE_SEK = 600;

/**
 * @anker ui.gebundenekraeftepanel Übersicht aller aktuell gebundenen Kräfte
 *
 * Gruppiert nach dem exakten `gebundenGrund`-Text (→ `modell.gebunden`), da
 * Narkose und Rettung mehrere Personen unter demselben Grund binden. Eine
 * noch werbende Anfrage bindet jede Person vorläufig für eine volle Stunde
 * (`VORLAEUFIGE_BINDUNG_SEK`), eine vollständige Bindung ersetzt das für
 * alle Beteiligten in einem Schritt durch die echte, kurze Restzeit
 * (→ `kollegenanfrageAnnehmen`) - das unterscheidet "wartet auf Team" von
 * einem echten Countdown, auch wenn bisher nur eine einzelne Person
 * (die anfragende) überhaupt gebunden ist. Eigener Rahmen, da es als eines
 * von mehreren gestapelten Panels in der Regie-Seitenleiste steht
 * (→ `ui.gesamtlagebild`).
 */
export function GebundeneKraeftePanel() {
  const { state } = useSimulation();
  const gebunden = state.sitzung.spieler.filter(
    (spieler) => spieler.gebundenBis !== undefined && spieler.gebundenBis > state.zeitSek,
  );

  const gruppen = new Map<string, Bindungsgruppe>();
  for (const spieler of gebunden) {
    const grund = spieler.gebundenGrund ?? 'Gebunden';
    const gruppe = gruppen.get(grund) ?? { grund, mitglieder: [] };
    gruppe.mitglieder.push({ name: spieler.name, restSek: spieler.gebundenBis! - state.zeitSek });
    gruppen.set(grund, gruppe);
  }
  const liste = [...gruppen.values()];

  return (
    <div className="panel">
      <div className="panel-titel">
        <h2>Gebundene Kräfte</h2>
        <span className="panel-zaehler">{gebunden.length}</span>
      </div>
      {liste.length === 0 ? (
        <p className="hinweis hinweis-knapp">Niemand aktuell gebunden.</p>
      ) : (
        <div className="bindungsliste">
          {liste.map((gruppe) => {
            const wartetNochAufTeam = gruppe.mitglieder.some(
              (mitglied) => mitglied.restSek >= ECHTE_BINDUNG_SCHWELLE_SEK,
            );
            return (
              <div key={gruppe.grund} className="bindung-zeile">
                <div className="bindung-kopf">
                  <span>{gruppe.grund}</span>
                  <span className="bindung-timer">
                    {wartetNochAufTeam ? 'wartet auf Team' : zeitFormat(gruppe.mitglieder[0]!.restSek)}
                  </span>
                </div>
                <span className="bindung-team">
                  {gruppe.mitglieder.map((mitglied) => mitglied.name).join(' · ')}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
