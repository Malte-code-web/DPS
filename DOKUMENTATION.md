# DPS – Projektdokumentation

Stand: Juli 2026 · Branch `claude/web-app-initial-code-p73cx9`

Diese Datei beschreibt, **was die Anwendung heute kann**, **wie sie aufgebaut
ist** und **wo im Code welche Entscheidung liegt**. Für den Schnellstart und die
Benutzersicht siehe [README.md](README.md).

---

## 1. Was die Anwendung ist

Eine Trainingsumgebung für den **Massenanfall von Verletzten (MANV)**. Der Übende
führt eine Schadenslage vom Eintreffen bis zum Abtransport: vorsichten,
lebensrettende Handgriffe, Behandlungsplatz betreiben, Patienten abtransportieren.

Die drei Lernziele, an denen der gesamte Aufbau ausgerichtet ist:

1. **Vorsichtung nach mSTaRT** – schnell und ohne Messwerte kategorisieren.
2. **Zeit als knappe Ressource begreifen** – wer sich festarbeitet, verliert sie
   bei allen anderen.
3. **Der Versuchung zur Individualmedizin standhalten** – die Anwendung erlaubt
   sie ausdrücklich und rechnet sie im Debriefing ab.

Die Anwendung gibt während der Übung **keine Hinweise**, was richtig wäre. Kein
Algorithmus-Assistent, keine Warnung vor zu viel Behandlung. Rückmeldung gibt es
nur über den Zustand der Patienten und das Debriefing.

---

## 2. Aktueller Stand

### Fertig und getestet

| Bereich | Stand |
| --- | --- |
| Trainingsmodi | Auswahl aus drei Modi; die digitale Übung ist ausgebaut, Führungskräfte und Realübung zeigen bisher nur ihre Planung |
| Übungsleitung | Eigene Szenarien anlegen, bearbeiten, duplizieren, als JSON aus- und einlesen; Prüfung gegen dieselben Regeln wie die mitgelieferten |
| KI-Unterstützung | Erzeugt den vollständigen Auftrag für eine KI; das Ergebnis kommt über den JSON-Import zurück und wird geprüft |
| Simulationskern | Vitalwerte verändern sich pro Minute durch unbehandelte Probleme, Latenzzeiten, Todeskriterien, abgeleitete Sichtungsbefunde |
| mSTaRT | Vollständig mit nachvollziehbarer Entscheidungskette; alle Zweige getestet |
| Zeitmechanik | Jede Handlung (Sichtung, Untersuchung, Maßnahme, Verlegung) lässt die Uhr für alle Patienten weiterlaufen |
| Maßnahmen | 15 Maßnahmen nach xABCDE, gruppenweise einklappbar |
| Einsatzabschnitte | Schadensstelle → Eingangssichtung → drei Zelte → Ausgangssichtung → Abtransport, mit eigener Ansicht je Abschnitt |
| Sichtung an drei Stellen | Vor-, Eingangs- und Abschlusssichtung, jede mit Ort und Zeitpunkt protokolliert |
| Debriefing | Kennzahlen, Vergleich gegen die Referenz, Ausweis der Individualmedizin |
| Szenarien | Zwei Lagen mit zusammen 16 Patienten |
| Bedienung | Für Smartphone ausgelegt: Tippziele ≥ 44 px, kein Querscrollen, Tabellen brechen zu Karten um |
| Weitergabe | `npm run build:single` erzeugt eine einzelne HTML-Datei ohne Server |

62 automatische Tests (Vitest) über Domänenlogik, Zustandsverwaltung und Szenarioprüfung.

### Bewusst noch nicht gebaut

- **Modus Führungskräfte**: Auswahl und Beschreibung stehen, der Ablauf fehlt.
- **Modus Realübung**: Auswahl und Beschreibung stehen, der Ablauf fehlt.
- **Kapazitäten**: Zelte und Transportmittel sind unbegrenzt. Solange das so ist,
  ist die Verteilung auf die Zelte eine Formalität statt einer Entscheidung.
