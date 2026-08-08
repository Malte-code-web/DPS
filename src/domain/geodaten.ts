import { VERLEGUNGSDAUER_SEK, abschnittInfo } from './abschnitte';
import type { Einsatzabschnitt, GeoPosition, Route, Szenario } from './types';

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

/** Äquirechteck-Näherung, für Distanzen im Bereich einer Einsatzstelle (wenige hundert Meter) ausreichend genau. */
const METER_PRO_GRAD_LAT = 111_320;

/**
 * @anker domain.geodaten.haversine Echte Distanz zwischen zwei Schlüsselpunkten
 *
 * Ersetzt die früher von Hand geschätzten `RouteVorlage.distanzMeter`-Werte
 * standardmäßig durch die echte Luftlinien-Distanz (→ `modell.route`) -
 * behebt damit die ursprüngliche Diskrepanz zwischen angezeigter Karte und
 * Distanzwert endgültig, da es nur noch ein Koordinatensystem gibt statt
 * zweier unabhängiger.
 */
export function haversineMeter(a: GeoPosition, b: GeoPosition): number {
  const erdradiusM = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * erdradiusM * Math.asin(Math.sqrt(h));
}

/**
 * @anker domain.geodaten.projektion Lat/Lon ↔ lokale Meter, ein einziges Koordinatensystem für die Einsatzstelle
 *
 * `PlatzierteFlaeche.xM/yM` sind Meter relativ zu `Szenario.geodaten.ursprung`
 * (→ `modell.platzierteflaeche`) - `+xM` = Ost, `+yM` = Süd, passend zur
 * y-nach-unten-Konvention der bisherigen Baufeld-Darstellung. Nur die
 * Kartenkomponente rechnet um; Reducer, Zeitkosten und die reine Geometrie
 * in `domain.flaechen` bleiben unverändert in lokalen Metern.
 */
export function geoZuLokalM(ursprung: GeoPosition, position: GeoPosition): { xM: number; yM: number } {
  const yM = (ursprung.lat - position.lat) * METER_PRO_GRAD_LAT;
  const xM = (position.lon - ursprung.lon) * METER_PRO_GRAD_LAT * Math.cos((ursprung.lat * Math.PI) / 180);
  return { xM, yM };
}

export function lokalMZuGeo(ursprung: GeoPosition, xM: number, yM: number): GeoPosition {
  return {
    lat: ursprung.lat - yM / METER_PRO_GRAD_LAT,
    lon: ursprung.lon + xM / (METER_PRO_GRAD_LAT * Math.cos((ursprung.lat * Math.PI) / 180)),
  };
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

/**
 * Materialisiert die Laufzeit-Routen eines Szenarios beim Sitzungsstart -
 * ein fehlender `distanzMeter`-Override wird aus den echten Koordinaten der
 * beiden Schlüsselpunkte berechnet (→ `domain.geodaten.haversine`); fehlt
 * einer der beiden Punkte, bleibt defensiv `0` (sollte bei gepflegten
 * Szenariodaten nicht vorkommen).
 */
export function routenAusSzenario(szenario: Szenario): Route[] {
  const punkte = szenario.geodaten?.schluesselpunkte ?? {};
  return (szenario.geodaten?.routen ?? []).map((vorlage) => {
    const von = punkte[vorlage.von];
    const nach = punkte[vorlage.nach];
    const distanzMeter =
      vorlage.distanzMeter ?? (von && nach ? haversineMeter(von, nach) : 0);
    return {
      ...vorlage,
      distanzMeter,
      status: vorlage.gesperrtBeimStart ? 'gesperrt' : 'frei',
    };
  });
}
