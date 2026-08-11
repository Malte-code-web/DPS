import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * Zwei Ausgabeformen aus derselben Quelle:
 *
 * - Normalfall (gehostet, z. B. Vercel): mit Code-Splitting. Der
 *   KI-Szenariogenerator (→ `ki.client`) wird erst nachgeladen, wenn die
 *   Übungsleitung ihn wirklich aufruft - sonst läge das Anthropic-SDK im
 *   Bundle jedes Spielers, der es nie braucht.
 * - `--mode einzeldatei` (→ scripts/build-single-file.mjs): ohne Splitting.
 *   Dort wird genau eine JS- und eine CSS-Datei in eine HTML-Datei eingebettet,
 *   die per Doppelklick ohne Server läuft; ein nachzuladender Extra-Chunk
 *   liefe dabei ins Leere.
 *
 * https://vite.dev/config/
 */
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  build: {
    rollupOptions: { output: { codeSplitting: mode !== 'einzeldatei' } },
  },
}))
