import { lokalMZuGeo } from './geodaten';
import type { GeoPosition, Szenario } from './types';

/**
 * Kompakter Standard-Grundriss für einen Einzelfall (ein Patient, kurze
 * Wege) - dieselbe Ableitung über echte Meterversätze wie bei den
 * MANV-Szenarien (→ `domain.geodaten.projektion`), nur enger gefasst.
 */
function einzelfallGeodaten(ursprung: GeoPosition): Szenario['geodaten'] {
  return {
    ursprung,
    schluesselpunkte: {
      schadensstelle: ursprung,
      ablage: lokalMZuGeo(ursprung, 8, -10),
      bereitstellungsraum: lokalMZuGeo(ursprung, -25, -15),
      eingangssichtung: lokalMZuGeo(ursprung, 5, 12),
      zelt_rot: lokalMZuGeo(ursprung, 0, 25),
      zelt_gelb: lokalMZuGeo(ursprung, 10, 25),
      zelt_gruen: lokalMZuGeo(ursprung, 20, 25),
      ausgangssichtung: lokalMZuGeo(ursprung, 10, 40),
      transport: lokalMZuGeo(ursprung, 10, 55),
    },
  };
}

/**
 * @anker einzelfaelle.liste Einzelfälle - Szenarien mit genau einer Person
 *
 * Fokussierte Fälle für den Ablauf an einem einzigen Patienten: vorsichten,
 * untersuchen, versorgen, verlegen - ohne das Gedränge des MANV. Jeder Fall ist
 * ein Szenario mit einer einzigen Betroffenen und einem klaren Lernschwerpunkt.
 * Sie stehen in der digitalen Übung neben den MANV-Lagen zur Auswahl und lassen
 * sich, wie jedes Szenario, auch im Alleinspiel starten.
 */
