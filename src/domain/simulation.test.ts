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
import { sichtungNachTacstart } from './triage';
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

  it('bildet die hinterlegte Referenzkategorie exakt nach tacSTART ab', () => {
    for (const vorlage of ALLE_VORLAGEN) {
      const patient = patientAusVorlage(vorlage);
      expect(sichtungNachTacstart(patient).kategorie, `Patient ${vorlage.id}`).toBe(
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

  it('verlangt für jedes rein i.v. gegebene Medikament einen Zugang', () => {
    // Nur Medikamente ohne alternativen Weg. Ein Schrägstrich im Label ("i.v. /
    // nasal", "i.v. / rektal", "i.v. / i.m.") heißt: Es geht auch ohne Zugang -
    // diese dürfen deshalb bewusst nicht dahinter gesperrt sein.
    const nurIntravenoes = WAEHLBARE_MASSNAHMEN.filter(
      (m) => m.art === 'medikament' && m.label.includes('i.v.') && !m.label.includes('/'),
    );
    expect(nurIntravenoes.length).toBeGreaterThan(8);
    for (const medikament of nurIntravenoes) {
      expect(medikament.benoetigtEinesVon, medikament.id).toEqual(['zugang_iv', 'zugang_io']);
    }
  });

  it('lässt Medikamente mit zugangsfreiem Weg nicht am Zugang scheitern', () => {
    // Der häufigste Fehler im Katalog: Ein Medikament, das laut eigener
    // Dosierung auch nasal, i.m., rektal oder oral geht, hängt trotzdem am
    // i.v.-Zugang - und der zugangsfreie Weg ist im Spiel unerreichbar.
    for (const id of ['nalbuphin', 'fentanyl', 'esketamin', 'prednisolon', 'glucagon'] as const) {
      expect(MASSNAHMEN[id].benoetigtEinesVon, id).toBeUndefined();
    }
    // Epinephrin ist bewusst getrennt: i.v./i.o. für die Reanimation, i.m. für
    // die Anaphylaxie. Sonst ließe eine gemeinsame Voraussetzung fälschlich
    // Reanimationsadrenalin i.m. zu.
    expect(MASSNAHMEN.epinephrin.benoetigtEinesVon).toEqual(['zugang_iv', 'zugang_io']);
    expect(MASSNAHMEN.epinephrin_im.benoetigtEinesVon).toEqual(['injektion_im']);
  });

  it('meldet die fehlende Voraussetzung erst, wenn kein Zugang liegt', () => {
    expect(fehlendeVoraussetzung(MASSNAHMEN.volumengabe, [])).toEqual(['zugang_iv', 'zugang_io']);
    expect(fehlendeVoraussetzung(MASSNAHMEN.volumengabe, ['zugang_io'])).toBeNull();
    expect(fehlendeVoraussetzung(MASSNAHMEN.blutstillung, [])).toBeNull();
  });

  it('hält die ärztlichen Maßnahmen jenseits der SAA klein und benannt', () => {
    // Im MANV die knappste Ressource - das muss sichtbar bleiben. Wächst diese
    // Liste, ist das eine bewusste Entscheidung und keine Nebenwirkung.
    // Die vier Notfallnarkose-Maßnahmen (→ `domain.notfallnarkose`) sind
    // genau eine solche bewusste Erweiterung.
    const aerztlich = WAEHLBARE_MASSNAHMEN.filter((m) => m.qualifikation === 'notarzt');
    expect(aerztlich.map((m) => m.id).sort()).toEqual([
      'esketamin_narkose',
      'intubation',
      'koniotomie',
      'levetiracetam',
      'propofol',
      'rocuronium',
      'thiopental',
      'thoraxdrainage',
    ]);
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
    expect(sichtungNachTacstart(spaeter).kategorie).toBe('SK3');
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
    expect(sichtungNachTacstart(spaeter).kategorie).toBe('SK1');
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
    // Intubation lässt zusätzlich den RSI-Weg über Rocuronium zu
    // (→ `domain.notfallnarkose`) - beide Optionen stehen bei fehlender
    // Voraussetzung zur Wahl.
    expect(fehlendeVoraussetzung(MASSNAHMEN.intubation, [])).toEqual([
      'mundraumkontrolle',
      'rocuronium',
    ]);
    expect(fehlendeVoraussetzung(MASSNAHMEN.intubation, ['mundraumkontrolle'])).toBeNull();
    expect(fehlendeVoraussetzung(MASSNAHMEN.intubation, ['rocuronium'])).toBeNull();
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

  it('kennzeichnet Guedel-Tubus und Larynxmaske als nur bei Bewusstlosigkeit wirksam', () => {
    expect(MASSNAHMEN.guedeltubus.nurBeiBewusstlosigkeit).toBe(true);
    // Die eigene Indikation nennt "mit Bewusstlosigkeit und fehlenden Schutzreflexen" -
    // ohne das Flag würde die Simulation sie auch beim wachen Patienten wirken lassen.
    expect(MASSNAHMEN.larynxmaske.nurBeiBewusstlosigkeit).toBe(true);
    // Der Handgriff (Freimachen) hat diese Einschränkung nicht.
    expect(MASSNAHMEN.atemwege_freimachen.nurBeiBewusstlosigkeit).toBeUndefined();
  });

  it('lässt den Wendl-Tubus bewusst auch beim wachen Patienten wirken', () => {
    // Der Nasopharyngealtubus ist gerade das Mittel für erhaltene Schutzreflexe:
    // Er wird auch bei Würgereiz toleriert und steht im eskalierenden
    // Atemwegsmanagement deshalb VOR dem Guedel-Tubus. Ein
    // nurBeiBewusstlosigkeit-Flag wäre hier fachlich verkehrt herum.
    expect(MASSNAHMEN.wendltubus.nurBeiBewusstlosigkeit).toBeUndefined();
    const wach = { ...patientAusVorlage(ALLE_VORLAGEN.find((v) => v.id === 'B-03')!) };
    wach.vitalwerte = { ...wach.vitalwerte, gcs: 13 };
    const versorgt = wendeMassnahmeAn(wach, 'wendltubus', 0);
    expect(versorgt.behandelteProbleme).toContain('atemwegsverlegung');
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

  it('lässt auch die Larynxmaske beim wachen Patienten unwirksam bleiben', () => {
    const patient = wach();
    const versucht = wendeMassnahmeAn(patient, 'larynxmaske', 0);
    expect(versucht.vitalwerte.spo2).toBe(patient.vitalwerte.spo2);
    expect(versucht.verlauf.at(-1)?.text).toContain('nicht toleriert');
  });
});

describe('Gewichtsbezogene Dosierung (Analgesie)', () => {
  // Ein Patient mit klar bekanntem Gewicht - ein an behandeltDurch: ['morphin']
  // gekoppeltes Problem, damit auch das Lösen/Nicht-Lösen geprüft werden kann.
  function patientMitSchmerz(): Patient {
    const vorlage: PatientVorlage = {
      ...ALLE_VORLAGEN[0]!,
      id: 'DOSIS-TEST',
      alter: 40,
      geschlecht: 'd',
      gewicht: 80,
      // schmerz nicht bei 0 starten - sonst deckelt GRENZEN.schmerz.min die
      // Wirkung unsichtbar auf 0 statt sie negativ (also spürbar) zu zeigen.
      startVitalwerte: { ...ALLE_VORLAGEN[0]!.startVitalwerte, schmerz: 8 },
      probleme: [
        {
          id: 'schmerz-problem',
          label: 'Starker Schmerz',
          beschreibung: 'Äußert starke Schmerzen.',
          behandeltDurch: ['morphin'],
          verlauf: { schmerz: 1 },
        },
      ],
    };
    return patientAusVorlage(vorlage);
  }

  it('bleibt ohne Dosisangabe unverändert wie bisher (kein Regressionsrisiko)', () => {
    const patient = patientMitSchmerz();
    const versorgt = wendeMassnahmeAn(patient, 'morphin', 0);
    expect(versorgt.behandelteProbleme).toContain('schmerz-problem');
    expect(versorgt.vitalwerte.schmerz).toBeLessThan(patient.vitalwerte.schmerz);
  });

  it('bleibt bei zu niedriger Dosis wirkungslos und löst das Problem nicht', () => {
    const patient = patientMitSchmerz();
    const versucht = wendeMassnahmeAn(patient, 'morphin', 0, 1); // 1 mg / 80 kg = 0,0125 mg/kg
    expect(versucht.behandelteProbleme).not.toContain('schmerz-problem');
    expect(versucht.vitalwerte).toEqual(patient.vitalwerte);
    expect(versucht.verlauf.at(-1)?.text).toContain('zu niedrig');
  });

  it('wirkt bei therapeutischer Dosis wie die Katalog-Wirkung und löst das Problem', () => {
    const patient = patientMitSchmerz();
    const versorgt = wendeMassnahmeAn(patient, 'morphin', 0, 6); // 6 mg / 80 kg = 0,075 mg/kg (Ziel)
    expect(versorgt.behandelteProbleme).toContain('schmerz-problem');
    expect(versorgt.vitalwerte.schmerz).toBe(patient.vitalwerte.schmerz + MASSNAHMEN.morphin.sofortEffekt!.schmerz!);
  });

  it('verschlechtert zusätzlich zur Wirkung bei Überdosierung (Atemdepression)', () => {
    const patient = patientMitSchmerz();
    const versorgt = wendeMassnahmeAn(patient, 'morphin', 0, 20); // 0,25 mg/kg, über 0,15 Schwelle
    expect(versorgt.behandelteProbleme).toContain('schmerz-problem');
    expect(versorgt.vitalwerte.atemfrequenz).toBeLessThan(patient.vitalwerte.atemfrequenz);
    expect(versorgt.verlauf.at(-1)?.text).toContain('überdosiert');
  });

  it('kostet trotz Fehldosierung dieselbe Einsatzzeit - die Konsequenz ist die Wirkung, nicht die Dauer', () => {
    // wendeMassnahmeAn selbst rechnet keine Zeit (das macht der Reducer),
    // aber durchgefuehrteMassnahmen und der Zeitstempel-Protokolleintrag
    // müssen bei jeder Dosisstufe gleichermaßen gesetzt werden.
    const patient = patientMitSchmerz();
    for (const dosis of [1, 6, 20]) {
      const versucht = wendeMassnahmeAn(patient, 'morphin', 42, dosis);
      expect(versucht.durchgefuehrteMassnahmen).toContain('morphin');
      expect(versucht.verlauf.at(-1)?.zeitSek).toBe(42);
    }
  });
});
