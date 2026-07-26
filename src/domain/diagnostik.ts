import type {
  Befundschluessel,
  Diagnostik,
  DiagnostikId,
  Diagnostikgruppe,
  Patient,
} from './types';

/**
 * @anker diagnostik.katalog Alle Untersuchungen mit Dauer und aufgedecktem Befund
 *
 * Der Kern der Diagnostik: Ein Wert ist erst sichtbar, wenn jemand ihn erhoben
 * hat - und jede Erhebung kostet Zeit, die für alle Patienten weiterläuft.
 *
 * Vorher gab es einen einzigen Knopf "Patient untersuchen" für 30 Sekunden, der
 * alles auf einmal zeigte. Das war die schnellste und beste Wahl in jeder Lage
 * und damit keine Entscheidung. Jetzt kostet der vollständige Durchgang über
 * fünf Minuten - wer alles misst, verliert diese Zeit bei allen anderen.
 *
 * Die Dauern orientieren sich am realen Aufwand: den Puls tastet man in zehn
 * Sekunden, eine Blutdruckmanschette braucht dreiviertel Minute.
 */
export const DIAGNOSTIK: Record<DiagnostikId, Diagnostik> = {
  puls_tasten: {
    id: 'puls_tasten',
    label: 'Puls tasten',
    gruppe: 'basis',
    dauerSek: 10,
    zeigt: ['herzfrequenz'],
  },
  atemfrequenz_zaehlen: {
    id: 'atemfrequenz_zaehlen',
    label: 'Atemfrequenz zählen',
    gruppe: 'basis',
    dauerSek: 15,
    zeigt: ['atemfrequenz'],
  },
  rekapzeit_pruefen: {
    id: 'rekapzeit_pruefen',
    label: 'Rekapillarisierungszeit prüfen',
    gruppe: 'basis',
    dauerSek: 10,
    zeigt: ['rekapzeit'],
  },
  pupillen_kontrollieren: {
    id: 'pupillen_kontrollieren',
    label: 'Pupillen kontrollieren',
    gruppe: 'basis',
    dauerSek: 10,
    zeigt: ['pupillen'],
  },
  bewusstsein_pruefen: {
    id: 'bewusstsein_pruefen',
    label: 'Bewusstsein prüfen (GCS)',
    gruppe: 'basis',
    dauerSek: 20,
    zeigt: ['gcs'],
  },
  schmerz_erfragen: {
    id: 'schmerz_erfragen',
    label: 'Schmerz erfragen (NRS)',
    gruppe: 'basis',
    dauerSek: 10,
    zeigt: ['schmerz'],
  },
  blutdruck_messen: {
    id: 'blutdruck_messen',
    label: 'Blutdruck messen',
    gruppe: 'geraet',
    dauerSek: 45,
    zeigt: ['systolischerRR'],
  },
  pulsoxymetrie: {
    id: 'pulsoxymetrie',
    label: 'Pulsoxymetrie',
    gruppe: 'geraet',
    dauerSek: 20,
    // Das Pulsoxymeter zeigt beides an - Sättigung und Frequenz.
    zeigt: ['spo2', 'herzfrequenz'],
  },
  blutzucker_messen: {
    id: 'blutzucker_messen',
    label: 'Blutzucker messen',
    gruppe: 'geraet',
    dauerSek: 30,
    zeigt: ['blutzucker'],
  },
  temperatur_messen: {
    id: 'temperatur_messen',
    label: 'Temperatur messen',
    gruppe: 'geraet',
    dauerSek: 20,
    zeigt: ['temperatur'],
  },
  ekg_monitoring: {
    id: 'ekg_monitoring',
    label: 'EKG-Monitoring anlegen',
    gruppe: 'geraet',
    dauerSek: 60,
    zeigt: ['ekg', 'herzfrequenz'],
  },
  auskultation: {
    id: 'auskultation',
    label: 'Lunge auskultieren',
    gruppe: 'koerperlich',
    dauerSek: 30,
    zeigt: ['auskultation'],
  },
  bodycheck: {
    id: 'bodycheck',
    label: 'Bodycheck (Ganzkörperuntersuchung)',
    gruppe: 'koerperlich',
    dauerSek: 60,
    zeigt: ['koerper'],
  },
};

export const DIAGNOSTIK_LISTE = Object.values(DIAGNOSTIK);

export const DIAGNOSTIK_GRUPPEN: Diagnostikgruppe[] = ['basis', 'geraet', 'koerperlich'];

export const GRUPPE_LABEL: Record<Diagnostikgruppe, string> = {
  basis: 'Ohne Hilfsmittel',
  geraet: 'Mit Gerät',
  koerperlich: 'Körperliche Untersuchung',
};

export function diagnostikDerGruppe(gruppe: Diagnostikgruppe): Diagnostik[] {
  return DIAGNOSTIK_LISTE.filter((eintrag) => eintrag.gruppe === gruppe);
}

/**
 * @anker diagnostik.bekannt Ist dieser Befund schon erhoben?
 *
 * Die einzige Stelle, die entscheidet, ob ein Wert angezeigt wird. Alles, was
 * hier false ergibt, erscheint in der Oberfläche als "nicht erhoben".
 */
export function istBekannt(patient: Patient, schluessel: Befundschluessel): boolean {
  return patient.durchgefuehrteDiagnostik.some((id) =>
    DIAGNOSTIK[id].zeigt.includes(schluessel),
  );
}

/**
 * @anker diagnostik.zuordnung Welche Untersuchung ein Feld der Befundtafel öffnet
 *
 * Damit die Befundtafel selbst bedienbar ist: Ein Tippen auf "RR sys –" soll
 * die Blutdruckmessung starten. Wo mehrere Untersuchungen denselben Wert
 * liefern, gewinnt die günstigste - die Herzfrequenz kommt über den getasteten
 * Puls (10 s), nicht über das EKG (60 s).
 *
 * Abgeleitet statt von Hand gepflegt: eine neue Untersuchung im Katalog
 * ordnet sich automatisch zu.
 */
export const DIAGNOSTIK_FUER: Record<Befundschluessel, DiagnostikId> = (() => {
  const zuordnung = {} as Record<Befundschluessel, DiagnostikId>;
  for (const eintrag of DIAGNOSTIK_LISTE) {
    for (const schluessel of eintrag.zeigt) {
      const bisher = zuordnung[schluessel];
      if (!bisher || eintrag.dauerSek < DIAGNOSTIK[bisher].dauerSek) {
        zuordnung[schluessel] = eintrag.id;
      }
    }
  }
  return zuordnung;
})();

/** Summierter Zeitbedarf aller durchgeführten Untersuchungen. */
export function diagnostikZeitSek(patient: Patient): number {
  return patient.durchgefuehrteDiagnostik.reduce(
    (summe, id) => summe + DIAGNOSTIK[id].dauerSek,
    0,
  );
}

/** Zeitbedarf, wenn jemand an einem Patienten alles erheben würde. */
export const VOLLSTAENDIGE_DIAGNOSTIK_SEK = DIAGNOSTIK_LISTE.reduce(
  (summe, eintrag) => summe + eintrag.dauerSek,
  0,
);
