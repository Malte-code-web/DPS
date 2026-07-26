import { MASSNAHMEN_LISTE } from '../domain/massnahmen';
import { PUPILLEN_TEXT, SICHTUNGSKATEGORIEN } from '../domain/types';
import type { Pupillenbefund, Sichtungskategorie, VitalKey } from '../domain/types';

/**
 * @anker ki.schema Das JSON-Schema, an das die KI gebunden wird
 *
 * Bei der direkten Erzeugung antwortet das Modell nicht in Prosa, sondern
 * gegen dieses Schema (`output_config.format`). Damit fallen die häufigsten
 * Fehler weg: erfundene Maßnahmen-IDs, fehlende Felder, Markdown um das JSON.
 *
 * Das Schema wird aus dem echten Maßnahmenkatalog und den echten
 * Sichtungskategorien gebaut und kann deshalb nicht veralten. Bewusst
 * beschränkt auf den Kern von JSON Schema (type, properties, required, enum,
 * items, additionalProperties) - alles Weitere steht als Regel im Auftrag und
 * wird von `pruefeSzenario` geprüft.
 */

const MASSNAHMEN_IDS = MASSNAHMEN_LISTE.map((massnahme) => massnahme.id);
const KATEGORIEN = Object.keys(SICHTUNGSKATEGORIEN) as Sichtungskategorie[];
const PUPILLEN = Object.keys(PUPILLEN_TEXT) as Pupillenbefund[];

const VITAL_BESCHREIBUNG: Record<VitalKey, string> = {
  atemfrequenz: 'Atemfrequenz pro Minute, 0 bis 60.',
  herzfrequenz: 'Herzfrequenz pro Minute, 0 bis 220.',
  systolischerRR: 'Systolischer Blutdruck in mmHg, 0 bis 220.',
  spo2: 'Sauerstoffsättigung in Prozent, 0 bis 100.',
  gcs: 'Glasgow Coma Scale, 3 bis 15.',
  rekapzeit: 'Rekapillarisierungszeit in Sekunden, 0.5 bis 10.',
  blutzucker: 'Blutzucker in mg/dl, normal 70 bis 140.',
  temperatur: 'Körpertemperatur in Grad Celsius, normal 36 bis 37.5.',
  schmerz: 'Schmerz auf der numerischen Rangskala, 0 bis 10.',
};

const VITAL_KEYS = Object.keys(VITAL_BESCHREIBUNG) as VitalKey[];

function objekt(
  eigenschaften: Record<string, unknown>,
  beschreibung?: string,
): Record<string, unknown> {
  return {
    type: 'object',
    ...(beschreibung ? { description: beschreibung } : {}),
    properties: eigenschaften,
    // Strikte Schemata verlangen beides: keine Extrafelder, alle Felder gesetzt.
    required: Object.keys(eigenschaften),
    additionalProperties: false,
  };
}

const startVitalwerte = objekt(
  Object.fromEntries(
    VITAL_KEYS.map((key) => [key, { type: 'number', description: VITAL_BESCHREIBUNG[key] }]),
  ),
  'Messwerte zum Einsatzbeginn.',
);

const verlauf = objekt(
  Object.fromEntries(
    VITAL_KEYS.map((key) => [
      key,
      {
        type: ['number', 'null'],
        description: `Änderung von ${key} pro Minute, solange unbehandelt. Negativ verschlechtert. null, wenn dieser Wert unberührt bleibt.`,
      },
    ]),
  ),
  'Veränderung der Vitalwerte pro Minute.',
);

const problem = objekt({
  id: { type: 'string', description: 'Kurzname ohne Leerzeichen, im Patienten eindeutig.' },
  label: { type: 'string', description: 'Anzeigename des Problems.' },
  beschreibung: {
    type: 'string',
    description:
      'Der Befund, den die Einsatzkraft erhebt - ausschließlich Beobachtbares. ' +
      'Keine Handlungsanweisung, keine Nennung der richtigen Maßnahme.',
  },
  behandeltDurch: {
    type: 'array',
    description: 'Maßnahmen, die das Problem lösen. Nur diese IDs sind erlaubt.',
    items: { type: 'string', enum: MASSNAHMEN_IDS },
  },
  verlauf,
  startetNachMin: {
    type: ['number', 'null'],
    description: 'Minute, ab der das Problem wirkt. null bedeutet: von Anfang an.',
  },
});