- **Personal**: Es gibt genau einen handelnden Übenden ohne eigenes Zeitbudget.
- **Störgrößen zur Laufzeit**: Die Übungsleitung baut Szenarien vorab, kann aber
  in eine laufende Übung nicht eingreifen.
- **Direkter KI-Aufruf**: Die App ruft kein Modell auf, sondern erzeugt den
  Auftrag zum Einfügen. Ein echter Aufruf bräuchte einen Server oder einen
  API-Schlüssel im Browser (→ `ki.prompt`).
- **Mehrbenutzerbetrieb**: Die Simulation läuft vollständig im Browser; eigene
  Szenarien liegen im localStorage des Geräts (→ `speicher.szenarien`).

### Bekannte Vereinfachungen

- Die Verschlechterungsraten sind **didaktisch geschätzt, nicht aus Leitlinien
  abgeleitet**. Sie gehören von jemandem mit MANV-Erfahrung kalibriert. Alle
  Werte stehen als `verlauf` in `szenarien.ts` (→ `szenarien.liste`).
- Eine Maßnahme wirkt sofort zu Beginn ihrer Dauer, nicht am Ende. Ein Tourniquet
  stoppt die Blutung also, bevor die 60 Sekunden vergangen sind.
- SK IV und Verstorbene werden dem roten Zelt zugeordnet; ein eigener
  Betreuungsabschnitt fehlt (→ `abschnitte.zeltzuordnung`).
- Die Maßnahmen tragen `hinweis`-Texte, die nirgends angezeigt werden. Sie sind
  für einen späteren Übungsleitermodus aufgehoben.

---

## 3. Aufbau

```
src/
  domain/     Fachlogik – kennt kein React, vollständig testbar
  state/      useReducer-Store, Simulationsuhr, React-Context
  components/ Wiederverwendbare Bausteine der Oberfläche
  pages/      Die Ansichten; pages/patient/ die Ansichten je Abschnitt
  lib/        Formatierung und Auswertung
```

Die Trennung ist strikt: `domain/` enthält ausschließlich reine Funktionen. Ein
Simulationsschritt, eine Maßnahme oder eine Sichtung lassen sich ohne Oberfläche
ausführen – deshalb sind sie auch vollständig testbar und ließen sich später auf
einem Server ausführen.

### Datenfluss

```
Aktion (Klick)  →  dispatch  →  simulationReducer  →  neuer Zustand  →  Neuaufbau
                                      │
                                      ├─ zeitVergehen()      Uhr läuft für alle
                                      └─ domain/simulation   reine Rechenfunktionen
```

Parallel dazu tickt die Uhr (`state.uhr`) alle 500 ms und schickt `tick`-Aktionen.

---

## 4. Die drei Mechaniken

### Verschlechterung

Ein Patient hat eine Liste **Probleme**. Jedes unbehandelte Problem verändert die
Vitalwerte um feste Beträge pro Minute (→ `modell.problem`, `sim.tick`). Manche
Probleme setzen erst nach einer Latenzzeit ein. Aus den Vitalwerten leitet die
Simulation die Sichtungsbefunde ab (→ `sim.befunde`) – dadurch wird aus einer
gehfähigen SK-III-Patientin im Verlauf ein SK-I-Fall.

Intern wird mit Gleitkommazahlen gerechnet und erst bei der Anzeige gerundet.
Das ist kein Detail: mit Rundung nach jedem Tick verschwindet jede Änderung
(→ `sim.gleitkomma`).

### Zeit als Ressource

Jede Handlung kostet ihre Dauer, und zwar **für alle Patienten gleichzeitig**
(→ `state.zeit`). Die Rechnung, um die es geht:

| Handlung | Zeit |
| --- | --- |
| Vorsichtung | 20 s |
| Verlegung | 30 s |
| Untersuchung | 30 s |
| Blutstillung / Atemweg | 20–60 s |
| Intubation | 180 s |

