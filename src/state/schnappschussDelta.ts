import type { Schnappschuss, SchnappschussFelder } from './reducer';

/**
 * @anker net.delta Nur senden, was sich wirklich geändert hat
 *
 * Der Host verteilte bisher bei **jeder** Änderung den kompletten geteilten
 * Zustand - gemessen 58,6 kB nach einer halben Stunde Übung, alle 500 ms.
 * Rund ein Drittel davon (`szenario`, `massnahmenrechte`) ist über die ganze
 * Sitzung unveränderlich und ging trotzdem zweihundertmal pro Minute erneut
 * über die Leitung.
 *
 * Der Vergleich läuft über **Referenzgleichheit** (`===`), nicht über einen
 * Tiefenvergleich. Das ist hier nicht die billige Näherung, sondern die
 * exakte Antwort: Der Reducer arbeitet durchgängig unveränderlich, ein Feld
 * bekommt also genau dann eine neue Referenz, wenn es wirklich neu gebaut
 * wurde. Ein Tiefenvergleich fände dieselben Felder, nur langsamer - und
 * müsste bei jedem Takt über alle Patienten laufen.
 *
 * Das Delta ist bewusst nur eine **Abkürzung**, nie die Garantie: Das
 * Vollbild (→ `state.schnappschuss.nachricht`, `basis: 0`) bleibt jederzeit
 * anwendbar, und eine Lücke wird erkannt und repariert (→ `state.puls`).
 * Wäre diese Datei komplett kaputt, liefe die Sitzung weiter - nur mit ein
 * paar Sekunden mehr Verzug.
 */

/**
 * Die Feldliste an genau einer Stelle. `Record<keyof SchnappschussFelder, …>`
 * ist der eigentliche Zweck: Wer dem Schnappschuss ein Feld hinzufügt, ohne es
 * hier einzutragen, bekommt einen Typfehler statt ein Feld, das stillschweigend
 * nie synchronisiert wird.
 */
const FELDER: Record<keyof SchnappschussFelder, true> = {
  phase: true,
  szenario: true,
  zeitSek: true,
  laufend: true,
  geschwindigkeit: true,
  patienten: true,
  fahrzeuge: true,
  spieler: true,
  status: true,
  massnahmenrechte: true,
  delegationsanfragen: true,
  rufgruppen: true,
  kollegenanfragen: true,
  freigabemodus: true,
  routen: true,
  ausgeloesteEreignisse: true,
  regieProtokoll: true,
  spielerProtokoll: true,
  flaechen: true,
  flaechenBefehle: true,
  abschnittFuehrenBefehle: true,
  meldebuch: true,
  zeltMinispiele: true,
  personalanfragen: true,
};

export const SCHNAPPSCHUSS_FELDER = Object.keys(FELDER) as (keyof SchnappschussFelder)[];

/**
 * Die Felder, die sich zwischen `alt` und `neu` geändert haben. Ohne `alt`
 * (erster Versand einer Sitzung) ist das Ergebnis vollständig - der Aufrufer
 * schickt es dann als Vollbild.
 */
export function deltaBilden(
  alt: SchnappschussFelder | null,
  neu: SchnappschussFelder,
): Partial<SchnappschussFelder> {
  if (!alt) return { ...neu };
  const delta: Partial<SchnappschussFelder> = {};
  for (const schluessel of SCHNAPPSCHUSS_FELDER) {
    if (alt[schluessel] !== neu[schluessel]) {
      // Der Umweg über `Record<string, unknown>` ist nötig, weil TypeScript
      // eine Zuweisung über einen generischen Schlüssel hinweg nicht als
      // typsicher erkennen kann - der Lesezugriff darüber ist es.
      (delta as Record<string, unknown>)[schluessel] = neu[schluessel];
    }
  }
  return delta;
}

/**
 * Host: die nächste zu sendende Nachricht - oder `null`, wenn sich kein
 * geteiltes Feld geändert hat (eine reine Navigationsänderung z. B. ändert den
 * Zustand, aber nichts Geteiltes).
 *
 * Ohne Vorgänger ist das Ergebnis ein Vollbild (`basis: 0`). Bewusst eine reine
 * Funktion und nicht im Provider vergraben: So prüft der Konvergenztest
 * (→ `schnappschussDelta.test.ts`) dieselbe Entscheidung, die im Betrieb läuft,
 * statt einer Nachbildung davon.
 */
export function naechsteNachricht(
  vorher: SchnappschussFelder | null,
  neu: SchnappschussFelder,
  letzteFolge: number,
): Schnappschuss | null {
  const delta = deltaBilden(vorher, neu);
  if (!vorher) return { folge: letzteFolge + 1, basis: 0, felder: delta };
  if (Object.keys(delta).length === 0) return null;

  /**
   * @anker net.delta.patienten Die Patientenliste stückweise
   *
   * Nach allem anderen bleibt sie der mit Abstand größte Posten: Jeder Takt
   * lässt Vitalwerte driften, also gilt das Feld als geändert und die ganze
   * Liste ginge erneut raus - gemessen 14,4 kB je halbe Sekunde. Verändert
   * haben sich dabei aber nur die Patienten, die gerade wirklich altern; wer
   * versorgt, verstorben oder abtransportiert ist, bleibt unangetastet und
   * behält seine Referenz (im gemessenen Lauf 4 von 10).
   *
   * Die Id-Reihenfolge fährt vollständig mit - sonst ließe sich ein
   * hinzugekommener oder entfernter Patient nicht von einem unveränderten
   * unterscheiden. Sie kostet ein paar Byte je Person und macht die
   * Zusammensetzung eindeutig.
   */
  if ('patienten' in delta) {
    const vorherNachId = new Map(vorher.patienten.map((patient) => [patient.id, patient]));
    const geaendert = neu.patienten.filter(
      (patient) => vorherNachId.get(patient.id) !== patient,
    );
    // Nur wenn dabei wirklich gespart wird - sonst bleibt es beim ganzen Feld.
    if (geaendert.length < neu.patienten.length) {
      const { patienten: _weggelassen, ...rest } = delta;
      return {
        folge: letzteFolge + 1,
        basis: letzteFolge,
        felder: rest,
        patientenTeil: { reihenfolge: neu.patienten.map((patient) => patient.id), geaendert },
      };
    }
  }
  return { folge: letzteFolge + 1, basis: letzteFolge, felder: delta };
}

/**
 * Client: Fehlt zwischen dem eigenen Stand und dieser Nachricht ein Stück?
 *
 * Dann ist sie nicht anwendbar und es muss ein Vollbild her (→ `state.puls`).
 * Eine *ältere* Nachricht (`folge <= stand`) ist dagegen keine Lücke, sondern
 * eine verspätete oder doppelte Zustellung - die wird schlicht verworfen.
 */
export function fehltZwischenstueck(nachricht: Schnappschuss, stand: number): boolean {
  return nachricht.basis !== 0 && nachricht.basis !== stand && nachricht.folge > stand;
}
