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
| Baukasten | Erzeugt Szenarien kostenfrei im Browser, ohne Schlüssel und ohne Netz; Verläufe werden aus der Zielminute zurückgerechnet, die Saat macht jede Lage wiederholbar |
| KI-Unterstützung | Erzeugt Szenarien direkt aus der App: Auftrag ans Modell, an ein JSON-Schema gebunden, Ergebnis geprüft und durchgespielt, Befunde gehen automatisch zur Nachbesserung zurück. Der Auftrag zum Kopieren bleibt als Weg ohne Zugang |
| Probelauf | Jedes Szenario wird über 30 Minuten unbehandelt und bestversorgt durchgespielt; der Editor zeigt je Patient den Todeszeitpunkt |
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

84 automatische Tests (Vitest) über Domänenlogik, Zustandsverwaltung, Szenarioprüfung,
Probelauf und Baukasten.

### Bewusst noch nicht gebaut

- **Modus Führungskräfte**: Auswahl und Beschreibung stehen, der Ablauf fehlt.
- **Modus Realübung**: Auswahl und Beschreibung stehen, der Ablauf fehlt.
- **Kapazitäten**: Zelte und Transportmittel sind unbegrenzt. Solange das so ist,
  ist die Verteilung auf die Zelte eine Formalität statt einer Entscheidung.
- **Personal**: Es gibt genau einen handelnden Übenden ohne eigenes Zeitbudget.
- **Störgrößen zur Laufzeit**: Die Übungsleitung baut Szenarien vorab, kann aber
  in eine laufende Übung nicht eingreifen.
- **Server für den KI-Aufruf**: Die App spricht direkt aus dem Browser mit der
  API und braucht dafür den API-Schlüssel der Übungsleitung auf dem Gerät
  (→ `ki.zugang`). Für eine gemeinsam genutzte Installation gehört ein eigener
  Dienst davor; das Feld "Adresse" ist dafür schon vorgesehen.
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
3. **Erzeugen lassen** (→ `ui.szenarioquelle`) - auf zwei Wegen:
   - **Baukasten** (→ `ui.baukasten`): kostenfrei, ohne Zugang, ohne Netz.
   - **Sprachmodell** (→ `ui.kigenerator`): für eine frei beschriebene Lage,
     die der Baukasten nicht kennt. Braucht einen API-Schlüssel.

Alle drei Wege laufen durch dieselbe Prüfung (→ `szenario.pruefung`). **Fehler**
verhindern das Sichern - fehlende Felder, unbekannte Maßnahmen-IDs, Werte
ausserhalb der Grenzen, doppelte Patienten-IDs. **Warnungen** halten nicht auf;
dazu zählt insbesondere eine Referenzkategorie, die vom mSTaRT-Ergebnis abweicht:
Der Editor zeigt die berechnete Kategorie an und bietet an, sie zu übernehmen -
erzwingt sie aber nicht, weil eine Abweichung didaktisch gewollt sein kann.

Eigene Szenarien liegen im localStorage und erscheinen in der digitalen Übung
neben den mitgelieferten. Zum Weitergeben dient der JSON-Export.

### Der Probelauf

Die formale Prüfung sagt nur, ob ein Szenario heil ist - nicht, ob es taugt.
Deshalb spielt der **Probelauf** (→ `szenario.dynamik`) jeden Patienten über 30
Minuten zweimal durch: einmal ohne jede Hilfe, einmal mit allen passenden
Maßnahmen sofort. Aus den beiden Todeszeitpunkten fällt ab, ob die Lage trägt:

| Kategorie | Erwartung unbehandelt |
| --- | --- |
| SK I | verstirbt zwischen Minute 4 und 25 |
| SK II | hält mindestens 10 Minuten durch |
| SK III | stabil, oder kippt frühestens nach 15 Minuten (Falle für die Nachsichtung) |
| SK IV | verstirbt auch bestversorgt |

Dazu kommen zwei Fragen an die Lage als Ganzes: Gibt es überhaupt einen SK-I-
Patienten, und ist der rote Anteil realistisch? Der Editor zeigt das Ergebnis
als Tabelle; ein Test pinnt die mitgelieferten Szenarien darauf fest.

### Der Baukasten - kostenfrei erzeugen

Der Baukasten (→ `generator.baukasten`) braucht kein Modell, keinen Schlüssel und
kein Netz. Er läuft deshalb überall, wo die App läuft - auch in der Einzeldatei
ohne Internet.

