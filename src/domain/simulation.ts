import { abschnittInfo, sichtungsstelleIn } from './abschnitte';
import { DIAGNOSTIK } from './diagnostik';
import { DOSISREFERENZ, gewichtVon, wirkungBeiDosis } from './dosierung';
import { MASSNAHMEN } from './massnahmen';
import type {
  DiagnostikId,
  Einsatzabschnitt,
  KernVitalKey,
  MassnahmeId,
  Patient,
  PatientVorlage,
  Problem,
  Sichtungskategorie,
  Sichtungsstelle,
  Startwerte,
  VitalKey,
  VitalVerlauf,
  Vitalwerte,
} from './types';

/** Physiologisch sinnvolle Ober- und Untergrenzen je Vitalparameter. */
const GRENZEN: Record<VitalKey, { min: number; max: number }> = {
  atemfrequenz: { min: 0, max: 60 },
  herzfrequenz: { min: 0, max: 220 },
  systolischerRR: { min: 0, max: 220 },
  spo2: { min: 0, max: 100 },
  gcs: { min: 3, max: 15 },
  rekapzeit: { min: 0.5, max: 10 },
  blutzucker: { min: 10, max: 600 },
  temperatur: { min: 25, max: 43 },
  schmerz: { min: 0, max: 10 },
};

/**
 * Werte, die eine Vorlage weglassen darf.
 * @anker sim.standardwerte Unauffällige Vorgaben für die später ergänzten Werte
 */
export const STANDARD_ZUSATZWERTE: Omit<Vitalwerte, KernVitalKey> = {
  blutzucker: 95,
  temperatur: 36.6,
  schmerz: 0,
};

/** Liest einen Startwert aus einer Vorlage und füllt fehlende Werte auf. */
export function startwert(werte: Startwerte, key: VitalKey): number {
  return { ...STANDARD_ZUSATZWERTE, ...werte }[key];
}

function begrenze(key: VitalKey, wert: number): number {
  const { min, max } = GRENZEN[key];
  return Math.min(max, Math.max(min, wert));
}

/**
 * Wendet eine Vitalwert-Veränderung an und hält die Grenzen ein.
 * @anker sim.gleitkomma Warum intern nicht gerundet wird - sonst verschwindet jede Änderung
 *
 * Intern wird bewusst mit Gleitkommawerten gerechnet: ein Tick umfasst nur
 * Sekundenbruchteile einer Minute, gerundete Zwischenwerte würden die
 * Veränderung komplett verschlucken. Gerundet wird erst bei der Anzeige.
 */
export function veraendereVitalwerte(basis: Vitalwerte, delta: VitalVerlauf): Vitalwerte {
  const naechste: Vitalwerte = { ...basis };
  for (const [key, wert] of Object.entries(delta) as [VitalKey, number][]) {
    naechste[key] = begrenze(key, naechste[key] + wert);
  }
  return naechste;
}

/**
 * @anker sim.tempo Langsamere Verschlechterung im Alleinspiel
 *
 * Wer alleine spielt, kann nicht alles gleichzeitig - deshalb läuft die
 * Verschlechterung dann langsamer. 0.8 heißt rund 25 % mehr Zeit, bis derselbe
 * Zustand erreicht ist. Der Faktor ist kein globaler Schalter, sondern wird beim
 * Start je Sitzung an `patientAusVorlage` übergeben; im Teamspiel bleibt es bei
 * den gemeinten Raten (Faktor 1). So bleiben die Rechenfunktionen und die
 * Szenariodaten unberührt.
 */
export const SOLO_VERSCHLECHTERUNG_FAKTOR = 0.8;

function skaliereVerlauf(verlauf: VitalVerlauf, faktor: number): VitalVerlauf {
  const skaliert: VitalVerlauf = {};
  for (const [key, wert] of Object.entries(verlauf) as [VitalKey, number][]) {
    skaliert[key] = wert * faktor;
  }
  return skaliert;
}

