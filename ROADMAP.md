# Roadmap – DPS

Diese Roadmap beschreibt die geplanten **Bausteine** über den heutigen Stand
hinaus: Mehrspieler, Qualifikation (fachlich und Führung) sowie Material
(Fahrzeuge und Verbrauchsgüter). Sie ist ein lebendes Planungsdokument – die
Reihenfolge und der Zuschnitt können sich ändern, der rote Faden bleibt.

## Leitprinzipien

Warum die Bausteine additiv bleiben und nichts umgebaut werden muss:

- **Reine Domäne.** Die Spielregeln liegen framework-frei und getestet in
  `src/domain/`, getrennt von der Oberfläche. Neue Regeln kommen als eigene
  Bausteine dazu.
- **Ein Zustands-Kern.** Alles läuft über den zentralen Reducer
  (`src/state/reducer.ts`). Neue Konzepte sind neue Zustandsfelder und Aktionen,
  keine Umbauten.
- **Datengetrieben.** Fachinhalte stehen als Daten (wie der Maßnahmenkatalog nach
  SAA Kreis Steinfurt), nicht als Code. Reale Listen und Konzepte fließen als
  Datendateien ein.
- **Host-autoritativ.** Im Mehrspieler rechnet die Übungsleitung die Simulation
  und verteilt den Zustand. Qualifikation und Führung hängen an den Spieler-
  Identitäten, die dieses Modell bereits kennt.

**Legende:** ✅ fertig · 🔜 als Nächstes · 🟡 geplant · 💤 Horizont

---

## Baustein 1 – Mehrspieler

Mehrere spielen dieselbe Lage; die Übungsleitung eröffnet eine Sitzung, Spieler
treten über einen Code bei und warten im Wartebereich bis zum Start.

- ✅ **Stufe 1 – Fundament + lokaler Kanal.** Rollen (Übungsleitung/Spieler),
  Wartebereich, host-autoritativer Zustand, Transport-Schnittstelle mit
  `BroadcastChannel`-Umsetzung (mehrere Tabs eines Browsers), hintergrundfeste
  Uhr. Lokal über zwei Tabs spielbar, ohne Server. **Verifiziert.**
- ✅ **Stufe 2 – Supabase Realtime.** Echtes Cross-Device über
  Supabase-Realtime-Kanäle je Sitzungscode, hinter derselben
  Transport-Schnittstelle – dieselbe Nachrichtenform wie Stufe 1, nur über echte
  Geräte statt Tabs. Fällt ohne `.env` automatisch auf den lokalen Kanal zurück,
  keine Datenbank-Tabelle nötig. **Verifiziert:** Relay-Test gegen ein echtes
  Supabase-Projekt sowie ein voller Ablauf über zwei echte Geräte im selben
  WLAN (PC eröffnet, Handy tritt bei, erscheint in der Teilnehmerliste).
- ✅ **Stufe 3 – Übungsleiter-Konten.** Anmeldung mit E-Mail und Passwort
  (Supabase Auth); nur angemeldete Übungsleitungen eröffnen Sitzungen. Konten
  werden bewusst nicht in der App angelegt, sondern vorab im
  Supabase-Dashboard ("Authentication" -> "Add user") - die App bietet nur
  den Login. Ohne konfiguriertes Supabase ist die Übungsleitungs-Rolle
  komplett gesperrt (mit erklärendem Hinweis), Spieler treten weiterhin ohne
  Konto per Code bei. **Verifiziert:** Sperre ohne Supabase per Playwright,
  Fehlerpfad (falsche Zugangsdaten) direkt gegen die echte Supabase-Auth-API
  bestätigt (Fehlertext-Übersetzung passend zur echten Antwort) - der volle
  Login-Rundlauf über einen echten Browser ließ sich in der Sandbox wegen
  einer bekannten Proxy-Einschränkung nicht zusätzlich verifizieren.

