import { VERSCHLECHTERUNG_FAKTOR, patientAusVorlage } from './simulation';
import { sichtungNachMstart } from './triage';
import type {
  Koerperregion,
  MassnahmeId,
  PatientVorlage,
  Problem,
  Pupillenbefund,
  Sichtungskategorie,
  Startwerte,
  Szenario,
  VitalVerlauf,
} from './types';

/**
 * @anker generator.baukasten Szenarien ohne Modell, ohne Schlüssel, ohne Netz
 *
 * Der kostenfreie Weg zu einer neuen Lage: ein Baukasten aus Verletzungsmustern,
 * der im Browser läuft. Kein API-Schlüssel, keine Kosten, funktioniert auch in
 * der Einzeldatei ohne Internet.
 *
 * Der Kniff steckt in der Richtung der Rechnung. Ein Modell muss raten, welche
 * Verlaufswerte einen Patienten rechtzeitig sterben lassen, und liegt dabei oft
 * daneben - genau deshalb gibt es die Nachbesserungsschleife. Hier läuft es
 * andersherum: Die Zielminute wird vorgegeben und die Änderung pro Minute daraus
 * zurückgerechnet (→ `generator.zielminute`). Ein Szenario aus dem Baukasten
 * besteht den Probelauf damit von vornherein.
 */

/** Todesschwellen aus `simulation.ts` - hier als Rechengrundlage. */
const SCHWELLE = { systolischerRR: 30, spo2: 40 } as const;

type Leitwert = keyof typeof SCHWELLE;

export type LageId = 'verkehr' | 'zug' | 'brand' | 'explosion' | 'einsturz';

interface Lage {
  titel: string;
  lagemeldung: (anzahl: number) => string;
  einsatzhinweis: string;
  muster: string[];
}

interface Muster {
  id: string;
  ziel: Sichtungskategorie;
  kurzbefund: string;
  untersuchungsbefund: string;
  problemLabel: string;
  problemBeschreibung: string;
  behandeltDurch: MassnahmeId[];
  /** Vitalwert, über den der Patient kippt. */
  leitwert: Leitwert;
  /** Startwert des Leitwerts; die Rate wird daraus zurückgerechnet. */
  start: number;
  /** Begleitende Veränderungen pro Minute - klein halten, sie laufen mit. */
  begleit?: VitalVerlauf;
  /** Nur für SK1: welcher Zweig des mSTaRT greifen soll. */
  weg?: 'blutung' | 'atmung' | 'kreislauf' | 'bewusstsein';
  /** Körperliche Befunde - der Weg, das Problem überhaupt zu finden. */
  pupillen?: Pupillenbefund;
  auskultation?: string;
  ekg?: string;
  /** Schmerzstärke auf der NRS. */
  schmerz?: number;
  /** Wo am Körper - erscheint nach dem Bodycheck im Körperschema. */
  koerperregion: Koerperregion;
  /** Auf den ersten Blick erkennbar - steht sofort auf dem Schema. */
  offensichtlich?: boolean;
}

/**
 * @anker generator.muster Der Vorrat an Verletzungsmustern - hier erweitern
 *
 * Jedes Muster beschreibt ein Verletzungsbild, nicht einen fertigen Patienten.
 * Vitalwerte, Name, Alter und die Verlaufsrate entstehen erst beim Bauen.
 */