Zehn Patienten vorzusichten kostet 3:20 – weniger als zwei Intubationen. Ein Test
hält das fest (→ `test.zeitkosten`).

### Versuchung

Der Maßnahmenkatalog ist in jeder Ansicht vollständig vorhanden. In der
Ersteinschätzung sind nur **x** und **A** aufgeklappt; B bis E sind einen Klick
entfernt (→ `ui.ersteinschaetzung`, `ui.massnahmenliste`). Nichts hindert daran,
sich festzuarbeiten – das Debriefing weist die Zeit jenseits der Sofortmaßnahmen
als Individualmedizin aus (→ `sim.individualmedizin`).

---

## 4a. Trainingsmodi und Übungsleitung

Die Startseite (→ `ui.start`) führt in einen von drei Modi (→ `modi.liste`):

| Modus | Stand | Gedacht für |
| --- | --- | --- |
| Digitale Übung | ausgebaut | Einsatzkräfte, vollständige Lage am Bildschirm |
| Führungskräfte | in Vorbereitung | OrgL, LNA, Zug- und Abschnittsführung |
| Realübung | in Vorbereitung | Übungen mit Mimen im Gelände |

Die beiden noch nicht gebauten Modi zeigen beim Antippen, was sie können sollen -
so bleibt die Ausbaurichtung sichtbar, ohne etwas vorzutäuschen.

Daneben steht die **Übungsleitung** (→ `ui.uebungsleitung`) mit drei Wegen zu
einem eigenen Szenario:

1. **Von Hand** anlegen und im Editor ausfüllen (→ `ui.szenarioeditor`).
2. **Eine Vorlage duplizieren** - ein mitgeliefertes Szenario als Kopie öffnen.
3. **Eine KI beauftragen**: Die App erzeugt aus dem echten Maßnahmenkatalog und
   den echten mSTaRT-Grenzwerten einen vollständigen Auftrag (→ `ki.prompt`).
   Dieser wird in eine beliebige KI eingefügt, das Ergebnis kommt als JSON
   zurück in den Import.

Alle drei Wege laufen durch dieselbe Prüfung (→ `szenario.pruefung`). **Fehler**
verhindern das Sichern - fehlende Felder, unbekannte Maßnahmen-IDs, Werte
ausserhalb der Grenzen, doppelte Patienten-IDs. **Warnungen** halten nicht auf;
dazu zählt insbesondere eine Referenzkategorie, die vom mSTaRT-Ergebnis abweicht:
Der Editor zeigt die berechnete Kategorie an und bietet an, sie zu übernehmen -
erzwingt sie aber nicht, weil eine Abweichung didaktisch gewollt sein kann.

Eigene Szenarien liegen im localStorage und erscheinen in der digitalen Übung
neben den mitgelieferten. Zum Weitergeben dient der JSON-Export.

---

## 5. Ablauf der Einsatzabschnitte

```
Schadensstelle ──► Eingangssichtung ──┬──► Rotes Zelt   ──┐
                                      ├──► Gelbes Zelt  ──┼──► Ausgangssichtung ──► Abtransport
                                      └──► Grünes Zelt  ──┘
                                              ▲   │
                                              └───┘  Verlegung zwischen Zelten
```

Erlaubte Wege stehen an einer Stelle (→ `abschnitte.wege`); der Reducer weist
alles andere ab. Jeder Abschnitt hat seine eigene Ansicht (→ `ui.patientseite`).

---

## 6. Anker im Code

Alle wichtigen Stellen sind im Quelltext mit `@anker <id>` markiert. Die folgende
Tabelle wird von `npm run anker` aus dem Code erzeugt und ist deshalb nie
veraltet.

**So findest du eine Stelle:**

```bash
grep -rn "@anker sim.tick" src/     # oder in der IDE nach "@anker" suchen
```

**So arbeiten wir damit:** Nenne mir eine Anker-ID statt einer Dateizeile –
„ändere die Zeitkosten bei `sim.zeitkosten`" ist eindeutig und bleibt gültig,
auch wenn sich Zeilennummern verschieben.

