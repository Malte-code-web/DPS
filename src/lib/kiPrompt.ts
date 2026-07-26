import { MASSNAHMEN_LISTE } from '../domain/massnahmen';
import { HORIZONT_MIN } from '../domain/szenarioDynamik';
import { GRENZWERTE } from '../domain/triage';
import type { Befund } from '../domain/szenarioPruefung';

/**
 * @anker ki.prompt Der Auftrag an die KI - für den direkten Aufruf und zum Kopieren
 *
 * Es gibt zwei Wege zu einem KI-Szenario: den direkten Aufruf aus der App
 * (`kiClient.ts`) und den Umweg über die Zwischenablage für alle, die keinen
 * API-Zugang hinterlegen wollen. Beide benutzen denselben Regeltext, damit sie
 * nicht auseinanderlaufen.
 *
 * Regeln, Maßnahmen-IDs und Grenzwerte stammen aus dem echten Katalog und den
 * echten mSTaRT-Schwellen - der Auftrag kann also nicht veralten.
 */
export interface PromptWunsch {
  lage: string;
  anzahl: number;
  schwerpunkt: string;
}

/** Rolle und Handwerkszeug - bleibt über alle Anfragen gleich. */
export const KI_SYSTEM = `Du bist Übungsplaner für den Rettungsdienst und entwirfst Szenarien für
eine MANV-Simulation (Massenanfall von Verletzten). Du kennst die Sichtung
nach mSTaRT und den Ablauf auf einem Behandlungsplatz.

Deine Patienten sind keine Standbilder: jedes Problem verändert die Vitalwerte
pro Minute weiter, solange es nicht behandelt ist. Genau daraus entsteht der
Zeitdruck, den die Übenden spüren sollen. Du planst diese Verläufe bewusst -
wer rot ist, muss ohne Hilfe sterben; wer grün ist, muss die Übung überleben.

Du sagst den Übenden nie, was zu tun ist. Du beschreibst ausschließlich, was
sie vorfinden - Aussehen, Tastbefund, Geräusch, Äußerung des Patienten. Welche
Maßnahme daraus folgt, ist ihre Entscheidung und ihre Prüfung.

Antworte ausschließlich mit den geforderten Daten, ohne Begleittext.`;

function massnahmenliste(): string {
  return MASSNAHMEN_LISTE.map(
    (massnahme) =>
      `  "${massnahme.id}" - ${massnahme.label} (${massnahme.kategorie}, ${massnahme.dauerSek} s)`,
  ).join('\n');
}

/** Die fachlichen Regeln - identisch für den direkten Aufruf und den Kopier-Auftrag. */
export function regeltext(): string {
  return `1. "verlauf" beschreibt die Veränderung pro Minute, solange das Problem
   unbehandelt ist. Negative Werte verschlechtern. Erlaubte Schlüssel:
   atemfrequenz, herzfrequenz, systolischerRR, spo2, gcs, rekapzeit.
2. "startetNachMin" lässt ein Problem verzögert einsetzen (z. B. Spannungspneu).
3. "behandeltDurch" darf nur diese Maßnahmen-IDs enthalten:
${massnahmenliste()}
4. "erwarteteSK" muss dem mSTaRT-Ergebnis aus den Startwerten entsprechen.
   Geprüft wird in dieser Reihenfolge:
   - gehfaehig = true -> SK3
   - kritischeBlutung = true -> SK1
   - spontanatmung = false -> SK4
   - atemfrequenz > ${GRENZWERTE.atemfrequenzHoch} oder < ${GRENZWERTE.atemfrequenzNiedrig} -> SK1
   - systolischerRR < ${GRENZWERTE.radialispulsRRsys} oder rekapzeit > ${GRENZWERTE.rekapzeitKritisch} -> SK1
   - befolgtAufforderungen = false oder gcs < ${GRENZWERTE.gcsKritisch} -> SK1
   - sonst -> SK2
5. Wertebereiche: atemfrequenz 0-60, herzfrequenz 0-220, systolischerRR 0-220,
   spo2 0-100, gcs 3-15, rekapzeit 0.5-10.
6. Ein Patient verstirbt, sobald spo2 auf 40 oder systolischerRR auf 30 fällt
   oder die Herzfrequenz 20 unter- bzw. 220 überschreitet. Rechne die Verläufe
   nach: (Startwert - Todesschwelle) / Änderung pro Minute ergibt die Minute
   des Todes.
   - SK1 unbehandelt: verstirbt zwischen Minute 5 und 20.
   - SK2 unbehandelt: verschlechtert sich deutlich, überlebt aber ${HORIZONT_MIN} Minuten.
   - SK3: bleibt stabil. Ein gehfähiger Patient darf sich als Falle für die
     Nachsichtung verschlechtern - dann aber so langsam, dass er frühestens
     nach 15 Minuten kritisch wird.
   - SK4: verstirbt auch mit Behandlung.
7. Jeder Patient außer SK4 muss mit den genannten Maßnahmen zu retten sein.
8. "beschreibung" ist ein Befund, keine Anweisung. Erlaubt ist, was man sieht,
   tastet, hört oder erfragt. Verboten sind Formulierungen wie "Tourniquet
   anlegen", "Sauerstoff geben", "Entlastungspunktion" oder "indiziert" - auch
   dann, wenn sie fachlich richtig wären.
   schlecht: "Nicht komprimierbare Blutung - Tourniquet indiziert."
   gut:      "Pulsierende Blutung aus der Wunde, Hose durchtränkt."
9. Untersuchungsbefunde: "auskultation" ist bei Atemwegs- und Thoraxproblemen
   der Befund, über den das Problem überhaupt gefunden wird - setze ihn dort.
   "pupillen" bei Schädel-Hirn-Trauma, "ekg" bei Kreislaufproblemen.
10. Patienten-IDs sind eindeutig. Namen und Befunde auf Deutsch.
11. Mische realistisch: wenige SK1, mehr SK2 und SK3, höchstens ein SK4.`;
}