const MUSTER: Muster[] = [
  {
    id: 'oberschenkelblutung',
    offensichtlich: true,
    koerperregion: 'bein_rechts',
    ziel: 'SK1',
    weg: 'blutung',
    kurzbefund: 'Spritzende Blutung am Oberschenkel, große Blutlache.',
    untersuchungsbefund: 'Tiefe Weichteilwunde am Oberschenkel, arterielle Blutung.',
    problemLabel: 'Arterielle Blutung Oberschenkel',
    problemBeschreibung: 'Pulsierende Blutung aus der Wunde, Hose durchtränkt, Blutlache am Boden.',
    schmerz: 8,
    behandeltDurch: ['tourniquet', 'blutstillung'],
    leitwert: 'systolischerRR',
    start: 105,
    begleit: { herzfrequenz: 3, rekapzeit: 0.1 },
  },
  {
    id: 'amputation',
    offensichtlich: true,
    koerperregion: 'arm_links',
    ziel: 'SK1',
    weg: 'blutung',
    kurzbefund: 'Unterarm subtotal amputiert, blutet stark.',
    untersuchungsbefund: 'Subtotale Amputation im Unterarm, pulsierende Blutung.',
    problemLabel: 'Subtotale Amputation',
    problemBeschreibung: 'Unterarm nur noch über Weichteile verbunden, spritzende Blutung aus dem Stumpf.',
    schmerz: 9,
    behandeltDurch: ['tourniquet'],
    leitwert: 'systolischerRR',
    start: 100,
    begleit: { herzfrequenz: 3 },
  },
  {
    id: 'spannungspneu',
    koerperregion: 'thorax',
    ziel: 'SK1',
    weg: 'atmung',
    kurzbefund: 'Ringt nach Luft, atmet sehr schnell und flach.',
    untersuchungsbefund: 'Einseitig fehlendes Atemgeräusch, gestaute Halsvenen.',
    problemLabel: 'Spannungspneumothorax',
    problemBeschreibung: 'Gestaute Halsvenen, hypersonorer Klopfschall, Atemnot nimmt rasch zu.',
    auskultation: 'einseitig kein Atemgeräusch, Gegenseite seitengleich belüftet',
    schmerz: 6,
    behandeltDurch: ['thoraxentlastung'],
    leitwert: 'spo2',
    start: 84,
    begleit: { herzfrequenz: 3 },
  },
  {
    id: 'rauchgas_schwer',
    offensichtlich: true,
    koerperregion: 'hals',
    ziel: 'SK1',
    weg: 'atmung',
    kurzbefund: 'Rußgeschwärzt, hustet, atmet mühsam und laut.',
    untersuchungsbefund: 'Rußpartikel in Mund und Rachen, Stridor, verbrannte Nasenhaare.',
    problemLabel: 'Inhalationstrauma',
    problemBeschreibung: 'Ruß in Mund und Rachen, heisere Stimme, hörbares Einatmen.',
    auskultation: 'inspiratorischer Stridor, giemende Nebengeräusche beidseits',
    schmerz: 4,
    behandeltDurch: ['sauerstoffgabe', 'intubation'],
    leitwert: 'spo2',
    start: 82,
    begleit: { atemfrequenz: 0.4 },
  },
  {
    id: 'verschuetteter_thorax',
    koerperregion: 'thorax',
    ziel: 'SK1',
    weg: 'kreislauf',
    kurzbefund: 'War verschüttet, blass und kaltschweißig, kaum ansprechbar.',
    untersuchungsbefund: 'Instabiler Thorax, Prellmarken, schwacher Radialispuls.',
    problemLabel: 'Thoraxtrauma mit Blutverlust',
    problemBeschreibung: 'Thorax instabil bei Kompression, Haut kaltschweißig, Puls kaum zu tasten.',
    ekg: 'Sinustachykardie, vereinzelt Extrasystolen',
    schmerz: 7,
    behandeltDurch: ['volumengabe', 'schocklage'],
    leitwert: 'systolischerRR',
    start: 85,
    begleit: { herzfrequenz: 3, rekapzeit: 0.1 },
  },
  {
    id: 'beckenfraktur',
    offensichtlich: true,
    koerperregion: 'becken',
    ziel: 'SK1',
    weg: 'kreislauf',
    kurzbefund: 'Liegt eingeklemmt, klagt über stärkste Schmerzen im Becken.',
    untersuchungsbefund: 'Instabiles Becken, zunehmende Kreislaufzentralisation.',
    problemLabel: 'Beckenringfraktur mit Blutung',
    problemBeschreibung: 'Becken federt bei vorsichtigem Druck, Hämatom in der Leiste, blasse Haut.',
    schmerz: 8,
    behandeltDurch: ['beckenschlinge', 'volumengabe'],
    leitwert: 'systolischerRR',
    start: 88,
    begleit: { herzfrequenz: 3, rekapzeit: 0.1 },
  },
  {
    id: 'sht',
    offensichtlich: true,
    koerperregion: 'kopf',
    ziel: 'SK1',
    weg: 'bewusstsein',
    kurzbefund: 'Reagiert nicht auf Ansprache, blutende Kopfplatzwunde.',
    untersuchungsbefund: 'Schädel-Hirn-Trauma, ungleiche Pupillen, Schnarchatmung.',
    problemLabel: 'Schweres Schädel-Hirn-Trauma',
    problemBeschreibung: 'Keine Reaktion auf Ansprache, schnarchende Atmung, Blut im Mundraum.',
    pupillen: 'seitendifferent',
    schmerz: 0,
    behandeltDurch: ['atemwege_freimachen', 'guedeltubus', 'wendltubus', 'intubation'],
    leitwert: 'spo2',
    start: 86,
    begleit: { atemfrequenz: -0.3 },
  },
  {
    id: 'oberschenkelfraktur',
    offensichtlich: true,
    koerperregion: 'bein_links',
    ziel: 'SK2',
    kurzbefund: 'Liegt, Bein deutlich fehlgestellt, starke Schmerzen.',
    untersuchungsbefund: 'Geschlossene Oberschenkelfraktur, Schwellung.',
    problemLabel: 'Oberschenkelfraktur',
    problemBeschreibung: 'Deutliche Fehlstellung des Oberschenkels, Schwellung, jede Bewegung schmerzt.',
    schmerz: 8,
    behandeltDurch: ['immobilisation', 'esketamin'],
    leitwert: 'systolischerRR',
    start: 112,
    begleit: { herzfrequenz: 1 },
  },
  {
    id: 'thoraxprellung',
    offensichtlich: true,
    koerperregion: 'thorax',
    ziel: 'SK2',
    kurzbefund: 'Sitzt angelehnt, atmet flach wegen Schmerzen.',
    untersuchungsbefund: 'Rippenserienfraktur, Atemexkursion schmerzbedingt vermindert.',
    problemLabel: 'Rippenserienfraktur',
    problemBeschreibung: 'Druckschmerz über den Rippen, atmet flach und schont die verletzte Seite.',
    auskultation: 'rechts abgeschwächt, keine Rasselgeräusche',
    schmerz: 6,
    behandeltDurch: ['sauerstoffgabe', 'morphin'],
    leitwert: 'spo2',
    start: 93,
    begleit: { atemfrequenz: 0.2 },
  },
  {
    id: 'verbrennung',
    offensichtlich: true,
    koerperregion: 'thorax',
    ziel: 'SK2',
    kurzbefund: 'Verbrennungen an Armen und Rumpf, wach und ansprechbar.',
    untersuchungsbefund: 'Verbrennungen zweiten Grades, etwa 15 Prozent der Körperoberfläche.',
    problemLabel: 'Verbrennung 2. Grades',
    problemBeschreibung: 'Blasenbildung an Armen und Rumpf, nässende Wundflächen, Patient friert.',
    schmerz: 8,
    behandeltDurch: ['waermeerhalt', 'esketamin', 'volumengabe'],
    leitwert: 'systolischerRR',
    start: 110,
    begleit: { herzfrequenz: 1 },
  },
  {
    id: 'wirbelsaeule',
    offensichtlich: true,
    koerperregion: 'ruecken',
    ziel: 'SK2',
    kurzbefund: 'Liegt still, klagt über Rückenschmerzen und Kribbeln in den Beinen.',
    untersuchungsbefund: 'Druckschmerz über der Brustwirbelsäule, Sensibilitätsstörung.',
    problemLabel: 'Verdacht auf Wirbelsäulenverletzung',
    problemBeschreibung: 'Druckschmerz über der Brustwirbelsäule, Kribbeln in beiden Beinen.',
    schmerz: 5,
    behandeltDurch: ['immobilisation', 'waermeerhalt'],
    leitwert: 'systolischerRR',
    start: 115,
    begleit: { herzfrequenz: 1 },
  },
  {
    id: 'schuerfwunden',
    offensichtlich: true,
    koerperregion: 'arm_rechts',
    ziel: 'SK3',
    kurzbefund: 'Geht umher, Schürfwunden an Armen und Knien.',
    untersuchungsbefund: 'Oberflächliche Schürfwunden, sonst unauffällig.',
    problemLabel: 'Schürfwunden',
    problemBeschreibung: 'Oberflächliche Schürfwunden an Armen und Knien, stark verschmutzt.',
    schmerz: 3,
    behandeltDurch: ['betreuung', 'waermeerhalt'],
    leitwert: 'systolischerRR',
    start: 126,
    begleit: { herzfrequenz: 1 },
  },
  {
    id: 'handgelenk',
    offensichtlich: true,
    koerperregion: 'arm_rechts',
    ziel: 'SK3',
    kurzbefund: 'Steht abseits, hält das Handgelenk, ansprechbar.',
    untersuchungsbefund: 'Schmerzhafte Schwellung des Handgelenks, Durchblutung intakt.',
    problemLabel: 'Distale Radiusfraktur',
    problemBeschreibung: 'Schmerzhafte Schwellung über dem Handgelenk, Finger gut durchblutet.',
    schmerz: 4,
    behandeltDurch: ['immobilisation', 'esketamin'],
    leitwert: 'systolischerRR',
    start: 124,
    begleit: { herzfrequenz: 1 },
  },
  {
    id: 'unverletzt_betroffen',
    offensichtlich: true,
    koerperregion: 'kopf',
    ziel: 'SK3',
    kurzbefund: 'Läuft aufgeregt umher, körperlich unverletzt.',
    untersuchungsbefund: 'Keine Verletzungszeichen, deutliche Belastungsreaktion.',
    problemLabel: 'Akute Belastungsreaktion',
    problemBeschreibung: 'Läuft aufgeregt umher, spricht hastig, keine Verletzungszeichen.',
    schmerz: 1,
    behandeltDurch: ['betreuung'],
    leitwert: 'systolischerRR',
    start: 130,
    begleit: { herzfrequenz: 1 },
  },
  {
    id: 'innere_blutung',
    koerperregion: 'abdomen',
    ziel: 'SK3',
    kurzbefund: 'Geht umher, klagt über leichte Bauchschmerzen.',
    untersuchungsbefund: 'Gurtmarke am Abdomen, zunehmender Druckschmerz.',
    problemLabel: 'Intraabdominelle Blutung',
    problemBeschreibung: 'Gurtmarke am Abdomen, Bauchdecke zunehmend gespannt, Patient wird stiller.',
    schmerz: 4,
    behandeltDurch: ['volumengabe'],
    leitwert: 'systolischerRR',
    start: 120,
    begleit: { herzfrequenz: 2, rekapzeit: 0.06 },
  },
  {
    id: 'apnoe',
    offensichtlich: true,
    koerperregion: 'thorax',
    ziel: 'SK4',
    kurzbefund: 'Reglos, keine sichtbare Atmung.',
    untersuchungsbefund: 'Keine Spontanatmung, zentrale Zyanose, weite Pupillen.',
    problemLabel: 'Atemstillstand nach Schädel-Hirn-Trauma',
    problemBeschreibung: 'Keine Atembewegung, keine Reaktion auf Schmerzreiz, Haut fahl.',
    pupillen: 'weit',
    auskultation: 'kein Atemgeräusch beidseits',
    schmerz: 0,
    behandeltDurch: ['beatmung', 'intubation'],
    leitwert: 'spo2',
    start: 68,
  },
];

