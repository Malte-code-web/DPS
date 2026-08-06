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

1. **Vorsichtung nach tacSTART** – schnell und ohne Messwerte kategorisieren.
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
| Alleinspiel | Eine Person, dafür rund 25 % langsamere Verschlechterung - auch für die volle MANV-Lage. Der Reducer-Mechanismus (`szenarioStarten` mit `alleine: true`) bleibt bestehen und getestet, ist aber seit der Umstellung auf den einheitlichen Sitzungs-Ablauf (→ Direkter Einstieg) über die Oberfläche aktuell nicht mehr erreichbar |
| Einzelfälle | Vier Szenarien mit genau einer Person und klarem Schwerpunkt; steigen direkt in die Patientenansicht ein, ohne Behandlungsplatz |
| Übungsleitung | Eigene Szenarien anlegen, bearbeiten, duplizieren, als JSON aus- und einlesen; Prüfung gegen dieselben Regeln wie die mitgelieferten |
| Baukasten | Erzeugt Szenarien kostenfrei im Browser, ohne Schlüssel und ohne Netz; Verläufe werden aus der Zielminute zurückgerechnet, die Saat macht jede Lage wiederholbar |
| KI-Unterstützung | Erzeugt Szenarien direkt aus der App: Auftrag ans Modell, an ein JSON-Schema gebunden, Ergebnis geprüft und durchgespielt, Befunde gehen automatisch zur Nachbesserung zurück. Der Auftrag zum Kopieren bleibt als Weg ohne Zugang |
| Probelauf | Jedes Szenario wird über 30 Minuten unbehandelt und bestversorgt durchgespielt; der Editor zeigt je Patient den Todeszeitpunkt |
| Simulationskern | Vitalwerte verändern sich pro Minute durch unbehandelte Probleme, Latenzzeiten, Todeskriterien, abgeleitete Sichtungsbefunde |
| tacSTART | Vollständig mit nachvollziehbarer Entscheidungskette; alle Zweige getestet - kritische Blutung wird vorgezogen vor Atemwege/Atmung geprüft (TCCC-nah), von Kreis Steinfurt in der MANV-Tasche als "Checkliste (Vor)Sichtung tacSTART" mitgeführt |
| Zeitmechanik | Jede Handlung (Sichtung, Untersuchung, Maßnahme, Verlegung) lässt die Uhr für alle Patienten weiterlaufen |
| Mehrspieler | Übungsleitung eröffnet eine Sitzung, Spieler treten per Code bei; host-autoritativ (die Übungsleitung rechnet, alle anderen rendern Schnappschüsse). Lokal über `BroadcastChannel` (mehrere Tabs, ein Gerät) oder über Supabase Realtime (echtes Cross-Device) hinter derselben Transport-Schnittstelle. Der Supabase-Transport baut eine abgebrochene Verbindung selbst neu auf (steigende Wartezeit im Hintergrund, sofort beim Zurückwechseln in den Vordergrund über `visibilitychange`) - ein in den Hintergrund geschobener Browser muss die Sitzung dadurch nicht mehr manuell neu laden. Ein eigenes Zeitlimit (10 s) fängt zusätzlich den Fall ab, dass der zugrunde liegende Websocket-Aufbau hängen bleibt, ohne dass Supabase selbst je einen Fehler meldet. Jede Aktion eines Spielers (Maßnahme, Diagnostik, Sichtung ...) sowie sein Beitritt selbst werden an den Host per Bestätigung quittiert; bleibt sie aus, wird bis zu 5-mal automatisch wiederholt - der Host wendet eine wiederholt eintreffende Nachricht dedupliziert trotzdem nur einmal an, ein Realtime-Broadcast liefert sonst ohne jede Fehlermeldung einfach nie zu. Ohne das blieb ein Beitritt spurlos verschwunden, wenn der Host ihn genau in dem Moment verpasste, etwa mitten in einer eigenen Wiederverbindung nach Hintergrund. Denselben Grund hat der alle 4 Sekunden erneut gesendete Schnappschuss: ändert sich der Zustand länger nicht mehr (z. B. Wartebereich nach einer einzelnen Besatzungszuweisung), heilt kein Simulationstakt einen verlorenen Broadcast mehr von selbst - der Neuversand schon |
| Qualifikation | Fünf Stufen (Sanitätshelfer/-in bis Notärztin/Notarzt); die Übungsleitung stellt je Maßnahme die Mindeststufe zum Durchführen und ein Delegationsziel ein (oder „nicht delegierbar"), noch vor der Szenariowahl; jede Person wählt ihre eigene Stufe im Wartebereich - die eigene Auswahl erscheint sofort (optimistisch, ohne auf den Netzwerk-Umlauf über den Host zu warten) |
| Delegationsanfrage | Wer eine delegierbare Maßnahme wegen fehlender Qualifikation nicht durchführen darf, kann sie trotzdem anklicken - statt gesperrt zu sein, öffnet sich eine Auswahl der durchführungsberechtigten Personen im selben Einsatzabschnitt. Die angefragte Person bekommt eine Benachrichtigung mit Annehmen/Ablehnen; erst nach Annahme ist die Maßnahme freigegeben - gezielt nur für die anfragende Person, nicht patientenweit für alle. Ersetzt den früheren proaktiven „Freigeben"-Knopf vollständig |
| Direkter Einstieg (Startseite) | Die Startseite zeigt ausschließlich den Einstieg: ein Umschalter mit Spieler-Beitritt (Sitzungscode + Name, direkt in den Wartebereich) oder Übungsleitungs-Anmeldung - sonst nichts. Die Übungsleitungs-Rolle erfordert ein vorab im Supabase-Dashboard angelegtes Konto (E-Mail + Passwort, Supabase Auth) - Registrierung läuft bewusst nicht über die App. Ohne konfiguriertes Supabase ist der Umschalter-Reiter für die Übungsleitung gesperrt (mit erklärendem Hinweis); Spieler treten weiterhin ohne Konto per Code bei; der freie Anzeigename für die Sitzung (z. B. "OrgL Müller") wird direkt im Login-Formular mit abgefragt. Nach dem Login wählt die Übungsleitung zuerst den Modus (digital/Führung/real - nur digital ist gebaut, die anderen zeigen "in Vorbereitung"), dann folgen Maßnahmenrechte, Szenario, Fahrzeuge, Wartebereich. Ein eigenständiger Solo-Modus ohne Sitzung existiert nicht mehr - jeder Durchlauf läuft über denselben Sitzungs-Ablauf, auch wenn effektiv nur eine Person spielt. Der Szenario-Editor ("Szenarien bauen") ist über die Szenarioauswahl der Sitzung erreichbar, nicht mehr direkt von der Startseite |
| Führung | Zweite Ebene neben der Qualifikation: TrFü/GrFü/ZgFü/OrgL RD/LNA, aufsteigender Rang (OrgL RD und LNA gleichrangig). Die Übungsleitung weist die Rolle im Wartebereich zu; ab Zugführer aufwärts (oder die Übungsleitung selbst) darf Fahrzeuge disponieren |
| Fahrzeuge | RTW/NEF/KTW/GW-Rett/GW-San/AB-MANV/ELW 2/GW-Log als eigene Objekte: vor Sitzungsbeginn per MANV-Stufe (MANV-10 bis MANV-50plus, nach dem MANV-Konzept Kreis Steinfurt) oder einzeln zusammengestellt. Besatzung wird im Wartebereich je Fahrzeug über ein Dropdown-Menü pro Besatzungsplatz zugewiesen - jedes Fahrzeug lässt sich komplett besetzen: RTW/NEF/KTW/GW-Rett/AB-MANV je 2 (Doppelbesetzung bzw. Fahrer/-in + Maschinist/-in), GW-San/GW-Log/ELW 2 je 6 (Staffel-/Führungsgruppenbesetzung); eine Person lässt sich nicht doppelt auf denselben Wagen setzen. Dazu eine reale Stärkemeldung nach BOS-Funkkonvention ("Führungskräfte/Unterführer/Mannschaft/Gesamt", z. B. `1/0/1/2`), je Fahrzeug und als Gesamtsumme im Wartebereich sowie kompakt auf jeder Fahrzeugkarte im Einsatz - eingeordnet über die Führungsrolle der Besatzung. In der laufenden Übung zwischen Einsatzabschnitten verlegbar |
| Fahrzeug-Bestückung & Materialverbrauch | Jedes Fahrzeug führt eine reale Bestückung (58 Verbrauchsmaterialien und Medikamente): RTW und NEF nach der jeweiligen Bestückungsliste Kreis Steinfurt (inkl. gemeinsamem Rucksacksystem und MANV-Tasche), GW-San nach dem BBK-Begleitheft, AB-MANV nach der Packliste Kreis Steinfurt - je vollständig ausgewertet; KTW/GW-Rett daraus hergeleitet und als Schätzung gekennzeichnet, ELW 2/GW-Log führen kein Patientenmaterial. 60 Maßnahmen (Verbandmaterial, Zugänge, Atemwegshilfen, Immobilisation und alle Medikamente mit gefundener Bestückung) ziehen bei Ausführung 1 Einheit vom Bestand eines Fahrzeugs im selben Einsatzabschnitt; ist dort nichts mehr da, sperrt der Knopf mit Kurzhinweis ("... alle"). Ohne Fahrzeuge im Spiel (Solo, oder eine Sitzung ohne konfigurierte Fahrzeuge) bleibt jede Maßnahme unbegrenzt. Bestand je Fahrzeug einsehbar über einen Aufklapper auf der Fahrzeugkarte im Einsatz |
| Maßnahmen | 88 Maßnahmen nach xABCDE, abgeglichen gegen SAA/BPR der ÄLRD (6 Länder 2025), DBRD-Musteralgorithmen 2026, AWMF S3 Polytrauma und ERC/RCUK 2025: Basismaßnahmen, invasive Maßnahmen und 40 Medikamente mit Indikation, Dosierung und Kontraindikationen; Atemwegssicherung wirkt erst nach Mundraumkontrolle, Guedel-Tubus und Larynxmaske nur beim Bewusstlosen - der Wendl-Tubus bewusst auch beim Wachen |
| Gewichtsbezogene Dosierung | 21 Medikamente rechnen die Dosis in mg gegen das Patientengewicht: zu niedrig bleibt wirkungslos, zu hoch löst zusätzlich zur Wirkung eine mittelspezifische Verschlechterung aus. Die sechs Analgetika (Morphin, Fentanyl, Nalbuphin, Esketamin, Paracetamol, Ibuprofen) stehen dafür hinter einem Sammel-Button „Analgesie" statt einzeln in der Liste; die vier Notfallnarkose-Mittel ebenso hinter „Notfallnarkose" (→ Zeile unten); die übrigen elf (Epinephrin, Amiodaron, Lidocain, Atropin, Metoprolol, Midazolam, Diazepam-Rectiole, Naloxon, Nitrat, Urapidil, Furosemid) öffnen die Dosis-Eingabe direkt an ihrer Katalogzeile. Referenzwerte recherchiert (SAA/BPR Kreis Steinfurt, Toxikologie-Literatur); bewusste didaktische Kontraste je Mittel (Nalbuphin: Ceiling-Effekt statt Toxizität; Paracetamol: verzögerte statt akute Hepatotoxizität; Naloxon: präzipitierte Entzugsreaktion statt Organtoxizität; Urapidil: keine Reflextachykardie; Nitrat: paradoxe Bradykardie statt Reflextachykardie) |
| Notfallnarkose (RSI) | Induktionsmittel wählen (Propofol/Thiopental - hämodynamisch stabil; Esketamin - instabil/Schock, kreislaufstützend statt -dämpfend) und dosieren, danach Rocuronium zur Relaxierung, danach Intubation - als einzige Maßnahme im Katalog zusätzlich an ein anwesendes Team aus Rettungssanitäter/-in, NotSan und Notärztin/Notarzt gleichzeitig gebunden; eine einzelne Person darf nicht einleiten, selbst mit höchster Qualifikation. Referenz: Handlungsempfehlung zur prähospitalen Notfallnarkose beim Erwachsenen (DGAI/BAND); Wirkstoffe abgeglichen gegen die Bestückungsliste RTW Kreis Steinfurt |
| Diagnostik | 13 Einzeluntersuchungen nach RD-Standard; jede deckt nur ihren Befund auf und kostet ihre eigene Zeit; der verlegte Atemweg wird durch Mundraumkontrolle oder Bodycheck entdeckt |
| Monitor | Angeschlossen zeigt er HF, SpO₂, Atemfrequenz und Blutdruck (NIBP) fortlaufend und alarmiert gestaffelt: gelb (mittel) bei auffälligem, rot (hoch) bei kritischem Wert - mit unterschiedlichem Tonmuster; der Ton ist nur im selben Einsatzabschnitt zu hören |
| Einsatzabschnitte | Schadensstelle → Eingangssichtung → drei Zelte → Ausgangssichtung → Abtransport, mit eigener Ansicht je Abschnitt |
| Sichtung auf der Anhängekarte | Vier Sichtungszeilen mit I–IV/EX und Uhrzeit; vor jeder Verlegung Pflicht, endgültige Sichtung jederzeit möglich |
| Debriefing | Kennzahlen, Vergleich gegen die Referenz, Ausweis der Individualmedizin |
| Szenarien | Zwei Lagen mit zusammen 16 Patienten |
| Bedienung | Für Smartphone ausgelegt: Tippziele ≥ 44 px, kein Querscrollen, Tabellen brechen zu Karten um |
| Weitergabe | `npm run build:single` erzeugt eine einzelne HTML-Datei ohne Server |

332 automatische Tests (Vitest) über Domänenlogik, Zustandsverwaltung, Mehrspieler-Sitzung,
Qualifikation/Delegation, Führungsrollen und Stärkemeldung, Fahrzeuge/MANV-Stufen,
Fahrzeug-Bestückung und Materialverbrauch, Szenarioprüfung,
Probelauf, Diagnostik, Monitor, Baukasten, gewichtsbezogene Dosierung und die Team-Voraussetzung der
Notfallnarkose.

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
- **Übungsleiter-Konten**: Die Anmeldung der Übungsleitung ist noch ein
  Platzhalter (Anzeigename genügt); echte Konten mit E-Mail/Passwort über
  Supabase Auth sind Mehrspieler-Stufe 3 (→ ROADMAP.md).
- **Führung**: Fahrzeugdisposition ist umgesetzt (→ oben, `domain.fuehrung`).
  Kräfte-/Patientenzuweisung, Einsatzabschnitte eröffnen/zuordnen und
  Transporte freigeben sind als Konzept (`Fuehrungsrolle`,
  `erfuelltFuehrung`) angelegt, aber noch nicht gebaut (→ ROADMAP.md,
  Baustein 3).
- **Fahrzeugkapazität für den Patiententransport**: Fahrzeuge tragen keine
  Transportplätze; die bestehende Patientenverlegung
  (`Verlegung.tsx`/`patientVerlegen`) ist davon unabhängig und bleibt
  unverändert. „Patient mit diesem Fahrzeug abtransportieren" mit begrenzten
  Plätzen bleibt Ausbau (→ ROADMAP.md, Baustein 4). Der Materialverbrauch
  selbst ist dagegen umgesetzt (→ oben, `domain.material`).
- **Kein Nachschub**: Ist der Materialbestand eines Abschnitts erschöpft,
  bleibt die betroffene Maßnahme dort gesperrt, bis ein Fahrzeug mit Bestand
  dorthin verlegt wird (`fahrzeugVerlegen`) - eine eigene
  Nachschub-/Umlagerungsmechanik zwischen Fahrzeugen gibt es nicht.

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
  state/      useReducer-Store, rollen-bewusster Provider (Solo/Host/Spieler),
              Simulationsuhr, React-Context
  net/        Transport-Abstraktion für Mehrspieler: lokal (BroadcastChannel)
              und Supabase Realtime (Cross-Device) hinter derselben Schnittstelle
  components/ Wiederverwendbare Bausteine der Oberfläche
  pages/      Die Ansichten; pages/patient/ die Ansichten je Abschnitt,
              pages/uebungsleitung/ der Szenario-Editor
  lib/        Formatierung, Auswertung, Persistenz, KI-Anbindung
```

Die Trennung ist strikt: `domain/` enthält ausschließlich reine Funktionen. Ein
Simulationsschritt, eine Maßnahme oder eine Sichtung lassen sich ohne Oberfläche
ausführen – deshalb sind sie auch vollständig testbar und ließen sich später auf
einem Server ausführen.

### Datenfluss

```
Aktion (Klick)  →  dispatchMitZeitkosten  →  ggf. Echtzeit-Timer  →  dispatch  →  simulationReducer  →  neuer Zustand  →  Neuaufbau
                          │                                                            │
                          └─ zeitkostenSek()   Dauer bestimmen                         └─ domain/simulation   reine Rechenfunktionen
```

Eine zeitkostende Aktion (→ `state.zeitkosten`) wird nicht sofort an den
Reducer weitergereicht: Der Provider (→ `state.provider`) hält sie zurück,
zeigt einen Countdown (→ `ui.zeitkostenanzeige`) und reicht sie erst nach
Ablauf der (um `state.geschwindigkeit` gestauchten) Echtzeit durch. Parallel
dazu tickt die Uhr (`state.uhr`) unabhängig davon alle 500 ms und schickt
`tick`-Aktionen - sie lässt während der Wartezeit alle Patienten altern, ganz
gleich, ob gerade jemand beschäftigt ist oder nicht.

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

Jede zeitkostende Handlung läuft als echter Countdown bei genau dieser
Handlung ab (→ `state.zeitkosten`, `ui.zeitkostenanzeige`) - nicht mehr als
sofortiger Sprung der Einsatzuhr. Wer eine Maßnahme, Diagnostik oder
Verlegung beginnt, ist für deren Dauer ausgelastet und kann in dieser Zeit
nichts anderes anstoßen; ein Overlay sperrt währenddessen die Bedienung und
zeigt die verbleibenden Sekunden. Dass parallel dazu **alle anderen
Patienten gleichzeitig altern**, übernimmt in dieser Wartezeit ausschließlich
der ohnehin laufende Simulationstakt (`state.uhr`, `case 'tick'`) - wer sich
an einem Patienten festarbeitet, verliert die Zeit bei allen anderen, nur
eben in Echtzeit statt künstlich vorgezogen. Die Dauer selbst rechnet
`zeitkostenSek` (→ `state.zeitkosten`) mit denselben Wächtern wie der Reducer
aus, gestaucht um das eingestellte Tempo (1×/2×/4×/10×, → `state.provider`):

| Handlung | Zeit |
| --- | --- |
| Sichtung (Vor-, Ein-, Nach-, Ausgangssichtung) | 0 s |
| Verlegung | 30 s |
| Blutstillung / Atemweg | 20–60 s |
| Intubation | 180 s |
| Vollständige Diagnostik an einem Patienten | 340 s |

Die Sichtung selbst kostet bewusst keine Zeit - sie ist Einschätzen und
Ankreuzen, kein Handgriff am Patienten. Zeit kostet erst die anschließende
Verlegung in den passenden Abschnitt. Ein Test hält das fest
(→ `test.zeitkosten`, `zeitkosten.test.ts`).

### Der Maßnahmenkatalog

Fachliche Grundlage sind die **Standardarbeitsanweisungen und Behandlungspfade
Rettungsdienst des Kreises Steinfurt, Version Januar 2026** (ÄLRD Kreis
Steinfurt) - siehe Abschnitt 10. Aus ihnen stammen Bezeichnung, Indikation,
Dosierung und die Zuordnung zur Qualifikation (→ `massnahmen.katalog`).

Drei Angaben pro Maßnahme sind neu und verändern das Spiel:

**Art** (→ Farbstreifen links): Handgriff, invasiver Eingriff oder Medikament.

**Qualifikation** (→ `modell.qualifikation`, `domain.massnahmenrechte`): Fünf
Stufen - Sanitätshelfer/-in bis Notärztin/Notarzt. Die Übungsleitung stellt für
jede Maßnahme im Mehrspieler eine Mindeststufe zum Durchführen ein sowie ein
Delegationsziel (welche Stufe eine Freigabe für einen Patienten annehmen darf)
oder "nicht delegierbar"; der Katalog liefert nur den Ausgangswert. Genau eine
Maßnahme im Katalog ist ärztlich - die endotracheale Intubation. Im MANV ist
die Notärztin die knappste Ressource überhaupt; dass ihre eine Maßnahme rot
markiert ist und 180 Sekunden kostet, ist die Aussage. Im Einzel-/Teamspiel
ohne Sitzung bleibt jede Maßnahme frei wählbar wie bisher - die Sperre gilt nur
innerhalb einer Mehrspieler-Sitzung.

**Voraussetzung** (→ `massnahmen.voraussetzung`): Ein i.v.-Medikament ohne
Zugang gibt es nicht. Die 18 rein i.v. gegebenen Medikamente sind gesperrt, bis ein i.v.- oder
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

Wer an einem Patienten alles erhebt, zahlt **5:40** - beinahe zwei
Intubationen. Vorher war es ein einziger Knopf für 30 Sekunden, der
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
dazu zählt insbesondere eine Referenzkategorie, die vom tacSTART-Ergebnis abweicht:
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

_172 Anker, erzeugt von `npm run anker` – nicht von Hand ändern._

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

#### domain

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `domain.analgetika` | [`src/domain/dosierung.ts:302`](src/domain/dosierung.ts#L302) | Die sechs Mittel der Analgesie-Sammelauswahl |
| `domain.delegationskandidaten` | [`src/domain/qualifikation.ts:97`](src/domain/qualifikation.ts#L97) | Wen fragen? - Kandidaten für eine Delegationsanfrage |
| `domain.dosierbar` | [`src/domain/dosierung.ts:290`](src/domain/dosierung.ts#L290) | Alle Medikamente mit eigener Dosis-Eingabe |
| `domain.dosierung` | [`src/domain/dosierung.ts:4`](src/domain/dosierung.ts#L4) | Gewichtsbezogene Dosierung: zu wenig wirkt nicht, zu viel schadet |
| `domain.fahrzeuge` | [`src/domain/fahrzeuge.ts:5`](src/domain/fahrzeuge.ts#L5) | Fahrzeuge entstehen aus Vorlagen und durchlaufen dieselben Abschnitte wie Patienten |
| `domain.fuehrung` | [`src/domain/fuehrung.ts:5`](src/domain/fuehrung.ts#L5) | Rangfolge und Prüfung der Führungsrolle |
| `domain.gewicht` | [`src/domain/dosierung.ts:337`](src/domain/dosierung.ts#L337) | Körpergewicht - hinterlegt oder geschätzt |
| `domain.manvstufen` | [`src/domain/manvStufen.ts:4`](src/domain/manvStufen.ts#L4) | MANV-Stufen des Kreises Steinfurt -> kumulativer Fahrzeugbestand |
| `domain.massnahmenrechte` | [`src/domain/massnahmenrechte.ts:6`](src/domain/massnahmenrechte.ts#L6) | Je Sitzung einstellbare Durchführungs- und Delegationsziele |
| `domain.massnahmerecht` | [`src/domain/qualifikation.ts:30`](src/domain/qualifikation.ts#L30) | Wer eine Maßnahme durchführen darf, und an wen sie delegiert werden kann |
| `domain.material` | [`src/domain/material.ts:4`](src/domain/material.ts#L4) | Fahrzeug-Bestückung und Materialverbrauch je Maßnahme |
| `domain.notfallnarkose` | [`src/domain/massnahmen.ts:318`](src/domain/massnahmen.ts#L318) | Team aus RS + NotSan + NotArzt nötig |
| `domain.notfallnarkose_liste` | [`src/domain/dosierung.ts:319`](src/domain/dosierung.ts#L319) | Die drei Induktionsmittel der Notfallnarkose-Sammelauswahl |
| `domain.notfallnarkose_team` | [`src/domain/qualifikation.ts:121`](src/domain/qualifikation.ts#L121) | Team aus RS + NotSan + NotArzt gleichzeitig anwesend |
| `domain.qualifikation` | [`src/domain/qualifikation.ts:5`](src/domain/qualifikation.ts#L5) | Rangfolge und Prüfung der fachlichen Qualifikation |
| `domain.staerkemeldung` | [`src/domain/fuehrung.ts:69`](src/domain/fuehrung.ts#L69) | Reale Stärkemeldung einer Fahrzeugbesatzung |

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
| `generator.baukasten` | [`src/domain/szenarioGenerator.ts:17`](src/domain/szenarioGenerator.ts#L17) | Szenarien ohne Modell, ohne Schlüssel, ohne Netz |
| `generator.muster` | [`src/domain/szenarioGenerator.ts:74`](src/domain/szenarioGenerator.ts#L74) | Der Vorrat an Verletzungsmustern - hier erweitern |
| `generator.zielminute` | [`src/domain/szenarioGenerator.ts:470`](src/domain/szenarioGenerator.ts#L470) | Aus der gewünschten Todesminute wird die Verlaufsrate |

#### ki

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `ki.client` | [`src/lib/kiClient.ts:12`](src/lib/kiClient.ts#L12) | Szenario direkt erzeugen - mit Prüfschleife statt Copy-und-Paste |
| `ki.korrektur` | [`src/lib/kiPrompt.ts:124`](src/lib/kiPrompt.ts#L124) | Rückmeldung der Prüfung an das Modell |
| `ki.livetest` | [`src/lib/kiClient.live.test.ts:8`](src/lib/kiClient.live.test.ts#L8) | Echter Durchlauf gegen die API - nur mit Schlüssel |
| `ki.normalisieren` | [`src/lib/kiSchema.ts:152`](src/lib/kiSchema.ts#L152) | Räumt die Modellantwort auf, bevor sie geprüft wird |
| `ki.prompt` | [`src/lib/kiPrompt.ts:7`](src/lib/kiPrompt.ts#L7) | Der Auftrag an die KI - für den direkten Aufruf und zum Kopieren |
| `ki.schema` | [`src/lib/kiSchema.ts:6`](src/lib/kiSchema.ts#L6) | Das JSON-Schema, an das die KI gebunden wird |
| `ki.zugang` | [`src/lib/kiZugang.ts:2`](src/lib/kiZugang.ts#L2) | Wo der API-Schlüssel liegt - und was das bedeutet |

#### massnahmen

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `massnahmen.katalog` | [`src/domain/massnahmen.ts:5`](src/domain/massnahmen.ts#L5) | Alle Maßnahmen mit Dauer und Wirkung - hier neue ergänzen |
| `massnahmen.sofort` | [`src/domain/massnahmen.ts:1285`](src/domain/massnahmen.ts#L1285) | Lebensrettende Griffe der Schadensstelle |
| `massnahmen.veraltet` | [`src/domain/massnahmen.ts:1238`](src/domain/massnahmen.ts#L1238) | Was aus der Auswahl verschwindet, aber gültig bleibt |
| `massnahmen.voraussetzung` | [`src/domain/massnahmen.ts:1307`](src/domain/massnahmen.ts#L1307) | Was vor einer Maßnahme erledigt sein muss |
| `massnahmen.xabcde` | [`src/domain/massnahmen.ts:1250`](src/domain/massnahmen.ts#L1250) | Gruppierung und Reihenfolge der Maßnahmengruppen |

#### modell

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `modell.abschnitte` | [`src/domain/types.ts:386`](src/domain/types.ts#L386) | Die Stationen, die ein Patient durchläuft |
| `modell.delegation` | [`src/domain/types.ts:629`](src/domain/types.ts#L629) | Gezielte Freigabe einer Maßnahme für eine bestimmte Person |
| `modell.delegationsanfrage` | [`src/domain/types.ts:641`](src/domain/types.ts#L641) | Angefragte, noch nicht beantwortete Delegation |
| `modell.diagnostik` | [`src/domain/types.ts:595`](src/domain/types.ts#L595) | Einzelne Untersuchungen statt einer Rundumschau |
| `modell.fahrzeug` | [`src/domain/types.ts:402`](src/domain/types.ts#L402) | Fahrzeuge durchlaufen dieselben Stationen wie Patienten |
| `modell.finalsichtung` | [`src/domain/types.ts:668`](src/domain/types.ts#L668) | Vorläufig oder endgültig - die Anhängekarte zeigt es |
| `modell.fuehrung` | [`src/domain/types.ts:245`](src/domain/types.ts#L245) | Führung ist eine zweite Ebene neben der Qualifikation |
| `modell.kernwerte` | [`src/domain/types.ts:85`](src/domain/types.ts#L85) | Pflichtwerte einer Vorlage - der Rest wird aufgefüllt |
| `modell.koerperregion` | [`src/domain/types.ts:322`](src/domain/types.ts#L322) | Wo am Patienten das Problem sitzt - für das Körperschema |
| `modell.material` | [`src/domain/types.ts:455`](src/domain/types.ts#L455) | Verbrauchsmaterial, das eine Maßnahme aus einem Fahrzeug zieht |
| `modell.notfallnarkose` | [`src/domain/types.ts:307`](src/domain/types.ts#L307) | Nur mit vollem Team durchführbar |
| `modell.patient` | [`src/domain/types.ts:657`](src/domain/types.ts#L657) | Alles, was sich an einem Patienten im Einsatz ändert |
| `modell.patientvorlage` | [`src/domain/types.ts:559`](src/domain/types.ts#L559) | Felder, die ein neuer Szenario-Patient braucht |
| `modell.problem` | [`src/domain/types.ts:356`](src/domain/types.ts#L356) | Herzstück der Dynamik: Problem -> Vitalwertänderung pro Minute |
| `modell.qualifikation` | [`src/domain/types.ts:227`](src/domain/types.ts#L227) | Fünf Ausbildungsstufen von Basis bis Notärztin |
| `modell.sichtungskategorien` | [`src/domain/types.ts:12`](src/domain/types.ts#L12) | Die vier Sichtungskategorien und EX mit Farbe und Bedeutung |
| `modell.vitalwerte` | [`src/domain/types.ts:58`](src/domain/types.ts#L58) | Welche sechs Messwerte die Simulation führt |

#### modi

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `modi.liste` | [`src/domain/modi.ts:2`](src/domain/modi.ts#L2) | Die Trainingsmodi und ihr Ausbaustand |

#### monitor

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `monitor.alarme` | [`src/domain/monitor.ts:87`](src/domain/monitor.ts#L87) | Welche Grenzwerte gerade verletzt sind - gelb oder rot |
| `monitor.modell` | [`src/domain/monitor.ts:4`](src/domain/monitor.ts#L4) | Der Patientenmonitor - kontinuierliche Überwachung mit Alarm |

#### net

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `net.auswahl` | [`src/net/transportAuswahl.ts:7`](src/net/transportAuswahl.ts#L7) | Supabase, wenn konfiguriert - sonst der lokale Kanal |
| `net.lokal` | [`src/net/lokalerTransport.ts:5`](src/net/lokalerTransport.ts#L5) | Sitzungstransport über BroadcastChannel (ein Gerät) |
| `net.protokoll` | [`src/net/protokoll.ts:5`](src/net/protokoll.ts#L5) | Nachrichten zwischen Übungsleiter (Host) und Spielern |
| `net.supabase` | [`src/net/supabaseTransport.ts:6`](src/net/supabaseTransport.ts#L6) | Sitzungstransport über Supabase Realtime (Cross-Device) |
| `net.supabaseAuth` | [`src/net/supabaseAuth.ts:4`](src/net/supabaseAuth.ts#L4) | Anmeldung der Übungsleitung über Supabase Auth |
| `net.supabaseClient` | [`src/net/supabaseClient.ts:5`](src/net/supabaseClient.ts#L5) | Zugriff auf das Supabase-Projekt der Übungsleitung |
| `net.transport` | [`src/net/sitzungstransport.ts:4`](src/net/sitzungstransport.ts#L4) | Austauschbarer Kanal für eine Sitzung |

#### sichtung

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `sichtung.bewertung` | [`src/domain/triage.ts:134`](src/domain/triage.ts#L134) | Über- oder unterschätzt - Grundlage der Debriefing-Spalte |
| `sichtung.grenzwerte` | [`src/domain/triage.ts:32`](src/domain/triage.ts#L32) | Zahlen, an denen die Sichtung kippt (AF, RR, GCS, Rekapzeit) |
| `sichtung.tacstart` | [`src/domain/triage.ts:52`](src/domain/triage.ts#L52) | Der tacSTART-Algorithmus als Entscheidungskette |

#### sim

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `sim.befunde` | [`src/domain/simulation.ts:180`](src/domain/simulation.ts#L180) | Gehfähigkeit, Atmung und Reaktion folgen den Vitalwerten |
| `sim.bewusstlos` | [`src/domain/simulation.ts:257`](src/domain/simulation.ts#L257) | Guedel-/Wendl-Tubus wirken nur beim Bewusstlosen |
| `sim.diagnostik` | [`src/domain/simulation.ts:349`](src/domain/simulation.ts#L349) | Eine Untersuchung deckt genau ihren Befund auf |
| `sim.dosierung` | [`src/domain/simulation.ts:263`](src/domain/simulation.ts#L263) | Gewichtsbezogene Dosierung ersetzt die feste Wirkung |
| `sim.effektnurbeiproblem` | [`src/domain/simulation.ts:286`](src/domain/simulation.ts#L286) | Atemwegssicherung wirkt nur bei verlegtem Atemweg |
| `sim.gleitkomma` | [`src/domain/simulation.ts:56`](src/domain/simulation.ts#L56) | Warum intern nicht gerundet wird - sonst verschwindet jede Änderung |
| `sim.individualmedizin` | [`src/domain/simulation.ts:447`](src/domain/simulation.ts#L447) | Maß für Individualmedizin - Zeit jenseits der Sofortmaßnahmen |
| `sim.massnahme` | [`src/domain/simulation.ts:245`](src/domain/simulation.ts#L245) | Wirkung einer Maßnahme auf Probleme, Vitalwerte und Sichtungsbefunde |
| `sim.sichtungOffen` | [`src/domain/simulation.ts:396`](src/domain/simulation.ts#L396) | Steht an dieser Station noch eine Sichtung aus? |
| `sim.standardwerte` | [`src/domain/simulation.ts:36`](src/domain/simulation.ts#L36) | Unauffällige Vorgaben für die später ergänzten Werte |
| `sim.startzustand` | [`src/domain/simulation.ts:94`](src/domain/simulation.ts#L94) | Womit ein Patient in den Einsatz startet |
| `sim.tempo` | [`src/domain/simulation.ts:71`](src/domain/simulation.ts#L71) | Langsamere Verschlechterung im Alleinspiel |
| `sim.tick` | [`src/domain/simulation.ts:155`](src/domain/simulation.ts#L155) | Ein Simulationsschritt: Probleme wirken auf die Vitalwerte |
| `sim.tod` | [`src/domain/simulation.ts:133`](src/domain/simulation.ts#L133) | Ab welchen Werten ein Patient verstirbt |
| `sim.verlegung` | [`src/domain/simulation.ts:418`](src/domain/simulation.ts#L418) | Ortswechsel eines Patienten; Abtransport friert den Zustand ein |
| `sim.zeitkosten` | [`src/domain/simulation.ts:206`](src/domain/simulation.ts#L206) | Stellschrauben für Sichtungs- und Untersuchungsdauer |
| `sim.zeitraum` | [`src/domain/simulation.ts:220`](src/domain/simulation.ts#L220) | Längere Zeitsprünge in kleinen Schritten - für Maßnahmendauern |

#### sitzung

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `sitzung.modell` | [`src/domain/sitzung.ts:4`](src/domain/sitzung.ts#L4) | Rollen, Spieler und Code einer gemeinsamen Sitzung |

#### speicher

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `speicher.massnahmenrechte` | [`src/lib/speicher.ts:39`](src/lib/speicher.ts#L39) | Zuletzt eingestellte Qualifikations- und |
| `speicher.szenarien` | [`src/lib/speicher.ts:7`](src/lib/speicher.ts#L7) | Eigene Szenarien im Browser sichern |

#### state

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `state.aktionen` | [`src/state/reducer.ts:131`](src/state/reducer.ts#L131) | Alles, was der Übende auslösen kann |
| `state.aktionsbestaetigung` | [`src/state/SimulationProvider.tsx:38`](src/state/SimulationProvider.tsx#L38) | Bestätigte Nachrichten mit Wiederholung |
| `state.delegationsanfrage` | [`src/state/useDelegationsAnfrage.ts:12`](src/state/useDelegationsAnfrage.ts#L12) | Gemeinsame Logik hinter jedem "Anfragen"-Knopf |
| `state.phase` | [`src/state/reducer.ts:42`](src/state/reducer.ts#L42) | Die Hauptzustände der Anwendung |
| `state.provider` | [`src/state/SimulationProvider.tsx:82`](src/state/SimulationProvider.tsx#L82) | Rollen-bewusster Zustandsverteiler |
| `state.reducer` | [`src/state/reducer.ts:265`](src/state/reducer.ts#L265) | Wie Aktionen den Zustand verändern, inklusive Zeitkosten |
| `state.schnappschuss` | [`src/state/reducer.ts:189`](src/state/reducer.ts#L189) | Der geteilte, host-autoritative Ausschnitt des Zustands |
| `state.taktgeber` | [`src/state/taktgeber.ts:2`](src/state/taktgeber.ts#L2) | Hintergrundfester Taktgeber für die Simulationsuhr |
| `state.uhr` | [`src/state/SimulationProvider.tsx:22`](src/state/SimulationProvider.tsx#L22) | Der Taktgeber der laufenden Simulation |
| `state.zeitkosten` | [`src/state/zeitkosten.ts:8`](src/state/zeitkosten.ts#L8) | Wie lange eine Handlung den Handelnden bindet |
| `state.zustand` | [`src/state/reducer.ts:57`](src/state/reducer.ts#L57) | Der gesamte Zustand einer laufenden Übung |

#### stil

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `stil.anhaengekarte` | [`src/index.css:1506`](src/index.css#L1506) | Die Karte, ihre Farbreiter und die Einfärbung |
| `stil.bereichsseite` | [`src/index.css:1890`](src/index.css#L1890) | Vollbildseite mit stehendem Kopf |
| `stil.delegationsanfrage` | [`src/index.css:2370`](src/index.css#L2370) | Kandidatenwahl und Benachrichtigung der Delegation |
| `stil.editor` | [`src/index.css:626`](src/index.css#L626) | Formularfelder und Prueflisten des Szenario-Editors |
| `stil.einsatzleiste` | [`src/index.css:3285`](src/index.css#L3285) | Die angeheftete Leiste so flach wie möglich |
| `stil.einstieg` | [`src/index.css:364`](src/index.css#L364) | Direkter Spieler-/Übungsleitungs-Einstieg auf der Startseite |
| `stil.ersteindruck` | [`src/index.css:1943`](src/index.css#L1943) | Kompakte Befundchips statt gestapelter Zeilen |
| `stil.hover` | [`src/index.css:3029`](src/index.css#L3029) | Hover nur mit echtem Zeiger - sonst klebt der Zustand |
| `stil.massnahmenrechte` | [`src/index.css:274`](src/index.css#L274) | Übungsleitung stellt vor der Sitzung ein, wer was darf |
| `stil.mehrspieler` | [`src/index.css:361`](src/index.css#L361) | Einstieg (Startseite), Maßnahmenrechte und Wartebereich |
| `stil.modi` | [`src/index.css:553`](src/index.css#L553) | Karten der Trainingsmodus-Auswahl |
| `stil.patientnav` | [`src/index.css:1769`](src/index.css#L1769) | Navigation einzeilig - sie darf keine Bildhöhe fressen |
| `stil.sk-farbe` | [`src/index.css:156`](src/index.css#L156) | Kategoriefarbe als Variable - loest eine Spezifitaetsfalle |
| `stil.telefon` | [`src/index.css:3355`](src/index.css#L3355) | Anpassungen unter 760 px, inklusive Tabellenumbruch |
| `stil.tokens` | [`src/index.css:6`](src/index.css#L6) | Farben, Radien und Schatten der gesamten Oberfläche |
| `stil.touch` | [`src/index.css:3486`](src/index.css#L3486) | Mindestgroesse der Tippziele auf Touch-Geraeten |

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
| `test.abschnitte` | [`src/state/reducer.test.ts:166`](src/state/reducer.test.ts#L166) | Der Weg eines Patienten und die erlaubten Verlegungen |
| `test.atemweg` | [`src/domain/simulation.test.ts:224`](src/domain/simulation.test.ts#L224) | Sofortmaßnahmen und die Wirkung der Atemwegssicherung |
| `test.szenariodaten` | [`src/domain/simulation.test.ts:33`](src/domain/simulation.test.ts#L33) | Prueft, dass jede Szenario-Vorlage in sich stimmig ist |
| `test.szenariopruefung` | [`src/domain/szenarioPruefung.test.ts:9`](src/domain/szenarioPruefung.test.ts#L9) | Die Prüfung, durch die jedes importierte Szenario muss |
| `test.tacstart` | [`src/domain/triage.test.ts:42`](src/domain/triage.test.ts#L42) | Jeder Zweig des Sichtungsalgorithmus inklusive Grenzwerte |
| `test.tubus` | [`src/domain/simulation.test.ts:281`](src/domain/simulation.test.ts#L281) | Guedel- und Wendl-Tubus werden nur vom Bewusstlosen toleriert |
| `test.zeitkosten` | [`src/state/reducer.test.ts:59`](src/state/reducer.test.ts#L59) | Belegt, dass der Reducer selbst keine Zeit mehr vorspringen lässt |
| `test.zeitverlauf` | [`src/domain/simulation.test.ts:137`](src/domain/simulation.test.ts#L137) | Verschlechterung, Todesfaelle und Latenzzeiten |

#### ui

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `ui.abschnittsleiste` | [`src/components/Abschnittsleiste.tsx:5`](src/components/Abschnittsleiste.tsx#L5) | Reiter mit der Belegung je Abschnitt |
| `ui.alarmmelodie` | [`src/state/useMonitorAlarm.ts:27`](src/state/useMonitorAlarm.ts#L27) | Zwei corpuls³-nahe Alarmmuster nach IEC 60601-1-8 |
| `ui.analgesieauswahl` | [`src/components/Analgesieauswahl.tsx:24`](src/components/Analgesieauswahl.tsx#L24) | Ein Sammel-Button statt sechs Einzelknöpfe |
| `ui.anhaengekarte` | [`src/components/Anhaengekarte.tsx:21`](src/components/Anhaengekarte.tsx#L21) | Die Übersicht als Verletztenanhängekarte |
| `ui.app` | [`src/App.tsx:13`](src/App.tsx#L13) | Weiche zwischen den Hauptzustaenden der Anwendung |
| `ui.baukasten` | [`src/pages/uebungsleitung/BaukastenGenerator.tsx:7`](src/pages/uebungsleitung/BaukastenGenerator.tsx#L7) | Kostenfrei erzeugen - ohne Schlüssel, ohne Netz |
| `ui.befundtafel` | [`src/components/Befundtafel.tsx:13`](src/components/Befundtafel.tsx#L13) | Nur was erhoben wurde, ist zu sehen - und ein Tipp erhebt es |
| `ui.bereichsseite` | [`src/pages/patient/Bereichsseite.tsx:15`](src/pages/patient/Bereichsseite.tsx#L15) | Diagnostik, Maßnahmen und Verlegung als eigene Seite |
| `ui.debriefing` | [`src/pages/DebriefingSeite.tsx:30`](src/pages/DebriefingSeite.tsx#L30) | Auswertung nach dem Einsatz |
| `ui.delegationsanfrage` | [`src/components/DelegationAnfrageAuswahl.tsx:11`](src/components/DelegationAnfrageAuswahl.tsx#L11) | Popover: wen um Freigabe fragen? |
| `ui.delegationsbenachrichtigung` | [`src/components/DelegationBenachrichtigung.tsx:5`](src/components/DelegationBenachrichtigung.tsx#L5) | Benachrichtigung: jemand braucht eine Freigabe |
| `ui.dosiseingabe` | [`src/components/Dosiseingabe.tsx:12`](src/components/Dosiseingabe.tsx#L12) | Dosis in mg eingeben, live gegen das Körpergewicht gegengelesen |
| `ui.einfaerbung` | [`src/components/Anhaengekarte.tsx:34`](src/components/Anhaengekarte.tsx#L34) | Halb eingefärbt heißt vorläufig, ganz heißt endgültig |
| `ui.einsatzseite` | [`src/pages/EinsatzSeite.tsx:18`](src/pages/EinsatzSeite.tsx#L18) | Abschnittsliste oder Patientenseite |
| `ui.ersteindruck` | [`src/components/Ersteindruck.tsx:11`](src/components/Ersteindruck.tsx#L11) | Die fünf Befunde der Vorsichtung, ohne Messwerte |
| `ui.fahrzeugkonfiguration` | [`src/pages/FahrzeugkonfigurationSeite.tsx:8`](src/pages/FahrzeugkonfigurationSeite.tsx#L8) | Fahrzeuge vor Sitzungsbeginn: MANV-Stufe oder einzeln |
| `ui.fahrzeugverlegung` | [`src/components/FahrzeugVerlegung.tsx:7`](src/components/FahrzeugVerlegung.tsx#L7) | Fahrzeuge zwischen Abschnitten verlegen - nur mit Zugführer-Rang |
| `ui.kigenerator` | [`src/pages/uebungsleitung/KiGenerator.tsx:16`](src/pages/uebungsleitung/KiGenerator.tsx#L16) | Vom Modell erzeugen lassen - Zugang, Lauf, Befunde |
| `ui.koerperschema` | [`src/components/Koerperschema.tsx:6`](src/components/Koerperschema.tsx#L6) | Wo am Patienten etwas ist - Vorder- und Rückansicht |
| `ui.massnahmenliste` | [`src/components/Massnahmenliste.tsx:42`](src/components/Massnahmenliste.tsx#L42) | Das einklappbare xABCDE-Akkordeon |
| `ui.massnahmenrechte` | [`src/pages/MassnahmenrechteSeite.tsx:23`](src/pages/MassnahmenrechteSeite.tsx#L23) | Grundeinstellung: gleich zu Beginn, wer was darf |
| `ui.modus` | [`src/pages/ModusSeite.tsx:5`](src/pages/ModusSeite.tsx#L5) | Modus wählen - entscheidet, auf welche Art gespielt wird |
| `ui.monitor` | [`src/components/Monitor.tsx:18`](src/components/Monitor.tsx#L18) | Der Monitor in der Übersicht - Knopf zum Anschließen, dann live |
| `ui.monitoralarm` | [`src/state/useMonitorAlarm.ts:69`](src/state/useMonitorAlarm.ts#L69) | Der Alarmton - gestaffelt und nur im selben Abschnitt |
| `ui.notfallnarkoseauswahl` | [`src/components/Notfallnarkoseauswahl.tsx:27`](src/components/Notfallnarkoseauswahl.tsx#L27) | Induktionsmittel wählen, dann relaxieren - erst mit vollem Team |
| `ui.patienteditor` | [`src/pages/uebungsleitung/PatientEditor.tsx:34`](src/pages/uebungsleitung/PatientEditor.tsx#L34) | Formular für einen Szenario-Patienten samt Problemen |
| `ui.patientenansicht` | [`src/pages/patient/Patientenansicht.tsx:30`](src/pages/patient/Patientenansicht.tsx#L30) | Anhängekarte plus Knöpfe - eine Ansicht für alle Abschnitte |
| `ui.patientkarte` | [`src/components/PatientKarte.tsx:43`](src/components/PatientKarte.tsx#L43) | Kachel der Patientenliste - Einfärbung wie die Anhängekarte |
| `ui.patientseite` | [`src/pages/PatientSeite.tsx:8`](src/pages/PatientSeite.tsx#L8) | Rahmen der Patientenseite: Navigation und Blättern |
| `ui.setup` | [`src/pages/SetupSeite.tsx:7`](src/pages/SetupSeite.tsx#L7) | Szenarioauswahl für die Sitzung |
| `ui.sofortmassnahmen` | [`src/components/Sofortmassnahmen.tsx:20`](src/components/Sofortmassnahmen.tsx#L20) | Lebensrettende Griffe, dauerhaft in der Übersicht |
| `ui.start` | [`src/pages/StartSeite.tsx:10`](src/pages/StartSeite.tsx#L10) | Startseite: nur der Einstieg als Spieler oder Übungsleitung |
| `ui.szenarioeditor` | [`src/pages/uebungsleitung/SzenarioEditor.tsx:16`](src/pages/uebungsleitung/SzenarioEditor.tsx#L16) | Formular für ein ganzes Szenario mit laufender Prüfung |
| `ui.szenarioquelle` | [`src/pages/uebungsleitung/SzenarioQuelle.tsx:6`](src/pages/uebungsleitung/SzenarioQuelle.tsx#L6) | Zwei Wege zu einer neuen Lage - kostenfrei oder per Modell |
| `ui.uebungsleitung` | [`src/pages/UebungsleitungSeite.tsx:14`](src/pages/UebungsleitungSeite.tsx#L14) | Szenarien anlegen, prüfen, ein- und ausgeben |
| `ui.verlegung` | [`src/components/Verlegung.tsx:7`](src/components/Verlegung.tsx#L7) | Schaltflächen zum Verlegen, passendes Zelt hervorgehoben |
| `ui.wartebereich` | [`src/pages/WartebereichSeite.tsx:23`](src/pages/WartebereichSeite.tsx#L23) | Lobby vor dem Start - Code, Teilnehmende, Startknopf |
| `ui.zeitkostenanzeige` | [`src/components/Zeitkostenanzeige.tsx:5`](src/components/Zeitkostenanzeige.tsx#L5) | Laufender Zeitkosten-Timer sperrt die Bedienung |

#### vorlagen

| Anker | Datei | Bedeutung |
| --- | --- | --- |
| `vorlagen.neu` | [`src/lib/vorlagen.ts:5`](src/lib/vorlagen.ts#L5) | Startpunkte für neue Szenarien, Patienten und Probleme |

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
  automatisch, dass die hinterlegte Referenzkategorie zum tacSTART-Ergebnis passt.
- **CSS**: eine Datei, Klassennamen auf Deutsch, Farben über Variablen. Vorsicht
  bei Spezifitäten – `button:hover` schlägt eine einzelne Klasse
  (→ `stil.sk-farbe`).
- **Kontrast**: Normaler Text erreicht mindestens 4.5:1 gegen seinen Grund
  (WCAG AA). Deshalb gibt es zwei Blautöne (→ `stil.tokens`): `--akzent` für
  Text und Rahmen auf dunklem Grund, `--akzent-stark` als Fläche unter weißer
  Schrift. Eine gesättigte Farbe auf dem helleren `--bg-panel-hoch` wird mit
  `color-mix(… , var(--text))` eine Spur aufgehellt, statt die Kategoriefarbe
  selbst zu ändern.
- **Tippziele**: Auf Touch-Geräten sind Knöpfe, Auswahlfelder **und
  Eingabefelder** mindestens 44 px hoch (→ `stil.touch`).
- **Schmale Geräte**: Die Oberfläche darf bis hinunter zu 320 px nicht quer
  scrollen. Flex-Elemente mit langem Inhalt (`<select>`, lange Komposita)
  brauchen dafür `min-width: 0` – ohne das schrumpfen sie nie unter ihre
  Inhaltsbreite. `overflow-wrap: anywhere` ist dabei die falsche Wahl: Es
  senkt die Mindestbreite auf ein Zeichen und bricht Wörter senkrecht um.

## 7b. Versionen und Rückweg

Jeder abgeschlossene, geprüfte Stand wird als **Tag** `v<major>.<minor>.<patch>`
eingefroren - nicht als Branch. Ein Tag ist unveränderlich: Man kann nicht aus
Versehen darauf weiterentwickeln, und er bezeichnet immer exakt denselben
Stand. Ein Branch wandert dagegen mit jedem Commit weiter und taugt damit
gerade nicht als verlässlicher Rückweg. Entwickelt wird auf dem Arbeitsbranch.

### Welche Stelle wird hochgezählt

| Änderung | Beispiel | Neue Nummer |
| --- | --- | --- |
| Verhalten oder Funktion ändert sich | Zeitkosten laufen als Timer statt als Sprung; Login eingebaut | `0.2.0` → `0.3.0` |
| Korrektur oder Politur, Verhalten bleibt | Kontrast angehoben, Querscrollen behoben, totes CSS entfernt | `0.2.0` → `0.2.1` |
| Nur Text/Doku, kein Code | Quellenangabe ergänzt | gar keine neue Version |

Im Zweifel die kleinere Stufe: Eine Patch-Nummer zu viel schadet nicht, eine
zu grob zusammengefasste Version nimmt den genauen Rückweg.

### Bisherige Stände

| Tag | Stand |
| --- | --- |
| `v0.2.0` | UI-Audit abgeschlossen: Kontrast (WCAG AA), Tippziele, kein Querscrollen ab 320 px; Zeitkosten als Echtzeit-Timer; Sichtung ohne Zeitkosten |
| `v0.1` | Patientenseite als Anhängekarte, Befundtafel als Bedienfläche |

Daneben liegt der Branch `backup-vor-modus-umbau` - ein Rückweg aus der Zeit
vor dieser Systematik (Stand vor dem Umbau auf Login + Moduswahl).

### Ablauf für den nächsten Stand

Erst die Änderung fertigstellen und prüfen (`npm run typecheck`, `npm test`,
`npm run lint`, `npm run build`), dann:

```bash
# 1. Nummer in package.json heben und mitcommitten
# 2. Stand einfrieren - -a erzeugt ein annotiertes Tag mit Datum und Text
git tag -a v0.2.1 -m "Kurz: was dieser Stand kann"
git push origin v0.2.1

# Alte Stände ansehen
git tag -l                    # alle Versionen
git checkout v0.2.0           # nur anschauen

# Wirklich zurückgehen: neuen Branch aus dem alten Stand aufmachen
git checkout -b rueckweg-von-0.2.0 v0.2.0
```

So ist jede Versionsnummer ein Stand, der nachweislich lief.

## 8. Befehle

```bash
npm run dev            Entwicklungsserver
npm run test           332 Tests
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
| Fünf Qualifikationsstufen und die Maßnahmen unterhalb der NotSan-Stufe | Ausbildungsbroschüre Malteser Bildungszentrum Baden-Württemberg, Stand 05/2025 |
| Abgleich des gesamten Katalogs, Kontraindikationen, Kinderdosen, zugangsfreie Applikationswege | [SAA und BPR 2025 der ÄLRD in BW, BB, MV, NRW, SN, ST](https://www.aelrd-nrw.de/wp-content/uploads/2025/08/SAA_BPR_2025.pdf) (Stand 30.04.2025); [DBRD-Musteralgorithmen 2026](https://www.dbrd.de/images/algorithmen/DBRD_Musteralgorithmen_2026.pdf); [AWMF S3 Polytrauma 187-023](https://register.awmf.org/de/leitlinien/detail/187-023); ERC/RCUK 2025; Pyramidenprozess Anlage 3 |
| Sichtungskategorien und Eigenschutz vor der Vorsichtung | Bundesärztekammer, Sichtungskategorien; BBK, 6. Sichtungs-Konsensus-Konferenz |
| Sichtungskategorien SK I-IV | Bundeseinheitliche Systematik |
| tacSTART-Algorithmus und Grenzwerte | Ladehof, Redmer, Neitzel, Offterdinger, Kanz: „tacSTART als adaptierter Sichtungsalgorithmus in Bedrohungslagen", Notfall + Rettungsmedizin 21(6):469-477, 2018; öffentliche Checkliste „Checkliste Vorsichtung - tacSTART" (trema-europe.de); von Kreis Steinfurt in der MANV-Tasche referenziert (→ `domain.material`) |
| Tatsächliche Bestückung (welche Medikamente in welcher Konzentration wirklich mitgeführt werden) | [Bestückung RTW Kreis Steinfurt, Stand 01.02.2025](https://www.kreis-steinfurt.de/kv_steinfurt/Kreisverwaltung/%C3%84mter/Amt%20f%C3%BCr%20Bev%C3%B6lkerungsschutz/Rettungsdienst/Rettungsmittel/RTW%20Best%C3%BCckungsliste%20Februar%202025%20(Ausbau%20WAS)%20Kreis%20Steinfurt.pdf), ÄLRD Kreis Steinfurt |
| Überdosierungsschwellen und -wirkung der elf Medikamente jenseits der Analgesie (→ `domain.dosierung`) | LAST/Lidocain-Toxizität (EMCrit IBCC, Medscape); Amiodaron-IV-Toxizität (PMC4867816, PMC9199562); Anticholinerges Syndrom/Atropin (StatPearls NBK534798); Betablocker-Toxizität (Medscape 813342, LITFL); Midazolam-Fachinfo (FDA); Naloxon-Sicherheitsprofil/präzipitierter Entzug (PMC11089786); Nitroglycerin-Bezold-Jarisch-Reflex (AHA Circulation 54:624); Urapidil-Pharmakologie (ScienceDirect); Furosemid-Fachinfo Overdosage (Pfizer); Epinephrin-Fehldosierungsfälle (AME Case Reports, PMC6954811) |
| Notfallnarkose (RSI): Medikamentenauswahl, Dosierung, Team | Handlungsempfehlung zur prähospitalen Notfallnarkose beim Erwachsenen (DGAI/BAND, Notfall+Rettungsmedizin); Rocuronium-RSI-Dosis und Sicherheitsspanne (Notfall+Rettungsmedizin 2016, gasnarkose.at); Bestückung RTW Kreis Steinfurt Stand 01.02.2025 (Propofol, Thiopental, Rocuronium) |
| Fahrzeugbestand je MANV-Stufe (MANV-10 bis MANV-50plus) | Vorplanung für die Bewältigung großer (medizinischer) Schadenslagen im Kreis Steinfurt (MANV-Konzept), Stand 05.12.2019, Abschnitt 3 „Verfügbare Ressourcen" und 5.1-5.5 „Alarmierungsstufen" |
| Sollbesatzung je Fahrzeugtyp (→ `domain.fahrzeuge`) | GW-Rett: Freiwillige Feuerwehr Hörstel, Gerätewagen Rettungsdienst GW-RettD (Besatzung „1:2", derselbe Fahrzeugtyp/Standort wie im MANV-Konzept); GW-San/GW-Log: Wikipedia „Gerätewagen Sanität" und GW-L-KatS-Typenblatt (Doppelkabine für eine Staffel, 6 Plätze); AB-MANV: DIN 14505 / Wikipedia „Wechselladerfahrzeug" (Standardbesatzung des Wechselladerfahrzeugs, Führer/-in + Maschinist/-in); ELW 2: Wikipedia „Einsatzleitwagen" (Führungsgruppe, mindestens sechs Besatzungsmitglieder) |
| Fahrzeug-Bestückung und Materialverbrauch (→ `domain.material`) | RTW und NEF: „Bestückung RTW/NEF Kreis Steinfurt", je Stand 01.02.2025 (ÄLRD - vollständig ausgewertet), zzgl. „Bestückung Rucksacksysteme RTW/NEF" (der gemeinsame Notfallrucksack, die Sauerstoff-/Beatmungstasche und die Kindertasche, auf die beide Hauptlisten verweisen), „Packliste MANV/MANE-Tasche RTW/NEF", Stand 01.04.2023 (die mitgeführte MANV-Zusatztasche), und „Bestückung Desasterbag Kreis Steinfurt", Stand 01.02.2025 (ein vierter, nur vom NEF mitgeführter Notfallrucksack mit erweiterter invasiver Ausstattung); GW-San: BBK-Begleitheft „GW San: Mercedes Benz Sprinter 519 CDI DOKA 4x4" (Bund-Ausführung NRW, Bundesamt für Bevölkerungsschutz und Katastrophenhilfe - vollständig ausgewertet); AB-MANV: „Packliste AB ManV Kreis Steinfurt" (vollständig ausgewertet); KTW/GW-Rett rechnerisch aus diesen Quellen hergeleitet, klar als Schätzung gekennzeichnet |

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