Sein Kniff ist die **Richtung der Rechnung** (→ `generator.zielminute`). Ein
Sprachmodell muss raten, welche Verlaufswerte einen Patienten rechtzeitig sterben
lassen - genau dafür gibt es die Nachbesserungsschleife. Der Baukasten dreht das
um: Die Zielminute ist die Vorgabe, die Änderung pro Minute folgt daraus.

```
Zielminute 12 min, Startdruck 105 mmHg, Todesschwelle 30 mmHg
                    ↓
      Rate = -(105 - 30) / (12 - 0.25) = -6.38 mmHg/min
```

Damit besteht ein Szenario aus dem Baukasten den Probelauf von vornherein - es
gibt nichts nachzubessern. Ebenso wird die Referenzkategorie nicht behauptet,
sondern nach dem Bauen mit `sichtungNachMstart` **gerechnet**; sie kann also nie
abweichen.

Gebaut wird aus einem Vorrat an **Verletzungsmustern** (→ `generator.muster`),
die je Lage unterschiedlich zusammengestellt sind - fünf Lagen von Verkehrsunfall
bis Gebäudeeinsturz. Ab sechs Betroffenen enthält jede Lage genau eine Falle für
die Nachsichtung: einen gehfähigen Patienten, der später doch kippt.

Die **Saat** macht das Ergebnis wiederholbar: gleiche Zahl, gleiche Lage. Eine
Übung lässt sich damit an einem anderen Tag oder auf einem anderen Gerät exakt
wiederholen, ohne eine Datei weiterzugeben.

Ein Test baut 360 Szenarien über alle Lagen, Größen und Saaten und verlangt von
jedem einzelnen: kein Fehler, keine Warnung, kein Befund im Probelauf.

### KI-Erzeugung im Detail

Der eigentliche Gewinn ist die Schleife, nicht der Aufruf (→ `ki.client`):

```
Auftrag (ki.prompt) ──► Modell, an JSON-Schema gebunden (ki.schema)
                              │
                              ▼
                   pruefeSzenario + pruefeDynamik
                              │
             ┌────────────────┴────────────────┐
        alles stimmig                    Befunde offen
             │                                 │
             ▼                                 ▼
        in den Editor          Befunde zurück ans Modell (ki.korrektur)
                                    max. 3 Durchgänge, Abbruch sobald
                                    eine Nachbesserung nichts mehr bringt
```

Das Schema (→ `ki.schema`) wird aus dem echten Maßnahmenkatalog gebaut; erfundene
Maßnahmen-IDs sind damit ausgeschlossen. Die Antwort wird gestreamt, der
Fortschritt läuft als Protokoll mit.