/**
 * Erzeugt den Laufzeit-Patienten aus der statischen Szenario-Vorlage. Der
 * optionale Faktor drosselt die Verschlechterung fürs Alleinspiel (→ `sim.tempo`);
 * ohne Angabe (Faktor 1) gelten die gemeinten Raten.
 * @anker sim.startzustand Womit ein Patient in den Einsatz startet
 */
export function patientAusVorlage(vorlage: PatientVorlage, verschlechterungFaktor = 1): Patient {
  return {
    ...vorlage,
    probleme: vorlage.probleme.map((problem) => ({
      ...problem,
      verlauf:
        verschlechterungFaktor === 1
          ? problem.verlauf
          : skaliereVerlauf(problem.verlauf, verschlechterungFaktor),
    })),
    // Fehlende Zusatzwerte werden aufgefüllt - ältere Vorlagen kennen sie nicht.
    vitalwerte: { ...STANDARD_ZUSATZWERTE, ...vorlage.startVitalwerte },
    status: 'unbehandelt',
    abschnitt: 'schadensstelle',
    gesichtetAls: null,
    gesichtetUmSek: null,
    sichtungsverlauf: [],
    sichtungFinal: false,
    behandelteProbleme: [],
    durchgefuehrteMassnahmen: [],
    delegierteMassnahmen: [],
    durchgefuehrteDiagnostik: [],
    untersucht: false,
    verlauf: [],
  };
}

/** Alle Probleme, die aktuell unbehandelt sind und bereits wirken. */
export function aktiveProbleme(patient: Patient, zeitSek: number): Problem[] {
  return patient.probleme.filter(
    (problem) =>
      !patient.behandelteProbleme.includes(problem.id) &&
      zeitSek / 60 >= (problem.startetNachMin ?? 0),
  );
}

/**
 * @anker sim.tod Ab welchen Werten ein Patient verstirbt
 *
 * Tod ist in diesem Modell endgültig: `wendeMassnahmeAn` verweigert jede
 * weitere Maßnahme, sobald `status === 'verstorben'`. Das trifft bewusst auch
 * die Maßnahmen, deren Indikation selbst ein Kreislaufstillstand ist
 * (`reanimation`, `defibrillation`, `kardioversion`, `epinephrin` als
 * Reanimationsmedikament) - ein Stillstand ist damit in der Übung nicht
 * reversibel, nur vermeidbar. Eine reversible Zwischenstufe (erst nach
 * erfolgloser Reanimation über eine Zeitspanne verstorben) wäre medizinisch
 * treffender, ist aber bislang nicht modelliert - siehe die Vereinfachungen
 * in DOKUMENTATION.md.
 */
function istVerstorben(v: Vitalwerte): boolean {
  return v.spo2 <= 40 || v.systolischerRR <= 30 || v.herzfrequenz >= 220 || v.herzfrequenz <= 20;
}

function protokolliere(patient: Patient, zeitSek: number, text: string): Patient {
  return { ...patient, verlauf: [...patient.verlauf, { zeitSek, text }] };
}

/**
 * Rechnet den Zustand eines Patienten um `dtSek` Sekunden weiter.
 * @anker sim.tick Ein Simulationsschritt: Probleme wirken auf die Vitalwerte
 * Reine Funktion - der Aufrufer ersetzt den alten Patienten durch das Ergebnis.
 */
export function simuliereSchritt(patient: Patient, dtSek: number, zeitSek: number): Patient {
  if (patient.status === 'verstorben' || patient.status === 'transportiert') {
    return patient;
  }

  const dtMin = dtSek / 60;
  const wirksam = aktiveProbleme(patient, zeitSek);

  const delta: VitalVerlauf = {};
  for (const problem of wirksam) {
    for (const [key, proMinute] of Object.entries(problem.verlauf) as [VitalKey, number][]) {
      delta[key] = (delta[key] ?? 0) + proMinute * dtMin;
    }
  }

  let naechster: Patient = {
    ...patient,
    vitalwerte: veraendereVitalwerte(patient.vitalwerte, delta),
  };

  const v = naechster.vitalwerte;

  // @anker sim.befunde Gehfähigkeit, Atmung und Reaktion folgen den Vitalwerten
  // Abgeleitete Befunde: der Zustand des Patienten folgt seinen Vitalwerten.
  const spontanatmung = v.atemfrequenz >= 1;
  const befolgtAufforderungen = v.gcs >= 9 && (patient.befolgtAufforderungen || v.gcs >= 13);
  const gehfaehig = patient.gehfaehig && v.gcs >= 13 && v.systolischerRR >= 90;

  naechster = { ...naechster, spontanatmung, befolgtAufforderungen, gehfaehig };

  if (patient.gehfaehig && !gehfaehig) {
    naechster = protokolliere(
      naechster,
      zeitSek,
      'Patient sackt zusammen und ist nicht mehr gehfähig - Nachsichtung erforderlich.',
    );
  }

  if (istVerstorben(v)) {
    naechster = protokolliere(naechster, zeitSek, 'Keine Vitalfunktionen mehr feststellbar.');
    naechster = { ...naechster, status: 'verstorben' };
  }

  return naechster;
}

