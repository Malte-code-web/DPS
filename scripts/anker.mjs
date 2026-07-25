/**
 * Sammelt alle `@anker`-Markierungen aus dem Quelltext und schreibt daraus die
 * Ankertabelle in DOKUMENTATION.md.
 *
 *   npm run anker           Tabelle neu erzeugen
 *   npm run anker:pruefen   nur prüfen, ob sie aktuell ist (Exit 1, wenn nicht)
 *
 * Format der Markierung - ID ist das erste Wort, der Rest ist die Beschreibung:
 *
 *   // @anker sim.tick Ein Simulationsschritt für einen Patienten
 *    * @anker modell.patient Laufzeitzustand eines Patienten
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const WURZEL = 'src';
const DOKU = 'DOKUMENTATION.md';
const START = '<!-- ANKER:START -->';
const ENDE = '<!-- ANKER:END -->';
const ENDUNGEN = new Set(['.ts', '.tsx', '.css']);

async function dateien(verzeichnis) {
  const eintraege = await readdir(verzeichnis, { withFileTypes: true });
  const gefunden = [];
  for (const eintrag of eintraege) {
    const voll = path.join(verzeichnis, eintrag.name);
    if (eintrag.isDirectory()) {
      gefunden.push(...(await dateien(voll)));
    } else if (ENDUNGEN.has(path.extname(eintrag.name))) {
      gefunden.push(voll);
    }
  }
  return gefunden.sort();
}

/** Liest alle Anker einer Datei mit Zeilennummer und Beschreibung. */
function ankerAus(inhalt, datei) {
  const gefunden = [];
  inhalt.split('\n').forEach((zeile, index) => {
    const treffer = zeile.match(/@anker\s+(\S+)\s*(.*)$/);
    if (!treffer) return;
    const beschreibung = treffer[2].replace(/\*\/\s*$/, '').trim();
    gefunden.push({ id: treffer[1], datei, zeile: index + 1, beschreibung });
  });
  return gefunden;
}

const alle = [];
for (const datei of await dateien(WURZEL)) {
  alle.push(...ankerAus(await readFile(datei, 'utf8'), datei));
}

// Doppelte IDs machen die Doku unbrauchbar - lieber laut scheitern.
const doppelt = alle
  .map((anker) => anker.id)
  .filter((id, index, liste) => liste.indexOf(id) !== index);
if (doppelt.length > 0) {
  console.error(`Doppelte Anker-IDs: ${[...new Set(doppelt)].join(', ')}`);
  process.exit(2);
}

const ohneBeschreibung = alle.filter((anker) => anker.beschreibung === '');
if (ohneBeschreibung.length > 0) {
  console.error(
    `Anker ohne Beschreibung: ${ohneBeschreibung.map((a) => a.id).join(', ')}`,
  );
  process.exit(2);
}

/** Gruppiert nach Bereich - dem Teil der ID vor dem ersten Punkt. */
const bereiche = new Map();
for (const anker of alle) {
  const bereich = anker.id.split('.')[0];
  if (!bereiche.has(bereich)) bereiche.set(bereich, []);
  bereiche.get(bereich).push(anker);
}

const zeilen = [START, ''];
zeilen.push(`_${alle.length} Anker, erzeugt von \`npm run anker\` – nicht von Hand ändern._`, '');
for (const [bereich, anker] of [...bereiche.entries()].sort()) {
  zeilen.push(`#### ${bereich}`, '');
  zeilen.push('| Anker | Datei | Bedeutung |');
  zeilen.push('| --- | --- | --- |');
  for (const eintrag of anker.sort((a, b) => a.id.localeCompare(b.id))) {
    zeilen.push(
      `| \`${eintrag.id}\` | [\`${eintrag.datei}:${eintrag.zeile}\`](${eintrag.datei}#L${eintrag.zeile}) | ${eintrag.beschreibung} |`,
    );
  }
  zeilen.push('');
}
zeilen.push(ENDE);
const tabelle = zeilen.join('\n');

const doku = await readFile(DOKU, 'utf8');
const von = doku.indexOf(START);
const bis = doku.indexOf(ENDE);
if (von === -1 || bis === -1) {
  console.error(`${DOKU} enthält keine Marken ${START} / ${ENDE}.`);
  process.exit(2);
}
const neu = doku.slice(0, von) + tabelle + doku.slice(bis + ENDE.length);

if (process.argv.includes('--pruefen')) {
  if (neu !== doku) {
    console.error(`${DOKU} ist nicht aktuell - bitte "npm run anker" ausführen.`);
    process.exit(1);
  }
  console.log(`${DOKU} ist aktuell (${alle.length} Anker).`);
} else {
  await writeFile(DOKU, neu);
  console.log(`${alle.length} Anker in ${DOKU} geschrieben.`);
}
