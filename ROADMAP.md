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
- 🟡 **Stufe 3 – Übungsleiter-Konten.** Anmeldung mit E-Mail und Passwort
  (Supabase Auth); nur angemeldete Übungsleitungen eröffnen Sitzungen.

**Braucht von außen:** ein kostenloses Supabase-Projekt (EU-Region, DSGVO) –
URL und anon key (Einrichtung siehe README, Abschnitt „Gemeinsam üben").

> Mehrspieler ist das Fundament: Qualifikation und Führung wirken erst richtig,
> wenn mehrere Personen mit verschiedenen Rollen zusammenspielen.

---

## Baustein 2 – Qualifikation (fachlich)

Wer welche Maßnahme durchführen darf, richtet sich nach der fachlichen
Ausbildung.

- **Ausgangslage:** Jede Maßnahme trägt **heute schon** ihre nötige Stufe
  (`qualifikation`: aktuell `basis` / `notsan` / `notarzt`). Die Regel steckt in
  den Daten, wird aber noch nicht durchgesetzt.
- 🟡 **Geplant:**
  1. Stufen auf die reale Ausbildung verfeinern (z. B. SanH → RettSan → NotSan →
     NotArzt).
  2. Jeder Spieler bekommt beim Beitritt eine Qualifikation (die Übungsleitung
     vergibt sie im Wartebereich).
  3. Maßnahmen über der eigenen Stufe sind gesperrt.
  4. **Delegation:** Höherqualifizierte können einzelne Maßnahmen freigeben.

**Abhängigkeit:** Baustein 1 (Spieler-Identität). **Aufwand:** überschaubar, da
die Datengrundlage steht.

**Braucht von außen:** die realen Qualifikationsstufen und ihre Befugnisse.

---

## Baustein 3 – Führung

Führung ist eine **zweite, eigene Ebene** neben der fachlichen Qualifikation –
nicht „darf mehr behandeln", sondern **andere Rechte**.

- 🟡 **Geplant:** Pro Spieler eine Führungsrolle (z. B. TrFü / GrFü / ZgFü /
  OrgL / LNA) mit eigenen Befugnissen:
  - Kräfte und Patienten zuweisen,
  - Einsatzabschnitte eröffnen und zuordnen,
  - Transporte freigeben,
  - Fahrzeuge und Material disponieren (→ Baustein 4).
- So behandelt ein NotSan ohne Führungsrolle, teilt aber keine Kräfte ein; eine
  OrgL koordiniert, ohne selbst zu intubieren.

**Abhängigkeit:** Baustein 1; sinnvoll gemeinsam mit Baustein 2 gedacht.

**Braucht von außen:** die Führungsrollen und ihre Entscheidungsrechte nach eurem
Konzept.

---

## Baustein 4 – Material & Logistik

Der größte neue Baustein, aber klar abgegrenzt und datengetrieben aus realen
Listen und Konzepten.

- 🟡 **Verbrauchsgüter** (Tourniquet, Sauerstoff, Medikamente …): als Bestände
  modelliert, die Maßnahmen aufbrauchen. Der Mechanismus für Voraussetzungen
  existiert im Kern bereits (`benoetigtEinesVon`, etwa i.v.-Zugang vor
  i.v.-Medikament); ein Verbrauchsfeld ergänzt ihn.
- 💤 **Fahrzeuge** (RTW, NEF, GW-San …): tragen Kapazität (Transportplätze je
  Kategorie), Material und Personal mit Qualifikation an Bord. Sie verbinden sich
  mit dem bestehenden **Transport-Abschnitt**: Aus „Patient verlegen" wird
  „Patient mit diesem Fahrzeug abtransportieren" – mit Fahrzeit und begrenzten
  Plätzen. Knappheit wird spürbar.

**Abhängigkeit:** wirkt am stärksten mit Baustein 2/3 (wer disponiert, wer hat
welche Qualifikation an Bord).

**Braucht von außen:** reale Material- und Fahrzeuglisten (als Tabelle/Konzept) –
sie werden zu Datendateien.

---

## Horizont (später)

Weiter denkbar, sobald die Bausteine 1–4 stehen:

- 💤 **Meldewege/Kommunikation** zwischen den Rollen.
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

1. **Mehrspieler fertig** (Stufe 3 folgt) – Fundament, an dem Qualifikation und
   Führung hängen. Stufe 1 und 2 sind verifiziert im Einsatz.
2. **Qualifikation + Führung** – schneller Gewinn, Datengrundlage teils vorhanden.
3. **Material/Logistik** – erst Verbrauchsgüter, dann Fahrzeuge/Transport.

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
- **Reale Qualifikationsstufen** und ihre Befugnisse – für Baustein 2.
- **Führungsrollen** und ihre Entscheidungsrechte – für Baustein 3.
- **Material- und Fahrzeuglisten** – für Baustein 4.