**Zum Ausprobieren des eigenen Schlüssels** gibt es einen echten Durchlauf gegen
die API (→ `ki.livetest`). Er ist im normalen Testlauf übersprungen und läuft nur
mit gesetztem Schlüssel:

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run ki:test
```

Er gibt Titel, Lagemeldung und den vollständigen Probelauf aus - damit lässt sich
ohne Browser beurteilen, ob die Verläufe taugen.

Der API-Schlüssel liegt im localStorage des Geräts (→ `ki.zugang`) - eine
bewusste Abwägung für ein Werkzeug, das die Übungsleitung selbst betreibt. Wer
die App zentral hostet, trägt stattdessen die Adresse eines eigenen Dienstes ein
und lässt das Schlüsselfeld leer. Der **Auftrag zum Kopieren** bleibt daneben
bestehen: für Geräte ohne Zugang und für den Betrieb ohne Netz.

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

_86 Anker, erzeugt von `npm run anker` – nicht von Hand ändern._

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

#### generator

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `generator.baukasten` | [`src/domain/szenarioGenerator.ts:14`](src/domain/szenarioGenerator.ts#L14) | Szenarien ohne Modell, ohne Schlüssel, ohne Netz |
| `generator.muster` | [`src/domain/szenarioGenerator.ts:61`](src/domain/szenarioGenerator.ts#L61) | Der Vorrat an Verletzungsmustern - hier erweitern |
| `generator.zielminute` | [`src/domain/szenarioGenerator.ts:405`](src/domain/szenarioGenerator.ts#L405) | Aus der gewünschten Todesminute wird die Verlaufsrate |

#### ki

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `ki.client` | [`src/lib/kiClient.ts:12`](src/lib/kiClient.ts#L12) | Szenario direkt erzeugen - mit Prüfschleife statt Copy-und-Paste |
| `ki.korrektur` | [`src/lib/kiPrompt.ts:102`](src/lib/kiPrompt.ts#L102) | Rückmeldung der Prüfung an das Modell |
| `ki.livetest` | [`src/lib/kiClient.live.test.ts:8`](src/lib/kiClient.live.test.ts#L8) | Echter Durchlauf gegen die API - nur mit Schlüssel |
| `ki.normalisieren` | [`src/lib/kiSchema.ts:116`](src/lib/kiSchema.ts#L116) | Räumt die Modellantwort auf, bevor sie geprüft wird |
| `ki.prompt` | [`src/lib/kiPrompt.ts:7`](src/lib/kiPrompt.ts#L7) | Der Auftrag an die KI - für den direkten Aufruf und zum Kopieren |
| `ki.schema` | [`src/lib/kiSchema.ts:6`](src/lib/kiSchema.ts#L6) | Das JSON-Schema, an das die KI gebunden wird |
| `ki.zugang` | [`src/lib/kiZugang.ts:2`](src/lib/kiZugang.ts#L2) | Wo der API-Schlüssel liegt - und was das bedeutet |

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
| `stil.hover` | [`src/index.css:1618`](src/index.css#L1618) | Hover nur mit echtem Zeiger - sonst klebt der Zustand |
| `stil.modi` | [`src/index.css:240`](src/index.css#L240) | Karten der Trainingsmodus-Auswahl |
| `stil.raster` | [`src/index.css:1072`](src/index.css#L1072) | Zweispaltiges Raster der Patientenansichten ab 900 px |
| `stil.sk-farbe` | [`src/index.css:128`](src/index.css#L128) | Kategoriefarbe als Variable - loest eine Spezifitaetsfalle |
| `stil.telefon` | [`src/index.css:1725`](src/index.css#L1725) | Anpassungen unter 760 px, inklusive Tabellenumbruch |
| `stil.tokens` | [`src/index.css:6`](src/index.css#L6) | Farben, Radien und Schatten der gesamten Oberfläche |
| `stil.touch` | [`src/index.css:1862`](src/index.css#L1862) | Mindestgroesse der Tippziele auf Touch-Geraeten |

#### szenarien

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `szenarien.busunfall` | [`src/domain/szenarien.ts:11`](src/domain/szenarien.ts#L11) | Zehn Patienten als Vorlage für eigene Szenarien |
| `szenarien.liste` | [`src/domain/szenarien.ts:4`](src/domain/szenarien.ts#L4) | Die Übungsszenarien - hier neue Lagen und Patienten anlegen |

#### szenario

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `szenario.dynamik` | [`src/domain/szenarioDynamik.ts:6`](src/domain/szenarioDynamik.ts#L6) | Spielt ein Szenario durch, bevor es jemand übt |
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
| `ui.baukasten` | [`src/pages/uebungsleitung/BaukastenGenerator.tsx:7`](src/pages/uebungsleitung/BaukastenGenerator.tsx#L7) | Kostenfrei erzeugen - ohne Schlüssel, ohne Netz |
| `ui.debriefing` | [`src/pages/DebriefingSeite.tsx:30`](src/pages/DebriefingSeite.tsx#L30) | Auswertung nach dem Einsatz |
| `ui.eingangssichtung` | [`src/pages/patient/Eingangssichtung.tsx:10`](src/pages/patient/Eingangssichtung.tsx#L10) | Sichten und einem Zelt zuweisen |
| `ui.einsatzseite` | [`src/pages/EinsatzSeite.tsx:8`](src/pages/EinsatzSeite.tsx#L8) | Abschnittsliste oder Patientenseite |
| `ui.ersteindruck` | [`src/components/Ersteindruck.tsx:11`](src/components/Ersteindruck.tsx#L11) | Die fünf Befunde der Vorsichtung, ohne Messwerte |
| `ui.ersteinschaetzung` | [`src/pages/patient/Ersteinschaetzung.tsx:19`](src/pages/patient/Ersteinschaetzung.tsx#L19) | Der schnelle Weg - und die Versuchung daneben |
| `ui.kigenerator` | [`src/pages/uebungsleitung/KiGenerator.tsx:16`](src/pages/uebungsleitung/KiGenerator.tsx#L16) | Vom Modell erzeugen lassen - Zugang, Lauf, Befunde |
| `ui.massnahmenliste` | [`src/components/Massnahmenliste.tsx:13`](src/components/Massnahmenliste.tsx#L13) | Das einklappbare xABCDE-Akkordeon |
| `ui.patienteditor` | [`src/pages/uebungsleitung/PatientEditor.tsx:30`](src/pages/uebungsleitung/PatientEditor.tsx#L30) | Formular für einen Szenario-Patienten samt Problemen |
| `ui.patientseite` | [`src/pages/PatientSeite.tsx:13`](src/pages/PatientSeite.tsx#L13) | Weiche: welcher Abschnitt zeigt welche Ansicht |
| `ui.setup` | [`src/pages/SetupSeite.tsx:5`](src/pages/SetupSeite.tsx#L5) | Szenarioauswahl der digitalen Übung |
| `ui.start` | [`src/pages/StartSeite.tsx:5`](src/pages/StartSeite.tsx#L5) | Auswahl des Trainingsmodus und Einstieg in die Übungsleitung |
| `ui.szenarioeditor` | [`src/pages/uebungsleitung/SzenarioEditor.tsx:16`](src/pages/uebungsleitung/SzenarioEditor.tsx#L16) | Formular für ein ganzes Szenario mit laufender Prüfung |
| `ui.szenarioquelle` | [`src/pages/uebungsleitung/SzenarioQuelle.tsx:6`](src/pages/uebungsleitung/SzenarioQuelle.tsx#L6) | Zwei Wege zu einer neuen Lage - kostenfrei oder per Modell |
| `ui.uebungsleitung` | [`src/pages/UebungsleitungSeite.tsx:14`](src/pages/UebungsleitungSeite.tsx#L14) | Szenarien anlegen, prüfen, ein- und ausgeben |
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
npm run test           84 Tests
npm run ki:test        echter Durchlauf gegen die API (braucht ANTHROPIC_API_KEY)
npm run lint           oxlint
npm run typecheck      TypeScript
npm run build          Produktionsbuild
npm run build:single   dist/dps.html – eine Datei, ohne Server lauffähig
npm run anker          Ankertabelle in dieser Datei neu erzeugen
npm run anker:pruefen  prüft, ob die Tabelle aktuell ist
```

