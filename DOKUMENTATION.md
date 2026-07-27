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
| Alleinspiel | In der digitalen Übung vor dem Start wählbar: eine Person, dafür rund 25 % langsamere Verschlechterung - auch für die volle MANV-Lage |
| Einzelfälle | Vier Szenarien mit genau einer Person und klarem Schwerpunkt; steigen direkt in die Patientenansicht ein, ohne Behandlungsplatz |
| Übungsleitung | Eigene Szenarien anlegen, bearbeiten, duplizieren, als JSON aus- und einlesen; Prüfung gegen dieselben Regeln wie die mitgelieferten |
| Baukasten | Erzeugt Szenarien kostenfrei im Browser, ohne Schlüssel und ohne Netz; Verläufe werden aus der Zielminute zurückgerechnet, die Saat macht jede Lage wiederholbar |
| KI-Unterstützung | Erzeugt Szenarien direkt aus der App: Auftrag ans Modell, an ein JSON-Schema gebunden, Ergebnis geprüft und durchgespielt, Befunde gehen automatisch zur Nachbesserung zurück. Der Auftrag zum Kopieren bleibt als Weg ohne Zugang |
| Probelauf | Jedes Szenario wird über 30 Minuten unbehandelt und bestversorgt durchgespielt; der Editor zeigt je Patient den Todeszeitpunkt |
| Simulationskern | Vitalwerte verändern sich pro Minute durch unbehandelte Probleme, Latenzzeiten, Todeskriterien, abgeleitete Sichtungsbefunde |
| mSTaRT | Vollständig mit nachvollziehbarer Entscheidungskette; alle Zweige getestet |
| Zeitmechanik | Jede Handlung (Sichtung, Untersuchung, Maßnahme, Verlegung) lässt die Uhr für alle Patienten weiterlaufen |
| Maßnahmen | 54 Maßnahmen nach xABCDE auf Grundlage der SAA/BPR Kreis Steinfurt 2026: Basismaßnahmen, invasive Maßnahmen und 26 Medikamente mit Indikation und Dosierung; Atemwegssicherung wirkt erst nach Mundraumkontrolle, Guedel- und Wendl-Tubus nur beim Bewusstlosen |
| Diagnostik | 13 Einzeluntersuchungen nach RD-Standard; jede deckt nur ihren Befund auf und kostet ihre eigene Zeit; der verlegte Atemweg wird durch Mundraumkontrolle oder Bodycheck entdeckt |
| Monitor | Angeschlossen zeigt er HF, SpO₂, Atemfrequenz und Blutdruck (NIBP) fortlaufend und alarmiert gestaffelt: gelb (mittel) bei auffälligem, rot (hoch) bei kritischem Wert - mit unterschiedlichem Tonmuster; der Ton ist nur im selben Einsatzabschnitt zu hören |
| Einsatzabschnitte | Schadensstelle → Eingangssichtung → drei Zelte → Ausgangssichtung → Abtransport, mit eigener Ansicht je Abschnitt |
| Sichtung auf der Anhängekarte | Vier Sichtungszeilen mit I–IV/EX und Uhrzeit; vor jeder Verlegung Pflicht, endgültige Sichtung jederzeit möglich |
| Debriefing | Kennzahlen, Vergleich gegen die Referenz, Ausweis der Individualmedizin |
| Szenarien | Zwei Lagen mit zusammen 16 Patienten |
| Bedienung | Für Smartphone ausgelegt: Tippziele ≥ 44 px, kein Querscrollen, Tabellen brechen zu Karten um |
| Weitergabe | `npm run build:single` erzeugt eine einzelne HTML-Datei ohne Server |

138 automatische Tests (Vitest) über Domänenlogik, Zustandsverwaltung, Szenarioprüfung,
Probelauf, Diagnostik, Monitor und Baukasten.

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
- Die Wirkung einer Maßnahme hängt nicht von der Indikation ab: Wer Atropin bei
  einer Blutung gibt, verliert nur Zeit, bekommt aber keine Rückmeldung, dass es
  fachlich falsch war. Das Debriefing zählt es als Individualmedizin.
- Kontraindikationen, Dosisgrenzen und Wechselwirkungen sind nicht abgebildet.
  Die SAA nennen sie ausführlich; für die MANV-Übung stand die Zeitmechanik im
  Vordergrund.
- Eine Untersuchung liefert immer den korrekten Befund. Fehlmessungen, nicht
  verfügbare Geräte oder ein unkooperativer Patient sind nicht abgebildet.
- Das Körperschema kennt zehn grobe Regionen, keine Seitenlokalisation
  innerhalb einer Region und keine Verletzungsart. Für "Fraktur Unterarm
  links" steht die Marke am linken Arm, nicht am Unterarm.
- Blutzucker, Temperatur und Schmerz dürfen in einer Szenariodatei fehlen; die
  Simulation füllt sie dann unauffällig auf (→ `sim.standardwerte`). Ältere
  Dateien bleiben dadurch gültig.

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

## 4. Die vier Mechaniken

### Verschlechterung

Ein Patient hat eine Liste **Probleme**. Jedes unbehandelte Problem verändert die
Vitalwerte um feste Beträge pro Minute (→ `modell.problem`, `sim.tick`). Manche
Probleme setzen erst nach einer Latenzzeit ein. Aus den Vitalwerten leitet die
Simulation die Sichtungsbefunde ab (→ `sim.befunde`) – dadurch wird aus einer
gehfähigen SK-III-Patientin im Verlauf ein SK-I-Fall.

Intern wird mit Gleitkommazahlen gerechnet und erst bei der Anzeige gerundet.
Das ist kein Detail: mit Rundung nach jedem Tick verschwindet jede Änderung
(→ `sim.gleitkomma`).

Das Tempo hängt am **Alleinspiel** (→ `sim.tempo`): Wer allein spielt, kann
nicht alles gleichzeitig, deshalb übergibt der Start dann einen Faktor an
`patientAusVorlage`, der alle Verschlechterungsraten drosselt (0.8 = rund 25 %
mehr Zeit). Im Teamspiel bleibt es bei den gemeinten Raten (Faktor 1). Der
Faktor sitzt bewusst nur an dieser einen Stelle - die Rechenfunktionen, der
Probelauf und der Generator arbeiten unverändert mit den Originalwerten.