const LAGEN: Record<LageId, Lage> = {
  verkehr: {
    titel: 'Verkehrsunfall',
    lagemeldung: (anzahl) =>
      `Auffahrunfall auf der Bundesstraße, mehrere Fahrzeuge ineinander geschoben. ` +
      `Etwa ${anzahl} Betroffene, einzelne eingeklemmt. Erster RTW vor Ort.`,
    einsatzhinweis:
      'Eingeklemmte binden viel Zeit - die Vorsichtung darf darauf nicht warten.',
    muster: [
      'oberschenkelblutung',
      'amputation',
      'sht',
      'beckenfraktur',
      'oberschenkelfraktur',
      'thoraxprellung',
      'wirbelsaeule',
      'schuerfwunden',
      'handgelenk',
      'unverletzt_betroffen',
      'innere_blutung',
      'apnoe',
    ],
  },
  zug: {
    titel: 'Zugunglück',
    lagemeldung: (anzahl) =>
      `Regionalzug im Bahnhofsbereich entgleist, ein Waggon liegt quer. ` +
      `Etwa ${anzahl} Betroffene, Teile im Gleisbett verteilt.`,
    einsatzhinweis:
      'Gleise gesperrt, aber weiträumige Lage - die Sammlung der Gehfähigen ist entscheidend.',
    muster: [
      'oberschenkelblutung',
      'amputation',
      'spannungspneu',
      'sht',
      'beckenfraktur',
      'oberschenkelfraktur',
      'wirbelsaeule',
      'thoraxprellung',
      'schuerfwunden',
      'handgelenk',
      'unverletzt_betroffen',
      'innere_blutung',
      'apnoe',
    ],
  },
  brand: {
    titel: 'Brand mit Menschenrettung',
    lagemeldung: (anzahl) =>
      `Kellerbrand mit starker Verrauchung im Treppenhaus. ` +
      `Etwa ${anzahl} Bewohner gerettet, Sammelstelle vor dem Gebäude.`,
    einsatzhinweis:
      'Rauchgasintoxikationen verschlechtern sich verzögert - Nachsichtung einplanen.',
    muster: [
      'rauchgas_schwer',
      'sht',
      'verbrennung',
      'thoraxprellung',
      'schuerfwunden',
      'unverletzt_betroffen',
      'handgelenk',
      'apnoe',
    ],
  },
  explosion: {
    titel: 'Explosion',
    lagemeldung: (anzahl) =>
      `Explosion in einem Gewerbebetrieb, Fassade teilweise eingestürzt. ` +
      `Etwa ${anzahl} Betroffene, Trümmer auf dem Hof.`,
    einsatzhinweis: 'Mit weiteren Verletzten im Gebäude rechnen - Lage bleibt unübersichtlich.',
    muster: [
      'amputation',
      'spannungspneu',
      'oberschenkelblutung',
      'sht',
      'verbrennung',
      'thoraxprellung',
      'oberschenkelfraktur',
      'schuerfwunden',
      'unverletzt_betroffen',
      'innere_blutung',
      'apnoe',
    ],
  },
  einsturz: {
    titel: 'Gebäudeeinsturz',
    lagemeldung: (anzahl) =>
      `Teileinsturz eines Rohbaus, Deckenplatte auf das Gerüst gestürzt. ` +
      `Etwa ${anzahl} Betroffene, einzelne verschüttet.`,
    einsatzhinweis: 'Verschüttete brauchen technische Rettung - Zeit läuft für alle anderen weiter.',
    muster: [
      'verschuetteter_thorax',
      'beckenfraktur',
      'oberschenkelblutung',
      'sht',
      'wirbelsaeule',
      'oberschenkelfraktur',
      'schuerfwunden',
      'handgelenk',
      'unverletzt_betroffen',
      'innere_blutung',
      'apnoe',
    ],
  },
};

