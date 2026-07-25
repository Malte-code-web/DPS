# DPS – Dynamische Patienten-Simulation

Trainingsanwendung für den **Massenanfall von Verletzten (MANV)**. Die App stellt eine
Schadensstelle mit mehreren Betroffenen dar, deren Zustand sich in Echtzeit verändert:
Wer zu spät gesichtet oder falsch priorisiert wird, verschlechtert sich – und kann versterben.

Geübt werden

- die **Vorsichtung nach mSTaRT** (Sichtungskategorien SK I–IV),
- das **Priorisieren knapper Ressourcen** (jede Maßnahme kostet Zeit),
- die **Nachsichtung**, weil sich Patienten im Verlauf verändern.

Anschließend zeigt ein **Debriefing** die vergebenen gegen die korrekten Kategorien.

## Schnellstart

```bash
npm install
npm run dev      # Entwicklungsserver auf http://localhost:5173
```

Weitere Skripte:

```bash
npm run test          # Vitest (Domänenlogik)
npm run lint          # oxlint
npm run typecheck     # TypeScript ohne Emit
npm run build         # Produktionsbuild nach dist/
npm run build:single  # dist/dps.html – alles in einer Datei
```

### Ohne Toolchain weitergeben

`npm run build:single` erzeugt `dist/dps.html`: eine einzelne Datei mit
eingebettetem JavaScript und CSS. Sie läuft per Doppelklick im Browser – ohne
Server, ohne Node, ohne Internet. Praktisch, um eine Übung auf einem beliebigen
Rechner oder per USB-Stick bereitzustellen.

## Aufbau

```
src/
  domain/        Fachlogik, framework-unabhängig und vollständig getestet
    types.ts         Datenmodell (Patient, Vitalwerte, Problem, Maßnahme, Szenario)
    triage.ts        mSTaRT-Algorithmus inkl. nachvollziehbarer Entscheidungskette
    simulation.ts    Zeitverlauf: Verschlechterung, Maßnahmenwirkung, Todeskriterien
    massnahmen.ts    Maßnahmenkatalog nach ABCDE-Schema
    szenarien.ts     Übungsszenarien mit Patientenvorlagen
  state/         useReducer-Store, Simulationsuhr, React-Context
  components/    Darstellung (Patientenkarten, Vitalmonitor, Maßnahmen, mSTaRT-Hilfe)
  pages/         Setup → Einsatz → Patientenseite → Debriefing
  lib/           Formatierung und Auswertung
```

### Navigation

Die Einsatzansicht zeigt die Schadensstelle als Kartenraster. Ein Klick auf eine
Karte öffnet die **Patientenseite**. Von dort führen „Zurück zur Schadensstelle"
(oder die Escape-Taste) in die Übersicht und „Vorheriger / Nächster" direkt zum
nächsten Betroffenen, ohne Umweg über die Liste.

### Die Patientenseite in zwei Stufen

Der didaktische Kern der Anwendung liegt im Aufbau dieser Seite.

**Stufe 1 – Ersteinschätzung** zeigt nur, was die Vorsichtung braucht: den ersten
Eindruck ohne Messwerte (gehfähig, kritische Blutung, Atmung, Radialispuls,
Reaktion), die beiden lebensrettenden Handgriffe und die Sichtungskategorie.
Vitalparameter sind hier bewusst nicht sichtbar – mSTaRT kommt ohne sie aus. Der
lehrbuchgerechte Weg ist damit kurz: sichten, gegebenenfalls Blutung stillen oder
Atemweg freimachen, weiter zum nächsten.

**Stufe 2 – Erweiterte Versorgung** ist die Individualmedizin. Sie liegt einen
einzigen Tipper entfernt und wird *nicht* versperrt, denn genau das ist der Punkt:
Die Versuchung, sich an einem Patienten festzuarbeiten, gehört zur Übung. Hier
gibt es Vitalwerte, den vollständigen ABCDE-Katalog und den Transport.

### Zeit ist die eigentliche Ressource

Damit diese Versuchung Folgen hat, kostet **jede Handlung echte Einsatzzeit – für
alle Betroffenen gleichzeitig**:

| Handlung | Zeit |
| --- | --- |
| Vorsichtung eines Patienten | 20 s |
| Blutung stillen / Atemweg freimachen | 20–60 s |
| Körperliche Untersuchung | 30 s |
| Endotracheale Intubation | 180 s |