/**
 * Zeitbedarf einer Vorsichtung nach mSTaRT.
 * @anker sim.zeitkosten Stellschrauben für Sichtungs- und Untersuchungsdauer
 */
export const SICHTUNGSDAUER_SEK = 20;

/**
 * Zeitbedarf des Bodychecks - die Dauern aller Untersuchungen stehen in
 * `diagnostik.ts` (→ `diagnostik.katalog`).
 */
export const UNTERSUCHUNGSDAUER_SEK = DIAGNOSTIK.bodycheck.dauerSek;

/** Ab dieser GCS und darunter gilt der Patient als bewusstlos (ohne Schutzreflexe). */
export const BEWUSSTLOS_GCS = 8;

/**
 * @anker sim.zeitraum Längere Zeitsprünge in kleinen Schritten - für Maßnahmendauern
 *
 * Rechnet einen Patienten über einen längeren Zeitraum weiter - etwa während
 * eine Maßnahme durchgeführt wird. Der Zeitraum wird in kleine Schritte
 * zerlegt, damit verzögert einsetzende Probleme (`startetNachMin`) nicht
 * übersprungen werden.
 */
export function simuliereZeitraum(
  patient: Patient,
  startSek: number,
  dauerSek: number,
  maxSchrittSek = 5,
): Patient {
  let aktuell = patient;
  let vergangen = 0;
  while (vergangen < dauerSek) {
    const schritt = Math.min(maxSchrittSek, dauerSek - vergangen);
    vergangen += schritt;
    aktuell = simuliereSchritt(aktuell, schritt, startSek + vergangen);
  }
  return aktuell;
}

/**
 * Führt eine Maßnahme durch: löst passende Probleme und wirkt sofort auf die Vitalwerte.
 * @anker sim.massnahme Wirkung einer Maßnahme auf Probleme, Vitalwerte und Sichtungsbefunde
 */
