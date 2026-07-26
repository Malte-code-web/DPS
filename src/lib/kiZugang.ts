/**
 * @anker ki.zugang Wo der API-Schlüssel liegt - und was das bedeutet
 *
 * Die App hat keinen Server. Wer sie direkt mit einem Modell sprechen lassen
 * will, hinterlegt seinen eigenen API-Schlüssel; er wird im localStorage des
 * Geräts abgelegt und ausschließlich an die eingetragene Adresse gesendet.
 *
 * Das ist eine bewusste Abwägung: für ein Werkzeug, das die Übungsleitung auf
 * dem eigenen Rechner betreibt, ist es vertretbar. Für eine gemeinsam
 * genutzte, öffentlich gehostete Installation ist es das nicht - dort gehört
 * ein eigener Server davor. Genau dafür gibt es das Feld "Adresse": zeigt es
 * auf einen eigenen Dienst, der den Schlüssel serverseitig hält, bleibt das
 * Feld für den Schlüssel leer.
 */

export interface KiZugang {
  /** API-Schlüssel des Anwenders. Leer, wenn ein eigener Dienst davorsteht. */
  schluessel: string;
  modell: string;
  /** Basisadresse der API. Leer bedeutet: direkt zu Anthropic. */
  adresse: string;
}

export const KI_MODELLE = [
  { id: 'claude-opus-5', label: 'Claude Opus 5 - beste Verläufe' },
  { id: 'claude-sonnet-5', label: 'Claude Sonnet 5 - schneller und günstiger' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 - für schnelle Entwürfe' },
];

const SCHLUESSEL = 'dps.kiZugang.v1';

export const LEERER_ZUGANG: KiZugang = { schluessel: '', modell: KI_MODELLE[0]!.id, adresse: '' };

export function ladeKiZugang(): KiZugang {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (!roh) return { ...LEERER_ZUGANG };
    const daten = JSON.parse(roh) as Partial<KiZugang>;
    return {
      schluessel: typeof daten.schluessel === 'string' ? daten.schluessel : '',
      modell: KI_MODELLE.some((modell) => modell.id === daten.modell)
        ? daten.modell!
        : LEERER_ZUGANG.modell,
      adresse: typeof daten.adresse === 'string' ? daten.adresse : '',
    };
  } catch {
    return { ...LEERER_ZUGANG };
  }
}

export function sichereKiZugang(zugang: KiZugang): boolean {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(zugang));
    return true;
  } catch {
    return false;
  }
}

export function loescheKiZugang(): void {
  try {
    localStorage.removeItem(SCHLUESSEL);
  } catch {
    // Nichts zu tun - ohne Speicher gab es auch nichts zu löschen.
  }
}

/** Ohne Schlüssel oder eigenen Dienst kann nicht gesendet werden. */
export function zugangVollstaendig(zugang: KiZugang): boolean {
  return zugang.schluessel.trim().length > 0 || zugang.adresse.trim().length > 0;
}