function auftragskopf(wunsch: PromptWunsch): string {
  return `LAGE
${wunsch.lage}

UMFANG
Genau ${wunsch.anzahl} Betroffene.

SCHWERPUNKT
${wunsch.schwerpunkt}`;
}

/**
 * Auftrag für den direkten API-Aufruf. Die Struktur steckt im JSON-Schema
 * (`kiSchema.ts`), hier stehen nur Lage und Regeln.
 */
export function baueAuftrag(wunsch: PromptWunsch): string {
  return `Entwirf ein Übungsszenario.

${auftragskopf(wunsch)}

REGELN

${regeltext()}`;
}

/**
 * @anker ki.korrektur Rückmeldung der Prüfung an das Modell
 *
 * Der eigentliche Qualitätssprung: Statt ein fehlerhaftes Szenario der
 * Übungsleitung vorzulegen, bekommt das Modell die Befunde der Prüfung zurück
 * und bessert nach.
 */
export function baueKorrektur(befunde: Befund[]): string {
  const zeilen = befunde
    .map((befund) => `- [${befund.schwere}] ${befund.ort}: ${befund.text}`)
    .join('\n');

  return `Das Szenario wurde geprüft und durchgespielt. Diese Punkte stimmen noch nicht:

${zeilen}

Gib das vollständige Szenario erneut aus - mit allen Patienten, auch den
unveränderten. Behebe die Fehler, ändere sonst so wenig wie möglich. Rechne
die Verläufe der beanstandeten Patienten nach, bevor du antwortest.`;
}

/**
 * Auftrag zum Kopieren in eine beliebige KI-Oberfläche. Enthält zusätzlich die
 * vollständige JSON-Struktur, weil dort kein Schema erzwungen werden kann.
 */
export function baueKiPrompt(wunsch: PromptWunsch): string {
  return `Du erstellst ein Übungsszenario für eine MANV-Simulation (Massenanfall von
Verletzten). Antworte ausschließlich mit einem JSON-Objekt, ohne Text davor
oder danach, ohne Markdown-Codeblock.

${auftragskopf(wunsch)}

STRUKTUR

{
  "id": "kurz-und-mit-bindestrichen",
  "titel": "Kurzer Titel",
  "lagemeldung": "Was die Einsatzkräfte beim Eintreffen erfahren.",
  "einsatzhinweis": "Hinweis für die Übungsleitung, worauf es ankommt.",
  "patienten": [
    {
      "id": "P-01",
      "name": "Vor- und Nachname",
      "alter": 34,
      "geschlecht": "w",
      "kurzbefund": "Was man auf den ersten Blick sieht.",
      "untersuchungsbefund": "Was die körperliche Untersuchung ergibt.",
      "gehfaehig": false,
      "kritischeBlutung": false,
      "spontanatmung": true,
      "befolgtAufforderungen": true,
      "startVitalwerte": {
        "atemfrequenz": 22,
        "herzfrequenz": 104,
        "systolischerRR": 110,
        "spo2": 95,
        "gcs": 15,
        "rekapzeit": 2
      },
      "pupillen": "unauffaellig",
      "auskultation": "seitengleich belüftet",
      "ekg": "Sinusrhythmus",
      "probleme": [
        {
          "id": "kurzname-des-problems",
          "label": "Anzeigename",
          "beschreibung": "Was die Einsatzkraft vorfindet - reiner Befund.",
          "behandeltDurch": ["tourniquet"],
          "verlauf": { "systolischerRR": -6, "herzfrequenz": 5 },
          "startetNachMin": 3
        }
      ],
      "erwarteteSK": "SK1"
    }
  ]
}

"startetNachMin", "pupillen", "auskultation" und "ekg" sind optional und
können entfallen.

REGELN

${regeltext()}`;
}