export const LAGEN_LISTE = (Object.keys(LAGEN) as LageId[]).map((id) => ({
  id,
  titel: LAGEN[id].titel,
}));

const VORNAMEN_W = ['Anna', 'Lena', 'Sofia', 'Marie', 'Julia', 'Klara', 'Nina', 'Hanna', 'Ella', 'Mia', 'Greta', 'Ida'];
const VORNAMEN_M = ['Jonas', 'Tobias', 'Lukas', 'Felix', 'Jan', 'Paul', 'Erik', 'David', 'Nico', 'Simon', 'Ben', 'Ole'];
const NACHNAMEN = [
  'Hoffmann', 'Vogt', 'Bergmann', 'Renner', 'Lang', 'Brandt', 'Weber', 'Petersen',
  'Krüger', 'Sommer', 'Ziegler', 'Hartmann', 'Schuster', 'Baumann', 'Reuter', 'Falk',
];

/** Kleiner, wiederholbarer Zufallsgenerator (mulberry32). */
function zufall(saat: number) {
  let zustand = saat >>> 0;
  return () => {
    zustand = (zustand + 0x6d2b79f5) >>> 0;
    let t = zustand;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Wuerfel = ReturnType<typeof zufall>;

const ganzzahl = (w: Wuerfel, von: number, bis: number) => von + Math.floor(w() * (bis - von + 1));
const auswahl = <T,>(w: Wuerfel, liste: T[]): T => liste[Math.floor(w() * liste.length)]!;
const streuung = (w: Wuerfel, wert: number, spanne: number) =>
  Math.round((wert + (w() * 2 - 1) * spanne) * 10) / 10;

/**
 * @anker generator.zielminute Aus der gewünschten Todesminute wird die Verlaufsrate
 *
 * Die Umkehrung der Simulation: Statt zu raten, wie schnell ein Wert fallen
 * muss, wird die Strecke bis zur Todesschwelle durch die Zeit geteilt. Der
 * Abzug von einer Viertelminute sorgt dafür, dass die Schwelle sicher innerhalb
 * der Zielminute unterschritten wird und nicht erst in der nächsten.
 */
function rateFuerZielminute(leitwert: Leitwert, start: number, zielMinute: number): number {
  return -(start - SCHWELLE[leitwert]) / (zielMinute - 0.25);
}

/** Verteilt die Sichtungskategorien realistisch auf die Betroffenen. */
export function verteilung(anzahl: number): Sichtungskategorie[] {
  const sk4 = anzahl >= 8 ? 1 : 0;
  const sk1 = Math.min(Math.max(1, Math.round(anzahl * 0.2)), Math.floor(anzahl / 2));
  const sk3 = anzahl >= 3 ? Math.max(1, Math.round((anzahl - sk1 - sk4) * 0.55)) : 0;
  const sk2 = Math.max(0, anzahl - sk1 - sk3 - sk4);

  return [
    ...Array<Sichtungskategorie>(sk1).fill('SK1'),
    ...Array<Sichtungskategorie>(sk2).fill('SK2'),
    ...Array<Sichtungskategorie>(sk3).fill('SK3'),
    ...Array<Sichtungskategorie>(sk4).fill('SK4'),
  ];
}

/** Die Startwerte, die den gewünschten mSTaRT-Zweig auslösen. */
function grundwerte(muster: Muster, w: Wuerfel): { werte: Startwerte; flags: Flags } {
  const flags: Flags = {
    gehfaehig: false,
    kritischeBlutung: false,
    spontanatmung: true,
    befolgtAufforderungen: true,
  };
  const werte: Startwerte = {
    atemfrequenz: streuung(w, 20, 2),
    herzfrequenz: streuung(w, 108, 8),
    systolischerRR: 120,
    spo2: 96,
    gcs: 15,
    rekapzeit: streuung(w, 1.6, 0.3),
    blutzucker: Math.round(streuung(w, 100, 20)),
    temperatur: streuung(w, 36.6, 0.3),
    schmerz: 0,
  };

  switch (muster.ziel) {
    case 'SK1':
      if (muster.weg === 'blutung') flags.kritischeBlutung = true;
      if (muster.weg === 'atmung') werte.atemfrequenz = streuung(w, 34, 2);
      if (muster.weg === 'kreislauf') werte.rekapzeit = streuung(w, 3, 0.4);
      if (muster.weg === 'bewusstsein') {
        werte.gcs = ganzzahl(w, 5, 8);
        flags.befolgtAufforderungen = false;
      }
      break;
    case 'SK2':
      werte.herzfrequenz = streuung(w, 96, 8);
      break;
    case 'SK3':
      flags.gehfaehig = true;
      werte.atemfrequenz = streuung(w, 17, 2);
      werte.herzfrequenz = streuung(w, 88, 8);
      werte.rekapzeit = streuung(w, 1.4, 0.2);
      break;
    case 'SK4':
      flags.spontanatmung = false;
      flags.befolgtAufforderungen = false;
      werte.atemfrequenz = 0;
      werte.gcs = 3;
      werte.herzfrequenz = streuung(w, 44, 6);
      break;
    default:
      break;
  }

  // Der Leitwert kommt aus dem Muster - er trägt den Verlauf.
  werte[muster.leitwert] = streuung(w, muster.start, 3);
  werte.schmerz = muster.schmerz ?? 0;
  return { werte, flags };
}

interface Flags {
  gehfaehig: boolean;
  kritischeBlutung: boolean;
  spontanatmung: boolean;
  befolgtAufforderungen: boolean;
}

/** Zielminute und Latenz je Kategorie - die Vorgabe, aus der die Rate folgt. */
function verlaufsplan(
  ziel: Sichtungskategorie,
  falle: boolean,
  w: Wuerfel,
): { zielMinute: number | null; startetNachMin?: number } {
  switch (ziel) {
    case 'SK1':
      return { zielMinute: ganzzahl(w, 9, 17) };
    case 'SK2':
      // Stirbt rechnerisch weit hinter dem Probelauf - verschlechtert sich also
      // deutlich, überlebt den Probelauf-Zeitraum aber sicher.
      return { zielMinute: ganzzahl(w, 55, 75) };
    case 'SK3':
      // Ohne Zielminute bleibt der Leitwert unberührt: ein Leichtverletzter
      // verliert über die Übung keinen Blutdruck, nur der Puls geht hoch.
      return falle
        ? { zielMinute: ganzzahl(w, 23, 27), startetNachMin: ganzzahl(w, 2, 4) }
        : { zielMinute: null };
    case 'SK4':
      return { zielMinute: ganzzahl(w, 3, 6) };
    default:
      return { zielMinute: null };
  }
}

function baueProblem(muster: Muster, plan: ReturnType<typeof verlaufsplan>, start: number): Problem {
  const verlauf: VitalVerlauf = { ...muster.begleit };
  if (plan.zielMinute !== null) {
    const dauer = plan.zielMinute - (plan.startetNachMin ?? 0);
    // Der globale Tempofaktor (→ `sim.tempo`) drosselt beim Laden alle Raten.
    // Damit die vorgegebene Zielminute trotzdem exakt getroffen wird, rechnet
    // der Generator ihn hier heraus.
    verlauf[muster.leitwert] =
      Math.round((rateFuerZielminute(muster.leitwert, start, dauer) / VERSCHLECHTERUNG_FAKTOR) * 100) /
      100;
  }

  return {
    id: muster.id,
    label: muster.problemLabel,
    beschreibung: muster.problemBeschreibung,
    behandeltDurch: muster.behandeltDurch,
    koerperregion: muster.koerperregion,
    ...(muster.offensichtlich ? { offensichtlich: true } : {}),
    verlauf,
    ...(plan.startetNachMin ? { startetNachMin: plan.startetNachMin } : {}),
  };
}

function bauePatient(
  muster: Muster,
  nummer: number,
  falle: boolean,
  w: Wuerfel,
  vergebeneNamen: Set<string>,
): PatientVorlage {
  const { werte, flags } = grundwerte(muster, w);
  const plan = verlaufsplan(muster.ziel, falle, w);

  const weiblich = w() < 0.5;
  let name = '';
  do {
    name = `${auswahl(w, weiblich ? VORNAMEN_W : VORNAMEN_M)} ${auswahl(w, NACHNAMEN)}`;
  } while (vergebeneNamen.has(name));
  vergebeneNamen.add(name);

  const vorlage: PatientVorlage = {
    id: `P-${String(nummer).padStart(2, '0')}`,
    name,
    alter: ganzzahl(w, 16, 78),
    geschlecht: weiblich ? 'w' : 'm',
    kurzbefund: muster.kurzbefund,
    untersuchungsbefund: muster.untersuchungsbefund,
    ...flags,
    startVitalwerte: werte,
    ...(muster.pupillen ? { pupillen: muster.pupillen } : {}),
    ...(muster.auskultation ? { auskultation: muster.auskultation } : {}),
    ...(muster.ekg ? { ekg: muster.ekg } : {}),
    probleme: [baueProblem(muster, plan, werte[muster.leitwert])],
    // Die Referenzkategorie wird nicht behauptet, sondern gerechnet - damit
    // kann sie nie von mSTaRT abweichen.
    erwarteteSK: 'SK2',
  };

  return { ...vorlage, erwarteteSK: sichtungNachMstart(patientAusVorlage(vorlage)).kategorie };
}

export interface GeneratorWunsch {
  lage: LageId;
  anzahl: number;
  /** Gleiche Saat, gleiches Szenario - zum Wiederholen einer Übung. */
  saat: number;
}

/**
 * Baut ein vollständiges Szenario aus dem Baukasten.
 * Reine Funktion: gleiche Eingabe, gleiches Ergebnis.
 */
export function erzeugeSzenarioLokal({ lage, anzahl, saat }: GeneratorWunsch): Szenario {
  const w = zufall(saat);
  const beschreibung = LAGEN[lage];
  const kategorien = verteilung(Math.max(2, Math.min(30, Math.round(anzahl))));
  const vorrat = MUSTER.filter((muster) => beschreibung.muster.includes(muster.id));
  const namen = new Set<string>();

  // Genau ein gehfähiger Patient wird zur Falle für die Nachsichtung.
  const falleBei = kategorien.lastIndexOf('SK3');

  const patienten = kategorien.map((kategorie, index) => {
    const passende = vorrat.filter((muster) => muster.ziel === kategorie);
    const geeignet = passende.length > 0 ? passende : vorrat;
    const falle = index === falleBei && kategorien.length >= 6;
    const muster =
      kategorie === 'SK3' && falle
        ? (geeignet.find((eintrag) => eintrag.id === 'innere_blutung') ?? auswahl(w, geeignet))
        : auswahl(
            w,
            geeignet.filter((eintrag) => eintrag.id !== 'innere_blutung' || kategorie !== 'SK3'),
          );

    return bauePatient(muster, index + 1, falle, w, namen);
  });

  return {
    id: `${lage}-${saat}`,
    titel: `${beschreibung.titel} (${patienten.length} Betroffene)`,
    lagemeldung: beschreibung.lagemeldung(patienten.length),
    einsatzhinweis: beschreibung.einsatzhinweis,
    patienten,
  };
}
