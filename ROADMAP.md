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

## Horizont (später)

Weiter denkbar, sobald die Bausteine 1–5 stehen:

- 💤 **Patientenfluss** über mehrere Behandlungsplätze und Zielkliniken.
- 💤 **Nachschub** knapper Güter.
- 💤 **Erweitertes Debriefing:** nicht nur Sichtungskategorien, sondern auch
  Ressourceneinsatz und Führungsentscheidungen.
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