### Zeit als Ressource

Jede Handlung kostet ihre Dauer, und zwar **für alle Patienten gleichzeitig**
(→ `state.zeit`). Die Rechnung, um die es geht:

| Handlung | Zeit |
| --- | --- |
| Vorsichtung | 20 s |
| Verlegung | 30 s |
| Blutstillung / Atemweg | 20–60 s |
| Intubation | 180 s |
| Vollständige Diagnostik an einem Patienten | 340 s |

Zehn Patienten vorzusichten kostet 3:20 – weniger als zwei Intubationen. Ein Test
hält das fest (→ `test.zeitkosten`).

### Der Maßnahmenkatalog

Fachliche Grundlage sind die **Standardarbeitsanweisungen und Behandlungspfade
Rettungsdienst des Kreises Steinfurt, Version Januar 2026** (ÄLRD Kreis
Steinfurt) - siehe Abschnitt 10. Aus ihnen stammen Bezeichnung, Indikation,
Dosierung und die Zuordnung zur Qualifikation (→ `massnahmen.katalog`).

Drei Angaben pro Maßnahme sind neu und verändern das Spiel:

**Art** (→ Farbstreifen links): Handgriff, invasiver Eingriff oder Medikament.

**Qualifikation** (→ `modell.qualifikation`): Was jeder darf, was der
Notfallsanitäter nach SAA eigenverantwortlich darf, und was ärztlich ist. Genau
eine Maßnahme im Katalog ist ärztlich - die endotracheale Intubation. Im MANV
ist die Notärztin die knappste Ressource überhaupt; dass ihre eine Maßnahme rot
markiert ist und 180 Sekunden kostet, ist die Aussage.

**Voraussetzung** (→ `massnahmen.voraussetzung`): Ein i.v.-Medikament ohne
Zugang gibt es nicht. Die 17 i.v.-Medikamente sind gesperrt, bis ein i.v.- oder
i.o.-Zugang liegt - und der kostet erst einmal 90 bzw. 120 Sekunden. Damit wird
sichtbar, was "schnell mal etwas geben" wirklich kostet:

```
Vollelektrolytlösung an einem Patienten
  i.v.-Zugang     90 s
+ Volumengabe    120 s
= 3:30 Minuten, die bei allen anderen fehlen
```

Indikation und Dosierung liegen hinter dem Knopf **SAA** an jeder Zeile und sind
zugeklappt. Das ist Nachschlagewissen wie die Kitteltaschenkarte - kein Hinweis
darauf, was bei *diesem* Patienten zu tun ist.

### Diagnostik als Entscheidung

Ein Wert ist erst zu sehen, wenn ihn jemand erhoben hat (→ `diagnostik.katalog`,
`ui.befundtafel`). Jede der 13 Untersuchungen kostet ihre eigene Zeit:

| Ohne Hilfsmittel | Mit Gerät | Körperliche Untersuchung |
| --- | --- | --- |
| Puls tasten 10 s | Blutdruck messen 45 s | Lunge auskultieren 30 s |
| Atemfrequenz zählen 15 s | Pulsoxymetrie 20 s | Bodycheck 60 s |
| Rekapzeit prüfen 10 s | Blutzucker messen 30 s | |
| Pupillen kontrollieren 10 s | Temperatur messen 20 s | |
| Bewusstsein prüfen 20 s | EKG-Monitoring 60 s | |
| Schmerz erfragen 10 s | | |

Wer an einem Patienten alles erhebt, zahlt **5:40** - mehr als drei Vorsichtungen
plus zwei Intubationen. Vorher war es ein einziger Knopf für 30 Sekunden, der
alles gleichzeitig zeigte; damit war die Rundumdiagnostik in jeder Lage die beste
Wahl und deshalb keine Entscheidung.

Nicht erhobene Werte stehen als Strich da - sichtbar, dass sie fehlen, ohne zu
verraten, ob sie auffällig wären. Manche Probleme sind ohne die passende
Untersuchung gar nicht zu finden: Der Spannungspneumothorax zeigt sich in der
Auskultation, das Schädel-Hirn-Trauma an den Pupillen.

**Die Befundtafel ist zugleich die Bedienfläche** (→ `ui.befundtafel`,
`diagnostik.zuordnung`). Ein Tippen auf das leere Feld startet die Untersuchung,
die genau diesen Wert liefert; der Preis steht vorher am Feld:

```
┌──────────┐  Tippen   ┌──────────────┐
│ RR SYS   │  ───────► │ RR SYS       │   Uhr 00:00 → 00:45
│ –   45 s │           │ 130 mmHg     │
└──────────┘           └──────────────┘
```

Wo mehrere Untersuchungen denselben Wert liefern, gewinnt die günstigste: die
Herzfrequenz kommt über den getasteten Puls (10 s), nicht über das EKG (60 s).
Die Zuordnung wird aus dem Katalog abgeleitet, nicht von Hand gepflegt - eine
neue Untersuchung ordnet sich selbst zu.

Damit gibt es keine getrennte Diagnostikliste mehr. Der Weg vom "das weiß ich
nicht" zum "dann messe ich es" ist ein Klick an genau der Stelle, an der die
Frage entsteht.

### Der Monitor

Die Einzeluntersuchung greift einen Wert einmal ab. Der **Monitor** (Maßnahme
"Monitoring anschließen") bleibt dagegen dran: Solange er läuft, stehen
Herzfrequenz, Sauerstoffsättigung, Atemfrequenz und - über die automatische
NIBP-Manschette - der Blutdruck fortlaufend in der Übersicht
(→ `monitor.modell`), ohne dass man sie erneut erhebt. Real misst die Manschette
im Intervall; die Simulation führt einen bekannten Wert ohnehin fortlaufend
nach, deshalb steht der Blutdruck gleichrangig neben den übrigen.

