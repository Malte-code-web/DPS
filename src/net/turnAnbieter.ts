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
 * Wartezeit, nach der der Abruf aufgegeben wird - ohne dieses Limit blockiert
 * ein hängender oder sehr langsamer Abruf (blockierter Domainname, lahmes
 * Netz) den gesamten Sprechfunk auf unbestimmte Zeit, obwohl reines STUN
 * für diese Verbindung eventuell völlig ausgereicht hätte.
 */
const ABRUF_TIMEOUT_MS = 5000;

export interface TurnErgebnis {
  server: RTCIceServer[];
  /** Menschenlesbarer Grund, warum `server` leer blieb - `null` bei Erfolg (→ `ui.sprechfunk`-Diagnose). */
  fehler: string | null;
}

/**
 * Holt TURN-Zugangsdaten von Metered.ca. Liefert bei fehlender Konfiguration,
 * einem Netzwerkfehler, einer ungültigen Antwort oder einem zu langsamen
 * Abruf (→ `ABRUF_TIMEOUT_MS`) bewusst eine leere Liste statt zu werfen oder
 * unbegrenzt zu warten - der Sprechfunk fällt dann einfach auf reines STUN
 * zurück, statt ganz zu blockieren (→ `state.sprechfunk`). `fehler` hält
 * fest, WARUM es leer blieb - ohne das war ein leerer STUN-Fallback von
 * einem schlicht fehlenden `.env`-Eintrag nicht zu unterscheiden.
 */
export async function holeTurnServer(): Promise<TurnErgebnis> {
  if (!turnKonfiguriert) {
    return { server: [], fehler: 'nicht konfiguriert (VITE_METERED_APP_NAME/VITE_METERED_API_KEY fehlen im Build)' };
  }
  try {
    const antwort = await fetch(
      `https://${umgebung.appName}.metered.live/api/v1/turn/credentials?apiKey=${umgebung.apiKey}`,
      { signal: AbortSignal.timeout(ABRUF_TIMEOUT_MS) },
    );
    if (!antwort.ok) return { server: [], fehler: `HTTP ${antwort.status} von Metered.ca` };
    const daten: unknown = await antwort.json();
    if (!Array.isArray(daten)) return { server: [], fehler: 'unerwartete Antwort von Metered.ca (kein Array)' };
    return { server: daten as RTCIceServer[], fehler: null };
  } catch (fehler) {
    const name = fehler instanceof Error ? fehler.name : '';
    const text =
      name === 'TimeoutError' || name === 'AbortError'
        ? `Zeitüberschreitung nach ${ABRUF_TIMEOUT_MS / 1000}s`
        : fehler instanceof Error
          ? fehler.message
          : 'unbekannter Fehler';
    return { server: [], fehler: text };
  }
}
