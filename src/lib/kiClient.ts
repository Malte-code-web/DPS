import Anthropic from '@anthropic-ai/sdk';
import { pruefeDynamik } from '../domain/szenarioDynamik';
import { pruefeSzenario } from '../domain/szenarioPruefung';
import { baueAuftrag, baueKorrektur, KI_SYSTEM } from './kiPrompt';
import { normalisiereSzenario, SZENARIO_SCHEMA } from './kiSchema';
import type { Befund } from '../domain/szenarioPruefung';
import type { Szenario } from '../domain/types';
import type { PromptWunsch } from './kiPrompt';
import type { KiZugang } from './kiZugang';

/**
 * @anker ki.client Szenario direkt erzeugen - mit Prüfschleife statt Copy-und-Paste
 *
 * Der Ablauf in einem Satz: Auftrag stellen, Antwort gegen das Schema
 * erzwingen, das Ergebnis prüfen UND durchspielen, und wenn etwas nicht
 * stimmt, die Befunde zurückgeben und nachbessern lassen.
 *
 * Diese Schleife ist der eigentliche Unterschied zur Zwischenablage: nicht die
 * Übungsleitung findet den zu schnell sterbenden Leichtverletzten, sondern die
 * Simulation selbst - vor dem ersten Blick eines Menschen.
 */

/** So oft darf das Modell nachbessern, bevor abgebrochen wird. */
export const MAX_VERSUCHE = 3;

export class KiFehler extends Error {}

export interface KiErgebnis {
  szenario: Szenario;
  /** Was nach dem letzten Versuch noch offen ist - immer nur Warnungen. */
  befunde: Befund[];
  versuche: number;
}

export interface KiLauf {
  wunsch: PromptWunsch;
  zugang: KiZugang;
  /** Fortschrittsmeldungen für die Oberfläche. */
  melde: (text: string) => void;
  signal?: AbortSignal;
}

function erzeugeClient(zugang: KiZugang): Anthropic {
  const adresse = zugang.adresse.trim();
  return new Anthropic({
    // Zeigt "Adresse" auf einen eigenen Dienst, hält der den Schlüssel
    // serverseitig (→ kiZugang.ts) - der eigene Schlüssel geht dann NICHT mit,
    // selbst wenn das Feld noch gefüllt ist (z. B. nach dem Umstieg von
    // direktem Anthropic-Zugang auf einen eigenen Proxy). Sonst würde ein
    // vergessener Schlüssel an eine beliebige Adresse gesendet.
    apiKey: adresse ? 'im-dienst-hinterlegt' : zugang.schluessel.trim() || 'im-dienst-hinterlegt',
    ...(adresse ? { baseURL: adresse } : {}),
    // Der Aufruf kommt aus dem Browser der Übungsleitung - siehe kiZugang.ts.
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  });
}

/** Genug Platz für alle Patienten, aber nicht unbegrenzt. */
function tokenbudget(anzahl: number): number {
  return Math.min(32000, Math.max(8000, anzahl * 1400));
}

