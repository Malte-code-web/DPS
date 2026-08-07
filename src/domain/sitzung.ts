import type { Einsatzabschnitt, Fuehrungsrolle, Qualifikation } from './types';

/**
 * @anker sitzung.modell Rollen, Spieler und Code einer gemeinsamen Sitzung
 *
 * Reine Bausteine für das Mehrspieler-Spiel - kennen weder Netz noch React.
 * Eine Sitzung hat einen Übungsleiter und beliebig viele Spieler (Gäste), einen
 * kurzen Beitrittscode und einen Status. Die eigentliche Synchronisation liegt
 * im Transport (→ `net`) und im Provider; hier stehen nur die Begriffe.
 */
/**
 * @anker sitzung.beobachter Dritte Rolle: sieht und steuert wie die Übungsleitung, tritt aber separat bei
 *
 * Ein Beobachter hat dieselben Rechte und dieselbe Regie-Ansicht wie die
 * Übungsleitung (→ `domain.fuehrung`, `istRegiefuehrend`), tritt aber nicht
 * über den normalen Sitzungscode bei - nur wer den gesondert geteilten
 * Beobachter-Code kennt, kommt herein (→ `beobachterCode`,
 * `codeUndRolleAus`). Unterscheidet sich von der Übungsleitung sonst nur
 * darin, dass eigene Notizen/Bewertungen zu Teilnehmenden festgehalten werden
 * können (spätere Version).
 */
export type Rolle = 'uebungsleiter' | 'spieler' | 'beobachter';

export type Sitzungsstatus = 'wartet' | 'laeuft' | 'beendet';

export interface Spieler {
  id: string;
  name: string;
  rolle: Rolle;
  /**
   * Fachliche Qualifikation, von der Übungsleitung im Wartebereich vergeben
   * (→ `domain.qualifikation`). Startet auf `basis` (Einsatzsanitäter-Niveau)
   * und lässt sich dort vor dem Start anheben.
   */
  qualifikation: Qualifikation;
  /**
   * Organisatorische Führungsrolle (→ `modell.fuehrung`), von der
   * Übungsleitung zugeteilt - anders als die Qualifikation nicht selbst
   * gewählt. Fehlt das Feld (z. B. bei älteren Schnappschüssen), gilt `'keine'`.
   */
  fuehrungsrolle?: Fuehrungsrolle;
  /**
   * Der Einsatzabschnitt, den dieser Spieler gerade selbst ansieht
   * (→ `ui.abschnittsleiste`) - im Unterschied zur rein lokalen Navigation
   * eines einzelnen Clients wird das hier für alle sichtbar mitgeführt, damit
   * eine Delegationsanfrage (→ `ui.delegationsanfrage`) nur an jemanden im
   * selben Bereich möglich ist. Fehlt das Feld (z. B. bevor die Person
   * überhaupt navigiert hat), gilt niemand als "im selben Bereich".
   */
  aktuellerAbschnitt?: Einsatzabschnitt;
}

/** Der lokale Sitzungszustand eines Clients (teils geteilt, teils nur hier). */
export interface Sitzungszustand {
  /** Sind wir überhaupt in einer gemeinsamen Sitzung? */
  aktiv: boolean;
  rolle: Rolle | null;
  code: string | null;
  /** Eigene Spieler-Id und -Name (Gast). */
  eigeneId: string | null;
  eigenerName: string | null;
  /** Alle Teilnehmenden - vom Übungsleiter gepflegt und verteilt. */
  spieler: Spieler[];
  status: Sitzungsstatus;
  /**
   * Verbindungsfehler des Transports (z. B. Supabase nicht erreichbar,
   * Kanal abgelehnt) - `null`, solange keiner vorliegt. Rein lokal, nicht
   * Teil des Schnappschusses (→ `net.transport`).
   */
  verbindungsfehler: string | null;
}

export const KEINE_SITZUNG: Sitzungszustand = {
  aktiv: false,
  rolle: null,
  code: null,
  eigeneId: null,
  eigenerName: null,
  spieler: [],
  status: 'wartet',
  verbindungsfehler: null,
};

// Ohne leicht verwechselbare Zeichen (0/O, 1/I) - der Code wird vorgelesen.
const CODE_ZEICHEN = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function zufallsZahl(grenze: number): number {
  const krypto = globalThis.crypto;
  if (krypto?.getRandomValues) {
    const puffer = new Uint32Array(1);
    krypto.getRandomValues(puffer);
    return puffer[0]! % grenze;
  }
  return Math.floor(Math.random() * grenze);
}

/** Kurzer, gut vorlesbarer Beitrittscode. */
export function erzeugeCode(laenge = 5): string {
  let code = '';
  for (let i = 0; i < laenge; i += 1) {
    code += CODE_ZEICHEN[zufallsZahl(CODE_ZEICHEN.length)];
  }
  return code;
}

/** Eindeutige Id für einen Spieler oder eine Nachricht. */
export function erzeugeId(): string {
  const krypto = globalThis.crypto;
  if (krypto?.randomUUID) return krypto.randomUUID();
  return `id-${Date.now()}-${zufallsZahl(1_000_000)}`;
}

/** Vereinheitlicht die Eingabe (Groß, ohne Leerzeichen). */
export function normalisiereCode(eingabe: string): string {
  return eingabe.trim().toUpperCase().replace(/\s+/g, '');
}

const BEOBACHTER_SUFFIX = '-BEOB';

/** Vom Sitzungscode abgeleiteter, gesondert zu teilender Beitrittscode für Beobachter:innen. */
export function beobachterCode(code: string): string {
  return `${code}${BEOBACHTER_SUFFIX}`;
}

export function istGueltigerCode(eingabe: string): boolean {
  const code = normalisiereCode(eingabe);
  return /^[A-Z0-9]{4,8}(-BEOB)?$/.test(code);
}

/**
 * Löst einen eingegebenen Beitrittscode in den echten Sitzungscode (für den
 * Transport-Kanal, → `state.provider`) und die daraus erkannte Rolle auf -
 * der Beobachter-Code teilt sich denselben Kanal wie der normale Code, nur
 * mit einem erkennbaren Anhang.
 */
export function codeUndRolleAus(eingabe: string): { code: string; rolle: 'spieler' | 'beobachter' } {
  const normalisiert = normalisiereCode(eingabe);
  if (normalisiert.endsWith(BEOBACHTER_SUFFIX)) {
    return { code: normalisiert.slice(0, -BEOBACHTER_SUFFIX.length), rolle: 'beobachter' };
  }
  return { code: normalisiert, rolle: 'spieler' };
}

/** Fügt einen Spieler hinzu oder aktualisiert ihn (Id ist der Schlüssel). */
export function mitSpieler(spieler: Spieler[], neu: Spieler): Spieler[] {
  const ohne = spieler.filter((eintrag) => eintrag.id !== neu.id);
  return [...ohne, neu];
}

export function ohneSpieler(spieler: Spieler[], id: string): Spieler[] {
  return spieler.filter((eintrag) => eintrag.id !== id);
}
