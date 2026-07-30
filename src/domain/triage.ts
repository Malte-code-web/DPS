import type { Patient, Sichtungskategorie, Vitalwerte } from './types';

/**
 * Vorsichtung nach mSTaRT (modified Simple Triage And Rapid Treatment).
 *
 * Der Algorithmus dient in der Simulation zwei Zwecken:
 *  - als Referenzlösung für das Debriefing,
 *  - als Lernhilfe, die die einzelnen Entscheidungsschritte offenlegt.
 */

export interface Sichtungsschritt {
  frage: string;
  antwort: string;
  /** true, wenn an dieser Stelle die Kategorie feststand. */
  entscheidend: boolean;
}

export interface Sichtungsergebnis {
  kategorie: Sichtungskategorie;
  schritte: Sichtungsschritt[];
}

/**
 * Grenzwerte des mSTaRT-Algorithmus.
 * @anker sichtung.grenzwerte Zahlen, an denen die Sichtung kippt (AF, RR, GCS, Rekapzeit)
 */
export const GRENZWERTE = {
  atemfrequenzHoch: 29,
  atemfrequenzNiedrig: 10,
  rekapzeitKritisch: 2,
  /** Ab diesem systolischen Druck ist der Radialispuls in der Regel tastbar. */
  radialispulsRRsys: 90,
  gcsKritisch: 9,
} as const;

/** Rundet einen Vitalwert für die Anzeige in der Begründung. */
function anzeige(wert: number): string {
  return Math.round(wert).toString();
}

export function radialispulsTastbar(vitalwerte: Vitalwerte): boolean {
  return vitalwerte.systolischerRR >= GRENZWERTE.radialispulsRRsys;
}

/** @anker sichtung.mstart Der mSTaRT-Algorithmus als Entscheidungskette */
export function sichtungNachMstart(patient: Patient): Sichtungsergebnis {
  const schritte: Sichtungsschritt[] = [];
  const v = patient.vitalwerte;

  const ergebnis = (
    kategorie: Sichtungskategorie,
    frage: string,
    antwort: string,
  ): Sichtungsergebnis => {
    schritte.push({ frage, antwort, entscheidend: true });
    return { kategorie, schritte };
  };

  const weiter = (frage: string, antwort: string) => {
    schritte.push({ frage, antwort, entscheidend: false });
  };

  if (patient.status === 'verstorben') {
    return ergebnis('EX', 'Lebenszeichen vorhanden?', 'Nein - keine Vitalfunktionen');
  }

  if (patient.gehfaehig) {
    return ergebnis('SK3', 'Gehfähig?', 'Ja - Patient folgt der Aufforderung zum Sammelplatz');
  }
  weiter('Gehfähig?', 'Nein');

  if (patient.kritischeBlutung) {
    return ergebnis(
      'SK1',
      'Kritische Blutung?',
      'Ja - sofortige Blutstillung, danach SK I',
    );
  }
  weiter('Kritische Blutung?', 'Nein');

  if (!patient.spontanatmung) {
    return ergebnis(
      'SK4',
      'Spontanatmung nach Freimachen der Atemwege?',
      'Nein - im MANV keine Reanimation, betreuende Behandlung',
    );
  }
  weiter('Spontanatmung nach Freimachen der Atemwege?', 'Ja');

  if (v.atemfrequenz > GRENZWERTE.atemfrequenzHoch || v.atemfrequenz < GRENZWERTE.atemfrequenzNiedrig) {
    return ergebnis(
      'SK1',
      `Atemfrequenz zwischen ${GRENZWERTE.atemfrequenzNiedrig} und ${GRENZWERTE.atemfrequenzHoch}/min?`,
      `Nein - ${anzeige(v.atemfrequenz)}/min`,
    );
  }
  weiter(
    `Atemfrequenz zwischen ${GRENZWERTE.atemfrequenzNiedrig} und ${GRENZWERTE.atemfrequenzHoch}/min?`,
    `Ja - ${anzeige(v.atemfrequenz)}/min`,
  );

  const pulsTastbar = radialispulsTastbar(v);
  if (!pulsTastbar || v.rekapzeit > GRENZWERTE.rekapzeitKritisch) {
    return ergebnis(
      'SK1',
      'Radialispuls tastbar und Rekapzeit <= 2 s?',
      !pulsTastbar
        ? `Nein - RR syst. ${anzeige(v.systolischerRR)} mmHg, kein Radialispuls`
        : `Nein - Rekapzeit ${v.rekapzeit.toFixed(1)} s`,
    );
  }
  weiter('Radialispuls tastbar und Rekapzeit <= 2 s?', 'Ja');

  if (!patient.befolgtAufforderungen || v.gcs < GRENZWERTE.gcsKritisch) {
    return ergebnis(
      'SK1',
      'Befolgt einfache Aufforderungen?',
      `Nein - GCS ${anzeige(v.gcs)}`,
    );
  }

  return ergebnis('SK2', 'Befolgt einfache Aufforderungen?', `Ja - GCS ${anzeige(v.gcs)}`);
}

/**
 * Bewertet die vom Übenden vergebene Kategorie gegen die Referenz.
 * @anker sichtung.bewertung Über- oder unterschätzt - Grundlage der Debriefing-Spalte
 */
export type Sichtungsbewertung = 'korrekt' | 'ueberschaetzt' | 'unterschaetzt' | 'offen';

const RANG: Record<Sichtungskategorie, number> = {
  SK1: 4,
  SK2: 3,
  SK3: 2,
  SK4: 1,
  EX: 0,
};

export function bewerteSichtung(
  vergeben: Sichtungskategorie | null,
  referenz: Sichtungskategorie,
): Sichtungsbewertung {
  if (vergeben === null) return 'offen';
  if (vergeben === referenz) return 'korrekt';
  return RANG[vergeben] > RANG[referenz] ? 'ueberschaetzt' : 'unterschaetzt';
}
