# DPS – Dynamische Patienten-Simulation

Trainingsanwendung für den **Massenanfall von Verletzten (MANV)**. Die App stellt eine
Schadensstelle mit mehreren Betroffenen dar, deren Zustand sich in Echtzeit verändert:
Wer zu spät gesichtet oder falsch priorisiert wird, verschlechtert sich – und kann versterben.

Geübt werden

- die **Vorsichtung nach mSTaRT** (Sichtungskategorien SK I–IV),
- das **Priorisieren knapper Ressourcen** (jede Maßnahme kostet Zeit),
- die **Nachsichtung**, weil sich Patienten im Verlauf verändern.

Anschließend zeigt ein **Debriefing** die vergebenen gegen die korrekten Kategorien.

## Trainingsmodi

Die Startseite führt in einen von drei Modi:

| Modus | Stand |
| --- | --- |
| **Digitale Übung** | ausgebaut – die vollständige Lage am Bildschirm |
| **Führungskräfte** | in Vorbereitung – Lagebeurteilung und Kräfteeinteilung |
| **Realübung** | in Vorbereitung – Begleitung einer Übung mit Mimen im Gelände |

Daneben steht die **Übungsleitung**: eigene Szenarien anlegen, bearbeiten,
als Datei weitergeben – oder erzeugen lassen. Dafür gibt es zwei Wege:

- **Baukasten** – kostenfrei, ohne Zugang, ohne Internet. Lage und Anzahl
  wählen, fertig. Die Verläufe werden aus der gewünschten Todesminute
  zurückgerechnet, deshalb ist jedes Szenario auf Anhieb stimmig. Die *Saat*
  macht eine Lage wiederholbar: gleiche Zahl, gleiche Übung.
- **Sprachmodell** – für eine frei beschriebene Lage, die der Baukasten nicht
  kennt. Die App beauftragt das Modell direkt, prüft das Ergebnis, spielt jeden
  Patienten über 30 Minuten durch und schickt alles, was nicht stimmt,
  automatisch zur Nachbesserung zurück. Dafür wird einmalig ein eigener
  API-Schlüssel hinterlegt – er bleibt im Browser des Geräts – und es entstehen
  Kosten je Szenario. Alternativ lässt sich der fertige Auftrag in eine
  beliebige KI kopieren und das Ergebnis als JSON importieren.

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

## Dokumentation

[DOKUMENTATION.md](DOKUMENTATION.md) beschreibt den aktuellen Stand, die
Mechaniken und die offenen Punkte – und enthält eine Tabelle aller **Anker**
(`@anker`-Markierungen im Quelltext), über die sich jede wichtige Stelle im Code
sofort finden lässt.

## Aufbau

```
src/
  domain/        Fachlogik, framework-unabhängig und vollständig getestet
    types.ts         Datenmodell (Patient, Vitalwerte, Problem, Maßnahme, Szenario)
    triage.ts        mSTaRT-Algorithmus inkl. nachvollziehbarer Entscheidungskette
    simulation.ts    Zeitverlauf: Verschlechterung, Maßnahmenwirkung, Todeskriterien
    massnahmen.ts    Maßnahmenkatalog nach xABCDE-Schema
    szenarien.ts     Übungsszenarien mit Patientenvorlagen
    abschnitte.ts    Einsatzabschnitte und die erlaubten Wege dazwischen
    modi.ts          Trainingsmodi und ihr Ausbaustand
    szenarioPruefung.ts  Prüfung eigener und importierter Szenarien
  state/         useReducer-Store, Simulationsuhr, React-Context
  components/    Darstellung (Patientenkarten, Vitalmonitor, Maßnahmenkatalog)
  pages/         Start → Setup → Einsatz → Patientenseite → Debriefing
                 pages/uebungsleitung/ der Szenario-Editor
  lib/           Formatierung und Auswertung
```

### Einsatzabschnitte

Die Patienten durchlaufen den Einsatz Abschnitt für Abschnitt:

```
Schadensstelle → Eingangssichtung → rotes / gelbes / grünes Zelt
                                  → Ausgangssichtung → Abtransport
```

Eine Reiterleiste zeigt alle Abschnitte mit ihrer aktuellen Belegung und dient
zugleich als Lageübersicht des Behandlungsplatzes. Jeder Abschnitt hat seine
eigene Arbeitsansicht:

| Abschnitt | Ansicht |
| --- | --- |
| Schadensstelle | Ersteinschätzung, dahinter die erweiterte Versorgung |
| Eingangssichtung | Erster Eindruck, bisheriger Verlauf, Sichtung und Zuweisung zum Zelt |
| Zelt (rot/gelb/grün) | Diagnostik und Behandlung mit Vitalwerten und vollem Katalog |
| Ausgangssichtung | Übergabe aller Befunde und Maßnahmen, schnelle Maßnahmen, Abschlusssichtung |
| Abtransport | abgeschlossen, nur noch Einsicht |

Verlegt wird über Schaltflächen in der jeweiligen Ansicht; das zur vergebenen
Kategorie passende Zelt ist hervorgehoben, abweichend verlegen bleibt möglich.
Sprünge im Ablauf lässt die Simulation nicht zu, eine Verlegung zwischen den
Zelten nach einer Nachsichtung dagegen schon. Jede Verlegung kostet 30 Sekunden
Einsatzzeit.

Gesichtet wird an drei Stellen – Vorsichtung, Eingangssichtung und
Abschlusssichtung. Jede Entscheidung wird mit Ort und Zeitpunkt festgehalten und
im Debriefing getrennt ausgewiesen; bewertet gegen die Referenz wird die
Vorsichtung, weil spätere Sichtungen einen bereits veränderten Zustand beurteilen.

### Navigation

Ein Klick auf eine Patientenkarte öffnet die **Patientenseite**. Von dort führen
die Schaltfläche oben links (oder die Escape-Taste) zurück in die Liste des
Abschnitts und „Vorheriger / Nächster" zu den übrigen Patienten desselben
Abschnitts.

### Die Patientenseite in zwei Stufen

Der didaktische Kern der Anwendung liegt im Aufbau dieser Seite.

**Stufe 1 – Ersteinschätzung** zeigt den ersten Eindruck ohne Messwerte (gehfähig,
kritische Blutung, Atmung, Radialispuls, Reaktion), den Maßnahmenkatalog und die
Sichtungskategorie. Vitalparameter sind hier bewusst nicht sichtbar – mSTaRT kommt
ohne sie aus.

Der Maßnahmenkatalog folgt dem **xABCDE-Schema** und ist gruppenweise einklappbar.
In der Ersteinschätzung sind **x** (kritische Blutung) und **A** (Atemweg)
aufgeklappt – die beiden Handgriffe, die in die Vorsichtung gehören. B bis E sind
eingeklappt, aber sichtbar. Genau darin liegt die Versuchung: Der Weg in die
Individualmedizin ist ein Klick auf eine Gruppe, und nichts hält davon ab.

**Stufe 2 – Erweiterte Versorgung** bringt Vitalwerte, den vollständig
aufgeklappten Katalog und das Verlaufsprotokoll.

Die Anwendung gibt bewusst **keine Hinweise**, was richtig wäre – keine
Algorithmus-Hilfe, keine Warnung vor zu viel Behandlung. Die Rückmeldung kommt
über den Zustand der Patienten und das Debriefing.

Diese zwei Stufen gelten für die Schadensstelle. In den übrigen Abschnitten
zeigt die Patientenseite direkt die dort passende Ansicht.

### Zeit ist die eigentliche Ressource

Damit diese Versuchung Folgen hat, kostet **jede Handlung echte Einsatzzeit – für
alle Betroffenen gleichzeitig**:

| Handlung | Zeit |
| --- | --- |
| Vorsichtung eines Patienten | 20 s |
| Verlegung in den nächsten Abschnitt | 30 s |
| Blutung stillen (x) / Atemweg freimachen (A) | 20–60 s |
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
