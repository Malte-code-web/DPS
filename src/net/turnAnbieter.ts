/**
 * @anker net.turnAnbieter Optionaler TURN-Relay für den Sprechfunk
 *
 * Ohne hinterlegte Umgebungsvariablen (`VITE_METERED_APP_NAME`/
 * `VITE_METERED_API_KEY`, siehe `.env.example`) läuft der Sprechfunk
 * unverändert mit reinem STUN weiter (→ `state.sprechfunk`) - funktioniert
 * zuverlässig nur innerhalb desselben Netzes. Zwei Geräte hinter je eigenem
 * NAT (z. B. beide im Mobilfunknetz) finden ohne TURN-Relay oft keine
 * direkte Verbindung, egal wie oft man es versucht - das ist keine Störung,
 * sondern eine bekannte Grenze von STUN allein. Mit hinterlegten
 * Zugangsdaten holt `holeTurnServer()` bei jedem ersten Kanalbeitritt einer
 * Sitzung frische, zeitlich befristete Zugangsdaten von Metered.ca und
 * ergänzt sie um den bestehenden STUN-Server.
 */
export interface TurnUmgebung {
  appName?: string;
  apiKey?: string;
}

/** Reine Prüfung ohne Seiteneffekt - testbar ohne echte Umgebungsvariablen. */
export function istTurnKonfiguriert(umgebung: TurnUmgebung): boolean {
  return Boolean(umgebung.appName && umgebung.apiKey);
}

const umgebung: TurnUmgebung = {
  appName: import.meta.env.VITE_METERED_APP_NAME as string | undefined,
  apiKey: import.meta.env.VITE_METERED_API_KEY as string | undefined,
};

export const turnKonfiguriert = istTurnKonfiguriert(umgebung);

/**
 * Holt TURN-Zugangsdaten von Metered.ca. Liefert bei fehlender Konfiguration,
 * einem Netzwerkfehler oder einer ungültigen Antwort bewusst eine leere
 * Liste statt zu werfen - der Sprechfunk fällt dann einfach auf reines STUN
 * zurück, statt ganz zu blockieren (→ `state.sprechfunk`).
 */
export async function holeTurnServer(): Promise<RTCIceServer[]> {
  if (!turnKonfiguriert) return [];
  try {
    const antwort = await fetch(
      `https://${umgebung.appName}.metered.live/api/v1/turn/credentials?apiKey=${umgebung.apiKey}`,
    );
    if (!antwort.ok) return [];
    const daten: unknown = await antwort.json();
    return Array.isArray(daten) ? (daten as RTCIceServer[]) : [];
  } catch {
    return [];
  }
}