Sein eigentlicher Zweck ist der **Alarm**, und der ist **gestaffelt** wie am
corpuls³ und nach IEC 60601-1-8 (→ `monitor.alarme`): Ein nur auffälliger Wert
meldet sich **gelb (mittlere Priorität)**, ein kritischer **rot (hohe
Priorität)** - dieselben zwei Grenzen, nach denen die Oberfläche einen Wert
ohnehin gelb oder rot färbt. Ein einziger kritischer Wert hebt den ganzen
Monitor auf Rot. Beide Stufen haben ihr eigenes **Tonmuster** (→
`ui.alarmmelodie`): rot fünf drängende, höhere Pulse in kurzer Folge, gelb drei
ruhigere, tiefere mit längerer Pause.

Sichtbar ist der Alarm überall, auch als Marke auf der Board-Kachel. **Hörbar**
ist er dagegen nur, wer im selben Einsatzabschnitt steht wie der Patient (→
`ui.monitoralarm`): Der Ton entsteht im Browser und pulst mit der höchsten Stufe,
die im gerade gezeigten Abschnitt ansteht. Ein pausierter Einsatz bleibt still,
ein Verstorbener löst keinen Ton mehr aus.

Der Monitor ist keine eigene Zustandsgröße am Patienten, sondern ergibt sich
daraus, ob die Maßnahme durchgeführt wurde. So kann er nicht in Widerspruch zum
Rest des Zustands geraten.

### Der Atemweg

Der **verlegte Atemweg** ist nicht von außen zu sehen: Er wird erst durch die
**Mundraumkontrolle** aufgedeckt (`entdecktDurch: 'mundraumkontrolle'`, →
`diagnostik.entdeckt`) - der volle Bodycheck findet ihn ebenfalls, aber die
Mundraumkontrolle ist der schnelle, gezielte Weg. Erst wenn er entdeckt (und
damit vorhanden) ist, hat das **Freimachen der Atemwege** einen Effekt (→
`sim.effektnurbeiproblem`).

**Guedel- und Wendl-Tubus** werden nur vom **Bewusstlosen** toleriert
(GCS ≤ 8, → `sim.bewusstlos`): Beim wachen Patienten löst der Tubus den
Würgereiz aus, sichert den Atemweg also nicht - er bleibt wirkungslos, und das
Protokoll sagt, warum. Der Handgriff (Freimachen, Absaugen) hat diese
Einschränkung nicht. Fachlich würde der nasopharyngeale Wendl-Tubus auch beim
wachen Patienten toleriert; hier ist er der Einfachheit halber wie der Guedel
an die Bewusstlosigkeit gebunden.

### Versuchung

Der Maßnahmenkatalog ist in jeder Ansicht vollständig vorhanden. In der
Ersteinschätzung sind nur **x** und **A** aufgeklappt; B bis E sind einen Klick
entfernt (→ `ui.ersteinschaetzung`, `ui.massnahmenliste`). Nichts hindert daran,
sich festzuarbeiten – das Debriefing weist die Zeit jenseits der Sofortmaßnahmen
als Individualmedizin aus (→ `sim.individualmedizin`).

**Die Anwendung sagt nie, was zu tun ist.** Befundtexte beschreiben ausschließlich
Beobachtbares - "Pulsierende Blutung aus der Wunde, Hose durchtränkt", nicht
"Tourniquet indiziert". Was daraus folgt, ist die Prüfung des Übenden. Für die
KI-Erzeugung steht diese Regel mit Positiv- und Negativbeispiel im Auftrag
(→ `ki.prompt`, Regel 8); im Editor steht sie unter dem Befundfeld.

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

## 4b. Die Patientenseite als Anhängekarte

Vorbild ist die **Patienten-Anhängetasche**, wie sie im MANV am Patienten hängt
(→ `ui.anhaengekarte`). Übernommen ist ihr Aufbau:

```
 ▇▇  ▇▇  ▇▇  ▇▇  ▇▇          Farbreiter der Kategorien
┌──────────────────────────────────────────┐
│ ┌──────┐  Lena Hoffmann          ☖  ☖    │  Kennung, Person, Körperschema
│ │ B-01 │  17 Jahre · weiblich              │
│ └──────┘                                   │
│ Liegt neben dem Bus, spritzende Blutung …  │
│                                            │
│ 1. Vorsichtung      [I][II][III][IV][EX] 00:20 │  ← die aktuelle Zeile
│ 2. Eingangssichtung [I][II][III][IV][EX] --:-- │
│ 3. Nachsichtung     [I][II][III][IV][EX] --:-- │
│ 4. Ausgangssichtung [I][II][III][IV][EX] --:-- │
│                                            │
│ SCHADENSSTELLE   [Als endgültig markieren] │
└──────────────────────────────────────────┘
```

**Gesichtet wird auf der Karte selbst**: ein Klick auf das Kästchen der
Kategorie in der Zeile der aktuellen Station. Eine getrennte Sichtungsauswahl
gibt es nicht mehr - die Karte ist das Bedienelement, so wie im Einsatz der
Stift auf der Karte.

### Vorläufig oder endgültig

Die Fläche der Karte trägt die Kategorie (→ `ui.einfaerbung`, `stil.anhaengekarte`):

| Zustand | Karte |
| --- | --- |
| noch nicht gesichtet | keine Farbe |
| vorläufig gesichtet | obere **Hälfte** in der Kategoriefarbe |
| endgültig gesichtet | **ganze** Karte, Rahmen in der Kategoriefarbe |

Umgesetzt als linearer Verlauf mit hartem Farbstopp bei 50 % - kein zweites
Element, keine Überlagerung der Schrift. Damit ist in der Übersicht auf einen
Blick zu sehen, wer noch nachzusichten ist.

### Sichtung vor jeder Verlegung

Jede Station sichtet neu (→ `sim.sichtungOffen`). Solange die Zeile der
aktuellen Station leer ist, sind **alle Verlegungsziele gesperrt** - sichtbar
im Knopf ("Sichtung offen") und im Reducer, der die Verlegung ohnehin abweist.
Die erste Sichtung einer Station kostet 20 Sekunden, ein Korrigieren an
derselben Stelle nichts.

