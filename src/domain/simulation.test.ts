import { describe, expect, it } from 'vitest';
import {
  KATEGORIEN,
  MASSNAHMEN,
  SOFORTMASSNAHMEN,
  WAEHLBARE_MASSNAHMEN,
  fehlendeVoraussetzung,
  massnahmenDerKategorie,
} from './massnahmen';
import {
  aktiveProbleme,
  patientAusVorlage,
  simuliereSchritt,
  wendeMassnahmeAn,
} from './simulation';
import { SZENARIEN } from './szenarien';
import { sichtungNachMstart } from './triage';
import type { Patient, PatientVorlage } from './types';

const ALLE_VORLAGEN: PatientVorlage[] = SZENARIEN.flatMap((szenario) => szenario.patienten);

/** Lässt einen Patienten `minuten` lang altern, optional mit Maßnahmen zu Beginn. */
function simuliere(patient: Patient, minuten: number, taktSek = 1): Patient {
  let aktuell = patient;
  let zeitSek = 0;
  for (let i = 0; i < (minuten * 60) / taktSek; i++) {
    zeitSek += taktSek;
    aktuell = simuliereSchritt(aktuell, taktSek, zeitSek);
  }
  return aktuell;
}

/** @anker test.szenariodaten Prueft, dass jede Szenario-Vorlage in sich stimmig ist */
describe('Szenariodaten', () => {
  it('vergibt eindeutige Patienten-IDs', () => {
    const ids = ALLE_VORLAGEN.map((vorlage) => vorlage.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('bildet die hinterlegte Referenzkategorie exakt nach mSTaRT ab', () => {
    for (const vorlage of ALLE_VORLAGEN) {
      const patient = patientAusVorlage(vorlage);
      expect(sichtungNachMstart(patient).kategorie, `Patient ${vorlage.id}`).toBe(
        vorlage.erwarteteSK,
      );
    }
  });

  it('ordnet jede Maßnahme genau einer xABCDE-Gruppe zu', () => {
    for (const kategorie of KATEGORIEN) {
      expect(massnahmenDerKategorie(kategorie).length, `Gruppe ${kategorie}`).toBeGreaterThan(0);
    }
    const summe = KATEGORIEN.reduce(
      (anzahl, kategorie) => anzahl + massnahmenDerKategorie(kategorie).length,
      0,
    );
    // Veraltete Maßnahmen bleiben gültig, erscheinen aber in keiner Gruppe.
    expect(summe).toBe(WAEHLBARE_MASSNAHMEN.length);
    expect(summe).toBe(Object.keys(MASSNAHMEN).length - 1);
  });

  it('behält veraltete Maßnahmen im Katalog, aber nicht in der Auswahl', () => {
    // Alte Szenariodateien nennen sie noch - sie müssen gültig bleiben.
    expect(MASSNAHMEN.analgesie).toBeDefined();
    expect(WAEHLBARE_MASSNAHMEN.some((m) => m.id === 'analgesie')).toBe(false);
  });

  it('verlangt für jedes i.v.-Medikament einen Zugang', () => {
    const ivMedikamente = WAEHLBARE_MASSNAHMEN.filter(
      (m) => m.art === 'medikament' && m.label.includes('i.v.'),
    );
    expect(ivMedikamente.length).toBeGreaterThan(8);
    for (const medikament of ivMedikamente) {
      expect(medikament.benoetigtEinesVon, medikament.id).toEqual(['zugang_iv', 'zugang_io']);
    }
  });

  it('meldet die fehlende Voraussetzung erst, wenn kein Zugang liegt', () => {
    expect(fehlendeVoraussetzung(MASSNAHMEN.volumengabe, [])).toEqual(['zugang_iv', 'zugang_io']);
    expect(fehlendeVoraussetzung(MASSNAHMEN.volumengabe, ['zugang_io'])).toBeNull();
    expect(fehlendeVoraussetzung(MASSNAHMEN.blutstillung, [])).toBeNull();
  });

  it('kennt genau eine ärztliche Maßnahme jenseits der SAA', () => {
    // Im MANV die knappste Ressource - das muss sichtbar bleiben.
    const aerztlich = WAEHLBARE_MASSNAHMEN.filter((m) => m.qualifikation === 'notarzt');
    expect(aerztlich.map((m) => m.id)).toEqual(['intubation']);
  });

  it('führt die blutstillenden Maßnahmen unter x', () => {
    // Daran hängt, dass die Sichtungsfrage "kritische Blutung" beantwortet wird.
    expect(MASSNAHMEN.blutstillung.kategorie).toBe('x');
    expect(MASSNAHMEN.tourniquet.kategorie).toBe('x');
  });

  it('verweist nur auf Maßnahmen aus dem Katalog', () => {
    for (const vorlage of ALLE_VORLAGEN) {
      for (const problem of vorlage.probleme) {
        expect(problem.behandeltDurch.length).toBeGreaterThan(0);
        for (const massnahmeId of problem.behandeltDurch) {
          expect(MASSNAHMEN[massnahmeId]).toBeDefined();
        }
      }
    }
  });
});

/** @anker test.zeitverlauf Verschlechterung, Todesfaelle und Latenzzeiten */
describe('Zeitverlauf', () => {
  it('rechnet unabhängig von der Taktrate (kein Rundungsverlust pro Tick)', () => {
    const patient = patientAusVorlage(ALLE_VORLAGEN.find((v) => v.id === 'B-01')!);
    const feinerTakt = simuliere(patient, 5, 0.5);
    const groberTakt = simuliere(patient, 5, 5);
    expect(feinerTakt.vitalwerte.systolischerRR).toBeCloseTo(
      groberTakt.vitalwerte.systolischerRR,
      6,
    );
    expect(feinerTakt.vitalwerte.systolischerRR).toBeLessThan(
      patient.vitalwerte.systolischerRR - 25,
    );
  });

  it('lässt unbehandelte kritische Patienten versterben', () => {
    const patient = patientAusVorlage(ALLE_VORLAGEN.find((v) => v.id === 'B-01')!);
    expect(simuliere(patient, 20).status).toBe('verstorben');
  });

  it('hält stabile Leichtverletzte über die gesamte Übung am Leben', () => {
    const patient = patientAusVorlage(ALLE_VORLAGEN.find((v) => v.id === 'B-05')!);
    const spaeter = simuliere(patient, 30);
    expect(spaeter.status).not.toBe('verstorben');
    expect(sichtungNachMstart(spaeter).kategorie).toBe('SK3');
  });

  it('aktiviert verzögerte Probleme erst nach ihrer Latenzzeit', () => {
    const patient = patientAusVorlage(ALLE_VORLAGEN.find((v) => v.id === 'B-02')!);
    expect(aktiveProbleme(patient, 60)).toHaveLength(0);
    expect(aktiveProbleme(patient, 4 * 60)).toHaveLength(1);
    expect(simuliere(patient, 2).vitalwerte.spo2).toBe(patient.vitalwerte.spo2);
    expect(simuliere(patient, 6).vitalwerte.spo2).toBeLessThan(patient.vitalwerte.spo2);
  });

  it('stuft zunächst gehfähige Patienten bei Kreislaufversagen zurück', () => {
    const patient = patientAusVorlage(ALLE_VORLAGEN.find((v) => v.id === 'B-10')!);
    expect(patient.gehfaehig).toBe(true);
    const spaeter = simuliere(patient, 10);
    expect(spaeter.gehfaehig).toBe(false);
    expect(sichtungNachMstart(spaeter).kategorie).toBe('SK1');
  });

  it('verändert transportierte Patienten nicht mehr', () => {
    const patient = patientAusVorlage(ALLE_VORLAGEN.find((v) => v.id === 'B-01')!);
    const uebergeben: Patient = { ...patient, status: 'transportiert' };
    expect(simuliere(uebergeben, 30).vitalwerte).toEqual(patient.vitalwerte);
  });
});

describe('Maßnahmen', () => {
  it('stoppt die Verschlechterung, sobald die passende Maßnahme läuft', () => {
    const patient = patientAusVorlage(ALLE_VORLAGEN.find((v) => v.id === 'B-01')!);
    const versorgt = wendeMassnahmeAn(patient, 'tourniquet', 0);
    expect(versorgt.behandelteProbleme).toContain('blutung-femur');
    expect(versorgt.kritischeBlutung).toBe(false);

    const spaeter = simuliere(versorgt, 20);
    expect(spaeter.status).not.toBe('verstorben');
    expect(spaeter.vitalwerte.systolischerRR).toBeGreaterThan(90);
  });

  it('löst bei unpassender Maßnahme kein Problem', () => {
    const patient = patientAusVorlage(ALLE_VORLAGEN.find((v) => v.id === 'B-01')!);
    const versorgt = wendeMassnahmeAn(patient, 'waermeerhalt', 0);
    expect(versorgt.behandelteProbleme).toHaveLength(0);
    expect(simuliere(versorgt, 20).status).toBe('verstorben');
  });

  it('hält jeden Patienten am Leben, wenn alle Probleme versorgt werden', () => {
    for (const vorlage of ALLE_VORLAGEN) {
      let patient = patientAusVorlage(vorlage);
      for (const problem of patient.probleme) {
        patient = wendeMassnahmeAn(patient, problem.behandeltDurch[0]!, 0);
      }
      expect(simuliere(patient, 30).status, `Patient ${vorlage.id}`).not.toBe('verstorben');
    }
  });

  it('behandelt keine verstorbenen Patienten mehr', () => {
    const patient = patientAusVorlage(ALLE_VORLAGEN.find((v) => v.id === 'B-01')!);
    const verstorben = simuliere(patient, 20);
    expect(verstorben.status).toBe('verstorben');
    expect(wendeMassnahmeAn(verstorben, 'tourniquet', 0)).toBe(verstorben);
  });
});

/** @anker test.atemweg Sofortmaßnahmen und die Wirkung der Atemwegssicherung */
describe('Atemwegssicherung', () => {
  // B-03 Sabine Krüger: verlegter Atemweg, Blut im Mundraum.
  const mitVerlegtemAtemweg = (): Patient =>
    patientAusVorlage(ALLE_VORLAGEN.find((v) => v.id === 'B-03')!);
  // B-01 Lena Hoffmann: spritzende Blutung, Atemweg frei.
  const mitFreiemAtemweg = (): Patient =>
    patientAusVorlage(ALLE_VORLAGEN.find((v) => v.id === 'B-01')!);

  it('führt die lebensrettenden Griffe als Sofortmaßnahmen, Mundraumkontrolle inklusive', () => {
    const ids = SOFORTMASSNAHMEN.map((m) => m.id);
    expect(ids).toContain('mundraumkontrolle');
    expect(ids).toContain('blutstillung');
    expect(ids).toContain('atemwege_freimachen');
    expect(ids).toContain('beatmung');
    // Sofortmaßnahmen sind ausschließlich als solche markiert.
    expect(SOFORTMASSNAHMEN.every((m) => m.sofortmassnahme)).toBe(true);
  });

  it('verlangt vor jeder Atemwegssicherung die Mundraumkontrolle', () => {
    expect(fehlendeVoraussetzung(MASSNAHMEN.atemwege_freimachen, [])).toEqual(['mundraumkontrolle']);
    expect(fehlendeVoraussetzung(MASSNAHMEN.intubation, [])).toEqual(['mundraumkontrolle']);
    expect(
      fehlendeVoraussetzung(MASSNAHMEN.atemwege_freimachen, ['mundraumkontrolle']),
    ).toBeNull();
    // Die Mundraumkontrolle selbst braucht keine Voraussetzung.
    expect(fehlendeVoraussetzung(MASSNAHMEN.mundraumkontrolle, [])).toBeNull();
  });

  it('hebt die Sättigung nur, wenn der Atemweg wirklich verlegt war', () => {
    const patient = mitVerlegtemAtemweg();
    const vorher = patient.vitalwerte.spo2;
    const delta = MASSNAHMEN.atemwege_freimachen.sofortEffekt?.spo2 ?? 0;
    const versorgt = wendeMassnahmeAn(patient, 'atemwege_freimachen', 0);
    expect(versorgt.behandelteProbleme).toContain('atemwegsverlegung');
    expect(delta).toBeGreaterThan(0);
    expect(versorgt.vitalwerte.spo2).toBe(vorher + delta);
  });

  it('lässt den freien Atemweg unverändert - der Griff bringt dort nichts', () => {
    const patient = mitFreiemAtemweg();
    const vorher = patient.vitalwerte.spo2;
    const versorgt = wendeMassnahmeAn(patient, 'atemwege_freimachen', 0);
    expect(versorgt.behandelteProbleme).toHaveLength(0);
    expect(versorgt.vitalwerte.spo2).toBe(vorher);
    expect(versorgt.verlauf.at(-1)?.text).toContain('kein Effekt');
  });
});

/** @anker test.tubus Guedel- und Wendl-Tubus werden nur vom Bewusstlosen toleriert */
describe('Tubus nur beim Bewusstlosen', () => {
  // B-03 Sabine Krüger: verlegter Atemweg, GCS 7 - bewusstlos.
  const bewusstlos = (): Patient => patientAusVorlage(ALLE_VORLAGEN.find((v) => v.id === 'B-03')!);
  const wach = (): Patient => {
    const patient = bewusstlos();
    return { ...patient, vitalwerte: { ...patient.vitalwerte, gcs: 13 } };
  };

  it('kennzeichnet Guedel und Wendl als nur bei Bewusstlosigkeit wirksam', () => {
    expect(MASSNAHMEN.guedeltubus.nurBeiBewusstlosigkeit).toBe(true);
    expect(MASSNAHMEN.wendltubus.nurBeiBewusstlosigkeit).toBe(true);
    // Der Handgriff (Freimachen) hat diese Einschränkung nicht.
    expect(MASSNAHMEN.atemwege_freimachen.nurBeiBewusstlosigkeit).toBeUndefined();
  });

  it('sichert beim Bewusstlosen den Atemweg und hebt die Sättigung', () => {
    const patient = bewusstlos();
    expect(patient.vitalwerte.gcs).toBeLessThanOrEqual(8);
    for (const tubus of ['guedeltubus', 'wendltubus'] as const) {
      const versorgt = wendeMassnahmeAn(patient, tubus, 0);
      expect(versorgt.behandelteProbleme, tubus).toContain('atemwegsverlegung');
      expect(versorgt.vitalwerte.spo2, tubus).toBeGreaterThan(patient.vitalwerte.spo2);
    }
  });

  it('wird beim wachen Patienten nicht toleriert und bleibt wirkungslos', () => {
    const patient = wach();
    const versucht = wendeMassnahmeAn(patient, 'guedeltubus', 0);
    expect(versucht.behandelteProbleme).not.toContain('atemwegsverlegung');
    expect(versucht.vitalwerte.spo2).toBe(patient.vitalwerte.spo2);
    expect(versucht.verlauf.at(-1)?.text).toContain('nicht toleriert');
  });
});
