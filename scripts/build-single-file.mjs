/**
 * Baut aus dem Vite-Ergebnis in dist/ eine einzelne, in sich geschlossene
 * HTML-Datei. Nuetzlich zum Weitergeben an Uebungsleitungen: kein Server,
 * kein Node, kein Internet - Datei doppelklicken genuegt.
 *
 *   npm run build && node scripts/build-single-file.mjs
 *
 * Mit --fragment wird nur der Seiteninhalt ohne <html>/<head>/<body>
 * ausgegeben (fuer Umgebungen, die das Grundgeruest selbst mitbringen).
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DIST = 'dist';
const fragmentModus = process.argv.includes('--fragment');
const zielDatei =
  process.argv.find((arg) => arg.endsWith('.html') && arg !== process.argv[1]) ??
  path.join(DIST, 'dps.html');

const indexHtml = await readFile(path.join(DIST, 'index.html'), 'utf8');

function assetPfad(muster) {
  const treffer = indexHtml.match(muster);
  if (!treffer) {
    throw new Error(`Kein passendes Asset in dist/index.html gefunden: ${muster}`);
  }
  return path.join(DIST, treffer[1]);
}

const css = await readFile(assetPfad(/<link[^>]+href="\/([^"]+\.css)"/), 'utf8');
const js = await readFile(assetPfad(/<script[^>]+src="\/([^"]+\.js)"/), 'utf8');
const titel = indexHtml.match(/<title>([^<]*)<\/title>/)?.[1] ?? 'DPS';

// Ein "</script>" im Bundle wuerde den umschliessenden Script-Block beenden.
const jsSicher = js.replaceAll('</script', String.raw`<\/script`);

const kopf = `<title>${titel}</title>
<style>
${css}
</style>`;

const koerper = `<div id="root"></div>
<script type="module">
${jsSicher}
</script>`;

const ausgabe = fragmentModus
  ? `${kopf}\n${koerper}\n`
  : `<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${kopf}
  </head>
  <body>
${koerper}
  </body>
</html>
`;

await writeFile(zielDatei, ausgabe);
console.log(`${zielDatei} geschrieben (${(ausgabe.length / 1024).toFixed(0)} kB)`);