export const EINZELFAELLE: Szenario[] = [
  {
    id: 'ez-blutung',
    titel: 'Einzelfall: Kritische Blutung',
    lagemeldung: 'Arbeitsunfall an der Kreissäge, stark blutende Wunde am Oberschenkel.',
    einsatzhinweis: 'Übt den xABCDE-Einstieg: kritische Blutung zuerst, dann sichten.',
    patienten: [
      {
        id: 'E-01',
        name: 'Markus Berg',
        alter: 38,
        geschlecht: 'm',
        gewicht: 83,
        kurzbefund: 'Sitzt an die Wand gelehnt, presst ein Tuch auf den blutenden Oberschenkel.',
        untersuchungsbefund: 'Spritzende arterielle Blutung am rechten Oberschenkel, sonst unauffällig.',
        gehfaehig: false,
        kritischeBlutung: true,
        spontanatmung: true,
        befolgtAufforderungen: true,
        startVitalwerte: {
          atemfrequenz: 22,
          herzfrequenz: 122,
          systolischerRR: 100,
          spo2: 97,
          gcs: 15,
          rekapzeit: 2.5,
          schmerz: 7,
        },
        probleme: [
          {
            id: 'oberschenkelblutung',
            offensichtlich: true,
            koerperregion: 'bein_rechts',
            label: 'Arterielle Blutung Oberschenkel',
            beschreibung: 'Spritzende Blutung, nicht durch Druck allein zu stillen.',
            behandeltDurch: ['tourniquet', 'blutstillung'],
            verlauf: { systolischerRR: -6, herzfrequenz: 4, spo2: -1 },
          },
        ],
        erwarteteSK: 'SK1',
      },
    ],
    // Ochtrup (Kreis Steinfurt), realer Stadtmittelpunkt - kein realer Einsatz.
    geodaten: einzelfallGeodaten({ lat: 52.2062, lon: 7.1866 }),
  },
  {
    id: 'ez-atemweg',
    titel: 'Einzelfall: Verlegter Atemweg',
    lagemeldung: 'Bewusstlose Person nach Sturz, schnarchende Atmung.',
    einsatzhinweis: 'Übt die Atemwegssicherung: Mundraumkontrolle deckt den Verschluss auf.',
    patienten: [
      {
        id: 'E-02',
        name: 'Sabine Krüger',
        alter: 44,
        geschlecht: 'w',
        gewicht: 68,
        kurzbefund: 'Liegt auf dem Rücken, reagiert nicht auf Ansprache, atmet geräuschvoll.',
        untersuchungsbefund: 'Schweres Schädel-Hirn-Trauma, schnarchende Atmung, Blut im Mundraum.',
        gehfaehig: false,
        kritischeBlutung: false,
        spontanatmung: true,
        befolgtAufforderungen: false,
        startVitalwerte: {
          atemfrequenz: 12,
          herzfrequenz: 92,
          systolischerRR: 130,
          spo2: 91,
          gcs: 7,
          rekapzeit: 1.8,
        },
        probleme: [
          {
            id: 'atemwegsverlegung',
            entdecktDurch: 'mundraumkontrolle',
            koerperregion: 'kopf',
            label: 'Verlegter Atemweg',
            beschreibung: 'Schnarchende Atmung, Blut und Erbrochenes im Mundraum, Zunge fällt zurück.',
            behandeltDurch: ['atemwege_freimachen', 'guedeltubus', 'wendltubus', 'intubation'],
            verlauf: { spo2: -4, gcs: -0.3, herzfrequenz: 2 },
          },
        ],
        erwarteteSK: 'SK1',
        pupillen: 'seitendifferent',
        auskultation: 'grobblasige Rasselgeräusche beidseits',
      },
    ],
    // Ibbenbüren (Kreis Steinfurt), realer Stadtmittelpunkt - kein realer Einsatz.
    geodaten: einzelfallGeodaten({ lat: 52.2779, lon: 7.7164 }),
  },
  {
    id: 'ez-thorax',
    titel: 'Einzelfall: Zunehmende Atemnot',
    lagemeldung: 'Sturz aus großer Höhe, klagt über Atemnot und Brustschmerz.',
    einsatzhinweis: 'Übt das B-Problem: der Spannungspneumothorax setzt erst verzögert ein.',
    patienten: [
      {
        id: 'E-03',
        name: 'Tobias Lang',
        alter: 29,
        geschlecht: 'm',
        gewicht: 76,
        kurzbefund: 'Sitzt vornübergebeugt, ringt sichtbar nach Luft, hält sich die rechte Thoraxseite.',
        untersuchungsbefund: 'Abgeschwächtes Atemgeräusch rechts, gestaute Halsvenen, Thoraxprellung.',
        gehfaehig: false,
        kritischeBlutung: false,
        spontanatmung: true,
        befolgtAufforderungen: true,
        startVitalwerte: {
          atemfrequenz: 26,
          herzfrequenz: 110,
          systolischerRR: 115,
          spo2: 94,
          gcs: 15,
          rekapzeit: 2.5,
          schmerz: 6,
        },
        probleme: [
          {
            id: 'spannungspneumothorax',
            koerperregion: 'thorax',
            label: 'Spannungspneumothorax',
            beschreibung: 'Zunehmende Atemnot, einseitig abgeschwächtes Atemgeräusch, gestaute Halsvenen.',
            behandeltDurch: ['thoraxentlastung'],
            verlauf: { spo2: -6, systolischerRR: -4, herzfrequenz: 3, schmerz: 0.15 },
            startetNachMin: 3,
          },
        ],
        erwarteteSK: 'SK1',
        auskultation: 'rechts deutlich abgeschwächt',
      },
    ],
    // Emsdetten (Kreis Steinfurt), realer Stadtmittelpunkt - kein realer Einsatz.
    geodaten: einzelfallGeodaten({ lat: 52.1667, lon: 7.5333 }),
  },
  {
    id: 'ez-schock',
    titel: 'Einzelfall: Innere Blutung',
    lagemeldung: 'Angefahrene Radfahrerin, klagt über zunehmende Bauchschmerzen.',
    einsatzhinweis: 'Übt das C-Problem: Zugang legen, Volumen geben, zügig verlegen.',
    patienten: [
      {
        id: 'E-04',
        name: 'Julia Petersen',
        alter: 34,
        geschlecht: 'w',
        gewicht: 63,
        kurzbefund: 'Blass, kaltschweißig, klagt über starke Bauchschmerzen, wird zunehmend unruhig.',
        untersuchungsbefund: 'Gespanntes Abdomen, deutliche Schockzeichen, keine äußere Blutung.',
        gehfaehig: false,
        kritischeBlutung: false,
        spontanatmung: true,
        befolgtAufforderungen: true,
        startVitalwerte: {
          atemfrequenz: 24,
          herzfrequenz: 118,
          systolischerRR: 98,
          spo2: 96,
          gcs: 14,
          rekapzeit: 3,
          schmerz: 7,
        },
        probleme: [
          {
            id: 'intraabdominelle-blutung',
            koerperregion: 'abdomen',
            label: 'Intraabdominelle Blutung',
            beschreibung: 'Präklinisch nicht zu stillen - Volumen verzögert, entscheidend ist der Transport.',
            behandeltDurch: ['volumengabe'],
            verlauf: { systolischerRR: -5, herzfrequenz: 3, schmerz: 0.2 },
            startetNachMin: 1,
          },
        ],
        erwarteteSK: 'SK2',
      },
    ],
    // Greven (Kreis Steinfurt), realer Stadtmittelpunkt - kein realer Einsatz.
    geodaten: einzelfallGeodaten({ lat: 52.0967, lon: 7.6122 }),
  },
];