<!-- ANKER:START -->

_73 Anker, erzeugt von `npm run anker` – nicht von Hand ändern._

#### abschnitte

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `abschnitte.dauer` | [`src/domain/abschnitte.ts:142`](src/domain/abschnitte.ts#L142) | Zeitkosten einer Verlegung |
| `abschnitte.liste` | [`src/domain/abschnitte.ts:22`](src/domain/abschnitte.ts#L22) | Namen und Aufgaben der Einsatzabschnitte |
| `abschnitte.wege` | [`src/domain/abschnitte.ts:81`](src/domain/abschnitte.ts#L81) | Erlaubte Verlegungen - hier ändert man den Ablauf |
| `abschnitte.zeltzuordnung` | [`src/domain/abschnitte.ts:103`](src/domain/abschnitte.ts#L103) | Welche Kategorie in welches Zelt gehört |

#### auswertung

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `auswertung.debriefing` | [`src/lib/auswertung.ts:63`](src/lib/auswertung.ts#L63) | Eine Auswertungszeile je Patient |
| `auswertung.kennzahlen` | [`src/lib/auswertung.ts:97`](src/lib/auswertung.ts#L97) | Die Zahlen über der Debriefing-Tabelle |

#### format

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `format.vitalgrenzen` | [`src/lib/format.ts:26`](src/lib/format.ts#L26) | Norm- und Kritischbereiche für die Farbgebung der Messwerte |

#### ki

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `ki.prompt` | [`src/lib/kiPrompt.ts:5`](src/lib/kiPrompt.ts#L5) | Erzeugt den Auftrag für eine KI, ein Szenario zu bauen |

#### massnahmen

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `massnahmen.katalog` | [`src/domain/massnahmen.ts:5`](src/domain/massnahmen.ts#L5) | Alle Maßnahmen mit Dauer und Wirkung - hier neue ergänzen |
| `massnahmen.schnell` | [`src/domain/massnahmen.ts:152`](src/domain/massnahmen.ts#L152) | Auswahl für die Ausgangssichtung (bis 60 Sekunden) |
| `massnahmen.xabcde` | [`src/domain/massnahmen.ts:138`](src/domain/massnahmen.ts#L138) | Gruppierung und Reihenfolge der Maßnahmengruppen |

#### modell

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `modell.abschnitte` | [`src/domain/types.ts:138`](src/domain/types.ts#L138) | Die Stationen, die ein Patient durchläuft |
| `modell.patient` | [`src/domain/types.ts:204`](src/domain/types.ts#L204) | Alles, was sich an einem Patienten im Einsatz ändert |
| `modell.patientvorlage` | [`src/domain/types.ts:180`](src/domain/types.ts#L180) | Felder, die ein neuer Szenario-Patient braucht |
| `modell.problem` | [`src/domain/types.ts:123`](src/domain/types.ts#L123) | Herzstück der Dynamik: Problem -> Vitalwertänderung pro Minute |
| `modell.sichtungskategorien` | [`src/domain/types.ts:12`](src/domain/types.ts#L12) | Die vier Sichtungskategorien und EX mit Farbe und Bedeutung |
| `modell.vitalwerte` | [`src/domain/types.ts:58`](src/domain/types.ts#L58) | Welche sechs Messwerte die Simulation führt |

#### modi

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `modi.liste` | [`src/domain/modi.ts:2`](src/domain/modi.ts#L2) | Die Trainingsmodi und ihr Ausbaustand |

#### sichtung

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `sichtung.bewertung` | [`src/domain/triage.ts:126`](src/domain/triage.ts#L126) | Über- oder unterschätzt - Grundlage der Debriefing-Spalte |
| `sichtung.grenzwerte` | [`src/domain/triage.ts:25`](src/domain/triage.ts#L25) | Zahlen, an denen die Sichtung kippt (AF, RR, GCS, Rekapzeit) |
| `sichtung.mstart` | [`src/domain/triage.ts:45`](src/domain/triage.ts#L45) | Der mSTaRT-Algorithmus als Entscheidungskette |

#### sim

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `sim.befunde` | [`src/domain/simulation.ts:121`](src/domain/simulation.ts#L121) | Gehfähigkeit, Atmung und Reaktion folgen den Vitalwerten |
| `sim.gleitkomma` | [`src/domain/simulation.ts:33`](src/domain/simulation.ts#L33) | Warum intern nicht gerundet wird - sonst verschwindet jede Änderung |
| `sim.individualmedizin` | [`src/domain/simulation.ts:287`](src/domain/simulation.ts#L287) | Maß für Individualmedizin - Zeit jenseits der Sofortmaßnahmen |
| `sim.massnahme` | [`src/domain/simulation.ts:180`](src/domain/simulation.ts#L180) | Wirkung einer Maßnahme auf Probleme, Vitalwerte und Sichtungsbefunde |
| `sim.startzustand` | [`src/domain/simulation.ts:49`](src/domain/simulation.ts#L49) | Womit ein Patient in den Einsatz startet |
| `sim.tick` | [`src/domain/simulation.ts:96`](src/domain/simulation.ts#L96) | Ein Simulationsschritt: Probleme wirken auf die Vitalwerte |
| `sim.tod` | [`src/domain/simulation.ts:85`](src/domain/simulation.ts#L85) | Ab welchen Werten ein Patient verstirbt |
| `sim.verlegung` | [`src/domain/simulation.ts:258`](src/domain/simulation.ts#L258) | Ortswechsel eines Patienten; Abtransport friert den Zustand ein |
| `sim.zeitkosten` | [`src/domain/simulation.ts:147`](src/domain/simulation.ts#L147) | Stellschrauben für Sichtungs- und Untersuchungsdauer |
| `sim.zeitraum` | [`src/domain/simulation.ts:155`](src/domain/simulation.ts#L155) | Längere Zeitsprünge in kleinen Schritten - für Maßnahmendauern |

#### speicher

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `speicher.szenarien` | [`src/lib/speicher.ts:5`](src/lib/speicher.ts#L5) | Eigene Szenarien im Browser sichern |

#### state

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `state.aktionen` | [`src/state/reducer.ts:61`](src/state/reducer.ts#L61) | Alles, was der Übende auslösen kann |
| `state.phase` | [`src/state/reducer.ts:23`](src/state/reducer.ts#L23) | Die Hauptzustände der Anwendung |
| `state.reducer` | [`src/state/reducer.ts:114`](src/state/reducer.ts#L114) | Wie Aktionen den Zustand verändern, inklusive Zeitkosten |
| `state.uhr` | [`src/state/SimulationProvider.tsx:9`](src/state/SimulationProvider.tsx#L9) | Der Taktgeber der laufenden Simulation |
| `state.zeit` | [`src/state/reducer.ts:81`](src/state/reducer.ts#L81) | Kernmechanik: jede Handlung lässt die Uhr für alle laufen |
| `state.zustand` | [`src/state/reducer.ts:26`](src/state/reducer.ts#L26) | Der gesamte Zustand einer laufenden Übung |

#### stil

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `stil.editor` | [`src/index.css:313`](src/index.css#L313) | Formularfelder und Prueflisten des Szenario-Editors |
| `stil.hover` | [`src/index.css:1489`](src/index.css#L1489) | Hover nur mit echtem Zeiger - sonst klebt der Zustand |
| `stil.modi` | [`src/index.css:240`](src/index.css#L240) | Karten der Trainingsmodus-Auswahl |
| `stil.raster` | [`src/index.css:943`](src/index.css#L943) | Zweispaltiges Raster der Patientenansichten ab 900 px |
| `stil.sk-farbe` | [`src/index.css:128`](src/index.css#L128) | Kategoriefarbe als Variable - loest eine Spezifitaetsfalle |
| `stil.telefon` | [`src/index.css:1596`](src/index.css#L1596) | Anpassungen unter 760 px, inklusive Tabellenumbruch |
| `stil.tokens` | [`src/index.css:6`](src/index.css#L6) | Farben, Radien und Schatten der gesamten Oberfläche |
| `stil.touch` | [`src/index.css:1733`](src/index.css#L1733) | Mindestgroesse der Tippziele auf Touch-Geraeten |

#### szenarien

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `szenarien.busunfall` | [`src/domain/szenarien.ts:11`](src/domain/szenarien.ts#L11) | Zehn Patienten als Vorlage für eigene Szenarien |
| `szenarien.liste` | [`src/domain/szenarien.ts:4`](src/domain/szenarien.ts#L4) | Die Übungsszenarien - hier neue Lagen und Patienten anlegen |

#### szenario

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `szenario.pruefung` | [`src/domain/szenarioPruefung.ts:15`](src/domain/szenarioPruefung.ts#L15) | Prüft ein Szenario auf Vollständigkeit und Stimmigkeit |

#### test

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `test.abschnitte` | [`src/state/reducer.test.ts:147`](src/state/reducer.test.ts#L147) | Der Weg eines Patienten und die erlaubten Verlegungen |
| `test.mstart` | [`src/domain/triage.test.ts:39`](src/domain/triage.test.ts#L39) | Jeder Zweig des Sichtungsalgorithmus inklusive Grenzwerte |
| `test.szenariodaten` | [`src/domain/simulation.test.ts:26`](src/domain/simulation.test.ts#L26) | Prueft, dass jede Szenario-Vorlage in sich stimmig ist |
| `test.szenariopruefung` | [`src/domain/szenarioPruefung.test.ts:9`](src/domain/szenarioPruefung.test.ts#L9) | Die Prüfung, durch die jedes importierte Szenario muss |
| `test.zeitkosten` | [`src/state/reducer.test.ts:22`](src/state/reducer.test.ts#L22) | Belegt, dass jede Handlung die Uhr fuer alle weiterlaufen laesst |
| `test.zeitverlauf` | [`src/domain/simulation.test.ts:71`](src/domain/simulation.test.ts#L71) | Verschlechterung, Todesfaelle und Latenzzeiten |

#### ui

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `ui.abschnittsleiste` | [`src/components/Abschnittsleiste.tsx:5`](src/components/Abschnittsleiste.tsx#L5) | Reiter mit der Belegung je Abschnitt |
| `ui.app` | [`src/App.tsx:8`](src/App.tsx#L8) | Weiche zwischen den Hauptzustaenden der Anwendung |
| `ui.ausgangssichtung` | [`src/pages/patient/Ausgangssichtung.tsx:12`](src/pages/patient/Ausgangssichtung.tsx#L12) | Übergabe, schnelle Maßnahmen, Abschlusssichtung |
| `ui.debriefing` | [`src/pages/DebriefingSeite.tsx:30`](src/pages/DebriefingSeite.tsx#L30) | Auswertung nach dem Einsatz |
| `ui.eingangssichtung` | [`src/pages/patient/Eingangssichtung.tsx:10`](src/pages/patient/Eingangssichtung.tsx#L10) | Sichten und einem Zelt zuweisen |
| `ui.einsatzseite` | [`src/pages/EinsatzSeite.tsx:8`](src/pages/EinsatzSeite.tsx#L8) | Abschnittsliste oder Patientenseite |
| `ui.ersteindruck` | [`src/components/Ersteindruck.tsx:11`](src/components/Ersteindruck.tsx#L11) | Die fünf Befunde der Vorsichtung, ohne Messwerte |
| `ui.ersteinschaetzung` | [`src/pages/patient/Ersteinschaetzung.tsx:19`](src/pages/patient/Ersteinschaetzung.tsx#L19) | Der schnelle Weg - und die Versuchung daneben |
| `ui.massnahmenliste` | [`src/components/Massnahmenliste.tsx:13`](src/components/Massnahmenliste.tsx#L13) | Das einklappbare xABCDE-Akkordeon |
| `ui.patienteditor` | [`src/pages/uebungsleitung/PatientEditor.tsx:30`](src/pages/uebungsleitung/PatientEditor.tsx#L30) | Formular für einen Szenario-Patienten samt Problemen |
| `ui.patientseite` | [`src/pages/PatientSeite.tsx:13`](src/pages/PatientSeite.tsx#L13) | Weiche: welcher Abschnitt zeigt welche Ansicht |
| `ui.setup` | [`src/pages/SetupSeite.tsx:5`](src/pages/SetupSeite.tsx#L5) | Szenarioauswahl der digitalen Übung |
| `ui.start` | [`src/pages/StartSeite.tsx:5`](src/pages/StartSeite.tsx#L5) | Auswahl des Trainingsmodus und Einstieg in die Übungsleitung |
| `ui.szenarioeditor` | [`src/pages/uebungsleitung/SzenarioEditor.tsx:15`](src/pages/uebungsleitung/SzenarioEditor.tsx#L15) | Formular für ein ganzes Szenario mit laufender Prüfung |
| `ui.uebungsleitung` | [`src/pages/UebungsleitungSeite.tsx:13`](src/pages/UebungsleitungSeite.tsx#L13) | Szenarien anlegen, prüfen, ein- und ausgeben |
| `ui.verlegung` | [`src/components/Verlegung.tsx:6`](src/components/Verlegung.tsx#L6) | Schaltflächen zum Verlegen, passendes Zelt hervorgehoben |
| `ui.versorgung` | [`src/pages/patient/Versorgung.tsx:24`](src/pages/patient/Versorgung.tsx#L24) | Diagnostik und Behandlung - in den Zelten und als zweite Stufe |

#### vorlagen

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `vorlagen.neu` | [`src/lib/vorlagen.ts:4`](src/lib/vorlagen.ts#L4) | Startpunkte für neue Szenarien, Patienten und Probleme |

<!-- ANKER:END -->

---

## 7. Konventionen

- **Sprache**: Bezeichner und Kommentare auf Deutsch, weil die Fachbegriffe es
  sind (`sichtePatient`, `Vitalwerte`, `erwarteteSK`). Bezeichner bleiben ASCII
  (`gehfaehig`, `massnahme`), sichtbare Texte tragen Umlaute.
- **Domänenlogik ist rein**: keine Seiteneffekte, kein React, kein `Date.now()`.
  Die Zeit kommt immer als Parameter herein.
- **Zustand ist unveränderlich**: Der Reducer gibt neue Objekte zurück.
- **Neue Szenarien sind Daten**, kein Code (→ `szenarien.liste`). Ein Test prüft
  automatisch, dass die hinterlegte Referenzkategorie zum mSTaRT-Ergebnis passt.
- **CSS**: eine Datei, Klassennamen auf Deutsch, Farben über Variablen. Vorsicht
  bei Spezifitäten – `button:hover` schlägt eine einzelne Klasse
  (→ `stil.sk-farbe`).

## 8. Befehle

```bash
npm run dev            Entwicklungsserver
npm run test           62 Tests
npm run lint           oxlint
npm run typecheck      TypeScript
npm run build          Produktionsbuild
npm run build:single   dist/dps.html – eine Datei, ohne Server lauffähig
npm run anker          Ankertabelle in dieser Datei neu erzeugen
npm run anker:pruefen  prüft, ob die Tabelle aktuell ist
```

## 9. Woran ich mich beim Weiterbauen halte

- Vor jeder Änderung: `npm run test`, danach erneut.
- Änderungen an der Fachlogik bekommen einen Test, der das gewünschte Verhalten
  festhält – die bestehenden Tests haben bereits zwei echte Fehler gefangen
  (Rundungsverlust pro Tick, Kategorie­wechsel der Blutstillung).
- Nach Änderungen an der Oberfläche prüfe ich Desktop **und** Telefon im Browser,
  nicht nur den Build.
- Neue Anker bekommen eine ID nach dem Muster `bereich.sache` und eine
  Beschreibung in einem Satz; danach `npm run anker`.
