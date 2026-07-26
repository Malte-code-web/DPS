import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Alles in ein Bundle: das Anthropic-SDK bringt dynamische Importe mit,
    // die in der Einzeldatei-Ausgabe (scripts/build-single-file.mjs) sonst ins
    // Leere liefen.
    rollupOptions: { output: { codeSplitting: false } },
  },
})
