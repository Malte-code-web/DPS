import { VERLEGUNGSDAUER_SEK, abschnittInfo } from './abschnitte';
import type { Einsatzabschnitt, Route, Szenario } from './types';

/**
 * `bereitstellungsraum` taucht bewusst nicht in der normalen Abschnittsliste
 * auf (→ `abschnitte.liste`, reine Fahrzeug-Infrastruktur, kein Ziel für
 * Patienten) - `abschnittInfo` kennt den Namen deshalb nicht. Die Karte muss
 * ihn trotzdem beschriften können, wenn ein Szenario ihm eine Koordinate gibt.
 */
const ZUSATZ_NAMEN: Partial<Record<Einsatzabschnitt, string>> = {
  bereitstellungsraum: 'Bereitstellungsraum',
};

export function geoPunktName(abschnitt: Einsatzabschnitt): string {
  return ZUSATZ_NAMEN[abschnitt] ?? abschnittInfo(abschnitt).name;
}

/**
 * @anker domain.geodaten Verlegungsdauer aus echter Distanz statt Pauschale
 *
 * Tempo eines Trägertrupps beim vorsichtigen Tragen/Schieben einer Trage -
 * kein sourcierter Wert wie die Fahrzeug-Bestückung, sondern ein bewusst
 * gewähltes, plausibles Tempo (≈ 3,6 km/h). Gilt einheitlich für
 * Patienten- wie Fahrzeugverlegung (→ `state.zeitkosten`), genau wie schon
 * die bisherige Pauschale beide Fälle gleich behandelte.
 */
const GEHGESCHWINDIGKEIT_M_PRO_SEK = 1;

/**
 * Ersetzt die pauschale `VERLEGUNGSDAUER_SEK` durch die echte Distanz
 * zwischen zwei Abschnitten, sobald eine passende Route vorliegt - eine
 * gesperrte Route bleibt passierbar, kostet aber einen festen Zeitaufschlag
 * (`sperraufschlagSek`), keine Blockade. Ohne Geodaten (kein Szenario-Eintrag
 * oder keine passende Route) bleibt der bisherige Pauschalwert als Fallback -
 * ein Szenario ohne Geodaten verhält sich unverändert.
 */
export function verlegungsdauerSek(
  routen: Route[],
  von: Einsatzabschnitt,
  nach: Einsatzabschnitt,
): number {
  const route = routen.find(
    (eintrag) => (eintrag.von === von && eintrag.nach === nach) || (eintrag.von === nach && eintrag.nach === von),
  );
  if (!route) return VERLEGUNGSDAUER_SEK;
  const basis = route.distanzMeter / GEHGESCHWINDIGKEIT_M_PRO_SEK;
  return route.status === 'gesperrt' ? basis + route.sperraufschlagSek : basis;
}

/** Materialisiert die Laufzeit-Routen eines Szenarios beim Sitzungsstart. */
export function routenAusSzenario(szenario: Szenario): Route[] {
  return (szenario.geodaten?.routen ?? []).map((vorlage) => ({
    ...vorlage,
    status: vorlage.gesperrtBeimStart ? 'gesperrt' : 'frei',
  }));
}
