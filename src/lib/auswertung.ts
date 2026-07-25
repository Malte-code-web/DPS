import { gebundeneZeitSek } from '../domain/simulation';
import { bewerteSichtung, sichtungNachMstart } from '../domain/triage';
import type { Sichtungsbewertung } from '../domain/triage';
import type { Patient, Sichtungskategorie } from '../domain/types';

export type Zaehlschluessel = Sichtungskategorie | 'offen';

export const ZAEHL_REIHENFOLGE: Zaehlschluessel[] = ['SK1', 'SK2', 'SK3', 'SK4', 'EX', 'offen'];

/** Zählt die vom Übenden vergebenen Sichtungskategorien - Basis der Lagemeldung. */
export function zaehleSichtung(patienten: Patient[]): Record<Zaehlschluessel, number> {
  const zaehler: Record<Zaehlschluessel, number> = {
    SK1: 0,
    SK2: 0,
    SK3: 0,
    SK4: 0,
    EX: 0,
    offen: 0,
  };
  for (const patient of patienten) {
    if (patient.status === 'verstorben') {
      zaehler.EX += 1;
    } else if (patient.gesichtetAls) {
      zaehler[patient.gesichtetAls] += 1;
    } else {
      zaehler.offen += 1;
    }
  }
  return zaehler;
}

export interface Debriefingzeile {
  patient: Patient;
  vergeben: Sichtungskategorie | null;
  referenz: Sichtungskategorie;
  /** Kategorie nach mSTaRT auf Basis des aktuellen Zustands. */
  aktuell: Sichtungskategorie;
  bewertung: Sichtungsbewertung;
  sichtungsdauerSek: number | null;
  massnahmenzeitSek: number;
}

export function erstelleDebriefing(patienten: Patient[]): Debriefingzeile[] {
  return patienten.map((patient) => ({
    patient,
    vergeben: patient.gesichtetAls,
    referenz: patient.erwarteteSK,
    aktuell: sichtungNachMstart(patient).kategorie,
    bewertung: bewerteSichtung(patient.gesichtetAls, patient.erwarteteSK),
    sichtungsdauerSek: patient.gesichtetUmSek,
    massnahmenzeitSek: gebundeneZeitSek(patient),
  }));
}

export interface Kennzahlen {
  gesamt: number;
  gesichtet: number;
  korrekt: number;
  verstorben: number;
  transportiert: number;
  /** Zeitpunkt, zu dem der letzte Patient vorgesichtet war. */
  vorsichtungAbgeschlossenSek: number | null;
  massnahmenzeitSek: number;
}

export function berechneKennzahlen(zeilen: Debriefingzeile[]): Kennzahlen {
  const gesichtet = zeilen.filter((zeile) => zeile.vergeben !== null);
  const sichtungszeiten = gesichtet
    .map((zeile) => zeile.sichtungsdauerSek)
    .filter((zeit): zeit is number => zeit !== null);

  return {
    gesamt: zeilen.length,
    gesichtet: gesichtet.length,
    korrekt: zeilen.filter((zeile) => zeile.bewertung === 'korrekt').length,
    verstorben: zeilen.filter((zeile) => zeile.patient.status === 'verstorben').length,
    transportiert: zeilen.filter((zeile) => zeile.patient.status === 'transportiert').length,
    vorsichtungAbgeschlossenSek:
      gesichtet.length === zeilen.length && sichtungszeiten.length > 0
        ? Math.max(...sichtungszeiten)
        : null,
    massnahmenzeitSek: zeilen.reduce((summe, zeile) => summe + zeile.massnahmenzeitSek, 0),
  };
}