Die Ausnahme ist die **endgültige Sichtung**: Wer als endgültig markiert ist,
wird nicht wieder aufgemacht und darf ohne erneute Sichtung weiter. Markieren
lässt sich das an jeder Station, nicht erst am Ausgang.

### Körperschema mit Markierungen

Das Schema ist keine Zierde (→ `ui.koerperschema`). Es markiert die
Körperregion jedes bekannten Problems (→ `modell.koerperregion`): unbehandelte
Marken pulsieren **rot**, versorgte stehen **grün**.

Wann eine Marke erscheint, entscheidet `offensichtlich`
(→ `diagnostik.koerpermarken`): Sichtbare Blutung, Fehlstellung, Verbrennung
oder eine Klage des Patienten stehen **sofort** auf dem Schema - man sieht sie,
ohne den Patienten anzufassen. Verborgenes erscheint erst nach dem Bodycheck.
Die stimmige Regel für eigene Szenarien: Was der Kurzbefund beschreibt, ist
offensichtlich; innere Verletzungen sind es nicht. Julia Petersens
intraabdominelle Blutung bleibt deshalb unsichtbar, bis jemand nachsieht -
genau das ist die Falle.

Seitenangaben gelten für den Patienten: Auf der Vorderansicht liegt sein rechter
Arm links im Bild, weil man ihm gegenübersteht. Klein steht das Schema auf der
Karte, groß auf der Diagnostikseite.

### Alles auf eine Seite - notfalls auf eine eigene

Unter der Karte stehen fünf Knöpfe (→ `ui.patientenansicht`). Jeder öffnet eine
**eigene Vollbildseite** (→ `ui.bereichsseite`) statt eines Blocks darunter:

| Knopf | Inhalt | Marke am Knopf |
| --- | --- | --- |
| Diagnostik | Befundtafel, Körperschema, Bodycheck | erhobene Zeit |
| Maßnahmen | Handgriffe und Eingriffe nach xABCDE, Durchgeführtes | Anzahl durchgeführt |
| Medikamente | Medikamente nach SAA mit Indikation und Dosierung | Anzahl gegeben |
| Verlegung | erlaubte Ziele | offene Sichtung oder Anzahl Ziele |
| Verlauf | Protokoll | Anzahl Einträge |

Handgriffe und Eingriffe stehen im Maßnahmenreiter, die Medikamente in einem
eigenen Reiter - so bleibt jede Liste kurz, und die Gruppen starten
eingeklappt. Solange der Patient an der Schadensstelle liegt, stehen die
lebensrettenden **Sofortmaßnahmen** (→ `ui.sofortmassnahmen`) dauerhaft unter
der Karte: kritische Blutung, Mundraumkontrolle, Atemweg, Beatmung - der Griff,
der zählt, wartet nicht hinter einem Reiter.

Damit bleibt die Übersicht unabhängig davon, wie lang der Maßnahmenkatalog
wird. Auf der Bereichsseite steht der Kopf, gescrollt wird nur der Inhalt;
Escape schließt sie und führt zurück auf die Karte.

Gemessen an derselben Lage:

| | Übersicht | Bereichsseite |
| --- | --- | --- |
| Desktop 1440×950 | **1,00** Bildschirme | 1,00 |
| Telefon 390×844 | 1,10 Bildschirme | 1,08 |

Auf dem Desktop passt die Übersicht damit exakt auf eine Seite. Auf dem Telefon
bleibt ein kurzer Rest - die angeheftete Einsatzleiste (Titel, Uhr, sechs
Zähler) belegt dort allein 173 px.

Damit sind die vier fast gleichen Abschnittsansichten (Ersteinschätzung,
Eingangssichtung, Versorgung, Ausgangssichtung) zu **einer** Ansicht geworden.
Was sich je Abschnitt unterscheidet - erlaubte Ziele und die dran seiende
Sichtungszeile - steht in der Domäne, nicht in vier Komponenten.

Der didaktische Kern bleibt: Die Karte zeigt nur den Ersteindruck, also das,
was ohne Gerät zu sehen ist. Wer Messwerte will, öffnet die Diagnostik und
bezahlt sie mit Einsatzzeit.

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

_134 Anker, erzeugt von `npm run anker` – nicht von Hand ändern._

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