function textAus(antwort: Anthropic.Message): string {
  return antwort.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

/** Übersetzt die typisierten SDK-Fehler in Klartext für die Übungsleitung. */
function alsKiFehler(fehler: unknown): KiFehler {
  if (fehler instanceof KiFehler) return fehler;
  if (fehler instanceof Anthropic.AuthenticationError) {
    return new KiFehler('Der API-Schlüssel wurde abgelehnt. Bitte im Zugang prüfen.');
  }
  if (fehler instanceof Anthropic.PermissionDeniedError) {
    return new KiFehler('Der Schlüssel hat keinen Zugriff auf dieses Modell.');
  }
  if (fehler instanceof Anthropic.RateLimitError) {
    return new KiFehler('Zu viele Anfragen. Bitte kurz warten und erneut versuchen.');
  }
  if (fehler instanceof Anthropic.APIConnectionError) {
    return new KiFehler(
      'Keine Verbindung zur API. Ohne Netz oder mit blockierendem Netzwerk hilft der Auftrag zum Kopieren.',
    );
  }
  if (fehler instanceof Anthropic.APIError) {
    return new KiFehler(`Die API meldet einen Fehler (${fehler.status}): ${fehler.message}`);
  }
  if (fehler instanceof Error) return new KiFehler(fehler.message);
  return new KiFehler('Unbekannter Fehler bei der Erzeugung.');
}

async function frage(
  client: Anthropic,
  zugang: KiZugang,
  verlauf: Anthropic.MessageParam[],
  anzahl: number,
  melde: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  // Gestreamt, weil ein Szenario mit vielen Patienten lange schreibt.
  const strom = client.messages.stream(
    {
      model: zugang.modell,
      max_tokens: tokenbudget(anzahl),
      system: KI_SYSTEM,
      messages: verlauf,
      output_config: { format: { type: 'json_schema', schema: SZENARIO_SCHEMA } },
    },
    signal ? { signal } : undefined,
  );

  let zeichen = 0;
  let letzteMeldung = 0;
  strom.on('text', (stueck) => {
    zeichen += stueck.length;
    // Nicht bei jedem Textstück neu rendern.
    if (zeichen - letzteMeldung >= 1500) {
      letzteMeldung = zeichen;
      melde(`Das Modell schreibt … ${Math.round(zeichen / 100) / 10} k Zeichen`);
    }
  });

  const antwort = await strom.finalMessage();

  if (antwort.stop_reason === 'refusal') {
    throw new KiFehler(
      'Das Modell hat die Anfrage abgelehnt. Formuliere die Lage sachlicher (Übungsszenario, keine realen Personen).',
    );
  }
  if (antwort.stop_reason === 'max_tokens') {
    throw new KiFehler(
      'Die Antwort wurde abgeschnitten. Bitte mit weniger Betroffenen erneut versuchen.',
    );
  }

  const text = textAus(antwort);
  if (!text.trim()) throw new KiFehler('Das Modell hat nichts zurückgegeben.');
  return text;
}

/** Prüfung und Durchspielen in einem Schritt - beides fließt in die Nachbesserung. */
function bewerte(daten: unknown): { befunde: Befund[]; szenario: Szenario | null } {
  const pruefung = pruefeSzenario(daten);
  if (!pruefung.gueltig) return { befunde: pruefung.befunde, szenario: null };

  const szenario = daten as Szenario;
  const dynamik = pruefeDynamik(szenario);
  return { befunde: [...pruefung.befunde, ...dynamik.befunde], szenario };
}

/**
 * Erzeugt ein Szenario direkt über die API - inklusive Nachbesserungsschleife.
 * Gibt das beste erreichte Ergebnis zurück; bleibt es fehlerhaft, wirft die
 * Funktion einen `KiFehler` mit Klartext.
 */
export async function erzeugeSzenario({
  wunsch,
  zugang,
  melde,
  signal,
}: KiLauf): Promise<KiErgebnis> {
  const client = erzeugeClient(zugang);
  const verlauf: Anthropic.MessageParam[] = [
    { role: 'user', content: baueAuftrag(wunsch) },
  ];
  let letzteBefunde: Befund[] = [];
  let vorherOffen = Number.POSITIVE_INFINITY;

  try {
    for (let versuch = 1; versuch <= MAX_VERSUCHE; versuch += 1) {
      melde(
        versuch === 1
          ? `Auftrag an ${zugang.modell} …`
          : `Nachbesserung ${versuch - 1} von ${MAX_VERSUCHE - 1} …`,
      );

      const text = await frage(client, zugang, verlauf, wunsch.anzahl, melde, signal);

      let daten: unknown;
      try {
        daten = normalisiereSzenario(JSON.parse(text));
      } catch {
        throw new KiFehler('Die Antwort war kein gültiges JSON.');
      }

      melde('Szenario prüfen und durchspielen …');
      const { befunde, szenario } = bewerte(daten);
      letzteBefunde = befunde;

      if (szenario && befunde.length === 0) {
        melde(`Fertig nach ${versuch} ${versuch === 1 ? 'Durchgang' : 'Durchgängen'}.`);
        return { szenario, befunde, versuche: versuch };
      }

      const fehlerzahl = befunde.filter((befund) => befund.schwere === 'fehler').length;
      const warnzahl = befunde.length - fehlerzahl;
      melde(`${fehlerzahl} Fehler, ${warnzahl} Hinweise gefunden.`);

      // Wenn eine Nachbesserung nichts mehr verbessert, hört sie auch beim
      // nächsten Mal nicht auf zu kosten.
      if (szenario && fehlerzahl === 0 && befunde.length >= vorherOffen) {
        melde('Weitere Nachbesserung bringt nichts mehr - Ergebnis übernommen.');
        return { szenario, befunde, versuche: versuch };
      }
      vorherOffen = befunde.length;

      if (versuch === MAX_VERSUCHE) {
        if (!szenario) {
          throw new KiFehler(
            `Nach ${MAX_VERSUCHE} Versuchen blieb das Szenario fehlerhaft. Bitte Lage vereinfachen oder Auftrag kopieren.`,
          );
        }
        melde('Übernehme das Ergebnis mit den verbliebenen Hinweisen.');
        return { szenario, befunde, versuche: versuch };
      }

      verlauf.push({ role: 'assistant', content: text }, { role: 'user', content: baueKorrektur(befunde) });
    }

    // Unerreichbar - die Schleife kehrt im letzten Durchgang immer zurück.
    throw new KiFehler('Erzeugung ohne Ergebnis beendet.');
  } catch (fehler) {
    if (signal?.aborted) throw new KiFehler('Abgebrochen.');
    const uebersetzt = alsKiFehler(fehler);
    if (letzteBefunde.length > 0) uebersetzt.message += ` (zuletzt ${letzteBefunde.length} offene Befunde)`;
    throw uebersetzt;
  }
}
