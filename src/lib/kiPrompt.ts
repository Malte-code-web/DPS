import { MASSNAHMEN_LISTE } from '../domain/massnahmen';
import { GRENZWERTE } from '../domain/triage';

/**
 * @anker ki.prompt Erzeugt den Auftrag für eine KI, ein Szenario zu bauen
 *
 * Die App hat keinen Server und ruft kein Modell selbst auf. Stattdessen
 * erzeugt sie einen vollständigen Auftrag, den die Übungsleitung in eine
 * beliebige KI einfügt; das Ergebnis kommt über den JSON-Import zurück.
 *
 * Der Auftrag wird aus dem echten Maßnahmenkatalog und den echten mSTaRT-
 * Grenzwerten gebaut - er kann also nicht veralten.
 */
export interface PromptWunsch {
  lage: string;
  anzahl: number;
  schwerpunkt: string;
}

export function baueKiPrompt(wunsch: PromptWunsch): string {
  const massnahmen = MASSNAHMEN_LISTE.map(
    (massnahme) => `  "${massnahme.id}" (${massnahme.label}, ${massnahme.dauerSek} s)`,
  ).join('\n');

  return `Du erstellst ein Übungsszenario für eine MANV-Simulation (Massenanfall von
Verletzten). Antworte ausschließlich mit einem JSON-Objekt, ohne Text davor
oder danach, ohne Markdown-Codeblock.

LAGE
${wunsch.lage}

UMFANG
${wunsch.anzahl} Betroffene.

SCHWERPUNKT
${wunsch.schwerpunkt}

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
      "probleme": [
        {
          "id": "kurzname-des-problems",
          "label": "Anzeigename",
          "beschreibung": "Was zu tun ist.",
          "behandeltDurch": ["tourniquet"],
          "verlauf": { "systolischerRR": -6, "herzfrequenz": 5 },
          "startetNachMin": 3
        }
      ],
      "erwarteteSK": "SK1"
    }
  ]
}

REGELN

1. "verlauf" beschreibt die Veränderung pro Minute, solange das Problem
   unbehandelt ist. Negative Werte verschlechtern. Nur diese Schlüssel sind
   erlaubt: atemfrequenz, herzfrequenz, systolischerRR, spo2, gcs, rekapzeit.
2. "startetNachMin" ist optional und lässt ein Problem verzögert einsetzen.
3. "behandeltDurch" darf nur diese Maßnahmen-IDs enthalten:
${massnahmen}
4. "erwarteteSK" muss dem Ergebnis des mSTaRT-Algorithmus aus den Startwerten
   entsprechen. Der Algorithmus prüft in dieser Reihenfolge:
   - gehfaehig = true  -> SK3
   - kritischeBlutung = true -> SK1
   - spontanatmung = false -> SK4
   - atemfrequenz > ${GRENZWERTE.atemfrequenzHoch} oder < ${GRENZWERTE.atemfrequenzNiedrig} -> SK1
   - systolischerRR < ${GRENZWERTE.radialispulsRRsys} oder rekapzeit > ${GRENZWERTE.rekapzeitKritisch} -> SK1
   - befolgtAufforderungen = false oder gcs < ${GRENZWERTE.gcsKritisch} -> SK1
   - sonst -> SK2
5. Wertebereiche: atemfrequenz 0-60, herzfrequenz 0-220, systolischerRR 0-220,
   spo2 0-100, gcs 3-15, rekapzeit 0.5-10.
6. Ein Patient verstirbt, wenn spo2 auf 40 oder systolischerRR auf 30 fällt.
   Wähle die Verlaufswerte so, dass unbehandelte kritische Patienten innerhalb
   von 8 bis 20 Minuten sterben, stabile Leichtverletzte aber nicht.
7. Patienten-IDs müssen eindeutig sein. Namen und Befunde auf Deutsch.
8. Mische die Kategorien realistisch: wenige SK1, mehr SK2 und SK3, höchstens
   ein SK4.`;
}