**Braucht von außen:** ein kostenloses Supabase-Projekt (EU-Region, DSGVO) –
URL und anon key (Einrichtung siehe README, Abschnitt „Gemeinsam üben").

> Mehrspieler ist das Fundament: Qualifikation und Führung wirken erst richtig,
> wenn mehrere Personen mit verschiedenen Rollen zusammenspielen.

---

## Baustein 2 – Qualifikation (fachlich)

Wer welche Maßnahme durchführen darf, richtet sich nach der fachlichen
Ausbildung.

- ✅ **Fertig und verifiziert.** Fünf Ausbildungsstufen statt drei, entlang der
  ehrenamtlichen und hauptamtlichen Ausbildungskette: `basis`
  (Sanitätshelfer/-in, Einsatzsanitäter/-in), `rettungshelfer` (medizinisch
  identischer Umfang wie `basis` - der Unterschied ist einsatztaktisch: Fahren
  unter Sonder-/Wegerechten, Funk, Klinikpraktikum -, deshalb ohne eigene
  Maßnahmen im Katalog), `rettungssanitaeter` (u. a. Larynxtubus/-maske
  sicher beherrscht, erweiterte Fahrzeugrettung, regional auch Sauerstoff/
  Aktivkohle), `notsan` (Notfallsanitäter/-in nach § 2a NotSanG, unverändert)
  und `notarzt` (unverändert). Grundlage: Ausbildungsbroschüre Malteser
  Bildungszentrum Baden-Württemberg, Stand 05/2025.
  - Larynxmaske von `notsan` auf `rettungssanitaeter` abgesenkt (RS
    beherrscht laut Broschüre sicher alternative Atemwegshilfen).
  - Drei neue Maßnahmen ergänzt, die es vorher nicht gab: **Reanimation (HLW)
    mit AED** (`basis` - Teil der SAN/ES-Grundausbildung), **Spineboard-/
    KED-Rettung aus dem Fahrzeug** (`rettungssanitaeter` - erweiterte
    Rettungstechnik) und **Medizinische Kohle (Aktivkohle) p.o.**
    (`rettungssanitaeter` - regional unterschiedlich freigegeben).
  1. **Konfigurierbar statt fest, als allererster Schritt:** Durchführungs-
     stufe und Delegationsziel je Maßnahme (`MassnahmeRecht`) - der Katalog
     liefert nur den Ausgangswert. Die Übungsleitung stellt beide direkt nach
     der Anmeldung ein, noch vor der Szenariowahl (die Rechte gelten
     unabhängig von der Lage); die Einstellung wird auf ihrem Gerät
     gespeichert und beim nächsten Mal vorgeschlagen, bleibt aber jederzeit
     änderbar.
  2. **Jede Person stellt ihre eigene Qualifikation selbst ein** im
     Wartebereich (Standard: `basis`) - keine Fremdzuweisung.
  3. Maßnahmen über der eigenen Stufe sind im Einsatz gesperrt und zeigen den
     Grund ("erfordert NotSan").
  4. **Delegation:** Wer eine Maßnahme durchführen darf, darf sie auch
     delegieren - eine eigene Schwelle "wer darf delegieren" gibt es bewusst
     nicht. Konfigurierbar ist stattdessen das Ziel: "Delegieren an" legt
     fest, welche Stufe die Freigabe empfängt (z. B. Durchführen ab NotArzt,
     Delegieren an NotSan - dann darf ein/e NotSan die Maßnahme nach Freigabe
     für den Patienten ausführen, ohne selbst durchführungsberechtigt zu
     sein). "Nicht delegierbar" schließt die Freigabe für eine Maßnahme ganz
     aus - dann gibt es auch für qualifizierte Durchführende keinen
     Freigeben-Knopf. Freigabe gilt gezielt für einen Patienten, ohne
     Zeitkosten.
  5. Enforcement bewusst nur clientseitig (kooperatives Übungstool) - passt zum
     host-autoritativen Modell, ohne das Netzprotokoll zu erweitern. Die
     konfigurierte Regel ist Teil des Schnappschusses, damit alle Clients
     dieselbe Sperre durchsetzen.

**Abhängigkeit:** Baustein 1 (Spieler-Identität). **Nicht Teil dieses
Bausteins:** Gruppenführer/-in aus derselben Ausbildungsreihe - das ist
Baustein 3 (Führung).

---

## Baustein 3 – Führung

Führung ist eine **zweite, eigene Ebene** neben der fachlichen Qualifikation –
nicht „darf mehr behandeln", sondern **andere Rechte**.

- 🟡 **Teilweise fertig.** Pro Spieler eine Führungsrolle (`Fuehrungsrolle`:
  `truppfuehrer` / `gruppenfuehrer` / `zugfuehrer` / `orgl_rd` / `lna`, Rang
  aufsteigend - OrgL RD und LNA teilen sich bewusst denselben Spitzenrang, da
  beide reale, gleichrangige Spitzenfunktionen ohne Rangfolge zueinander
  sind). Anders als die Qualifikation (jede Person stellt sie selbst ein)
  **weist die Übungsleitung die Führungsrolle zu** - passend zum realen
  Vorbild einer Kommandobenennung.
  - ✅ **Fahrzeuge und Material disponieren:** umgesetzt (→ Baustein 4). Ab
    Zugführer aufwärts darf Besatzung zugewiesen und ein Fahrzeug zwischen
    Einsatzabschnitten verlegt werden; die Übungsleitung darf das immer,
    unabhängig von einer eigenen Führungsrolle.
  - 💤 **Noch offen:** Kräfte/Patienten gezielt zuweisen, Einsatzabschnitte
    eröffnen und zuordnen, Transporte freigeben - als Konzept
    (`Fuehrungsrolle`/`erfuelltFuehrung`) bereits vorhanden, aber noch nicht
    auf die bestehende, ungegatete Patientenverlegung angewendet.
  - Enforcement wie bei Baustein 2 bewusst nur clientseitig.
- So behandelt ein NotSan ohne Führungsrolle, teilt aber keine Kräfte ein; eine
  OrgL koordiniert, ohne selbst zu intubieren.

**Abhängigkeit:** Baustein 1; sinnvoll gemeinsam mit Baustein 2 gedacht.

---

## Baustein 4 – Material & Logistik

Der größte neue Baustein, aber klar abgegrenzt und datengetrieben aus realen
Listen und Konzepten.

- ✅ **Verbrauchsgüter** (58 Materialtypen: Tourniquet, Sauerstoff, Zugänge,
  Atemwegshilfen, Immobilisation, Medikamente …): als Bestand je Fahrzeug
  modelliert (`Fahrzeug.material`), datengetrieben aus realen Bestückungs-
  listen (RTW/NEF Kreis Steinfurt inkl. gemeinsamem Rucksacksystem,
  MANV-Tasche und - nur NEF - Desasterbag, BBK-Begleitheft GW-San, Packliste
  AB-MANV Kreis Steinfurt - vollständig ausgewertet; KTW/GW-Rett daraus
  hergeleitet). 60 Maßnahmen
  ziehen bei Ausführung 1 Einheit vom Bestand eines Fahrzeugs im selben
  Einsatzabschnitt; ist dort nichts mehr da, sperrt die Maßnahme. Ohne
  Fahrzeuge im Spiel (Solo) unbegrenzt wie bisher.
  - 💤 **Noch offen:** kein Nachschub/Umlagern zwischen Fahrzeugen (nur über
    `fahrzeugVerlegen`, ein Fahrzeug mit Bestand an den Ort bringen).
- 🟡 **Fahrzeuge** (RTW, NEF, KTW, GW-Rett, GW-San, AB-MANV, ELW 2, GW-Log) als
  eigene, einzeln zuweisbare Objekte, datengetrieben aus dem MANV-Konzept
  Kreis Steinfurt (Stand 05.12.2019, Abschnitt 3 „Verfügbare Ressourcen" und
  5.1–5.5 „Alarmierungsstufen"):
  - Die Übungsleitung wählt vor Sitzungsbeginn entweder eine MANV-Stufe
    (MANV-10 bis MANV-50plus - füllt den Fahrzeugbestand mit einem Klick nach
    der Kreis-Steinfurt-Tabelle) oder stellt Fahrzeuge einzeln zusammen;
    beides lässt sich danach von Hand nachjustieren.
  - Besatzung (Spieler-IDs) wird schon im Wartebereich pro Fahrzeug
    zugewiesen, durch die Übungsleitung oder eine Person mit Führungsrolle ab
    Zugführer.
  - In der laufenden Übung verlegt ein Zugführer (oder die Übungsleitung) ein
    Fahrzeug zwischen Einsatzabschnitten - über dieselbe Abschnitts-Graph-Logik
    wie die bestehende Patientenverlegung, ohne eigenen Graphen.
  - Bewusst nur die Kernfahrzeuge, kein EE/PTZ-10/BHP-B 50/BTP-B 500/
    SEG-Notärzte - das bleibt Ausbau.
  - 💤 **Noch offen:** Kapazität (Transportplätze je Kategorie) und die
    Verbindung mit dem Transport-Abschnitt: Aus „Patient verlegen" wird
    „Patient mit diesem Fahrzeug abtransportieren" – mit Fahrzeit und
    begrenzten Plätzen. `Verlegung.tsx`/`patientVerlegen` bleiben bewusst
    unangetastet, Fahrzeuge und Patienten laufen als zwei unabhängige Listen
    nebeneinander her.

**Abhängigkeit:** wirkt am stärksten mit Baustein 2/3 (wer disponiert, wer hat
welche Qualifikation an Bord).

---

## Baustein 5 – Sprechfunk

- ✅ **Echte Live-Sprachverbindung (WebRTC)** in frei wählbaren Rufgruppen
  (Kanal 1-3, Führung) statt Text: wer einen Kanal wählt, verbindet sich
  direkt (Mesh, kein eigener Medienserver) mit jeder anderen Person auf
  demselben Kanal - echtes, bidirektionales Gespräch für alle Beteiligten.
  Eine Sprechen-Umschalttaste hält das Mikrofon standardmäßig stumm, wie bei
  einem echten Funkgerät. Ersetzt den ersten, kurzlebigen Text-Funkkanal
  (`DPS-0.6`) vollständig. Ein gescheiterter eigener Mikrofonzugriff
  (Berechtigung verweigert, keine Hardware) blockiert die Verbindung nicht
  mehr komplett - klare Fehlermeldung statt stiller Funkstille (`DPS-0.7.1`).
- ✅ **Optionaler TURN-Server** per `.env` (Metered.ca, → `net.turnAnbieter`,
  `DPS-0.7.2`) - nur mit STUN allein finden zwei Geräte hinter je eigenem
  NAT (z. B. beide im Mobilfunknetz) oft keine direkte Verbindung, das war
  der Grund für "Funkgeräte bekommen keine Verbindung" bei zwei Handys im
  selben Mobilfunknetz. Ohne hinterlegte Zugangsdaten läuft alles
  unverändert mit reinem STUN weiter (zuverlässig nur im selben Netz); ein
  Fehlschlag beim Abrufen der TURN-Zugangsdaten blockiert nichts.
- ✅ **Erzwungener Relay-Fallback nach 8 s** (`DPS-0.7.3`) - selbst mit
  konfiguriertem TURN-Server blieb eine Verbindung zwischen zwei Geräten im
  selben Mobilfunknetz weiterhin hängen: das Netz liefert scheinbar
  brauchbare direkte ICE-Kandidaten, die tatsächlich nicht funktionieren,
  ICE bevorzugt sie trotzdem vor dem funktionierenden Relay. Bleibt eine
  Verbindung länger als 8 Sekunden im Status "verbindet", wird einmal
  automatisch mit `iceTransportPolicy: 'relay'` neu verhandelt (`restartIce`
  + neues Angebot) - erzwingt den TURN-Server statt endlos zu warten.
- ✅ **Dreifache Signalisierung** (`DPS-0.7.4`) - selbst mit Relay-Fallback
  blieb eine Verbindung zwischen zwei Geräten im selben Mobilfunknetz
  weiterhin ohne Erfolg. Der Transport liefert ohne Zustellgarantie
  (→ `net.protokoll`), über ein Mobilfunknetz geht dabei öfter mal eine
  einzelne Nachricht verloren als im WLAN - eine ICE-Verhandlung besteht
  aus vielen Einzelnachrichten (Angebot, Antwort, oft ein Dutzend
  Kandidaten), fehlt auch nur einer, bleibt die Verbindung aus, ohne dass
  irgendwo ein Fehler auftaucht. Jede Signalnachricht wird jetzt dreifach
  im Abstand von 700ms verschickt statt nur einmal; erneutes Anwenden
  derselben Nachricht ist harmlos.
- ✅ **Diagnose je Kanalmitglied** (`DPS-0.7.5`) - trotz TURN-Server,
  Relay-Fallback und dreifacher Signalisierung blieb eine Verbindung
  zwischen zwei Geräten im selben Mobilfunknetz weiterhin ohne Erfolg.
  Ohne Entwicklerkonsole auf dem Handy war bisher nicht erkennbar, woran
  es liegt. Ein "Diagnose"-Knopf je Mitglied zeigt jetzt: ob TURN-Zugangsdaten
  geladen wurden, welche ICE-Kandidatentypen (host/srflx/relay) gesendet
  und empfangen wurden, aufgetretene ICE-Fehler
  (`RTCPeerConnection.onicecandidateerror`) und einen zeitgestempelten
  Verbindungsverlauf - als Text zum Kopieren, um ihn weiterzugeben.
- ✅ **TURN-Fehlgrund in der Diagnose** (`DPS-0.7.6`) - "TURN-Server geladen:
  nein" allein unterschied nicht zwischen "Umgebungsvariablen fehlen im
  Build" und "Metered.ca meldet einen Fehler/ist nicht erreichbar". Genau
  das war der reale Befund: bei zwei Handys im Mobilfunknetz zeigte die
  Diagnose "TURN-Server geladen: nein" auf beiden Seiten, ohne erkennbaren
  Grund - `holeTurnServer()` liefert jetzt zusätzlich einen Klartext-Grund
  mit (fehlende `.env`-Werte, HTTP-Status, Zeitüberschreitung, ungültige
  Antwort), sichtbar direkt in der Diagnose.
- ✅ **Großzügigeres TURN-Abruf-Zeitlimit + ein Wiederholungsversuch**
  (`DPS-0.7.7`) - die Diagnose auf echten Handys im Mobilfunknetz zeigte
  "TURN-Server geladen: nein - Load failed". Ein direkter Aufruf derselben
  Abruf-Adresse im Handy-Browser lieferte aber sofort die richtigen
  Zugangsdaten - das Netz war also erreichbar, nur das eingebaute
  Zeitlimit von 5 Sekunden war für einen Verbindungsaufbau zu einem noch
  nie besuchten Server über Mobilfunk zu knapp bemessen (Safari meldet
  einen so abgebrochenen Abruf zudem als unspezifisches "Load failed"
  statt als erkennbaren Timeout). Jetzt 12 Sekunden je Versuch, dazu ein
  zweiter Versuch bei Fehlschlag, bevor endgültig auf STUN zurückgefallen
  wird.
- ✅ **Hostname in der TURN-Diagnose + getrimmte Umgebungsvariablen**
  (`DPS-0.7.8`) - trotz 12 Sekunden Zeitlimit und Wiederholungsversuch
  zeigte die Diagnose auf echten Handys im Mobilfunknetz weiterhin
  "TURN-Server geladen: nein - Load failed", diesmal mit einer gesamten
  Verbindungsdauer weit unter dem Zeitlimit - kein Timeout also. Ein
  direkter Aufruf derselben Abruf-Adresse im Handy-Browser lieferte
  wieder sofort die richtigen Zugangsdaten. Naheliegender Verdacht: ein
  unsichtbares Leerzeichen oder ein Zeilenumbruch beim Eintragen der
  Umgebungsvariablen in Vercels Oberfläche, das eine leicht kaputte
  Abruf-Adresse baut. App-Name und API-Key werden jetzt beim Einlesen
  getrimmt, und jede Fehlermeldung nennt zusätzlich den tatsächlich
  verwendeten Hostnamen - damit zeigt die nächste Diagnose entweder eine
  erfolgreiche Verbindung (falls das die Ursache war) oder den genauen
  Hostnamen zum Abgleich.
- ✅ **TURN-Verbindung zwischen zwei Mobilfunk-Geräten bestätigt** (`DPS-0.7.9`,
  keine Code-Änderung) - der Hostname in der Diagnose (`DPS-0.7.8`) zeigte
  die tatsächliche Ursache sofort: ein falsch eingetragener
  `VITE_METERED_APP_NAME` in Vercel, keine Verstümmelung, kein Zeitlimit,
  kein Netzwerkfehler. Nach Korrektur des App-Namens in Vercel und
  Neu-Deployment live auf zwei echten Geräten im selben Mobilfunknetz
  getestet: Verbindung steht. Damit ist die seit `DPS-0.7.1` verfolgte
  Fehlerkette "Funkgeräte bekommen keine Verbindung" abgeschlossen.
  - 💤 **Noch offen:** feste Kanalliste (keine Übungsleitungs-Einstellung),
    kein Sprecher-Aktivitäts-Indikator, kein Protokoll/Debriefing der
    Sprache, Halten statt Umschalten für die Sprechtaste.

---

## Baustein 6 – Führungsebenen

Baut auf Baustein 1–5 auf: die digitale Übung bekommt eine Regie-Ebene für die
Übungsleitung und - schrittweise - je eine eigene, gescopte Ansicht für
Zugführer, Gruppenführer, Truppführer, OrgL RD und LNA. Diese Übung
("Verschmelzung" aus Digitalübung und Führungsebenen) trainiert
Menschenführung: eine Führungskraft leitet echte Mitspieler:innen an, die die
eigentliche Behandlung durchführen - anders als eine später denkbare, hier
bewusst zurückgestellte "reine Führungsübung", die nur den
taktisch-strategischen Teil (Raumordnung, Ressourcenverteilung) ohne
Menschenführung trainieren würde.

**Versionsschema:** `DPS-0.8.<Ebene>.<Patch>` - die dritte Stelle wählt die
Ebene (0 Übungsleiter, 1 Zugführer, 2 Gruppenführer, 3 Truppführer, 4 OrgL RD,
5 LNA), die vierte bleibt wie gewohnt für reine Korrekturen. Jede Ebene und
jeder Patch bekommt einen eigenen Rückweg-Branch.

- ✅ **Fundament (`DPS-0.8.0.0`)** - Übungsleiter-Ebene, Teil 1:
  - Neuer Einsatzabschnitt **Ablage**, ein zur Schadensstelle gleichwertiger,
    aber eigenständiger Startpunkt (RD nicht an der Schadensstelle) - gleiche
    Fähigkeiten (Vorsichtung, lebensrettende Sofortmaßnahmen), reine
    Wiederverwendung der bestehenden Verlegungslogik.
  - **Freigabemodus** (`sofort`/`gestaffelt`), von der Übungsleitung vor
    Sitzungsstart gewählt: `sofort` entspricht dem bisherigen Verhalten, bei
    `gestaffelt` starten alle Patienten verdeckt (neuer, für Spieler
    unsichtbarer Zustand) und werden erst durch manuelle oder zeitgesteuerte
    Freigabe sichtbar - Spieler beginnen dann nur mit der Einsatzmeldung, ohne
    jede Patientenliste.
  - Dritte Rolle **Beobachter** neben Übungsleitung und Spieler - tritt nur
    über einen gesondert geteilten Einladungscode bei (kein offener Beitritt
    über den normalen Sitzungscode), hat aber dieselbe Sicht und dieselben
    Rechte wie die Übungsleitung.
  - Rollen-gefilterter **Regie-Funkkanal**, getrennt von den normalen
    Rufgruppen - dieselbe Sprechfunk-Infrastruktur, nur für Übungsleitung und
    Beobachter sichtbar.
- ✅ **Bindende Maßnahmen, Narkose (`DPS-0.8.0.1`)** - Übungsleiter-Ebene,
  Teil 2 (Narkose-Hälfte):
  - Maßnahmen mit `benoetigtTeam` (bisher nur die drei
    Notfallnarkose-Induktionsmittel) lösen jetzt eine echte Kollegenanfrage
    aus, statt nur eine Möglichkeits-Prüfung zu sein
    (`notfallnarkoseTeamVerfuegbar` gab es schon, aber ohne Wirkung). Die
    durchführende Person (NotArzt) startet die Maßnahme, zwei offene
    Anfragen (NotSan, Rettungssanitäter/-in) gehen an alle passenden,
    verfügbaren Personen im selben Abschnitt.
  - Neues, geteiltes **"gebunden"-Feld** je Spieler - anders als der
    bisherige, rein lokale Zeitkosten-Timer für alle Clients sichtbar. Erst
    wenn beide Rollen angenommen haben, wirkt die Maßnahme wirklich und alle
    drei Beteiligten sind gebunden.
  - Bindungsdauer deckt bei Narkose zusätzlich die nachfolgende Intubation
    ab (`bindetZusaetzlichSek`, 180s) - dasselbe Team bleibt bis zur
    gesicherten Atemwegssicherung gebunden, nicht nur für die
    Medikamentengabe.
  - Live mit drei echten Clients (NotArzt + NotSan + Rettungssanitäter/-in)
    verifiziert: Anfrage-Benachrichtigung, Bindungsanzeige und automatisches
    Anwenden nach vollständigem Team funktionieren zusammen.
  - ✅ **Fundament, Teil 2 damit komplett** - der letzte offene Punkt (private
    Spieler-Statusansicht) ist mit `DPS-0.8.0.15` fertig.
- ✅ **Rettung eingeklemmter Personen (`DPS-0.8.0.2`)** - Übungsleiter-Ebene,
  Teil 2 (Rettungs-Hälfte):
  - Ein Patient kann im Szenario `eingeklemmtBeimStart` tragen (z. B. B-04 im
    Busunfall-Szenario) - bei der eigentlichen Freigabe (sofort oder
    gestaffelt) wird live gewürfelt, ob ein Spineboard/KED-System nötig ist
    (50/50) und wie viele zusätzliche Kolleg:innen (0-2) die Rettung braucht,
    nicht im Szenario vorherbestimmt.
  - Solange nicht gerettet, sind nur Kommunikation und Diagnostik möglich -
    jede körperkontakt- oder materialbasierte Maßnahme sowie die Verlegung
    bleiben gesperrt.
  - Eigenes Panel auf der Patientenseite: "Unterstützung anfragen" (nutzt
    dieselbe Kollegenanfrage-Infrastruktur wie die Narkose, aber offen für
    jede passende Person statt rollen-gebunden), Material bereitstellen,
    und - nur für Übungsleitung/Beobachter - "Rettung durchführen", sobald
    Material und Team bereitstehen (dieselbe Dauer wie die bestehende
    `fahrzeugrettung`-Maßnahme, 240s).
  - Live mit drei echten Clients verifiziert: Kollegenanfrage-Toast,
    Materialbereitstellung, Team-Gating (Rettung bleibt gesperrt, solange zu
    wenige Kolleg:innen zugesagt haben) und vollständige Freigabe aller
    Beteiligten nach der Rettung.
- ✅ **Regie-Panel (`DPS-0.8.0.3`)** - Übungsleiter-Ebene, Teil 2
  (Ablaufsteuerung-Verlegung, kleinster Zuschnitt):
  - Neues, aufklappbares **Regie-Panel** (nur Übungsleitung/Beobachter, wie
    der Sprechfunk als Knopf-plus-Panel) bündelt zwei Dinge: die
    Ablaufsteuerung (Pause/Weiter, Tempo, Einsatz beenden - vorher immer
    sichtbar in der Einsatzleiste) und ein neues **Freigabe-Panel** für
    verdeckte Patienten im gestaffelten Modus - `patientFreigeben` hatte
    trotz vollständigem Reducer bislang keine Bedienung.
  - Die Einsatzleiste zeigt jetzt für alle Rollen nur noch den reinen Status
    ("läuft"/"pausiert"), die Bedienelemente sind in die Regie gewandert.
  - Freigabemodus (sofort/gestaffelt) wird jetzt im Wartebereich vor
    Sitzungsstart gewählt statt nur im Reducer zu existieren.
  - Bewusst kleinster Zuschnitt statt der vollen `RegieSeite.tsx` aus der
    ursprünglichen Planung: Gesamtlagebild und Ereignis-Panel fehlen noch die
    nötigen Bausteine (Geodaten, Ereignis-Injektion) - kein Grund, deswegen
    die Übungsleitung von der normalen Patientenansicht auszusperren.
  - Live mit zwei echten Clients verifiziert: gestaffelter Start, Freigabe
    eines Patienten erscheint sofort in der Ablage des Spielers,
    Pause/Weiter wirkt synchron.
- ✅ **Gesamtlagebild (`DPS-0.8.0.4`)** - Übungsleiter-Ebene, Teil 2
  (Kacheln-Ansicht, gebilligtes Mockup vollständig umgesetzt):
  - Neuer Regie-Startbildschirm **`GesamtlagebildSeite.tsx`** ersetzt für
    Übungsleitung/Beobachter die Abschnitt-für-Abschnitt-Ansicht als ersten
    Bildschirm im Einsatz - ein Kärtchen je Abschnitt wechselt weiterhin in
    die gewohnte Detailsicht zum eigentlichen Behandeln, ein Zurück-Knopf
    führt wieder in die Übersicht.
  - **Kennzahlen-Leiste** (vier Kacheln: Patienten gesamt mit
    SK-Verteilungsbalken, Kräfte im Einsatz mit gebunden/frei, Fahrzeuge vor
    Ort nach Typ, offene Anfragen) fasst zusammen, was sonst verstreut war
    (Sichtungszähler in der Einsatzleiste, Fahrzeuge nur je Abschnitt,
    Anfragen nur als Toast).
  - **Abschnitte-Kacheln**: Patientenzahl, SK-Chips, anwesende Kräfte (mit
    Bindungs-Marker) und Fahrzeuge je Abschnitt - hervorgehoben bei einem
    SK-I-Patienten oder einer gebundenen Kraft.
  - **Seitenleiste** mit vier Panels, drei davon komplett neu: Ablage
    · Freigabe (erweitert das Regie-Panel um einen Countdown zur nächsten
    zeitgesteuerten Freigabe und eine neue Sammel-Freigabe
    `alleVerdecktenFreigeben`), Gebundene Kräfte (unterscheidet eine noch
    werbende Anfrage von einer echten kurzen Restzeit rein anhand der
    vorläufigen Bindungsdauer, ohne zusätzliches Datenfeld), Offene
    Anfragen (Delegationen und Kollegenanfragen erstmals Regie-weit statt
    nur als Toast bei den Betroffenen) und Funkkanäle (wer steht auf
    welchem Kanal).
  - Kein neuer Datenpfad - jede Kachel liest ausschließlich bereits
    vorhandene Felder.
  - Live mit drei echten Clients verifiziert: Kennzahlen, Alle-freigeben,
    Navigation in die Detailsicht und zurück, vollständiger
    Narkose-Kollegenanfrage-Zyklus (offene Anfrage → Team komplett →
    Bindungsanzeige mit Countdown), Funkkanal-Übersicht.
- ✅ **Geodaten & Kartenansicht (`DPS-0.8.0.5`)** - Übungsleiter-Ebene, Teil 2
  (Geodaten, voller Umfang inkl. echter Fahrzeit-Berechnung):
  - Komplett neue, optionale Datenschicht: ein Szenario kann `geodaten`
    mitbringen - schematische Koordinaten für seine Schlüsselpunkte
    (`GeoPosition`) und Wege zwischen Abschnitten (`RouteVorlage`/`Route`)
    mit Distanz und Sperrstatus. Ohne Geodaten funktioniert ein Szenario
    unverändert weiter.
  - **Ersetzt konsequent die bisher pauschale `VERLEGUNGSDAUER_SEK`** (30s
    für jede Patienten-/Fahrzeugverlegung) durch `verlegungsdauerSek()`:
    echte, distanzbasierte Dauer, wo eine passende Route existiert, sonst
    Fallback auf die alte Pauschale. Eine gesperrte Route bleibt passierbar,
    kostet aber einen festen Zeitaufschlag (`sperraufschlagSek`) - dieselbe
    "verzögert, nicht blockiert"-Linie wie überall sonst in der Simulation.
  - Neue, per Umschalter erreichbare **Kartenansicht** im Gesamtlagebild:
    schematische SVG-Darstellung (keine echten Kartenkacheln) mit einem
    Marker je Schlüsselpunkt (Patienten-/Fahrzeugzahl im Etikett), Wegen als
    Linien mit Distanz-Label (gesperrt: gestrichelt und orange), Legende und
    einer Orte-Liste in der Seitenleiste - der Umschalter erscheint nur,
    wenn das Szenario tatsächlich Geodaten mitbringt.
  - Busunfall-Szenario mit vollständigen, plausiblen (nicht real
    vermessenen) Koordinaten und Distanzen für alle neun Schlüsselpunkte
    hinterlegt - wie schon die feste Rufgruppenliste ein "sinnvoller
    Standard", keine sourcierte Angabe. Eine Route (Bereitstellungsraum →
    Schadensstelle) startet gesperrt, als Beispiel für den Sperraufschlag.
  - Live verifiziert: Kartenansicht mit allen neun Markern, gesperrte Route
    sichtbar als Linie und Label, Orte-Liste in der Seitenleiste, echte
    (statt pauschale) Verlegungsdauer in der Patientenansicht.
- ✅ **Gesamtlagebild als eine Ansicht (`DPS-0.8.0.6`)** - Übungsleiter-Ebene,
  Teil 2 (rein strukturelle Zusammenführung):
  - Das schwebende **Regie-Panel** (`DPS-0.8.0.3`) entfällt vollständig -
    Ablaufsteuerung und die vier Seitenleisten-Panels aus dem Gesamtlagebild
    (`DPS-0.8.0.4`) sind jetzt fünf gleichberechtigte Bereiche einer
    **Bereichswahl**-Leiste unterhalb der Kacheln/Karte, im selben
    Tab-plus-Vollbild-Muster wie die Patientenansicht (Klick auf einen
    Reiter öffnet eine Vollbildseite mit "← Zurück", Escape schließt
    ebenfalls).
  - Jeder Reiter trägt dieselbe Zähler-Marke wie zuvor die Panel-Badges
    (verdeckte Patienten, gebundene Kräfte, offene Anfragen, belegte
    Kanäle) - die vier Seitenleisten-Komponenten selbst sind unverändert,
    nur ohne eigenen Kasten-Rahmen (den liefert jetzt die Bereichsseite
    einheitlich).
  - Kein neuer Datenpfad, keine Reducer-Änderung - reine UI-Umstrukturierung
    auf ausdrücklichen Wunsch, dieselbe Bereichs-Umschaltung wie in der
    Spieler-Ansicht auch für die Regie zu verwenden.
  - Live verifiziert: alle fünf Bereiche öffnen/schließen korrekt,
    Ablaufsteuerung wirkt weiterhin synchron (Pause/Weiter, Tempo),
    Kartenansicht-Umschalter unverändert erreichbar, keine Konsolenfehler.
- ✅ **Regie-Seitenleiste, ein-/ausklappbar (`DPS-0.8.0.7`)** -
  Übungsleiter-Ebene, Teil 2 (Layout-Rückbau auf ausdrücklichen Wunsch):
  - Löst die Bereichswahl-Tabs samt Vollbildseiten aus `DPS-0.8.0.6` wieder
    ab: alle fünf Panels (Ablaufsteuerung, Ablage · Freigabe, Gebundene
    Kräfte, Offene Anfragen, Funkkanäle) stehen jetzt dauerhaft gestapelt in
    einer Seitenleiste neben der Kacheln-/Kartenansicht, jedes wieder mit
    eigenem Kasten-Rahmen und Titel (Rückbau der in `DPS-0.8.0.6` entfernten
    Panel-Wrapper).
  - Ein einzelner Knopf oben in der Leiste klappt alle fünf Panels auf
    einmal ein oder aus - eingeklappt bleibt nur ein schmaler Streifen mit
    dem Knopf übrig, die Kacheln-/Kartenansicht nutzt dann die volle Breite.
  - Kein neuer Datenpfad, keine Reducer-Änderung - reine Layout-Umstellung,
    die vier Seitenleisten-Komponenten und das Ablaufsteuerung-Panel selbst
    sind inhaltlich unverändert.
  - Live verifiziert: alle fünf Panel-Titel sichtbar, Ein-/Ausklappen wirkt
    sofort (Sidebar-Breite 320px → ca. 25px und zurück), Ablaufsteuerung
    (Pause/Weiter, Tempo) funktioniert direkt in der Leiste ohne
    zusätzlichen Klick, Kartenansicht-Umschalter unverändert erreichbar,
    keine Konsolenfehler.
- ✅ **Regie-Seitenleiste als Ansichts-Menü (`DPS-0.8.0.8`)** -
  Übungsleiter-Ebene, Teil 2 (Klarstellung: "Sidebar wie ein Menü"):
  - Löst das gestapelte Seitenleisten-Layout aus `DPS-0.8.0.7` ab: die
    Seitenleiste ist jetzt ein echtes Menü über alle sieben Ansichten
    (Kacheln, Karte, Ablaufsteuerung, Ablage · Freigabe, Gebundene Kräfte,
    Offene Anfragen, Funkkanäle) - immer nur eine Ansicht gleichzeitig in
    der Hauptfläche sichtbar, ein Klick im Menü wechselt sie.
  - Der bisherige eigenständige Kacheln/Karte-Umschalter oben entfällt -
    Kacheln und Karte sind jetzt die ersten beiden Menüpunkte (Karte nur,
    wenn das Szenario Geodaten mitbringt).
  - Jeder Menüpunkt trägt weiterhin dieselbe Status-Marke wie zuvor die
    Panel-Badges (läuft/pausiert, wartend-Zähler, gebundene Kräfte, offene
    Anfragen, belegte Kanäle) - auch für nicht ausgewählte Ansichten auf
    einen Blick sichtbar.
  - Derselbe Ein-/Ausklapp-Knopf wie in `DPS-0.8.0.7` blendet jetzt das
    komplette Menü aus, die Hauptfläche nutzt dann die volle Breite.
  - Kein neuer Datenpfad, keine Reducer-Änderung - reine Layout-Umstellung.
  - Live verifiziert: alle sieben Menüpunkte vorhanden, Klick auf einen
    Punkt zeigt ausschließlich dessen Ansicht (alle anderen verschwinden
    aus der Hauptfläche), Ablaufsteuerung (Pause/Weiter, Tempo) funktioniert
    innerhalb der gewählten Ansicht, Ein-/Ausklappen wirkt sofort, keine
    Konsolenfehler.
- ✅ **Regie-Menü bleibt eingeklappt erreichbar (`DPS-0.8.0.9`)** -
  Übungsleiter-Ebene, Teil 2 (Klarstellung: Activity-Bar-Muster statt
  Verschwinden):
  - Der Ein-/Ausklapp-Knopf aus `DPS-0.8.0.8` ließ das Menü beim Einklappen
    komplett verschwinden - jetzt bleibt es als schmale, aber vollständig
    bedienbare Leiste bestehen, ähnlich der Activity-Bar in vielen
    IDE-/Desktop-Apps: dieselben sieben Knöpfe bleiben sichtbar und
    anklickbar, nur die Beschriftung bricht auf zwei Zeilen um und die
    Status-Marke fällt aus Platzgründen weg.
  - Jede Ansicht ist damit jederzeit mit einem Klick erreichbar, ohne das
    Menü erst wieder ausklappen zu müssen.
  - Die Grid-Spalte der Seitenleiste folgt jetzt ihrer tatsächlichen Breite
    (`auto` statt fest `320px`) - eingeklappt bleibt keine leere Fläche
    mehr übrig, die Hauptfläche nutzt den gewonnenen Platz sofort.
  - Kein neuer Datenpfad, keine Reducer-Änderung - reine Layout-Umstellung.
  - Live verifiziert: alle sieben Knöpfe bleiben im eingeklappten Zustand
    sichtbar und funktionsfähig (Ablaufsteuerung inkl. Pause/Weiter,
    Kartenansicht direkt anwählbar), keine Leerfläche rechts, keine
    Konsolenfehler.
- ✅ **Regie-Menü: Icons + Sidebar am linken Rand auf schmalen
  Bildschirmen (`DPS-0.8.0.10`)** - Übungsleiter-Ebene, Teil 2 (zwei
  Verfeinerungen des Ansichts-Menüs aus `DPS-0.8.0.9`):
  - Sieben schlichte, einfarbige Strich-Icons (neue `RegieMenueIcons.tsx`,
    kein Icon-Set eingebunden) ersetzen den bisherigen zweizeilig
    umbrechenden Text im eingeklappten Zustand - jeder Menüpunkt bleibt
    damit auf einen Blick unterscheidbar, auch ohne Beschriftung;
    ausgeklappt stehen Icon und Beschriftung nebeneinander.
  - Die Seitenleiste bleibt auf schmalen Bildschirmen (≤980px) ein
    Rand-Streifen links neben der Hauptfläche statt darunter zu rutschen -
    ein `order: -1` im Grid stellt sie visuell nach vorn, ohne die
    DOM-Reihenfolge (und damit die Tab-Reihenfolge) zu ändern; eingeklappt
    schrumpft sie auf eine 56px breite Icon-Leiste, die weiterhin jeden
    Klick zum Ansicht-Wechsel entgegennimmt.
  - Kein neuer Datenpfad, keine Reducer-Änderung - reine UI-Verfeinerung.
  - Live verifiziert (Desktop und mobiler Viewport 390×844): alle sieben
    Icons vorhanden, im eingeklappten Zustand nur noch Icons sichtbar
    (kein Text), Ansicht per Icon-Klick auch eingeklappt wechselbar,
    mobile Seitenleiste steht links auf gleicher Höhe wie die Hauptfläche
    statt darunter, keine Konsolenfehler.
- ✅ **Regie-Menü bleibt beim Scrollen stehen (`DPS-0.8.0.11`)** -
  Übungsleiter-Ebene, Teil 2 (letzte Verfeinerung des Ansichts-Menüs):
  - Die Seitenleiste scrollte bislang mit der Hauptfläche mit - bei einer
    langen Kacheln- oder Panel-Ansicht verschwand das Menü nach oben aus
    dem sichtbaren Bereich.
  - `position: sticky` hält sie jetzt wie die bereits angeheftete
    Einsatzleiste (→ `ui.einsatzleiste`) direkt unterhalb von ihr fest,
    während der Inhalt darunter/daneben weiterscrollt - ein `top`-Wert
    knapp über der gemessenen Kopfzeilen-Höhe (113-120px) verhindert eine
    Überlappung, `max-height` + `overflow-y: auto` fangen sehr niedrige
    Bildschirme ab.
  - Gilt unverändert für ausgeklappten und eingeklappten Zustand, Desktop
    wie Mobil.
  - Kein neuer Datenpfad, keine Reducer-Änderung - reine CSS-Änderung.
  - Live verifiziert: Sidebar bleibt nach dem Scrollen sichtbar knapp
    unter der Einsatzleiste (Desktop und Mobil), ein Menüpunkt lässt sich
    auch nach dem Scrollen anklicken, keine Konsolenfehler.
- ✅ **Sichtungsleiste + Ablaufsteuerung zurück in der Kopfzeile
  (`DPS-0.8.0.12`)** - Übungsleiter-Ebene, Teil 2 (Wunsch per annotiertem
  Screenshot präzisiert):
  - Die Sichtungskategorien-Übersicht (SK I-EX + Offen) zieht aus der
    Einsatzleiste aus und bekommt eine eigene, ganz oben angeheftete Zeile
    über die volle Breite (`.sichtungsleiste`) - darunter bleibt die
    Einsatzleiste mit Titel, Lagemeldung und Uhr angeheftet, beide Zeilen
    zusammen `position: sticky`.
  - Pause/Tempo/Einsatz-beenden (Ablaufsteuerung) stehen wieder hier statt
    im Ansichts-Menü aus `DPS-0.8.0.8`/`.9` - nur für Übungsleitung/
    Beobachter (→ `domain.regiefuehrend`), Spieler sehen weiterhin nur den
    reinen Status und ihren Verlassen-Knopf.
  - Das Ansichts-Menü hat dadurch nur noch sechs statt sieben Punkte (kein
    „Ablaufsteuerung“ mehr), `AblaufsteuerungPanel.tsx` entfällt
    vollständig.
  - Die `top`-Offsets der angehefteten Elemente (Einsatzleiste,
    Verbindungsfehler-Hinweis, Regie-Menü) sind bewusst in `px` statt
    `rem` gesetzt, weil die Seite eine von 16px abweichende
    Root-Schriftgröße (15px) verwendet - mit `rem` hätte es je nach Basis
    zu Überlappungen kommen können (in einer früheren Fassung dieser
    Änderung tatsächlich passiert und live gefunden).
  - Kein neuer Datenpfad, keine Reducer-Änderung - reine Layout-Umstellung.
  - Live verifiziert (Desktop und Mobil, mit erzwungenem Scrollen): keine
    Überlappung zwischen Sichtungs- und Einsatzleiste, Pause/Weiter-Knopf
    funktioniert in der Kopfzeile, ein Menüpunkt bleibt nach dem Scrollen
    anklickbar, keine Konsolenfehler.
- ✅ **Ereignis-Injektion (`DPS-0.8.0.13`)** - Übungsleiter-Ebene, Teil 2
  (letzter offener Punkt aus dem Fundament, Teil 2, `DPS-0.8.0.1`):
  - Neuer siebter Punkt **„Ereignisse"** im Ansichts-Menü, nur für
    Übungsleitung/Beobachter, mit drei Ereignistypen.
  - **Fahrzeugausfall:** ein Knopf je Fahrzeug markiert es als ausgefallen
    (`Fahrzeug.ausgefallen`) - Besatzung und Materialbestand bleiben
    zugeordnet, das Fahrzeug liefert aber kein Material mehr
    (→ `domain.material`), bis die Übungsleitung den Ausfall wieder aufhebt.
    Reine Regie-Markierung, jederzeit umkehrbar.
  - **Nachforderung:** ein Knopf je Fahrzeugtyp erzeugt ein neues, unbesetztes
    Fahrzeug mit voller Materialausstattung im Bereitstellungsraum (bislang
    nur als Zielabschnitt für Verlegungen vorgesehen, jetzt auch als
    Startpunkt) - muss von dort wie jedes andere Fahrzeug verlegt werden,
    echte Geodaten-basierte Fahrzeit inklusive.
  - **Lageänderung:** löst vorab im Szenario hinterlegte, bislang komplett
    unsichtbare Nachzügler-Patienten aus (neues `Szenario.ereignisse`-Feld,
    → `modell.ereignis`) - anders als die bestehende
    verdeckt/gestaffelt-Freigabe existieren diese Patienten vor dem Auslösen
    gar nicht in `state.patienten`. Landen je nach Freigabemodus an der
    Schadensstelle (sofort) oder in der Ablage (gestaffelt), pro Ereignis nur
    einmal auslösbar. Für den Busunfall zwei neue, gegen `tacstartAbweichung`
    geprüfte Patienten (B-11 SK3, B-12 SK2) hinterlegt.
  - Kein neuer Zeitkosten-Eintrag nötig (fällt wie jede unbekannte Aktion auf
    `0` zurück).
  - Live verifiziert: Fahrzeugausfall in beide Richtungen (Marke
    erscheint/verschwindet), Nachforderung erzeugt sichtbar ein neues
    Fahrzeug, Lageänderung erhöht „Patienten gesamt" und die neuen Patienten
    erscheinen an der Schadensstelle, Knopf danach deaktiviert - keine
    Konsolenfehler.
- ✅ **Debriefing-Erweiterung (`DPS-0.8.0.14`)** - Übungsleiter-Ebene, Teil 2
  (letzter Punkt aus dem Fundament, Teil 2, wörtlich der bisherige
  Horizont-Punkt „Ressourceneinsatz und Führungsentscheidungen"):
  - **Ressourceneinsatz** ohne neuen State: `berechneMaterialverbrauch`
    vergleicht je Fahrzeug die Bestückung, mit der sein Typ immer startet
    (`materialAusVorlage`, unabhängig vom Eintreffzeitpunkt - auch eine
    Nachforderung aus `DPS-0.8.0.13`), mit dem aktuellen Bestand und summiert
    die Differenz je Materialtyp über alle Fahrzeuge (nur tatsächlich
    verbrauchte Typen, absteigend sortiert) - dazu zwei neue Kennzahlen
    (Fahrzeuge im Einsatz, davon ausgefallen).
  - **Führungsentscheidungen** dagegen als neues, nur wachsendes
    Protokollfeld `state.regieProtokoll` (derselbe `Verlaufseintrag`-Zeilentyp
    wie `Patient.verlauf`, nur auf Sitzungsebene) - eine Zeile je Pause/Weiter,
    Tempoänderung, Einzel-/Sammelfreigabe, Fahrzeugausfall, Nachforderung,
    Lageänderung sowie Start/Ende der Übung, über einen neuen
    `protokolliereRegie`-Helfer im Reducer, geteilt über den bestehenden
    Schnappschuss.
  - Beide Auswertungen erscheinen als neue Debriefing-Abschnitte, nur wenn es
    etwas zu zeigen gibt (keine Fahrzeuge/kein Protokoll → Abschnitt bleibt
    weg) - kein Eingriff in bestehende Abläufe.
  - Live verifiziert: nach Pause/Weiter, Tempo ×4, Fahrzeugausfall,
    Nachforderung und einer ausgelösten Lageänderung zeigt das Debriefing acht
    chronologisch korrekte Protokollzeilen und die richtige
    Fahrzeug-Kennzahl (2 im Einsatz, 1 ausgefallen), keine Konsolenfehler.
- ✅ **Private Spieler-Statusansicht "Mein Einsatz" (`DPS-0.8.0.15`)** -
  Übungsleiter-Ebene, Teil 2 (letzter Punkt aus dem Fundament, Teil 2 - auf
  Wunsch: eine zusätzliche Debriefing-Seite, auf der ein Spieler sieht, was
  er genau gemacht hat):
  - Der Reducer kannte bislang bei Maßnahme/Diagnostik/Sichtung/Verlegung
    keine Spieler-Zuordnung (nur teambasierte Aktionen wie Kollegenanfrage/
    Delegation/Rettung hatten schon eine Spieler-ID) - für eine echte
    persönliche Historie war deshalb eine Reducer-Erweiterung nötig, keine
    reine UI-Änderung.
  - Neues Feld `state.spielerProtokoll` (spielerId, patientId, zeitSek,
    text). Zwei Helfer füllen es: `protokolliereSpieler` für explizite Texte
    (Rettungskette) und `uebernimmVerlaufInSpielerprotokoll`, der den
    ohnehin schon an `patient.verlauf` angehängten Text unverändert
    übernimmt (Diagnostik, Sichtung, Maßnahme, Verlegung) statt ihn zu
    duplizieren - erkennt per Längenvergleich von `verlauf` vorher/nachher,
    ob überhaupt etwas passiert ist.
  - Team-Aktionen kreditieren alle Beteiligten mit derselben Zeile: eine
    abgeschlossene Notfallnarkose alle drei, eine abgeschlossene Rettung
    anfragende Person und alle Helfer:innen.
  - Fünf Aktionen bekamen dafür ein optionales `spielerId`-Feld
    (`state.sitzung.eigeneId`, im Einzelspiel `undefined` - dort
    protokolliert der Reducer bewusst nichts, die Haupttabelle deckt dort
    ohnehin schon alles ab), mitgegeben an allen acht betroffenen
    UI-Dispatch-Stellen. Die Debriefing-Seite filtert `spielerProtokoll`
    beim Lesen auf die eigene `sitzung.eigeneId` - keine getrennte
    Speicherung je Spieler.
  - Live mit zwei echten Clients verifiziert: Übungsleitung und Spieler
    sichten je einen anderen Patienten - jede Person sieht in "Mein Einsatz"
    ausschließlich die eigene Zeile, nie die der anderen Person, keine
    Konsolenfehler.
- 💤 **Noch offen:** je eine eigene Ansicht für Zugführer (`DPS-0.8.1.x`),
  Gruppenführer (`DPS-0.8.2.x`), Truppführer (`DPS-0.8.3.x`), OrgL RD
  (`DPS-0.8.4.x`), LNA (`DPS-0.8.5.x`); die reine Führungsübung
  (taktisch-strategisch, Raumordnung) als eigenes, späteres Bauvorhaben mit
  eigener Versionsleiter.

**Abhängigkeit:** Baustein 1-5 (Mehrspieler-Fundament, Qualifikation, Führung,
Material, Sprechfunk).

---

## Horizont (später)

Weiter denkbar, sobald die Bausteine 1–5 stehen:

- 💤 **Patientenfluss** über mehrere Behandlungsplätze und Zielkliniken.
- 💤 **Nachschub** knapper Güter.
- 💤 **Debriefing weiter ausbauen:** die Grundform (Materialverbrauch,
  Fahrzeug-Kennzahlen, Führungsentscheidungs-Zeitleiste) ist mit
  `DPS-0.8.0.14` fertig - denkbar bliebe z. B. eine Aufschlüsselung nach
  Einsatzabschnitt oder nach handelnder Person statt nur Sitzungs-weit.
- 💤 **Persistenz/Export** der Ergebnisse (PDF/CSV).
- 💤 **Serverseitiger Takt.** Löst die Bindung „Übungsleitungs-Tab muss offen
  bleiben" auf – entweder ein dauerhaft laufender Rechendienst (braucht echtes
  Server-Hosting, nicht nur Supabase) oder ein zeitstempel-basiertes Nachrechnen
  auf Abruf statt Dauer-Takt (baut auf der bestehenden Technik für die
  hintergrundfeste Uhr auf, → `state.taktgeber`). Nur nötig, falls sich das in
  der Praxis als echte Einschränkung zeigt.

---

## Reihenfolge & Abhängigkeiten

Jeder Schritt ist eigenständig nutzbar:

1. **Mehrspieler fertig** ✅ (Stufe 1-3) – Fundament, an dem Qualifikation und
   Führung hängen. Alle drei Stufen sind verifiziert im Einsatz.
2. **Qualifikation** ✅ fertig · **Führung** 🟡 teilweise (Fahrzeugdisposition
   fertig, Kräfte-/Patientenzuweisung und Transportfreigabe offen).
3. **Material/Logistik** – Fahrzeuge 🟡 teilweise fertig (Zuweisung, Besatzung,
   Verlegung, Kapazität/Transport-Kopplung offen); **Verbrauchsgüter** ✅ fertig
   (Bestückung je Fahrzeug, Materiallimit für ~50 Maßnahmen, kein Nachschub).
4. **Sprechfunk** ✅ fertig (echte Live-Sprachverbindung in frei wählbaren
   Rufgruppen, TURN-Server optional per `.env` nachrüstbar).
5. **Führungsebenen** 🟡 teilweise (Fundament der Übungsleiter-Ebene
   **komplett fertig**: Freigabemodus, Ablage, Beobachter-Rolle,
   Regie-Funkkanal, Bindende Maßnahmen, Rettung eingeklemmter Personen,
   echte Geodaten-basierte Verlegungsdauer, eine eigene angeheftete
   Sichtungskategorien-Zeile samt Ablaufsteuerung (Pause/Tempo/Einsatz
   beenden) in der Einsatzleiste, ein Gesamtlagebild, dessen
   Regie-Seitenleiste als Menü mit eigenen Icons über die übrigen sechs
   Ansichten (Kacheln, Karte, Freigabe, Gebundene Kräfte, Offene Anfragen,
   Funkkanäle) wirkt, auch eingeklappt vollständig erreichbar bleibt und auf
   schmalen Bildschirmen am linken Rand steht statt darunter zu rutschen,
   Ereignis-Injektion (Fahrzeugausfall, Nachforderung, Lageänderung), die
   Debriefing-Erweiterung um Ressourceneinsatz und Führungsentscheidungen
   sowie die private Spieler-Statusansicht "Mein Einsatz"; die fünf übrigen
   Ebenen offen).

## Ehrliche Grenzen

Nicht „geht nicht", sondern „kostet":

- **Aufwand.** Jeder Baustein ist ein eigenes Stück Arbeit; die Reihenfolge hält
  das Ganze beherrschbar.
- **Cross-Device** braucht die Supabase-Zugangsdaten von dir (Stufe 2 ist
  code-seitig fertig) – und weiterhin einen offenen Übungsleitungs-Tab
  während der Übung (host-autoritatives Modell, siehe „Horizont": ein
  serverseitiger Takt wäre der Ausbau, um das aufzuheben).
- **Fachliche Richtigkeit & Balancing** ist die eigentliche Kunst: Regeln sind
  schnell gebaut, aber realistische Zeiten, Verbräuche und Verläufe müssen
  fachlich stimmen. Dafür ist Input aus echten Konzepten entscheidend.

## Was von außen gebraucht wird

- **Supabase-Projekt** (kostenlos, EU-Region) – eingerichtet und in Betrieb
  seit Stufe 2. Für Stufe 3 (Übungsleiter-Konten) reicht dasselbe Projekt.
- **Führungsrollen und Entscheidungsrechte:** Ränge (TrFü/GrFü/ZgFü/OrgL RD/
  LNA) und Fahrzeugdisposition sind nach eurem Konzept umgesetzt; Kräfte-/
  Patientenzuweisung und Transportfreigabe brauchen noch euer Konzept – für
  den Rest von Baustein 3.
- **Fahrzeuglisten:** MANV-Konzept Kreis Steinfurt liefert bereits die
  Kernfahrzeuge je MANV-Stufe. **Verbrauchsgüterlisten** liegen für RTW und
  NEF (Kreis Steinfurt, inkl. Rucksacksystem und MANV-Tasche), GW-San (BBK)
  und AB-MANV (Kreis Steinfurt) real vor; nur KTW/GW-Rett sind noch
  hergeleitet – bei Bedarf eigene Listen dafür, für mehr Genauigkeit als die
  aktuelle Schätzung.
