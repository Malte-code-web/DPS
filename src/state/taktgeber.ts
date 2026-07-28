/**
 * @anker state.taktgeber Hintergrundfester Taktgeber für die Simulationsuhr
 *
 * Browser drosseln `setInterval` in Hintergrund-Tabs stark oder frieren es ein.
 * Im host-autoritativen Mehrspieler friert damit die Uhr für alle ein, sobald
 * die Übungsleitung den Tab wechselt (z. B. um selbst als Spielerin zu klicken).
 *
 * Ein Web Worker hat einen eigenen Ereignis-Loop und wird im Hintergrund weit
 * weniger gedrosselt - sein Takt läuft weiter. Wo ein Worker nicht erlaubt ist
 * (etwa die strenge CSP der Artefakt-Vorschau), fällt der Taktgeber lautlos auf
 * `setInterval` zurück. Die tatsächlich vergangene Zeit rechnet der Aufrufer
 * ohnehin aus Zeitstempeln aus - der Takt bestimmt nur, wie oft nachgerechnet
 * wird, nicht wie viel Zeit vergeht.
 */

// Der Worker als String, damit er ohne eigene Datei auskommt und in die
// Einzeldatei-Ausgabe (Artefakt) eingebettet bleibt.
const WORKER_QUELLE = `
let id = null;
self.onmessage = (e) => {
  const d = e.data || {};
  if (d.typ === 'start') {
    if (id !== null) clearInterval(id);
    id = setInterval(() => self.postMessage(0), d.intervallMs);
  } else if (d.typ === 'stop') {
    if (id !== null) clearInterval(id);
    id = null;
  }
};
`;

/**
 * Startet einen Takt, der alle `intervallMs` `beiTakt` aufruft. Gibt eine
 * Aufräumfunktion zurück, die den Takt beendet.
 */
export function starteTaktgeber(intervallMs: number, beiTakt: () => void): () => void {
  let gestoppt = false;
  let aufraeumen = () => {};

  const setzeIntervall = () => {
    if (gestoppt) return;
    const id = window.setInterval(beiTakt, intervallMs);
    aufraeumen = () => window.clearInterval(id);
  };

  if (typeof Worker === 'undefined') {
    setzeIntervall();
    return () => {
      gestoppt = true;
      aufraeumen();
    };
  }

  try {
    const blob = new Blob([WORKER_QUELLE], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    worker.onmessage = () => beiTakt();
    worker.onerror = () => {
      // Worker nicht nutzbar (z. B. CSP): sauber schließen und zurückfallen.
      worker.terminate();
      URL.revokeObjectURL(url);
      setzeIntervall();
    };
    worker.postMessage({ typ: 'start', intervallMs });
    aufraeumen = () => {
      worker.postMessage({ typ: 'stop' });
      worker.terminate();
      URL.revokeObjectURL(url);
    };
  } catch {
    setzeIntervall();
  }

  return () => {
    gestoppt = true;
    aufraeumen();
  };
}
