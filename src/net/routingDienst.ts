import type { GeoPosition } from '../domain/types';

/**
 * @anker net.routingdienst Echter Straßenverlauf statt Luftlinie für eine angelegte Wegstrecke
 *
 * Mirrort den Stil von `net.turnAnbieter`: reine Abruf-Funktion, fester
 * Timeout, nie werfen - bei jedem Fehlschlag `null` statt Exception, der
 * Aufrufer fällt dann auf `domain.geodaten.haversine` zurück (→
 * `ui.lagekarte.wegstrecke`). Nutzt den öffentlichen OSRM-Demo-Server, der
 * nur das `driving`-Profil frei anbietet (kein `foot` ohne eigenen
 * Server/API-Key) - für die kurzen Strecken innerhalb einer Einsatzstelle
 * eine Näherung, aber immer noch ein echter, straßenbasierter Verlauf statt
 * einer Luftlinie.
 */
export interface StrassenrouteErgebnis {
  distanzMeter: number;
  geometrie: GeoPosition[];
}

/** Kürzer als der TURN-Abruf (12s) - wird synchron in einer UI-Interaktion gebraucht, kein Hintergrundabruf. */
const ABRUF_TIMEOUT_MS = 8000;

interface OsrmRoute {
  distance: number;
  geometry: { coordinates: [number, number][] };
}

interface OsrmAntwort {
  code: string;
  routes?: OsrmRoute[];
}

export async function holeStrassenroute(von: GeoPosition, nach: GeoPosition): Promise<StrassenrouteErgebnis | null> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${von.lon},${von.lat};${nach.lon},${nach.lat}?overview=full&geometries=geojson`;
  try {
    const antwort = await fetch(url, { signal: AbortSignal.timeout(ABRUF_TIMEOUT_MS) });
    if (!antwort.ok) return null;
    const daten = (await antwort.json()) as OsrmAntwort;
    const route = daten.routes?.[0];
    if (daten.code !== 'Ok' || !route || !Array.isArray(route.geometry?.coordinates)) return null;
    const geometrie = route.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));
    if (geometrie.length < 2) return null;
    return { distanzMeter: route.distance, geometrie };
  } catch {
    return null;
  }
}