const patient = objekt({
  id: { type: 'string', description: 'Eindeutige Kennung, z. B. "P-01".' },
  name: { type: 'string', description: 'Deutscher Vor- und Nachname.' },
  alter: { type: 'number' },
  geschlecht: { type: 'string', enum: ['w', 'm', 'd'] },
  kurzbefund: { type: 'string', description: 'Was man auf den ersten Blick sieht.' },
  untersuchungsbefund: { type: 'string', description: 'Was die körperliche Untersuchung ergibt.' },
  gehfaehig: { type: 'boolean' },
  kritischeBlutung: { type: 'boolean' },
  spontanatmung: { type: 'boolean' },
  befolgtAufforderungen: { type: 'boolean' },
  startVitalwerte,
  probleme: { type: 'array', items: problem },
  erwarteteSK: {
    type: 'string',
    enum: KATEGORIEN,
    description: 'Ergebnis des mSTaRT-Algorithmus aus den Startwerten.',
  },
  pupillen: {
    type: 'string',
    enum: PUPILLEN,
    description: 'Ergebnis der Pupillenkontrolle. "unauffaellig", wenn nichts zu finden ist.',
  },
  auskultation: {
    type: ['string', 'null'],
    description:
      'Auskultationsbefund der Lunge. null, wenn seitengleich unauffällig. ' +
      'Bei Atemwegs- und Thoraxproblemen der entscheidende Befund.',
  },
  ekg: {
    type: ['string', 'null'],
    description: 'Rhythmus im Monitoring. null, wenn Sinusrhythmus ohne Besonderheiten.',
  },
});

/** Das vollständige Schema eines Szenarios. */
export const SZENARIO_SCHEMA: Record<string, unknown> = objekt({
  id: { type: 'string', description: 'Kleinbuchstaben und Bindestriche.' },
  titel: { type: 'string' },
  lagemeldung: { type: 'string', description: 'Was die Einsatzkräfte beim Eintreffen erfahren.' },
  einsatzhinweis: { type: 'string', description: 'Hinweis für die Übungsleitung.' },
  patienten: { type: 'array', items: patient },
});

/**
 * @anker ki.normalisieren Räumt die Modellantwort auf, bevor sie geprüft wird
 *
 * Das Schema verlangt alle Felder, auch die optionalen - unbenutzte kommen
 * deshalb als `null` zurück. Hier werden sie entfernt, ebenso Nullwerte im
 * Verlauf, die ohnehin keine Wirkung hätten.
 */
export function normalisiereSzenario(wert: unknown): unknown {
  if (typeof wert !== 'object' || wert === null) return wert;
  const szenario = wert as Record<string, unknown>;
  if (!Array.isArray(szenario.patienten)) return szenario;

  return {
    ...szenario,
    patienten: szenario.patienten.map((eintrag: unknown) => {
      if (typeof eintrag !== 'object' || eintrag === null) return eintrag;
      const { auskultation, ekg, ...patientDaten } = eintrag as Record<string, unknown>;
      // Nicht gesetzte Textbefunde kommen als null zurück und fliegen raus.
      const textbefunde = {
        ...(typeof auskultation === 'string' ? { auskultation } : {}),
        ...(typeof ekg === 'string' ? { ekg } : {}),
      };
      if (!Array.isArray(patientDaten.probleme)) return { ...patientDaten, ...textbefunde };

      return {
        ...patientDaten,
        ...textbefunde,
        probleme: patientDaten.probleme.map((rohesProblem: unknown) => {
          if (typeof rohesProblem !== 'object' || rohesProblem === null) return rohesProblem;
          const { startetNachMin, verlauf: rohVerlauf, ...rest } = rohesProblem as Record<
            string,
            unknown
          >;
          const gefiltert =
            typeof rohVerlauf === 'object' && rohVerlauf !== null
              ? Object.fromEntries(
                  Object.entries(rohVerlauf).filter(
                    ([, betrag]) => typeof betrag === 'number' && betrag !== 0,
                  ),
                )
              : rohVerlauf;

          return {
            ...rest,
            verlauf: gefiltert,
            ...(typeof startetNachMin === 'number' && startetNachMin > 0 ? { startetNachMin } : {}),
          };
        }),
      };
    }),
  };
}
