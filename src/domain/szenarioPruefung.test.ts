import { describe, expect, it } from 'vitest';
import { baueKiPrompt } from '../lib/kiPrompt';
import { leererPatient, leeresSzenario } from '../lib/vorlagen';
import { MASSNAHMEN_LISTE } from './massnahmen';
import { SZENARIEN } from './szenarien';
import { mstartAbweichung, pruefeSzenario } from './szenarioPruefung';
import type { Szenario } from './types';

/** @anker test.szenariopruefung Die Prüfung, durch die jedes importierte Szenario muss */

function fehlerTexte(wert: unknown): string[] {
  return pruefeSzenario(wert)
    .befunde.filter((befund) => befund.schwere === 'fehler')
    .map((befund) => befund.text);
}

describe('Szenarioprüfung', () => {
  it('lässt die mitgelieferten Szenarien ohne Fehler durch', () => {
    for (const szenario of SZENARIEN) {
      const ergebnis = pruefeSzenario(szenario);
      expect(ergebnis.gueltig, `${szenario.id}: ${JSON.stringify(ergebnis.befunde)}`).toBe(true);
    }
  });

  it('lässt ein frisch angelegtes Szenario durch', () => {
    expect(pruefeSzenario(leeresSzenario('test')).gueltig).toBe(true);
  });

  it.each([null, 42, 'Szenario', []])('weist %p als Szenario ab', (wert) => {
    expect(pruefeSzenario(wert).gueltig).toBe(false);
  });

  it('verlangt Titel, Lagemeldung und mindestens einen Patienten', () => {
    const texte = fehlerTexte({ id: 'x' });
    expect(texte.some((text) => text.includes('titel'))).toBe(true);
    expect(texte.some((text) => text.includes('Patient'))).toBe(true);
  });

  it('erkennt doppelte Patienten-IDs', () => {
    const szenario: Szenario = {
      ...leeresSzenario('test'),
      patienten: [leererPatient(1), leererPatient(1)],
    };
    expect(fehlerTexte(szenario).some((text) => text.includes('doppelt'))).toBe(true);
  });

  it('erkennt Vitalwerte ausserhalb der Grenzen', () => {
    const patient = leererPatient(1);
    patient.startVitalwerte.spo2 = 140;
    const szenario: Szenario = { ...leeresSzenario('test'), patienten: [patient] };
    expect(fehlerTexte(szenario).some((text) => text.includes('spo2'))).toBe(true);
  });

  it('erkennt unbekannte Maßnahmen in behandeltDurch', () => {
    const patient = leererPatient(1);
    patient.probleme = [
      {
        id: 'p',
        label: 'P',
        beschreibung: 'B',
        // Absichtlich ungültig - so kommt es aus einer KI, die sich verschreibt.
        behandeltDurch: ['zaubertrank' as never],
        verlauf: { spo2: -1 },
      },
    ];
    const szenario: Szenario = { ...leeresSzenario('test'), patienten: [patient] };
    expect(fehlerTexte(szenario).some((text) => text.includes('zaubertrank'))).toBe(true);
  });

  it('erkennt unbekannte Vitalwerte im Verlauf', () => {
    const patient = leererPatient(1);
    patient.probleme = [
      {
        id: 'p',
        label: 'P',
        beschreibung: 'B',
        behandeltDurch: ['sauerstoffgabe'],
        verlauf: { koerpertemperatur: -1 } as never,
      },
    ];
    const szenario: Szenario = { ...leeresSzenario('test'), patienten: [patient] };
    expect(fehlerTexte(szenario).some((text) => text.includes('koerpertemperatur'))).toBe(true);
  });

  it('meldet eine abweichende Referenzkategorie als Warnung, nicht als Fehler', () => {
    const patient = leererPatient(1);
    patient.erwarteteSK = 'SK1'; // Startwerte ergeben SK2
    const szenario: Szenario = { ...leeresSzenario('test'), patienten: [patient] };
    const ergebnis = pruefeSzenario(szenario);

    expect(ergebnis.gueltig).toBe(true);
    expect(
      ergebnis.befunde.some(
        (befund) => befund.schwere === 'warnung' && befund.text.includes('mSTaRT'),
      ),
    ).toBe(true);
    expect(mstartAbweichung(patient)).toBe('SK2');
  });

  it('meldet keine Abweichung, wenn die Kategorie passt', () => {
    expect(mstartAbweichung(leererPatient(1))).toBeNull();
  });
});

describe('KI-Auftrag', () => {
  it('nennt alle verfügbaren Maßnahmen-IDs', () => {
    const prompt = baueKiPrompt({ lage: 'Test', anzahl: 5, schwerpunkt: 'Test' });
    for (const massnahme of MASSNAHMEN_LISTE) {
      expect(prompt, `Maßnahme ${massnahme.id} fehlt im Auftrag`).toContain(`"${massnahme.id}"`);
    }
  });

  it('übernimmt die Wünsche der Übungsleitung', () => {
    const prompt = baueKiPrompt({
      lage: 'Zugunglück am Bahnhof',
      anzahl: 12,
      schwerpunkt: 'Rauchgas',
    });
    expect(prompt).toContain('Zugunglück am Bahnhof');
    expect(prompt).toContain('12 Betroffene');
    expect(prompt).toContain('Rauchgas');
  });
});