## 8a. Ausblick: was ein Server ändern würde

Heute läuft alles im Browser - bewusst, weil die App damit ohne Betreuung
weitergegeben werden kann. Sobald sie in den regelmäßigen Betrieb geht, lohnt
sich ein eigener Server. Drei Stellen sind darauf schon vorbereitet:

| Vorbereitet | Wo | Was dann passiert |
| --- | --- | --- |
| Eigene API-Adresse | `ki.zugang`, Feld "Adresse" | Der Schlüssel liegt serverseitig, das Schlüsselfeld bleibt leer. Die Sicherheitsabwägung entfällt |
| Reine Fachlogik | `domain/` kennt kein React | Simulation, Prüfung und Probelauf laufen unverändert auf dem Server |
| Reine Erzeugung | `ki.client`, `generator.baukasten` | Die Prüfschleife wandert hinter einen Endpunkt, der Aufruf bleibt derselbe |

Was ein Server darüber hinaus erst möglich macht:

- **Mehrere Übende auf einer Lage.** Der eigentliche MANV ist Teamarbeit; heute
  gibt es genau einen Handelnden. Das ist die größte Lücke - größer als alles,
  was die KI betrifft.
- **Eingriff zur Laufzeit.** Die Übungsleitung könnte Störgrößen einspielen,
  statt die Lage nur vorab zu bauen.
- **Szenarien auf Vorrat.** Statt bei jedem Aufruf zu erzeugen, lässt sich ein
  geprüfter Vorrat vorhalten - kostenlos im Gebrauch und ohne Wartezeit.
- **Prompt-Caching.** Der Regeltext ist bei jedem Auftrag identisch; zentral
  aufgerufen wird er zwischengespeichert und deutlich billiger.

Der Baukasten wird dadurch nicht überflüssig: Er bleibt der Weg für den Betrieb
ohne Netz und die Rückfallebene, wenn der Dienst nicht erreichbar ist.

---

## 9. Woran ich mich beim Weiterbauen halte

- Vor jeder Änderung: `npm run test`, danach erneut.
- Änderungen an der Fachlogik bekommen einen Test, der das gewünschte Verhalten
  festhält – die bestehenden Tests haben bereits zwei echte Fehler gefangen
  (Rundungsverlust pro Tick, Kategorie­wechsel der Blutstillung).
- Nach Änderungen an der Oberfläche prüfe ich Desktop **und** Telefon im Browser,
  nicht nur den Build.
- Neue Anker bekommen eine ID nach dem Muster `bereich.sache` und eine
  Beschreibung in einem Satz; danach `npm run anker`.