Wer intubiert, lässt die Uhr um drei Minuten springen, in denen sich alle anderen
weiter verschlechtern. Zehn Patienten vorzusichten kostet weniger Zeit als drei
Intubationen – diese Rechnung ist der Kern der Übung. Das Debriefing weist die
Zeit jenseits der Sofortmaßnahmen als **Individualmedizin** gesondert aus.

Die Einsatzleiste mit Uhr und Sichtungszählern bleibt dabei immer sichtbar – die
Zeit läuft auch weiter, während ein einzelner Patient versorgt wird.

### Bedienung auf dem Smartphone

Die Oberfläche ist für den Einsatz auf dem Telefon ausgelegt – auch weil eine
Übung selten am Schreibtisch stattfindet:

- Alle Schaltflächen sind auf Touch-Geräten mindestens 44 px hoch (`pointer: coarse`).
- Hover-Effekte gelten nur für Geräte mit echtem Zeiger (`hover: hover`), sonst
  bliebe eine angetippte Karte dauerhaft hervorgehoben.
- Die angeheftete Einsatzleiste ist auf schmalen Bildschirmen kompakt gesetzt und
  belegt rund ein Fünftel der Bildschirmhöhe statt zwei Fünfteln.
- Die Debriefing-Tabelle bricht unter 760 px zu einer Kartenliste um; die
  Spaltentitel stehen dann über `data-spalte` vor dem jeweiligen Wert.
- Keine Ansicht erzeugt horizontales Scrollen.

Die Fachlogik ist bewusst frei von React: `simuliereSchritt`, `wendeMassnahmeAn` und
`sichtungNachMstart` sind reine Funktionen und lassen sich unabhängig von der Oberfläche
testen oder später auf einem Server ausführen.

## Simulationsmodell

Jeder Patient hat Vitalwerte (AF, HF, RR systolisch, SpO₂, GCS, Rekapzeit) und eine Liste
offener **Probleme**. Ein unbehandeltes Problem verändert die Vitalwerte pro Minute; manche
Probleme werden erst nach einer Latenzzeit wirksam (z. B. ein Spannungspneumothorax nach
drei Minuten). Eine passende Maßnahme löst das Problem, stoppt die Verschlechterung und
verbessert die Werte einmalig.

Aus den Vitalwerten leitet die Simulation die Sichtungsbefunde ab: Gehfähigkeit,
Spontanatmung, Radialispuls und Reaktion auf Ansprache. Dadurch kann eine anfangs gehfähige
Person im Verlauf zum SK-I-Patienten werden. Unterschreiten die Werte kritische Grenzen,
verstirbt der Patient.

Intern wird mit Gleitkommawerten gerechnet und erst bei der Anzeige gerundet – sonst würde
die Veränderung eines einzelnen Ticks (Bruchteile einer Minute) verloren gehen.

## Szenarien

| Szenario | Betroffene | Schwerpunkt |
| --- | --- | --- |
| Busunfall B31 | 10 | Vollständige Vorsichtung, verzögerter Spannungspneumothorax, zunächst gehfähige Patientin mit innerer Blutung |
| Brand Mehrfamilienhaus | 6 | Rauchgasintoxikationen mit verzögerter Verschlechterung, Verbrennung, Kind |

Ein neues Szenario ist eine Datenstruktur in `src/domain/szenarien.ts` – kein Code nötig.
Der Test `simulation.test.ts` prüft automatisch, dass die hinterlegte Referenzkategorie
jedes Patienten zum Einsatzbeginn exakt dem mSTaRT-Algorithmus entspricht.

## Hinweis

Die Anwendung dient ausschließlich der Aus- und Fortbildung. Die hinterlegten Verläufe sind
didaktisch vereinfacht und ersetzen weder eine medizinische Leitlinie noch die geltenden
Vorgaben der jeweiligen Landesrettungsdienstgesetze oder der örtlichen Dienstanweisungen.

## Nächste Schritte

- Sichtungsraum/Behandlungsplatz und Transportkapazitäten als begrenzte Ressource
- Mehrere Einsatzkräfte mit eigenen Zeitbudgets statt unbegrenzter Maßnahmen
- Übungsleitermodus: Verläufe live anpassen, Störgrößen einspielen
- Persistenz der Ergebnisse (Export des Debriefings als PDF/CSV)