export function wendeMassnahmeAn(
  patient: Patient,
  massnahmeId: MassnahmeId,
  zeitSek: number,
  dosisMg?: number,
): Patient {
  if (patient.status === 'verstorben') return patient;

  const massnahme = MASSNAHMEN[massnahmeId];

  // @anker sim.bewusstlos Guedel-/Wendl-Tubus wirken nur beim Bewusstlosen
  // Beim wachen Patienten löst der Tubus den Würgereiz aus, sichert den Atemweg
  // also nicht - er löst dann kein Problem und hat keinen Effekt.
  const bewusstlos = patient.vitalwerte.gcs <= BEWUSSTLOS_GCS;
  const wirdToleriert = !massnahme.nurBeiBewusstlosigkeit || bewusstlos;

  // @anker sim.dosierung Gewichtsbezogene Dosierung ersetzt die feste Wirkung
  // Nur bei den Analgetika mit Dosisreferenz (→ `domain.dosierung`) und nur,
  // wenn eine Dosis gewählt wurde - jede andere Maßnahme verhält sich
  // unverändert wie zuvor.
  const gewichtKg = gewichtVon(patient);
  const dosisErgebnis =
    dosisMg !== undefined && DOSISREFERENZ[massnahmeId]
      ? wirkungBeiDosis(massnahmeId, massnahme.sofortEffekt, dosisMg, gewichtKg)
      : null;

  const geloest =
    wirdToleriert && (dosisErgebnis === null || dosisErgebnis.loestProblem)
      ? patient.probleme
          .filter(
            (problem) =>
              !patient.behandelteProbleme.includes(problem.id) &&
              problem.behandeltDurch.includes(massnahmeId),
          )
          .map((problem) => problem.id)
      : [];

  const angewendeterEffekt = dosisErgebnis ? (dosisErgebnis.effekt ?? undefined) : massnahme.sofortEffekt;

  // @anker sim.effektnurbeiproblem Atemwegssicherung wirkt nur bei verlegtem Atemweg
  const effektWirkt =
    angewendeterEffekt && (!massnahme.effektNurBeiProblem || geloest.length > 0);

  let naechster: Patient = {
    ...patient,
    vitalwerte: effektWirkt
      ? veraendereVitalwerte(patient.vitalwerte, angewendeterEffekt!)
      : patient.vitalwerte,
    behandelteProbleme: [...patient.behandelteProbleme, ...geloest],
    durchgefuehrteMassnahmen: [...patient.durchgefuehrteMassnahmen, massnahmeId],
    status: patient.status === 'transportiert' ? patient.status : 'in_behandlung',
  };

  // Blutstillung und Atemwegsmanagement verändern auch die Sichtungsbefunde.
  if (geloest.length > 0) {
    // x ist im xABCDE-Schema die kritische Blutung.
    if (massnahme.kategorie === 'x') {
      naechster = { ...naechster, kritischeBlutung: false };
    }
    if (massnahme.kategorie === 'A' || massnahme.kategorie === 'B') {
      naechster = { ...naechster, spontanatmung: naechster.vitalwerte.atemfrequenz >= 1 };
    }
  }

  const text = dosisErgebnis
    ? dosisText(massnahme.label, dosisErgebnis.stufe, dosisMg!, gewichtKg, geloest)
    : geloest.length > 0
      ? `${massnahme.label} - Problem behoben (${geloest.join(', ')}).`
      : massnahme.nurBeiBewusstlosigkeit && !bewusstlos
        ? `${massnahme.label} - beim wachen Patienten nicht toleriert (Würgereiz), kein Effekt.`
        : massnahme.effektNurBeiProblem
          ? `${massnahme.label} - Atemweg war frei, kein Effekt.`
          : `${massnahme.label} - ohne Effekt auf ein bestehendes Problem.`;

  return protokolliere(naechster, zeitSek, text);
}

/** Verlaufstext für eine dosisabhängige Gabe - benennt die Dosis und die Einordnung. */
function dosisText(
  label: string,
  stufe: 'unterdosiert' | 'therapeutisch' | 'ueberdosiert',
  dosisMg: number,
  gewichtKg: number,
  geloest: string[],
): string {
  const mgProKg = dosisMg / gewichtKg;
  const dosisAngabe = `${dosisMg} mg, ${mgProKg.toFixed(3)} mg/kg`;
  if (stufe === 'unterdosiert') {
    return `${label} - Dosis zu niedrig (${dosisAngabe}) für eine Wirkung.`;
  }
  if (stufe === 'ueberdosiert') {
    return geloest.length > 0
      ? `${label} - überdosiert (${dosisAngabe}), Problem behoben (${geloest.join(', ')}), zusätzliche Nebenwirkung.`
      : `${label} - überdosiert (${dosisAngabe}).`;
  }
  return geloest.length > 0
    ? `${label} - Problem behoben (${geloest.join(', ')}).`
    : `${label} - ohne Effekt auf ein bestehendes Problem.`;
}

/**
 * Führt eine einzelne Untersuchung durch.
 * @anker sim.diagnostik Eine Untersuchung deckt genau ihren Befund auf
 *
 * Der Patient verändert sich dadurch nicht - erhoben wird nur, was ohnehin da
 * ist. Bezahlt wird trotzdem: mit der Zeit, die im Reducer für alle vergeht.
 */
