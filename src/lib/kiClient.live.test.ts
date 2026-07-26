import { describe, expect, it } from 'vitest';
import { pruefeDynamik } from '../domain/szenarioDynamik';
import { pruefeSzenario } from '../domain/szenarioPruefung';
import { erzeugeSzenario } from './kiClient';
import { LEERER_ZUGANG } from './kiZugang';

/**
 * @anker ki.livetest Echter Durchlauf gegen die API - nur mit Schlüssel
 *
 * Alle anderen Tests laufen ohne Netz. Dieser hier ruft wirklich das Modell an
 * und ist deshalb standardmäßig übersprungen. Er beantwortet die eine Frage,
 * die kein Mock beantworten kann: Nimmt die API das Schema an, und taugt das,
 * was zurückkommt, wirklich als Übungslage?
 *
 *   ANTHROPIC_API_KEY=sk-ant-... npm run ki:test
 *
 * Ein Durchlauf kostet je nach Modell wenige Cent.
 */
const schluessel = process.env.ANTHROPIC_API_KEY ?? '';
const modell = process.env.DPS_KI_MODELL ?? LEERER_ZUGANG.modell;

describe.skipIf(!schluessel)('KI-Erzeugung gegen die echte API', () => {
  it(
    'liefert ein Szenario, das Prüfung und Probelauf besteht',
    async () => {
      const protokoll: string[] = [];

      const ergebnis = await erzeugeSzenario({
        wunsch: {
          lage: 'Auffahrunfall auf der Autobahn, drei Fahrzeuge, ein Kleintransporter quer.',
          anzahl: 6,
          schwerpunkt: 'Eine kritische Blutung, eine verzögerte Verschlechterung.',
        },
        zugang: { schluessel, modell, adresse: process.env.ANTHROPIC_BASE_URL ?? '' },
        melde: (text) => {
          protokoll.push(text);
          console.log(`  › ${text}`);
        },
      });

      const { szenario } = ergebnis;
      console.log(`\n  Titel:     ${szenario.titel}`);
      console.log(`  Lage:      ${szenario.lagemeldung}`);
      console.log(`  Durchgänge: ${ergebnis.versuche}`);
      console.log('\n  Probelauf:');
      for (const eintrag of pruefeDynamik(szenario).patienten) {
        const ohne =
          eintrag.todUnbehandeltMin !== null
            ? `† nach ${String(eintrag.todUnbehandeltMin).padStart(2)} min`
            : eintrag.veraendertSich
              ? 'überlebt, verschlechtert sich'
              : 'unverändert';
        console.log(
          `    ${eintrag.id.padEnd(6)} ${eintrag.erwarteteSK}  ${ohne.padEnd(30)} ` +
            `${eintrag.todBehandeltMin !== null ? `† nach ${eintrag.todBehandeltMin} min` : 'gerettet'}`,
        );
      }
      if (ergebnis.befunde.length > 0) {
        console.log('\n  Offene Befunde:');
        for (const befund of ergebnis.befunde) {
          console.log(`    [${befund.schwere}] ${befund.ort}: ${befund.text}`);
        }
      }

      // Was die Übungsleitung als Zusage bekommt: keine Fehler, richtige Anzahl.
      expect(pruefeSzenario(szenario).gueltig).toBe(true);
      expect(szenario.patienten).toHaveLength(6);
      expect(ergebnis.befunde.filter((befund) => befund.schwere === 'fehler')).toEqual([]);
      expect(protokoll.length).toBeGreaterThan(0);
    },
    // Bis zu drei Durchgänge über die API brauchen Zeit.
    300_000,
  );
});