#### diagnostik

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `diagnostik.bekannt` | [`src/domain/diagnostik.ts:134`](src/domain/diagnostik.ts#L134) | Ist dieser Befund schon erhoben? |
| `diagnostik.entdeckt` | [`src/domain/diagnostik.ts:181`](src/domain/diagnostik.ts#L181) | Wann ein Problem sichtbar wird |
| `diagnostik.katalog` | [`src/domain/diagnostik.ts:11`](src/domain/diagnostik.ts#L11) | Alle Untersuchungen mit Dauer und aufgedecktem Befund |
| `diagnostik.koerpermarken` | [`src/domain/diagnostik.ts:197`](src/domain/diagnostik.ts#L197) | Was das Körperschema wann zeigt |
| `diagnostik.zuordnung` | [`src/domain/diagnostik.ts:149`](src/domain/diagnostik.ts#L149) | Welche Untersuchung ein Feld der Befundtafel öffnet |

#### einzelfaelle

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `einzelfaelle.liste` | [`src/domain/einzelfaelle.ts:4`](src/domain/einzelfaelle.ts#L4) | Einzelfälle - Szenarien mit genau einer Person |

#### format

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `format.vitalgrenzen` | [`src/lib/format.ts:26`](src/lib/format.ts#L26) | Norm- und Kritischbereiche für die Farbgebung der Messwerte |

#### generator

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `generator.baukasten` | [`src/domain/szenarioGenerator.ts:16`](src/domain/szenarioGenerator.ts#L16) | Szenarien ohne Modell, ohne Schlüssel, ohne Netz |
| `generator.muster` | [`src/domain/szenarioGenerator.ts:73`](src/domain/szenarioGenerator.ts#L73) | Der Vorrat an Verletzungsmustern - hier erweitern |
| `generator.zielminute` | [`src/domain/szenarioGenerator.ts:469`](src/domain/szenarioGenerator.ts#L469) | Aus der gewünschten Todesminute wird die Verlaufsrate |

#### ki

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `ki.client` | [`src/lib/kiClient.ts:12`](src/lib/kiClient.ts#L12) | Szenario direkt erzeugen - mit Prüfschleife statt Copy-und-Paste |
| `ki.korrektur` | [`src/lib/kiPrompt.ts:123`](src/lib/kiPrompt.ts#L123) | Rückmeldung der Prüfung an das Modell |
| `ki.livetest` | [`src/lib/kiClient.live.test.ts:8`](src/lib/kiClient.live.test.ts#L8) | Echter Durchlauf gegen die API - nur mit Schlüssel |
| `ki.normalisieren` | [`src/lib/kiSchema.ts:152`](src/lib/kiSchema.ts#L152) | Räumt die Modellantwort auf, bevor sie geprüft wird |
| `ki.prompt` | [`src/lib/kiPrompt.ts:7`](src/lib/kiPrompt.ts#L7) | Der Auftrag an die KI - für den direkten Aufruf und zum Kopieren |
| `ki.schema` | [`src/lib/kiSchema.ts:6`](src/lib/kiSchema.ts#L6) | Das JSON-Schema, an das die KI gebunden wird |
| `ki.zugang` | [`src/lib/kiZugang.ts:2`](src/lib/kiZugang.ts#L2) | Wo der API-Schlüssel liegt - und was das bedeutet |

#### massnahmen

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `massnahmen.katalog` | [`src/domain/massnahmen.ts:5`](src/domain/massnahmen.ts#L5) | Alle Maßnahmen mit Dauer und Wirkung - hier neue ergänzen |
| `massnahmen.schnell` | [`src/domain/massnahmen.ts:736`](src/domain/massnahmen.ts#L736) | Auswahl für die Ausgangssichtung (bis 60 Sekunden) |
| `massnahmen.sofort` | [`src/domain/massnahmen.ts:748`](src/domain/massnahmen.ts#L748) | Lebensrettende Griffe der Schadensstelle |
| `massnahmen.veraltet` | [`src/domain/massnahmen.ts:704`](src/domain/massnahmen.ts#L704) | Was aus der Auswahl verschwindet, aber gültig bleibt |
| `massnahmen.voraussetzung` | [`src/domain/massnahmen.ts:770`](src/domain/massnahmen.ts#L770) | Was vor einer Maßnahme erledigt sein muss |
| `massnahmen.xabcde` | [`src/domain/massnahmen.ts:716`](src/domain/massnahmen.ts#L716) | Gruppierung und Reihenfolge der Maßnahmengruppen |

#### modell

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `modell.abschnitte` | [`src/domain/types.ts:310`](src/domain/types.ts#L310) | Die Stationen, die ein Patient durchläuft |
| `modell.diagnostik` | [`src/domain/types.ts:384`](src/domain/types.ts#L384) | Einzelne Untersuchungen statt einer Rundumschau |
| `modell.finalsichtung` | [`src/domain/types.ts:430`](src/domain/types.ts#L430) | Vorläufig oder endgültig - die Anhängekarte zeigt es |
| `modell.kernwerte` | [`src/domain/types.ts:85`](src/domain/types.ts#L85) | Pflichtwerte einer Vorlage - der Rest wird aufgefüllt |
| `modell.koerperregion` | [`src/domain/types.ts:246`](src/domain/types.ts#L246) | Wo am Patienten das Problem sitzt - für das Körperschema |
| `modell.patient` | [`src/domain/types.ts:419`](src/domain/types.ts#L419) | Alles, was sich an einem Patienten im Einsatz ändert |
| `modell.patientvorlage` | [`src/domain/types.ts:354`](src/domain/types.ts#L354) | Felder, die ein neuer Szenario-Patient braucht |
| `modell.problem` | [`src/domain/types.ts:280`](src/domain/types.ts#L280) | Herzstück der Dynamik: Problem -> Vitalwertänderung pro Minute |
| `modell.qualifikation` | [`src/domain/types.ts:191`](src/domain/types.ts#L191) | Basis, Notfallsanitäter nach SAA, Notärztin |
| `modell.sichtungskategorien` | [`src/domain/types.ts:12`](src/domain/types.ts#L12) | Die vier Sichtungskategorien und EX mit Farbe und Bedeutung |
| `modell.vitalwerte` | [`src/domain/types.ts:58`](src/domain/types.ts#L58) | Welche sechs Messwerte die Simulation führt |

#### modi

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `modi.liste` | [`src/domain/modi.ts:2`](src/domain/modi.ts#L2) | Die Trainingsmodi und ihr Ausbaustand |

#### monitor

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `monitor.alarme` | [`src/domain/monitor.ts:88`](src/domain/monitor.ts#L88) | Welche Grenzwerte gerade verletzt sind - gelb oder rot |
| `monitor.modell` | [`src/domain/monitor.ts:4`](src/domain/monitor.ts#L4) | Der Patientenmonitor - kontinuierliche Überwachung mit Alarm |

#### net

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `net.lokal` | [`src/net/lokalerTransport.ts:5`](src/net/lokalerTransport.ts#L5) | Sitzungstransport über BroadcastChannel (ein Gerät) |
| `net.protokoll` | [`src/net/protokoll.ts:5`](src/net/protokoll.ts#L5) | Nachrichten zwischen Übungsleiter (Host) und Spielern |
| `net.transport` | [`src/net/sitzungstransport.ts:4`](src/net/sitzungstransport.ts#L4) | Austauschbarer Kanal für eine Sitzung |

#### sichtung

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `sichtung.bewertung` | [`src/domain/triage.ts:126`](src/domain/triage.ts#L126) | Über- oder unterschätzt - Grundlage der Debriefing-Spalte |
| `sichtung.grenzwerte` | [`src/domain/triage.ts:25`](src/domain/triage.ts#L25) | Zahlen, an denen die Sichtung kippt (AF, RR, GCS, Rekapzeit) |
| `sichtung.mstart` | [`src/domain/triage.ts:45`](src/domain/triage.ts#L45) | Der mSTaRT-Algorithmus als Entscheidungskette |

#### sim

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `sim.befunde` | [`src/domain/simulation.ts:175`](src/domain/simulation.ts#L175) | Gehfähigkeit, Atmung und Reaktion folgen den Vitalwerten |
| `sim.bewusstlos` | [`src/domain/simulation.ts:251`](src/domain/simulation.ts#L251) | Guedel-/Wendl-Tubus wirken nur beim Bewusstlosen |
| `sim.diagnostik` | [`src/domain/simulation.ts:306`](src/domain/simulation.ts#L306) | Eine Untersuchung deckt genau ihren Befund auf |
| `sim.effektnurbeiproblem` | [`src/domain/simulation.ts:267`](src/domain/simulation.ts#L267) | Atemwegssicherung wirkt nur bei verlegtem Atemweg |
| `sim.gleitkomma` | [`src/domain/simulation.ts:55`](src/domain/simulation.ts#L55) | Warum intern nicht gerundet wird - sonst verschwindet jede Änderung |
| `sim.individualmedizin` | [`src/domain/simulation.ts:404`](src/domain/simulation.ts#L404) | Maß für Individualmedizin - Zeit jenseits der Sofortmaßnahmen |
| `sim.massnahme` | [`src/domain/simulation.ts:240`](src/domain/simulation.ts#L240) | Wirkung einer Maßnahme auf Probleme, Vitalwerte und Sichtungsbefunde |
| `sim.sichtungOffen` | [`src/domain/simulation.ts:353`](src/domain/simulation.ts#L353) | Steht an dieser Station noch eine Sichtung aus? |
| `sim.standardwerte` | [`src/domain/simulation.ts:35`](src/domain/simulation.ts#L35) | Unauffällige Vorgaben für die später ergänzten Werte |
| `sim.startzustand` | [`src/domain/simulation.ts:93`](src/domain/simulation.ts#L93) | Womit ein Patient in den Einsatz startet |
| `sim.tempo` | [`src/domain/simulation.ts:70`](src/domain/simulation.ts#L70) | Langsamere Verschlechterung im Alleinspiel |
| `sim.tick` | [`src/domain/simulation.ts:150`](src/domain/simulation.ts#L150) | Ein Simulationsschritt: Probleme wirken auf die Vitalwerte |
| `sim.tod` | [`src/domain/simulation.ts:139`](src/domain/simulation.ts#L139) | Ab welchen Werten ein Patient verstirbt |
| `sim.verlegung` | [`src/domain/simulation.ts:375`](src/domain/simulation.ts#L375) | Ortswechsel eines Patienten; Abtransport friert den Zustand ein |
| `sim.zeitkosten` | [`src/domain/simulation.ts:201`](src/domain/simulation.ts#L201) | Stellschrauben für Sichtungs- und Untersuchungsdauer |
| `sim.zeitraum` | [`src/domain/simulation.ts:215`](src/domain/simulation.ts#L215) | Längere Zeitsprünge in kleinen Schritten - für Maßnahmendauern |

#### sitzung

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `sitzung.modell` | [`src/domain/sitzung.ts:2`](src/domain/sitzung.ts#L2) | Rollen, Spieler und Code einer gemeinsamen Sitzung |

#### speicher

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `speicher.szenarien` | [`src/lib/speicher.ts:5`](src/lib/speicher.ts#L5) | Eigene Szenarien im Browser sichern |

#### state

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `state.aktionen` | [`src/state/reducer.ts:87`](src/state/reducer.ts#L87) | Alles, was der Übende auslösen kann |
| `state.phase` | [`src/state/reducer.ts:33`](src/state/reducer.ts#L33) | Die Hauptzustände der Anwendung |
| `state.provider` | [`src/state/SimulationProvider.tsx:26`](src/state/SimulationProvider.tsx#L26) | Rollen-bewusster Zustandsverteiler |
| `state.reducer` | [`src/state/reducer.ts:183`](src/state/reducer.ts#L183) | Wie Aktionen den Zustand verändern, inklusive Zeitkosten |
| `state.schnappschuss` | [`src/state/reducer.ts:118`](src/state/reducer.ts#L118) | Der geteilte, host-autoritative Ausschnitt des Zustands |
| `state.uhr` | [`src/state/SimulationProvider.tsx:12`](src/state/SimulationProvider.tsx#L12) | Der Taktgeber der laufenden Simulation |
| `state.zeit` | [`src/state/reducer.ts:150`](src/state/reducer.ts#L150) | Kernmechanik: jede Handlung lässt die Uhr für alle laufen |
| `state.zustand` | [`src/state/reducer.ts:45`](src/state/reducer.ts#L45) | Der gesamte Zustand einer laufenden Übung |

#### stil

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `stil.anhaengekarte` | [`src/index.css:1324`](src/index.css#L1324) | Die Karte, ihre Farbreiter und die Einfärbung |
| `stil.bereichsseite` | [`src/index.css:1708`](src/index.css#L1708) | Vollbildseite mit stehendem Kopf |
| `stil.editor` | [`src/index.css:536`](src/index.css#L536) | Formularfelder und Prueflisten des Szenario-Editors |
| `stil.einsatzleiste` | [`src/index.css:2885`](src/index.css#L2885) | Die angeheftete Leiste so flach wie möglich |
| `stil.ersteindruck` | [`src/index.css:1761`](src/index.css#L1761) | Kompakte Befundchips statt gestapelter Zeilen |
| `stil.hover` | [`src/index.css:2835`](src/index.css#L2835) | Hover nur mit echtem Zeiger - sonst klebt der Zustand |
| `stil.mehrspieler` | [`src/index.css:302`](src/index.css#L302) | Rollenwahl, Anmeldung, Beitritt und Wartebereich |
| `stil.modi` | [`src/index.css:463`](src/index.css#L463) | Karten der Trainingsmodus-Auswahl |
| `stil.patientnav` | [`src/index.css:1587`](src/index.css#L1587) | Navigation einzeilig - sie darf keine Bildhöhe fressen |
| `stil.raster` | [`src/index.css:2131`](src/index.css#L2131) | Zweispaltiges Raster der Patientenansichten ab 900 px |
| `stil.sk-farbe` | [`src/index.css:141`](src/index.css#L141) | Kategoriefarbe als Variable - loest eine Spezifitaetsfalle |
| `stil.telefon` | [`src/index.css:2955`](src/index.css#L2955) | Anpassungen unter 760 px, inklusive Tabellenumbruch |
| `stil.tokens` | [`src/index.css:6`](src/index.css#L6) | Farben, Radien und Schatten der gesamten Oberfläche |
| `stil.touch` | [`src/index.css:3086`](src/index.css#L3086) | Mindestgroesse der Tippziele auf Touch-Geraeten |

#### szenarien

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `szenarien.busunfall` | [`src/domain/szenarien.ts:11`](src/domain/szenarien.ts#L11) | Zehn Patienten als Vorlage für eigene Szenarien |
| `szenarien.liste` | [`src/domain/szenarien.ts:4`](src/domain/szenarien.ts#L4) | Die Übungsszenarien - hier neue Lagen und Patienten anlegen |

#### szenario

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `szenario.dynamik` | [`src/domain/szenarioDynamik.ts:6`](src/domain/szenarioDynamik.ts#L6) | Spielt ein Szenario durch, bevor es jemand übt |
| `szenario.pruefung` | [`src/domain/szenarioPruefung.ts:16`](src/domain/szenarioPruefung.ts#L16) | Prüft ein Szenario auf Vollständigkeit und Stimmigkeit |

#### test

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `test.abschnitte` | [`src/state/reducer.test.ts:222`](src/state/reducer.test.ts#L222) | Der Weg eines Patienten und die erlaubten Verlegungen |
| `test.atemweg` | [`src/domain/simulation.test.ts:195`](src/domain/simulation.test.ts#L195) | Sofortmaßnahmen und die Wirkung der Atemwegssicherung |
| `test.mstart` | [`src/domain/triage.test.ts:42`](src/domain/triage.test.ts#L42) | Jeder Zweig des Sichtungsalgorithmus inklusive Grenzwerte |
| `test.szenariodaten` | [`src/domain/simulation.test.ts:33`](src/domain/simulation.test.ts#L33) | Prueft, dass jede Szenario-Vorlage in sich stimmig ist |
| `test.szenariopruefung` | [`src/domain/szenarioPruefung.test.ts:9`](src/domain/szenarioPruefung.test.ts#L9) | Die Prüfung, durch die jedes importierte Szenario muss |
| `test.tubus` | [`src/domain/simulation.test.ts:244`](src/domain/simulation.test.ts#L244) | Guedel- und Wendl-Tubus werden nur vom Bewusstlosen toleriert |
| `test.zeitkosten` | [`src/state/reducer.test.ts:64`](src/state/reducer.test.ts#L64) | Belegt, dass jede Handlung die Uhr fuer alle weiterlaufen laesst |
| `test.zeitverlauf` | [`src/domain/simulation.test.ts:108`](src/domain/simulation.test.ts#L108) | Verschlechterung, Todesfaelle und Latenzzeiten |

#### ui

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `ui.abschnittsleiste` | [`src/components/Abschnittsleiste.tsx:5`](src/components/Abschnittsleiste.tsx#L5) | Reiter mit der Belegung je Abschnitt |
| `ui.alarmmelodie` | [`src/state/useMonitorAlarm.ts:27`](src/state/useMonitorAlarm.ts#L27) | Zwei corpuls³-nahe Alarmmuster nach IEC 60601-1-8 |
| `ui.alleinspiel` | [`src/pages/SetupSeite.tsx:52`](src/pages/SetupSeite.tsx#L52) | Vor dem Start wählen, ob man allein spielt */} |
| `ui.anhaengekarte` | [`src/components/Anhaengekarte.tsx:21`](src/components/Anhaengekarte.tsx#L21) | Die Übersicht als Verletztenanhängekarte |
| `ui.anmeldung` | [`src/pages/AnmeldungSeite.tsx:5`](src/pages/AnmeldungSeite.tsx#L5) | Übungsleiter-Anmeldung (Login folgt mit dem Server) |
| `ui.app` | [`src/App.tsx:12`](src/App.tsx#L12) | Weiche zwischen den Hauptzustaenden der Anwendung |
| `ui.baukasten` | [`src/pages/uebungsleitung/BaukastenGenerator.tsx:7`](src/pages/uebungsleitung/BaukastenGenerator.tsx#L7) | Kostenfrei erzeugen - ohne Schlüssel, ohne Netz |
| `ui.befundtafel` | [`src/components/Befundtafel.tsx:13`](src/components/Befundtafel.tsx#L13) | Nur was erhoben wurde, ist zu sehen - und ein Tipp erhebt es |
| `ui.beitritt` | [`src/pages/BeitrittSeite.tsx:5`](src/pages/BeitrittSeite.tsx#L5) | Spieler tritt mit Code und Name bei |
| `ui.bereichsseite` | [`src/pages/patient/Bereichsseite.tsx:15`](src/pages/patient/Bereichsseite.tsx#L15) | Diagnostik, Maßnahmen und Verlegung als eigene Seite |
| `ui.debriefing` | [`src/pages/DebriefingSeite.tsx:30`](src/pages/DebriefingSeite.tsx#L30) | Auswertung nach dem Einsatz |
| `ui.einfaerbung` | [`src/components/Anhaengekarte.tsx:34`](src/components/Anhaengekarte.tsx#L34) | Halb eingefärbt heißt vorläufig, ganz heißt endgültig |
| `ui.einsatzseite` | [`src/pages/EinsatzSeite.tsx:10`](src/pages/EinsatzSeite.tsx#L10) | Abschnittsliste oder Patientenseite |
| `ui.ersteindruck` | [`src/components/Ersteindruck.tsx:11`](src/components/Ersteindruck.tsx#L11) | Die fünf Befunde der Vorsichtung, ohne Messwerte |
| `ui.kigenerator` | [`src/pages/uebungsleitung/KiGenerator.tsx:16`](src/pages/uebungsleitung/KiGenerator.tsx#L16) | Vom Modell erzeugen lassen - Zugang, Lauf, Befunde |
| `ui.koerperschema` | [`src/components/Koerperschema.tsx:6`](src/components/Koerperschema.tsx#L6) | Wo am Patienten etwas ist - Vorder- und Rückansicht |
| `ui.massnahmenliste` | [`src/components/Massnahmenliste.tsx:32`](src/components/Massnahmenliste.tsx#L32) | Das einklappbare xABCDE-Akkordeon |
| `ui.monitor` | [`src/components/Monitor.tsx:18`](src/components/Monitor.tsx#L18) | Der Monitor in der Übersicht - Knopf zum Anschließen, dann live |
| `ui.monitoralarm` | [`src/state/useMonitorAlarm.ts:69`](src/state/useMonitorAlarm.ts#L69) | Der Alarmton - gestaffelt und nur im selben Abschnitt |
| `ui.patienteditor` | [`src/pages/uebungsleitung/PatientEditor.tsx:33`](src/pages/uebungsleitung/PatientEditor.tsx#L33) | Formular für einen Szenario-Patienten samt Problemen |
| `ui.patientenansicht` | [`src/pages/patient/Patientenansicht.tsx:30`](src/pages/patient/Patientenansicht.tsx#L30) | Anhängekarte plus Knöpfe - eine Ansicht für alle Abschnitte |
| `ui.patientkarte` | [`src/components/PatientKarte.tsx:35`](src/components/PatientKarte.tsx#L35) | Kachel der Patientenliste - Einfärbung wie die Anhängekarte |
| `ui.patientseite` | [`src/pages/PatientSeite.tsx:8`](src/pages/PatientSeite.tsx#L8) | Rahmen der Patientenseite: Navigation und Blättern |
| `ui.rolle` | [`src/pages/RolleSeite.tsx:3`](src/pages/RolleSeite.tsx#L3) | Übungsleiter oder Spieler wählen |
| `ui.setup` | [`src/pages/SetupSeite.tsx:7`](src/pages/SetupSeite.tsx#L7) | Szenarioauswahl der digitalen Übung, inkl. Alleinspiel |
| `ui.sofortmassnahmen` | [`src/components/Sofortmassnahmen.tsx:14`](src/components/Sofortmassnahmen.tsx#L14) | Lebensrettende Griffe, dauerhaft in der Übersicht |
| `ui.start` | [`src/pages/StartSeite.tsx:5`](src/pages/StartSeite.tsx#L5) | Auswahl des Trainingsmodus und Einstieg in die Übungsleitung |
| `ui.szenarioeditor` | [`src/pages/uebungsleitung/SzenarioEditor.tsx:16`](src/pages/uebungsleitung/SzenarioEditor.tsx#L16) | Formular für ein ganzes Szenario mit laufender Prüfung |
| `ui.szenarioquelle` | [`src/pages/uebungsleitung/SzenarioQuelle.tsx:6`](src/pages/uebungsleitung/SzenarioQuelle.tsx#L6) | Zwei Wege zu einer neuen Lage - kostenfrei oder per Modell |
| `ui.uebungsleitung` | [`src/pages/UebungsleitungSeite.tsx:14`](src/pages/UebungsleitungSeite.tsx#L14) | Szenarien anlegen, prüfen, ein- und ausgeben |
| `ui.verlegung` | [`src/components/Verlegung.tsx:7`](src/components/Verlegung.tsx#L7) | Schaltflächen zum Verlegen, passendes Zelt hervorgehoben |
| `ui.wartebereich` | [`src/pages/WartebereichSeite.tsx:3`](src/pages/WartebereichSeite.tsx#L3) | Lobby vor dem Start - Code, Teilnehmende, Startknopf |

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
npm run test           107 Tests
npm run ki:test        echter Durchlauf gegen die API (braucht ANTHROPIC_API_KEY)
npm run lint           oxlint
npm run typecheck      TypeScript
npm run build          Produktionsbuild
npm run build:single   dist/dps.html – eine Datei, ohne Server lauffähig
npm run anker          Ankertabelle in dieser Datei neu erzeugen
npm run anker:pruefen  prüft, ob die Tabelle aktuell ist
```

## 7a. Quellen

| Was | Woher |
| --- | --- |
| Maßnahmen, Indikationen, Dosierungen, Qualifikationszuordnung | [SAA und BPR Kreis Steinfurt, Version Januar 2026](https://www.kreis-steinfurt.de/kv_steinfurt/Ressourcen/Amt%20f%C3%BCr%20Bev%C3%B6lkerungsschutz/Rettungsdienst/SAA%20BPR%20Kreis%20Steinfurt%202026.pdf), ÄLRD Kreis Steinfurt |
| Sichtungskategorien SK I-IV | Bundeseinheitliche Systematik |
| mSTaRT-Algorithmus und Grenzwerte | Fachliteratur, umgesetzt in `triage.ts` |

**Was NICHT aus der Quelle stammt:** die Zeitdauern (`dauerSek`) und die
Sofortwirkungen (`sofortEffekt`) der Maßnahmen. Beides sind didaktische
Stellschrauben der Übung und ausdrücklich **keine medizinischen Aussagen**. Wer
die Simulation fachlich ernst nimmt, kalibriert diese Zahlen - der Probelauf im
Editor macht jede Änderung sofort sichtbar.

Die SAA sind eine regional gültige Anweisung des ÄLRD Kreis Steinfurt. Sie
gelten dort und sind hier als fachliche Referenz verwendet; andere
Rettungsdienstbereiche haben eigene Vorgaben.

---

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