export function fuehreDiagnostikDurch(
  patient: Patient,
  diagnostikId: DiagnostikId,
  zeitSek: number,
): Patient {
  if (patient.durchgefuehrteDiagnostik.includes(diagnostikId)) return patient;

  const diagnostik = DIAGNOSTIK[diagnostikId];
  const naechster: Patient = {
    ...patient,
    durchgefuehrteDiagnostik: [...patient.durchgefuehrteDiagnostik, diagnostikId],
    untersucht: patient.untersucht || diagnostikId === 'bodycheck',
  };
  return protokolliere(naechster, zeitSek, `${diagnostik.label} durchgeführt.`);
}

export function sichtePatient(
  patient: Patient,
  kategorie: Sichtungskategorie,
  zeitSek: number,
  final = false,
): Patient {
  const stelle = sichtungsstelleIn(patient.abschnitt);
  const naechster: Patient = {
    ...patient,
    gesichtetAls: kategorie,
    gesichtetUmSek: patient.gesichtetUmSek ?? zeitSek,
    sichtungFinal: patient.sichtungFinal || final,
    sichtungsverlauf: [
      ...patient.sichtungsverlauf,
      { stelle, kategorie, zeitSek, ...(final ? { final: true } : {}) },
    ],
    status: patient.status === 'unbehandelt' ? 'gesichtet' : patient.status,
  };
  return protokolliere(
    naechster,
    zeitSek,
    `Sichtung (${stelle}): ${kategorie}${final ? ', endgültig' : ''}.`,
  );
}

/**
 * @anker sim.sichtungOffen Steht an dieser Station noch eine Sichtung aus?
 *
 * Jede Station sichtet neu - erst danach darf verlegt werden. Ist die Kategorie
 * als endgültig bestätigt, entfällt die Pflicht: eine Abschlusssichtung wird
 * nicht wieder aufgemacht.
 */
export function sichtungOffen(patient: Patient): boolean {
  if (patient.sichtungFinal) return false;
  const stelle = sichtungsstelleIn(patient.abschnitt);
  return !patient.sichtungsverlauf.some((eintrag) => eintrag.stelle === stelle);
}

/** Die Kategorie, die an einer bestimmten Stelle vergeben wurde. */
export function sichtungAn(
  patient: Patient,
  stelle: Sichtungsstelle,
): Sichtungskategorie | null {
  const eintraege = patient.sichtungsverlauf.filter((eintrag) => eintrag.stelle === stelle);
  return eintraege.length > 0 ? eintraege[eintraege.length - 1]!.kategorie : null;
}

/**
 * @anker sim.verlegung Ortswechsel eines Patienten; Abtransport friert den Zustand ein
 *
 * Verlegt einen Patienten in einen anderen Einsatzabschnitt. Der Abtransport
 * ist die letzte Station - danach verändert sich der Zustand nicht mehr.
 */
export function verlegePatient(
  patient: Patient,
  ziel: Einsatzabschnitt,
  zeitSek: number,
): Patient {
  if (patient.status === 'verstorben' || patient.abschnitt === ziel) return patient;

  const naechster: Patient = {
    ...patient,
    abschnitt: ziel,
    status: ziel === 'transport' ? 'transportiert' : patient.status,
  };
  return protokolliere(naechster, zeitSek, `Verlegung: ${abschnittInfo(ziel).name}.`);
}

/** Summierter Zeitbedarf aller durchgeführten Maßnahmen in Sekunden. */
export function gebundeneZeitSek(patient: Patient): number {
  return patient.durchgefuehrteMassnahmen.reduce(
    (summe, id) => summe + MASSNAHMEN[id].dauerSek,
    0,
  );
}

/**
 * @anker sim.individualmedizin Maß für Individualmedizin - Zeit jenseits der Sofortmaßnahmen
 *
 * Zeit, die über die lebensrettenden Sofortmaßnahmen hinaus in diesen einen
 * Patienten geflossen ist - das Maß für Individualmedizin im MANV.
 */
export function individualmedizinZeitSek(patient: Patient): number {
  return patient.durchgefuehrteMassnahmen
    .filter((id) => !MASSNAHMEN[id].sofortmassnahme)
    .reduce((summe, id) => summe + MASSNAHMEN[id].dauerSek, 0);
}
