import { istFahrzeugVerlegungMoeglich, istVerlegungMoeglich } from '../domain/abschnitte';
import { FAHRZEUGTYP_INFO, fahrzeugAusVorlage, verlegeFahrzeug } from '../domain/fahrzeuge';
import { MASSNAHMEN } from '../domain/massnahmen';
import { standardMassnahmenrechte } from '../domain/massnahmenrechte';
import { MATERIAL_LABEL, verbraucheMaterial, verbraucheMaterialTyp } from '../domain/material';
import { fahrzeugeFuerStufe } from '../domain/manvStufen';
import { rettungBereit, wuerfleEinklemmungsbedarf } from '../domain/rettung';
import { geoPunktName } from '../domain/geodaten';
import { STANDARD_BAUFELD, platzierungGueltig } from '../domain/flaechen';
import type { ManvStufeId } from '../domain/manvStufen';
import {
  SOLO_VERSCHLECHTERUNG_FAKTOR,
  fuehreDiagnostikDurch,
  sichtungOffen,
  patientAusVorlage,
  sichtePatient,
  simuliereZeitraum,
  verlegePatient,
  wendeMassnahmeAn,
} from '../domain/simulation';
import type { Trainingsmodus } from '../domain/modi';
import type { Massnahmenrechte } from '../domain/massnahmenrechte';
import {
  KEINE_SITZUNG,
  codeUndRolleAus,
  erzeugeCode,
  erzeugeId,
  mitSpieler,
  ohneSpieler,
} from '../domain/sitzung';
import type { Rolle, Sitzungszustand, Spieler } from '../domain/sitzung';
import type {
  AbschnittFuehrenBefehl,
  DelegationsAnfrage,
  DiagnostikId,
  Einsatzabschnitt,
  Fahrzeug,
  FahrzeugTyp,
  FahrzeugVorlage,
  FlaechenAbschnitt,
  FlaechenBefehl,
  FlaechenTypId,
  Fuehrungsrolle,
  GeoPosition,
  Kollegenanfrage,
  MassnahmeId,
  MeldebuchBereich,
  MeldebuchEintrag,
  Patient,
  PlatzierteFlaeche,
  Qualifikation,
  Route,
  Rufgruppenmitgliedschaft,
  Sichtungskategorie,
  SpielerProtokollEintrag,
  Szenario,
  Verlaufseintrag,
  ZeltTypId,
} from '../domain/types';

/**
 * Vorläufige Bindungsdauer in Sekunden, solange ein Team noch nicht
 * vollständig ist: die annehmende Person hat sich committet und ist ab
 * diesem Moment nicht mehr anderweitig anfragbar, auch wenn die eigentliche
 * Wirkung erst mit vollständigem Team eintritt (→ `modell.gebunden`). Bewusst
 * großzügig statt exakt - wird beim tatsächlichen Beginn der Maßnahme durch
 * die reale Dauer ersetzt.
 */
const VORLAEUFIGE_BINDUNG_SEK = 3600;

/** @anker state.phase Die Hauptzustände der Anwendung */
export type Phase =
  | 'start'
  | 'rolle'
  | 'anmeldung'
  | 'beitritt'
  | 'modus'
  | 'massnahmenrechte'
  | 'fahrzeugkonfiguration'
  | 'wartebereich'
  | 'setup'
  | 'einsatz'
  | 'debriefing'
  | 'uebungsleitung';

/** @anker state.zustand Der gesamte Zustand einer laufenden Übung */
export interface SimulationState {
  phase: Phase;
  /** Gewählter Trainingsmodus; null auf der Startseite. */
  modus: Trainingsmodus | null;
  /** Das laufende Szenario - eingebaut oder selbst gebaut. */
  szenario: Szenario | null;
  /** Selbst gebaute Szenarien der Übungsleitung. */
  eigeneSzenarien: Szenario[];
  /** Vergangene Einsatzzeit in Sekunden (Simulationszeit, nicht Echtzeit). */
  zeitSek: number;
  laufend: boolean;
  /** Zeitraffer-Faktor: 1 = Echtzeit. */
  geschwindigkeit: number;
  patienten: Patient[];
  ausgewaehlterPatientId: string | null;
  /** Welcher Einsatzabschnitt in der Übersicht angezeigt wird. */
  ausgewaehlterAbschnitt: Einsatzabschnitt;
  /** Alleinspiel: eine Person, dafür langsamere Verschlechterung (→ `sim.tempo`). */
  alleine: boolean;
  /** Mehrspieler-Sitzung; inaktiv im Einzelspiel (→ `sitzung.modell`). */
  sitzung: Sitzungszustand;
  /**
   * Durchführungs- und Delegationsschwelle je Maßnahme, von der Übungsleitung
   * vor der Sitzung eingestellt (→ `domain.massnahmenrechte`). Unabhängig von
   * `sitzung` gepflegt - erst innerhalb einer Sitzung wirkt die Sperre.
   */
  massnahmenrechte: Massnahmenrechte;
  /**
   * Fahrzeug-Vorlagen, die die Übungsleitung vor Sitzungsbeginn zusammenstellt
   * (→ `ui.fahrzeugkonfiguration`) - per MANV-Stufe oder einzeln. Nur während
   * der Phase `'fahrzeugkonfiguration'` relevant; danach materialisiert in
   * `fahrzeuge`.
   */
  fahrzeugWunsch: FahrzeugVorlage[];
  /** Laufzeit-Fahrzeuge der aktiven Sitzung (→ `modell.fahrzeug`). Leer im Einzelspiel. */
  fahrzeuge: Fahrzeug[];
  /**
   * Noch nicht beantwortete Delegationsanfragen (→ `modell.delegationsanfrage`,
   * `ui.delegationsanfrage`) - jeder Client filtert selbst auf die an ihn
   * gerichteten heraus.
   */
  delegationsanfragen: DelegationsAnfrage[];
  /**
   * Wer sich in welchem Sprechfunk-Kanal befindet (→ `modell.rufgruppe`,
   * `ui.sprechfunk`) - Grundlage für den WebRTC-Mesh-Aufbau, nicht die
   * Sprachverbindung selbst (die läuft direkt zwischen den Clients, nicht
   * über den Reducer).
   */
  rufgruppen: Rufgruppenmitgliedschaft[];
  /**
   * Noch nicht vollständig beantwortete Anfragen nach Unterstützung bei einer
   * bindenden Maßnahme (→ `modell.kollegenanfrage`) - jeder Client filtert
   * selbst auf die für ihn relevanten (passende Qualifikation, eigener
   * Abschnitt, nicht selbst gebunden) heraus.
   */
  kollegenanfragen: Kollegenanfrage[];
  /**
   * @anker state.freigabemodus Sofort sichtbar oder gestaffelt über die Ablage
   *
   * Von der Übungsleitung vor Sitzungsbeginn gewählt (→ `modell.abschnitte`):
   * `'sofort'` erzeugt Patienten wie bisher direkt sichtbar an der
   * Schadensstelle; `'gestaffelt'` lässt sie zunächst `verdeckt` und damit für
   * Spieler unsichtbar, bis eine manuelle oder zeitgesteuerte Freigabe
   * (→ `modell.freigabemodus`) sie in die Ablage bringt.
   */
  freigabemodus: 'sofort' | 'gestaffelt';
  /**
   * Wege zwischen Einsatzabschnitten mit echter Distanz (→ `domain.geodaten`,
   * `modell.route`) - aus `szenario.geodaten` materialisiert, leer ohne
   * Geodaten (die Verlegungsdauer fällt dann auf `VERLEGUNGSDAUER_SEK`
   * zurück).
   */
  routen: Route[];
  /**
   * IDs bereits ausgelöster Lageänderungen (→ `modell.ereignis`) - verhindert
   * doppeltes Auslösen und blendet den Auslösen-Knopf im Ereignisse-Panel
   * (→ `ui.ereignissepanel`) danach aus.
   */
  ausgeloesteEreignisse: string[];
  /**
   * @anker state.regieprotokoll Chronik der Regie-Entscheidungen für die Debriefing-Erweiterung
   *
   * Zeitgestempelte Zeile je Ablaufsteuerung (Pause/Weiter, Tempo), Freigabe
   * und Ereignis-Injektion (→ `modell.ereignis`) - wächst nur, wird nie
   * bearbeitet oder gelöscht. Nutzt denselben Zeileneintrag wie
   * `Patient.verlauf` (→ `Verlaufseintrag`), nur auf Sitzungsebene statt je
   * Patient. Rein informativ für das Debriefing (→ `ui.debriefing`), ohne
   * Rückwirkung auf die Simulation.
   */
  regieProtokoll: Verlaufseintrag[];
  /**
   * @anker state.spielerprotokoll Private Statusansicht: was genau hat wer getan
   *
   * Wächst wie `regieProtokoll` nur an, ist aber nach Spieler statt nach
   * Sitzung sortiert (→ `modell.spielerprotokoll`) - Grundlage für "Mein
   * Einsatz" im Debriefing, wo jede Person nur ihre eigenen Zeilen sieht
   * (Filter beim Lesen, nicht getrennte Speicherung je Spieler).
   */
  spielerProtokoll: SpielerProtokollEintrag[];
  /**
   * Vom Zugführer platzierte Zelte/Flächen auf der Einsatzstelle (→
   * `modell.platzierteflaeche`, `ui.lagekarte`) - eine Platzierung pro
   * Abschnitt (die drei Behandlungszelte plus Ablage, Bereitstellungsraum,
   * Ein-/Ausgangssichtung, Transport). Schadensstelle ist vom Szenario
   * vorgegeben und immer offen (→ `domain.istAbschnittEroeffnet`).
   */
  flaechen: PlatzierteFlaeche[];
  /**
   * Offene Befehle des Zugführers an einen Gruppenführer, eine Fläche zu
   * bauen (→ `modell.flaechenbefehl`) - ein Befehl pro Abschnitt,
   * verschwindet, sobald die Fläche tatsächlich errichtet oder der Befehl
   * abgelehnt wurde.
   */
  flaechenBefehle: FlaechenBefehl[];
  /**
   * Offene Befehle des Zugführers an einen Gruppenführer, mit der ganzen
   * Gruppe einen Abschnitt zu führen (→ `modell.abschnittfuehrenbefehl`) -
   * ein Befehl pro Gruppenführer.
   */
  abschnittFuehrenBefehle: AbschnittFuehrenBefehl[];
  /**
   * Vom Zugführer per Funk erfragte und selbst eingetragene Meldungen (→
   * `modell.meldebucheintrag`, `Meldebuch`) - ersetzt die früher live
   * angezeigten Fahrzeug-/Kräfte-/Kennzahlen-Ansichten des Zugführers.
   * Wächst nur an, wird nie bearbeitet oder gelöscht.
   */
  meldebuch: MeldebuchEintrag[];
  /**
   * Laufnummer des zuletzt angewendeten Schnappschusses (→ `state.schnappschuss`).
   * Nur für Spieler relevant - verhindert, dass ein verspätet eintreffender
   * älterer Schnappschuss einen bereits angewendeten neueren überschreibt.
   */
  schnappschussFolge: number;
}

export const ANFANGSZUSTAND: SimulationState = {
  phase: 'start',
  modus: null,
  szenario: null,
  eigeneSzenarien: [],
  zeitSek: 0,
  laufend: false,
  // Startet in Echtzeit. Jede Handlung kostet zusaetzlich ihre eigene Dauer,
  // deshalb bleibt der Zeitraffer eine bewusste Entscheidung der Uebungsleitung,
  // nicht die Voreinstellung.
  geschwindigkeit: 1,
  patienten: [],
  ausgewaehlterPatientId: null,
  ausgewaehlterAbschnitt: 'schadensstelle',
  alleine: false,
  sitzung: KEINE_SITZUNG,
  massnahmenrechte: standardMassnahmenrechte(),
  fahrzeugWunsch: [],
  fahrzeuge: [],
  delegationsanfragen: [],
  rufgruppen: [],
  kollegenanfragen: [],
  freigabemodus: 'sofort',
  routen: [],
  ausgeloesteEreignisse: [],
  regieProtokoll: [],
  spielerProtokoll: [],
  flaechen: [],
  flaechenBefehle: [],
  abschnittFuehrenBefehle: [],
  meldebuch: [],
  schnappschussFolge: 0,
};

/** @anker state.aktionen Alles, was der Übende auslösen kann */
export type SimulationAction =
  | { typ: 'modusWaehlen'; modus: Trainingsmodus }
  | { typ: 'uebungsleitungOeffnen' }
  | { typ: 'zurueckZumStart' }
  | { typ: 'eigeneSzenarienSetzen'; szenarien: Szenario[] }
  | { typ: 'szenarioStarten'; szenario: Szenario; alleine?: boolean }
  | { typ: 'tick'; dtSek: number }
  | { typ: 'pauseUmschalten' }
  | { typ: 'geschwindigkeitSetzen'; wert: number }
  | { typ: 'patientWaehlen'; patientId: string | null }
  | {
      typ: 'diagnostikDurchfuehren';
      patientId: string;
      diagnostikId: DiagnostikId;
      /** Für die private Statusansicht (→ `modell.spielerprotokoll`) - fehlt im Einzelspiel. */
      spielerId?: string;
    }
  | {
      typ: 'patientSichten';
      patientId: string;
      kategorie: Sichtungskategorie;
      final?: boolean;
      spielerId?: string;
    }
  | {
      typ: 'massnahmeDurchfuehren';
      patientId: string;
      massnahmeId: MassnahmeId;
      /** Nur bei Maßnahmen mit Dosisreferenz relevant (→ `domain.dosierung`). */
      dosisMg?: number;
      spielerId?: string;
    }
  | {
      typ: 'delegationAnfragen';
      id: string;
      patientId: string;
      massnahmeId: MassnahmeId;
      anfragendeId: string;
      angefragteId: string;
    }
  | { typ: 'delegationBeantworten'; id: string; angenommen: boolean }
  | {
      typ: 'massnahmeMitTeamStarten';
      patientId: string;
      massnahmeId: MassnahmeId;
      anfragendeId: string;
      dosisMg?: number;
    }
  | { typ: 'kollegenanfrageAnnehmen'; anfrageId: string; spielerId: string }
  | { typ: 'rettungUnterstuetzungAnfragen'; patientId: string; anfragendeId: string }
  | { typ: 'rettungsmaterialBereitstellen'; patientId: string; fahrzeugId: string; spielerId?: string }
  | { typ: 'rettungDurchfuehren'; patientId: string }
  | { typ: 'rufgruppeWaehlen'; teilnehmerId: string; teilnehmerName: string; kanal: string | null }
  | { typ: 'patientVerlegen'; patientId: string; ziel: Einsatzabschnitt; spielerId?: string }
  | { typ: 'abschnittWaehlen'; abschnitt: Einsatzabschnitt }
  | { typ: 'einsatzBeenden' }
  | { typ: 'zurueckZumSetup' }
  // --- Mehrspieler (→ `sitzung.modell`) ---
  | { typ: 'gemeinsamOeffnen' }
  | { typ: 'rolleWaehlen'; rolle: Rolle }
  | { typ: 'anmeldungAbschliessen'; name: string; eigeneId: string }
  | { typ: 'massnahmenrechteSetzen'; rechte: Massnahmenrechte }
  | { typ: 'massnahmenrechteAbgeschlossen' }
  | { typ: 'szenarioFuerSitzungWaehlen'; szenario: Szenario }
  | { typ: 'manvStufeGewaehlt'; stufe: ManvStufeId }
  | { typ: 'fahrzeugHinzugefuegt'; fahrzeugTyp: FahrzeugTyp }
  | { typ: 'fahrzeugEntfernt'; fahrzeugId: string }
  | { typ: 'fahrzeugkonfigurationAbgeschlossen' }
  | { typ: 'spielerBeitreten'; code: string; name: string; eigeneId: string }
  | { typ: 'spielerHinzugefuegt'; spieler: Spieler }
  | { typ: 'spielerEntfernt'; spielerId: string }
  | { typ: 'spielerQualifikationSetzen'; spielerId: string; qualifikation: Qualifikation }
  | { typ: 'spielerFuehrungsrolleSetzen'; spielerId: string; rolle: Fuehrungsrolle }
  | { typ: 'spielerAbschnittGesetzt'; spielerId: string; abschnitt: Einsatzabschnitt }
  | { typ: 'fahrzeugBesatzungGesetzt'; fahrzeugId: string; besatzung: string[] }
  | { typ: 'fahrzeugVerlegen'; fahrzeugId: string; ziel: Einsatzabschnitt }
  | { typ: 'fahrzeugGruppeZuweisen'; fahrzeugId: string; gruppenfuehrerId: string | null }
  | { typ: 'freigabemodusSetzen'; modus: 'sofort' | 'gestaffelt' }
  | { typ: 'patientFreigeben'; patientId: string }
  | { typ: 'alleVerdecktenFreigeben' }
  | { typ: 'fahrzeugAusfallSetzen'; fahrzeugId: string; ausgefallen: boolean }
  | { typ: 'fahrzeugNachfordern'; fahrzeugTyp: FahrzeugTyp }
  | { typ: 'ereignisAusloesen'; ereignisId: string }
  | {
      typ: 'zeltPlatzieren';
      id: string;
      flaechenTyp: ZeltTypId | FlaechenTypId;
      abschnitt: FlaechenAbschnitt;
      xM: number;
      yM: number;
      spielerId?: string;
      /** Gesetzt, wenn diese Platzierung einen Befehl erfüllt (→ `modell.flaechenbefehl`). */
      befehlId?: string;
    }
  | { typ: 'zeltEntfernen'; id: string }
  | {
      typ: 'zeltBefehlErteilen';
      id: string;
      flaechenTyp: ZeltTypId | FlaechenTypId;
      abschnitt: FlaechenAbschnitt;
      xM: number;
      yM: number;
      zugfuehrerId: string;
      gruppenfuehrerId: string;
    }
  | { typ: 'zeltBefehlAblehnen'; id: string }
  | {
      typ: 'abschnittFuehrenBefehlErteilen';
      id: string;
      ziel: Einsatzabschnitt;
      zugfuehrerId: string;
      gruppenfuehrerId: string;
    }
  | { typ: 'abschnittFuehrenBefehlAusfuehren'; id: string }
  | { typ: 'abschnittFuehrenBefehlAblehnen'; id: string }
  | {
      typ: 'patientAbtransportieren';
      patientId: string;
      fahrzeugId: string;
      spielerId?: string;
    }
  | {
      typ: 'meldebuchEintragen';
      id: string;
      bereich: MeldebuchBereich;
      text: string;
      spielerId: string;
    }
  | {
      typ: 'routeErstellen';
      id: string;
      von: Einsatzabschnitt;
      nach: Einsatzabschnitt;
      distanzMeter: number;
      geometrie?: GeoPosition[];
    }
  | { typ: 'sitzungStarten' }
  | { typ: 'sitzungVerlassen' }
  | { typ: 'schnappschussAnwenden'; schnappschuss: Schnappschuss }
  | { typ: 'verbindungsfehlerSetzen'; meldung: string | null };

/**
 * @anker state.schnappschuss Der geteilte, host-autoritative Ausschnitt des Zustands
 *
 * Der Übungsleiter (Host) führt die Simulation und verteilt genau diese Felder;
 * die Navigation (welcher Patient, welcher Abschnitt) bleibt bei jedem Client
 * lokal. So arbeiten mehrere gleichzeitig an derselben Lage, ohne sich die
 * Ansicht gegenseitig umzuschalten.
 */
export interface Schnappschuss {
  phase: Phase;
  szenario: Szenario | null;
  zeitSek: number;
  laufend: boolean;
  geschwindigkeit: number;
  patienten: Patient[];
  /** Laufzeit-Fahrzeuge - erst ab der Phase `'wartebereich'` befüllt. */
  fahrzeuge: Fahrzeug[];
  spieler: Spieler[];
  status: Sitzungszustand['status'];
  /** Damit alle Clients dieselben Sperren durchsetzen, nicht nur der Host. */
  massnahmenrechte: Massnahmenrechte;
  /** Noch nicht beantwortete Delegationsanfragen (→ `modell.delegationsanfrage`). */
  delegationsanfragen: DelegationsAnfrage[];
  /** Wer sich in welchem Sprechfunk-Kanal befindet (→ `modell.rufgruppe`). */
  rufgruppen: Rufgruppenmitgliedschaft[];
  /** Noch offene Anfragen nach Unterstützung (→ `modell.kollegenanfrage`). */
  kollegenanfragen: Kollegenanfrage[];
  /** Sofort sichtbar oder gestaffelt über die Ablage (→ `state.freigabemodus`). */
  freigabemodus: 'sofort' | 'gestaffelt';
  /** Wege zwischen Einsatzabschnitten mit echter Distanz (→ `modell.route`). */
  routen: Route[];
  /** IDs bereits ausgelöster Lageänderungen (→ `modell.ereignis`). */
  ausgeloesteEreignisse: string[];
  /** Chronik der Regie-Entscheidungen für die Debriefing-Erweiterung (→ `state.regieprotokoll`). */
  regieProtokoll: Verlaufseintrag[];
  /** Private Statusansicht je Spieler für "Mein Einsatz" (→ `state.spielerprotokoll`). */
  spielerProtokoll: SpielerProtokollEintrag[];
  /** Platzierte Zelte/Flächen auf der Einsatzstelle (→ `modell.platzierteflaeche`). */
  flaechen: PlatzierteFlaeche[];
  /** Offene Flächen-Befehle des Zugführers an einen Gruppenführer (→ `modell.flaechenbefehl`). */
  flaechenBefehle: FlaechenBefehl[];
  /** Offene Führungsbefehle des Zugführers an einen Gruppenführer (→ `modell.abschnittfuehrenbefehl`). */
  abschnittFuehrenBefehle: AbschnittFuehrenBefehl[];
  /** Per Funk erfragte, selbst eingetragene Meldungen des Zugführers (→ `modell.meldebucheintrag`). */
  meldebuch: MeldebuchEintrag[];
  /**
   * Fortlaufende Laufnummer, vom Host bei jedem Versand hochgezählt
   * (→ `state.provider`). Kein Feld des reinen Zustands - der Aufrufer
   * (Provider) zählt sie separat je Sitzung; der Vorgabewert genügt für einen
   * einzelnen, isoliert angewendeten Schnappschuss (z. B. in Tests).
   */
  folge: number;
}

export function schnappschussAus(state: SimulationState, folge = 1): Schnappschuss {
  return {
    phase: state.phase,
    szenario: state.szenario,
    zeitSek: state.zeitSek,
    laufend: state.laufend,
    geschwindigkeit: state.geschwindigkeit,
    folge,
    patienten: state.patienten,
    fahrzeuge: state.fahrzeuge,
    spieler: state.sitzung.spieler,
    status: state.sitzung.status,
    massnahmenrechte: state.massnahmenrechte,
    delegationsanfragen: state.delegationsanfragen,
    rufgruppen: state.rufgruppen,
    kollegenanfragen: state.kollegenanfragen,
    freigabemodus: state.freigabemodus,
    routen: state.routen,
    ausgeloesteEreignisse: state.ausgeloesteEreignisse,
    regieProtokoll: state.regieProtokoll,
    spielerProtokoll: state.spielerProtokoll,
    flaechen: state.flaechen,
    flaechenBefehle: state.flaechenBefehle,
    abschnittFuehrenBefehle: state.abschnittFuehrenBefehle,
    meldebuch: state.meldebuch,
  };
}

/** Wendet eine Aenderung auf genau einen Patienten an. */
function mitPatient(
  state: SimulationState,
  patientId: string,
  aenderung: (patient: Patient) => Patient,
): SimulationState {
  return {
    ...state,
    patienten: state.patienten.map((patient) =>
      patient.id === patientId ? aenderung(patient) : patient,
    ),
  };
}

/**
 * Ein einzelner verdeckter Patient wird sichtbar (→ `modell.freigabemodus`) -
 * gemeinsame Grundlage für `patientFreigeben` (eine Person) und
 * `alleVerdecktenFreigeben` (Sammel-Freigabe aus dem Gesamtlagebild). Wer
 * bereits freigegeben ist, bleibt unverändert (kein erneutes Würfeln).
 */
function freigebenPatient(patient: Patient, ziel: Einsatzabschnitt, zeitSek: number): Patient {
  if (patient.abschnitt !== 'verdeckt') return patient;
  // Materialbedarf und benötigte Kollegenanzahl werden live bei der
  // Freigabe ausgewürfelt (→ `domain.rettung`), nicht vorab im Szenario
  // festgelegt - dieselbe eingeklemmte Person kann in zwei Durchläufen
  // unterschiedlich anspruchsvoll ausfallen.
  const eingeklemmt = patient.eingeklemmtBeimStart
    ? {
        ...wuerfleEinklemmungsbedarf(),
        materialBereitgestellt: false,
        anfragendeId: null,
        helfendeIds: [],
        gerettet: false,
        entdecktUmSek: zeitSek,
      }
    : undefined;
  return { ...patient, abschnitt: ziel, eingeklemmt };
}

/** Wendet eine Aenderung auf genau ein Fahrzeug an - Pendant zu `mitPatient`. */
function mitFahrzeug(
  state: SimulationState,
  fahrzeugId: string,
  aenderung: (fahrzeug: Fahrzeug) => Fahrzeug,
): SimulationState {
  return {
    ...state,
    fahrzeuge: state.fahrzeuge.map((fahrzeug) =>
      fahrzeug.id === fahrzeugId ? aenderung(fahrzeug) : fahrzeug,
    ),
  };
}

/**
 * Hängt eine Zeile an `regieProtokoll` an (→ `state.regieprotokoll`) - reine
 * Anhänge-Funktion, nie rückwirkend verändert.
 */
function protokolliereRegie(state: SimulationState, text: string): SimulationState {
  return {
    ...state,
    regieProtokoll: [...state.regieProtokoll, { zeitSek: state.zeitSek, text }],
  };
}

/**
 * Hängt eine Zeile an `spielerProtokoll` an (→ `state.spielerprotokoll`) -
 * ohne `spielerId` passiert nichts (Einzelspiel kennt keine Sitzung, dort
 * ist die ganze Auswertung ohnehin schon "mein Einsatz").
 */
function protokolliereSpieler(
  state: SimulationState,
  spielerId: string | undefined,
  patientId: string,
  text: string,
): SimulationState {
  if (!spielerId) return state;
  return {
    ...state,
    spielerProtokoll: [
      ...state.spielerProtokoll,
      { spielerId, patientId, zeitSek: state.zeitSek, text },
    ],
  };
}

/**
 * Übernimmt den zuletzt an einen Patienten angehängten Verlaufseintrag
 * (→ `domain.simulation`, `protokolliere`) unverändert in `spielerProtokoll`
 * - kein eigener Text, keine Wiederholung der Domänenlogik. Vergleicht
 * `vorher`/`nachher`, um zu erkennen, ob die Domänenfunktion überhaupt etwas
 * protokolliert hat (z. B. keine Wirkung bei bereits durchgeführter
 * Diagnostik oder einem verstorbenen Patienten) - sonst entstünde ein
 * irreführender Eintrag ohne echte Handlung dahinter. Kreditiert bei Bedarf
 * mehrere Personen gleichzeitig mit derselben Zeile (Team-Maßnahmen).
 */
function uebernimmVerlaufInSpielerprotokoll(
  vorher: SimulationState,
  nachher: SimulationState,
  spielerIds: (string | undefined)[],
  patientId: string,
): SimulationState {
  const beteiligte = spielerIds.filter((id): id is string => id !== undefined);
  if (beteiligte.length === 0) return nachher;
  const alterPatient = vorher.patienten.find((patient) => patient.id === patientId);
  const neuerPatient = nachher.patienten.find((patient) => patient.id === patientId);
  if (!neuerPatient || neuerPatient.verlauf.length === (alterPatient?.verlauf.length ?? 0)) {
    return nachher;
  }
  const eintrag = neuerPatient.verlauf.at(-1)!;
  return {
    ...nachher,
    spielerProtokoll: [
      ...nachher.spielerProtokoll,
      ...beteiligte.map((spielerId) => ({
        spielerId,
        patientId,
        zeitSek: eintrag.zeitSek,
        text: eintrag.text,
      })),
    ],
  };
}

/** @anker state.reducer Wie Aktionen den Zustand verändern, inklusive Zeitkosten */
export function simulationReducer(
  state: SimulationState,
  action: SimulationAction,
): SimulationState {
  switch (action.typ) {
    case 'modusWaehlen':
      // Nur die digitale Übung führt weiter (zu den Maßnahmenrechten, dem
      // ersten Schritt der Sitzungseröffnung); die übrigen Modi zeigen auf
      // derselben Seite (→ `ui.modus`) vorerst nur, was sie können sollen.
      return {
        ...state,
        modus: action.modus,
        phase: action.modus === 'digital' ? 'massnahmenrechte' : state.phase,
      };

    case 'uebungsleitungOeffnen':
      return { ...state, phase: 'uebungsleitung' };

    case 'zurueckZumStart':
      return {
        ...ANFANGSZUSTAND,
        geschwindigkeit: state.geschwindigkeit,
        eigeneSzenarien: state.eigeneSzenarien,
        massnahmenrechte: state.massnahmenrechte,
      };

    case 'eigeneSzenarienSetzen':
      return { ...state, eigeneSzenarien: action.szenarien };

    case 'szenarioStarten': {
      const alleine = action.alleine ?? false;
      // Alleinspiel drosselt die Verschlechterung (→ `sim.tempo`), Teamspiel
      // läuft mit den gemeinten Raten.
      const faktor = alleine ? SOLO_VERSCHLECHTERUNG_FAKTOR : 1;
      return {
        ...ANFANGSZUSTAND,
        geschwindigkeit: state.geschwindigkeit,
        eigeneSzenarien: state.eigeneSzenarien,
        massnahmenrechte: state.massnahmenrechte,
        modus: state.modus ?? 'digital',
        phase: 'einsatz',
        szenario: action.szenario,
        laufend: true,
        alleine,
        ausgewaehlterAbschnitt: 'schadensstelle',
        patienten: action.szenario.patienten.map((vorlage) => patientAusVorlage(vorlage, faktor)),
        // Wegstrecken entstehen nicht mehr automatisch aus dem Szenario -
        // der Zugführer legt sie selbst an (→ `routeErstellen`,
        // `ui.lagekarte.wegstrecke`). Ohne angelegte Route gilt weiterhin der
        // pauschale Zeitwert (→ `domain.geodaten`, `verlegungsdauerSek`).
        routen: [],
        // Ein einzelner Betroffener geht direkt in die Patientenansicht - kein
        // Behandlungsplatz, keine Übersicht dazwischen.
        ausgewaehlterPatientId:
          action.szenario.patienten.length === 1 ? action.szenario.patienten[0]!.id : null,
      };
    }

    case 'tick': {
      if (!state.laufend || state.phase !== 'einsatz') return state;
      if (action.dtSek <= 0) return state;
      // In kleine Schritte zerlegt (→ `sim.zeitraum`): So bleibt ein großer
      // Nachhol-Takt korrekt, wenn der Übungsleiter-Tab im Hintergrund war und
      // die Uhr auf einen Schlag aufholt.
      const neueZeitSek = state.zeitSek + action.dtSek;
      // Zeitgesteuerte Freigabe (→ `modell.freigabemodus`): läuft nebenbei im
      // selben Takt wie verzögert einsetzende Probleme, statt einen eigenen
      // Mechanismus zu brauchen - eine geplante automatische Freigabe ist im
      // Kern dieselbe Ableitung aus verstrichener Zeit wie `startetNachMin`.
      const zielAbschnitt: Einsatzabschnitt =
        state.freigabemodus === 'sofort' ? 'schadensstelle' : 'ablage';
      return {
        ...state,
        zeitSek: neueZeitSek,
        patienten: state.patienten.map((patient) => {
          const simuliert = simuliereZeitraum(patient, state.zeitSek, action.dtSek);
          if (
            simuliert.abschnitt === 'verdeckt' &&
            simuliert.freigabeMinuten !== undefined &&
            neueZeitSek / 60 >= simuliert.freigabeMinuten
          ) {
            return { ...simuliert, abschnitt: zielAbschnitt };
          }
          return simuliert;
        }),
      };
    }

    case 'pauseUmschalten':
      return protokolliereRegie(
        { ...state, laufend: !state.laufend },
        state.laufend ? 'Übung pausiert.' : 'Übung fortgesetzt.',
      );

    case 'geschwindigkeitSetzen':
      return protokolliereRegie(
        { ...state, geschwindigkeit: action.wert },
        `Tempo auf ×${action.wert} gesetzt.`,
      );

    case 'patientWaehlen':
      return { ...state, ausgewaehlterPatientId: action.patientId };

    case 'diagnostikDurchfuehren': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      if (!patient || patient.durchgefuehrteDiagnostik.includes(action.diagnostikId)) {
        return state;
      }
      const naechster = mitPatient(state, action.patientId, (eintrag) =>
        fuehreDiagnostikDurch(eintrag, action.diagnostikId, state.zeitSek),
      );
      return uebernimmVerlaufInSpielerprotokoll(
        state,
        naechster,
        [action.spielerId],
        action.patientId,
      );
    }

    case 'patientSichten': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      if (!patient) return state;
      const naechster = mitPatient(state, action.patientId, (eintrag) =>
        sichtePatient(eintrag, action.kategorie, state.zeitSek, action.final),
      );
      return uebernimmVerlaufInSpielerprotokoll(
        state,
        naechster,
        [action.spielerId],
        action.patientId,
      );
    }

    case 'massnahmeDurchfuehren': {
      const behandelter = state.patienten.find((patient) => patient.id === action.patientId);
      if (!behandelter) return state;
      const naechster = {
        ...mitPatient(state, action.patientId, (patient) =>
          wendeMassnahmeAn(patient, action.massnahmeId, state.zeitSek, action.dosisMg),
        ),
        fahrzeuge: verbraucheMaterial(state.fahrzeuge, action.massnahmeId, behandelter.abschnitt),
      };
      return uebernimmVerlaufInSpielerprotokoll(
        state,
        naechster,
        [action.spielerId],
        action.patientId,
      );
    }

    case 'delegationAnfragen':
      // Dedupliziert über die Anfrage-Id, falls dieselbe Anfrage (z. B. nach
      // einer verlorenen Bestätigung, → `state.aktionsbestaetigung`) erneut
      // ankommt.
      if (state.delegationsanfragen.some((anfrage) => anfrage.id === action.id)) return state;
      return {
        ...state,
        delegationsanfragen: [
          ...state.delegationsanfragen,
          {
            id: action.id,
            patientId: action.patientId,
            massnahmeId: action.massnahmeId,
            anfragendeId: action.anfragendeId,
            angefragteId: action.angefragteId,
          },
        ],
      };

    case 'delegationBeantworten': {
      const anfrage = state.delegationsanfragen.find((eintrag) => eintrag.id === action.id);
      if (!anfrage) return state;
      const ohneAnfrage = {
        ...state,
        delegationsanfragen: state.delegationsanfragen.filter((eintrag) => eintrag.id !== action.id),
      };
      if (!action.angenommen) return ohneAnfrage;
      // Freigabe durch Rücksprache - kostet keine Einsatzzeit (→ `domain.qualifikation`).
      // Gezielt für die anfragende Person, nicht patientenweit (→ `modell.delegation`).
      return mitPatient(ohneAnfrage, anfrage.patientId, (patient) =>
        patient.delegierteMassnahmen.some(
          (freigabe) =>
            freigabe.massnahmeId === anfrage.massnahmeId && freigabe.spielerId === anfrage.anfragendeId,
        )
          ? patient
          : {
              ...patient,
              delegierteMassnahmen: [
                ...patient.delegierteMassnahmen,
                { massnahmeId: anfrage.massnahmeId, spielerId: anfrage.anfragendeId },
              ],
            },
      );
    }

    case 'massnahmeMitTeamStarten': {
      // Nur für Maßnahmen mit Team-Bedarf (→ `modell.benoetigtTeam`) sinnvoll -
      // die anfragende Person deckt die NotArzt-Rolle bereits durch die
      // eigene Katalog-Qualifikation ab, fehlen noch NotSan und
      // Rettungssanitäter/-in.
      const massnahme = MASSNAHMEN[action.massnahmeId];
      if (!massnahme?.benoetigtTeam) return state;
      const anfragender = state.sitzung.spieler.find((spieler) => spieler.id === action.anfragendeId);
      if (!anfragender) return state;
      const gebundenGrundStart = `${massnahme.label} bei ${action.patientId}`;
      const neueAnfragen: Kollegenanfrage[] = (['notsan', 'rettungssanitaeter'] as const).map(
        (benoetigteQualifikation) => ({
          id: erzeugeId(),
          patientId: action.patientId,
          grund: 'narkose',
          anfragendeId: action.anfragendeId,
          benoetigteQualifikation,
          angenommenVon: [],
          massnahmeId: action.massnahmeId,
          dosisMg: action.dosisMg,
        }),
      );
      return {
        ...state,
        kollegenanfragen: [...state.kollegenanfragen, ...neueAnfragen],
        sitzung: {
          ...state.sitzung,
          spieler: state.sitzung.spieler.map((spieler) =>
            spieler.id === action.anfragendeId
              ? {
                  ...spieler,
                  gebundenBis: state.zeitSek + VORLAEUFIGE_BINDUNG_SEK,
                  gebundenGrund: gebundenGrundStart,
                }
              : spieler,
          ),
        },
      };
    }

    case 'kollegenanfrageAnnehmen': {
      const anfrage = state.kollegenanfragen.find((eintrag) => eintrag.id === action.anfrageId);
      if (!anfrage || anfrage.angenommenVon.includes(action.spielerId)) return state;
      const massnahme = anfrage.massnahmeId ? MASSNAHMEN[anfrage.massnahmeId] : undefined;
      const gebundenGrund = massnahme
        ? `${massnahme.label} bei ${anfrage.patientId}`
        : `Unterstützung bei ${anfrage.patientId}`;

      // Rettung: die annehmende Person wird zusätzliche Hilfe
      // (→ `modell.eingeklemmtstatus`, `rettungUnterstuetzungAnfragen`) - im
      // Unterschied zur Narkose wirkt hier noch nichts automatisch, die
      // Übungsleitung löst die eigentliche Rettung separat aus
      // (`rettungDurchfuehren`), sobald genug Kolleg:innen und Material bereit sind.
      if (anfrage.grund === 'rettung') {
        const eingeklemmterPatient = state.patienten.find((patient) => patient.id === anfrage.patientId);
        // Schon dabei (anfragend oder bereits als Helfer:in eingetragen)? Kein
        // doppelter Beitritt derselben Person zum selben Team.
        if (
          !eingeklemmterPatient?.eingeklemmt ||
          eingeklemmterPatient.eingeklemmt.anfragendeId === action.spielerId ||
          eingeklemmterPatient.eingeklemmt.helfendeIds.includes(action.spielerId)
        ) {
          return state;
        }
        // `benoetigteKollegenAnzahl` zählt nur die zusätzlichen Kolleg:innen,
        // nicht die anfragende Person selbst (→ `modell.eingeklemmtstatus`) -
        // +1 für die gerade annehmende Person, die noch nicht in `helfendeIds` steht.
        const genugKollegen =
          eingeklemmterPatient.eingeklemmt.helfendeIds.length + 1 >=
          eingeklemmterPatient.eingeklemmt.benoetigteKollegenAnzahl;
        const naechster = {
          ...mitPatient(state, anfrage.patientId, (patient) =>
            patient.eingeklemmt
              ? {
                  ...patient,
                  eingeklemmt: {
                    ...patient.eingeklemmt,
                    helfendeIds: [...patient.eingeklemmt.helfendeIds, action.spielerId],
                  },
                }
              : patient,
          ),
          kollegenanfragen: genugKollegen
            ? state.kollegenanfragen.filter((eintrag) => eintrag.id !== anfrage.id)
            : state.kollegenanfragen,
          sitzung: {
            ...state.sitzung,
            spieler: state.sitzung.spieler.map((spieler) =>
              spieler.id === action.spielerId
                ? { ...spieler, gebundenBis: state.zeitSek + VORLAEUFIGE_BINDUNG_SEK, gebundenGrund }
                : spieler,
            ),
          },
        };
        return protokolliereSpieler(
          naechster,
          action.spielerId,
          anfrage.patientId,
          `Bei der Rettung von ${anfrage.patientId} unterstützt.`,
        );
      }

      // Narkose: sobald keine andere Anfrage desselben Vorgangs (dieselbe
      // Person, Maßnahme, Patient - je fehlende Rolle eine eigene Anfrage,
      // → `massnahmeMitTeamStarten`) mehr unbeantwortet ist, ist das Team
      // vollständig - Wirkung und echte Bindungsdauer greifen sofort, ohne
      // weitere Bestätigung.
      if (anfrage.grund === 'narkose' && massnahme) {
        const selberVorgang = (eintrag: Kollegenanfrage) =>
          eintrag.patientId === anfrage.patientId &&
          eintrag.anfragendeId === anfrage.anfragendeId &&
          eintrag.massnahmeId === anfrage.massnahmeId;
        const restlicheAnfragen = state.kollegenanfragen.filter(
          (eintrag) => eintrag.id !== anfrage.id && selberVorgang(eintrag),
        );
        const nochOffen = restlicheAnfragen.some((eintrag) => eintrag.angenommenVon.length === 0);

        if (!nochOffen) {
          const behandelter = state.patienten.find((patient) => patient.id === anfrage.patientId);
          const teamIds = [
            anfrage.anfragendeId,
            action.spielerId,
            ...restlicheAnfragen.flatMap((eintrag) => eintrag.angenommenVon),
          ];
          const dauer = massnahme.dauerSek + (massnahme.bindetZusaetzlichSek ?? 0);
          const gebundenBis = state.zeitSek + dauer;
          const ohneVorgang = state.kollegenanfragen.filter(
            (eintrag) => !(eintrag.id === anfrage.id || selberVorgang(eintrag)),
          );
          const mitWirkung = behandelter
            ? {
                ...mitPatient(state, anfrage.patientId, (patient) =>
                  wendeMassnahmeAn(patient, anfrage.massnahmeId!, state.zeitSek, anfrage.dosisMg),
                ),
                fahrzeuge: verbraucheMaterial(
                  state.fahrzeuge,
                  anfrage.massnahmeId!,
                  behandelter.abschnitt,
                ),
              }
            : state;
          const naechster = {
            ...mitWirkung,
            kollegenanfragen: ohneVorgang,
            sitzung: {
              ...mitWirkung.sitzung,
              spieler: mitWirkung.sitzung.spieler.map((spieler) =>
                teamIds.includes(spieler.id) ? { ...spieler, gebundenBis, gebundenGrund } : spieler,
              ),
            },
          };
          // Das ganze Team wird kreditiert, nicht nur die zuletzt annehmende
          // Person - dieselbe Zeile aus `patient.verlauf` erscheint bei allen
          // Beteiligten in ihrer je eigenen Statusansicht.
          return uebernimmVerlaufInSpielerprotokoll(state, naechster, teamIds, anfrage.patientId);
        }
      }

      // Noch nicht vollständig: Anfrage vermerkt die Annahme, die annehmende
      // Person ist ab jetzt committet und vorläufig gebunden (→ `modell.gebunden`),
      // auch wenn die eigentliche Wirkung noch auf den Rest des Teams wartet.
      return {
        ...state,
        kollegenanfragen: state.kollegenanfragen.map((eintrag) =>
          eintrag.id === anfrage.id
            ? { ...eintrag, angenommenVon: [...eintrag.angenommenVon, action.spielerId] }
            : eintrag,
        ),
        sitzung: {
          ...state.sitzung,
          spieler: state.sitzung.spieler.map((spieler) =>
            spieler.id === action.spielerId
              ? {
                  ...spieler,
                  gebundenBis: state.zeitSek + VORLAEUFIGE_BINDUNG_SEK,
                  gebundenGrund,
                }
              : spieler,
          ),
        },
      };
    }

    case 'rettungUnterstuetzungAnfragen': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      // Nur die erste Person übernimmt die Koordination - kein Wechsel
      // mittendrin (→ `modell.eingeklemmtstatus`).
      if (!patient?.eingeklemmt || patient.eingeklemmt.anfragendeId !== null) return state;
      const braucht = patient.eingeklemmt.benoetigteKollegenAnzahl > 0;
      const gebundenGrund = `Rettung bei ${action.patientId}`;
      const naechsterAnfrage = {
        ...mitPatient(state, action.patientId, (eintrag) =>
          eintrag.eingeklemmt
            ? { ...eintrag, eingeklemmt: { ...eintrag.eingeklemmt, anfragendeId: action.anfragendeId } }
            : eintrag,
        ),
        kollegenanfragen: braucht
          ? [
              ...state.kollegenanfragen,
              {
                id: erzeugeId(),
                patientId: action.patientId,
                grund: 'rettung' as const,
                anfragendeId: action.anfragendeId,
                angenommenVon: [],
              },
            ]
          : state.kollegenanfragen,
        sitzung: {
          ...state.sitzung,
          spieler: state.sitzung.spieler.map((spieler) =>
            spieler.id === action.anfragendeId
              ? { ...spieler, gebundenBis: state.zeitSek + VORLAEUFIGE_BINDUNG_SEK, gebundenGrund }
              : spieler,
          ),
        },
      };
      return protokolliereSpieler(
        naechsterAnfrage,
        action.anfragendeId,
        action.patientId,
        `Unterstützung bei der Rettung von ${action.patientId} angefordert.`,
      );
    }

    case 'rettungsmaterialBereitstellen': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      const material = patient?.eingeklemmt?.benoetigtesMaterial;
      if (!patient?.eingeklemmt || !material || patient.eingeklemmt.materialBereitgestellt) return state;
      const naechster = {
        ...mitPatient(state, action.patientId, (eintrag) =>
          eintrag.eingeklemmt
            ? { ...eintrag, eingeklemmt: { ...eintrag.eingeklemmt, materialBereitgestellt: true } }
            : eintrag,
        ),
        fahrzeuge: verbraucheMaterialTyp(state.fahrzeuge, material, patient.abschnitt),
      };
      return protokolliereSpieler(
        naechster,
        action.spielerId,
        action.patientId,
        `Rettungsmaterial (${MATERIAL_LABEL[material]}) bereitgestellt.`,
      );
    }

    case 'rettungDurchfuehren': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      if (!patient?.eingeklemmt || patient.eingeklemmt.gerettet) return state;
      if (!rettungBereit(patient.eingeklemmt)) return state;
      const { anfragendeId, helfendeIds, entdecktUmSek } = patient.eingeklemmt;
      const beteiligteIds = [anfragendeId, ...helfendeIds].filter((id): id is string => id !== null);
      const naechster = {
        ...mitPatient(state, action.patientId, (eintrag) =>
          eintrag.eingeklemmt
            ? {
                ...eintrag,
                eingeklemmt: {
                  ...eintrag.eingeklemmt,
                  gerettet: true,
                  rettungsdauerSek: state.zeitSek - entdecktUmSek,
                },
              }
            : eintrag,
        ),
        sitzung: {
          ...state.sitzung,
          spieler: state.sitzung.spieler.map((spieler) =>
            beteiligteIds.includes(spieler.id)
              ? { ...spieler, gebundenBis: state.zeitSek, gebundenGrund: undefined }
              : spieler,
          ),
        },
      };
      return beteiligteIds.reduce(
        (zwischenstand, spielerId) =>
          protokolliereSpieler(
            zwischenstand,
            spielerId,
            action.patientId,
            `Rettung von ${action.patientId} abgeschlossen.`,
          ),
        naechster,
      );
    }

    case 'rufgruppeWaehlen': {
      // Eigenen Eintrag immer zuerst entfernen - ein Kanalwechsel ist kein
      // Beitritt zu einem zweiten Kanal gleichzeitig.
      const ohneEigenen = state.rufgruppen.filter(
        (mitglied) => mitglied.teilnehmerId !== action.teilnehmerId,
      );
      if (action.kanal === null) return { ...state, rufgruppen: ohneEigenen };
      return {
        ...state,
        rufgruppen: [
          ...ohneEigenen,
          { teilnehmerId: action.teilnehmerId, teilnehmerName: action.teilnehmerName, kanal: action.kanal },
        ],
      };
    }

    case 'patientVerlegen': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      if (!patient || !istVerlegungMoeglich(patient.abschnitt, action.ziel)) return state;
      // Ohne bestätigte Sichtung wird niemand weitergereicht.
      if (sichtungOffen(patient)) return state;
      // Eine noch nicht gerettete, eingeklemmte Person lässt sich nicht
      // verlegen - sie steckt physisch fest (→ `modell.eingeklemmtstatus`).
      if (patient.eingeklemmt && !patient.eingeklemmt.gerettet) return state;
      const verlegt = mitPatient(state, action.patientId, (eintrag) =>
        verlegePatient(eintrag, action.ziel, state.zeitSek),
      );
      const protokolliert = uebernimmVerlaufInSpielerprotokoll(
        state,
        verlegt,
        [action.spielerId],
        action.patientId,
      );
      // Nach der Verlegung zurück in die Liste des bearbeiteten Abschnitts:
      // Dort warten die übrigen Patienten.
      return { ...protokolliert, ausgewaehlterPatientId: null };
    }

    case 'abschnittWaehlen':
      return { ...state, ausgewaehlterAbschnitt: action.abschnitt, ausgewaehlterPatientId: null };

    case 'einsatzBeenden':
      return protokolliereRegie(
        { ...state, phase: 'debriefing', laufend: false, ausgewaehlterPatientId: null },
        'Übung beendet.',
      );

    case 'zurueckZumSetup':
      // sitzung bleibt erhalten: Eine Übungsleitung, die aus dem Debriefing
      // zurückgeht, bleibt angemeldet und kann direkt ein neues Szenario
      // wählen, statt sich neu anzumelden.
      return {
        ...ANFANGSZUSTAND,
        geschwindigkeit: state.geschwindigkeit,
        eigeneSzenarien: state.eigeneSzenarien,
        massnahmenrechte: state.massnahmenrechte,
        modus: state.modus,
        sitzung: state.sitzung,
        phase: 'setup',
      };

    // --- Mehrspieler -------------------------------------------------
    case 'gemeinsamOeffnen':
      return { ...state, phase: 'rolle', modus: 'digital', sitzung: KEINE_SITZUNG };

    case 'rolleWaehlen':
      return {
        ...state,
        phase: action.rolle === 'uebungsleiter' ? 'anmeldung' : 'beitritt',
        sitzung: { ...KEINE_SITZUNG, rolle: action.rolle },
      };

    case 'anmeldungAbschliessen':
      // Erst der Modus (→ `ui.modus`) - er entscheidet, auf welche Art das
      // Szenario gespielt wird, noch vor den Maßnahmenrechten.
      return {
        ...state,
        phase: 'modus',
        sitzung: {
          ...state.sitzung,
          rolle: 'uebungsleiter',
          eigeneId: action.eigeneId,
          eigenerName: action.name,
        },
      };

    case 'massnahmenrechteSetzen':
      return { ...state, massnahmenrechte: action.rechte };

    case 'massnahmenrechteAbgeschlossen':
      return { ...state, phase: 'setup' };

    // --- Fahrzeugkonfiguration (→ `domain.manvstufen`, `ui.fahrzeugkonfiguration`) ---
    // Zwischen Szenariowahl und Sitzungseröffnung: die Sitzung (Code,
    // Spielerliste) existiert hier noch nicht - erst
    // `fahrzeugkonfigurationAbgeschlossen` öffnet sie, wie zuvor
    // `sitzungEroeffnen` es direkt beim Szenario-Klick tat.
    case 'szenarioFuerSitzungWaehlen':
      return {
        ...state,
        phase: 'fahrzeugkonfiguration',
        szenario: action.szenario,
        fahrzeugWunsch: action.szenario.fahrzeuge ?? [],
      };

    case 'manvStufeGewaehlt':
      return { ...state, fahrzeugWunsch: fahrzeugeFuerStufe(action.stufe) };

    case 'fahrzeugHinzugefuegt':
      return {
        ...state,
        fahrzeugWunsch: [
          ...state.fahrzeugWunsch,
          { id: erzeugeId(), typ: action.fahrzeugTyp },
        ],
      };

    case 'fahrzeugEntfernt':
      return {
        ...state,
        fahrzeugWunsch: state.fahrzeugWunsch.filter((f) => f.id !== action.fahrzeugId),
      };

    case 'fahrzeugkonfigurationAbgeschlossen': {
      if (!state.szenario) return state;
      const code = erzeugeCode();
      const selbst: Spieler = {
        id: state.sitzung.eigeneId ?? 'leiter',
        name: state.sitzung.eigenerName ?? 'Übungsleitung',
        rolle: 'uebungsleiter',
        qualifikation: 'basis',
      };
      return {
        ...ANFANGSZUSTAND,
        eigeneSzenarien: state.eigeneSzenarien,
        geschwindigkeit: state.geschwindigkeit,
        massnahmenrechte: state.massnahmenrechte,
        modus: 'digital',
        phase: 'wartebereich',
        szenario: state.szenario,
        fahrzeuge: state.fahrzeugWunsch.map((vorlage) => fahrzeugAusVorlage(vorlage)),
        sitzung: {
          aktiv: true,
          rolle: 'uebungsleiter',
          code,
          eigeneId: selbst.id,
          eigenerName: selbst.name,
          spieler: [selbst],
          status: 'wartet',
          verbindungsfehler: null,
        },
      };
    }

    case 'spielerBeitreten': {
      // Der Beobachter-Code teilt sich denselben Transport-Kanal wie der
      // normale Sitzungscode, nur mit erkennbarem Anhang (→ `sitzung.beobachter`) -
      // hier wird er in echten Kanal-Code und erkannte Rolle aufgelöst.
      const { code, rolle } = codeUndRolleAus(action.code);
      return {
        ...ANFANGSZUSTAND,
        eigeneSzenarien: state.eigeneSzenarien,
        geschwindigkeit: state.geschwindigkeit,
        massnahmenrechte: state.massnahmenrechte,
        modus: 'digital',
        phase: 'wartebereich',
        sitzung: {
          aktiv: true,
          rolle,
          code,
          eigeneId: action.eigeneId,
          eigenerName: action.name,
          spieler: [],
          status: 'wartet',
          verbindungsfehler: null,
        },
      };
    }

    case 'spielerHinzugefuegt':
      return {
        ...state,
        sitzung: { ...state.sitzung, spieler: mitSpieler(state.sitzung.spieler, action.spieler) },
      };

    case 'spielerEntfernt':
      return {
        ...state,
        sitzung: { ...state.sitzung, spieler: ohneSpieler(state.sitzung.spieler, action.spielerId) },
        // Kein Geistermitglied im Sprechfunk-Kanal zurücklassen (→ `modell.rufgruppe`).
        rufgruppen: state.rufgruppen.filter((mitglied) => mitglied.teilnehmerId !== action.spielerId),
        // Anfragen der verlassenden Person entfallen ganz (→ `modell.kollegenanfrage`),
        // eine bereits angenommene Rolle wird wieder frei für jemand anderen.
        kollegenanfragen: state.kollegenanfragen
          .filter((anfrage) => anfrage.anfragendeId !== action.spielerId)
          .map((anfrage) => ({
            ...anfrage,
            angenommenVon: anfrage.angenommenVon.filter((id) => id !== action.spielerId),
          })),
        // Eine laufende Rettung verliert die verlassende Person wieder -
        // koordinierte sie selbst, kann eine andere Person neu beginnen
        // (→ `modell.eingeklemmtstatus`).
        patienten: state.patienten.map((patient) =>
          patient.eingeklemmt
            ? {
                ...patient,
                eingeklemmt: {
                  ...patient.eingeklemmt,
                  anfragendeId:
                    patient.eingeklemmt.anfragendeId === action.spielerId
                      ? null
                      : patient.eingeklemmt.anfragendeId,
                  helfendeIds: patient.eingeklemmt.helfendeIds.filter((id) => id !== action.spielerId),
                },
              }
            : patient,
        ),
      };

    case 'spielerQualifikationSetzen':
      return {
        ...state,
        sitzung: {
          ...state.sitzung,
          spieler: state.sitzung.spieler.map((spieler) =>
            spieler.id === action.spielerId
              ? { ...spieler, qualifikation: action.qualifikation }
              : spieler,
          ),
        },
      };

    case 'spielerAbschnittGesetzt':
      // Für alle sichtbar mitgeführt (→ `sitzung.modell`), anders als die rein
      // lokale Navigation (`ausgewaehlterAbschnitt`) - Grundlage für die
      // Kandidatenwahl einer Delegationsanfrage (→ `ui.delegationsanfrage`).
      return {
        ...state,
        sitzung: {
          ...state.sitzung,
          spieler: state.sitzung.spieler.map((spieler) =>
            spieler.id === action.spielerId
              ? { ...spieler, aktuellerAbschnitt: action.abschnitt }
              : spieler,
          ),
        },
      };

    case 'spielerFuehrungsrolleSetzen':
      // Anders als die Qualifikation (jede Person wählt sich selbst) wird die
      // Führungsrolle zugeteilt - Aufruf ist deshalb nur der Übungsleitung
      // sinnvoll zugänglich (→ `ui.wartebereich`), im Reducer selbst wie
      // gewohnt nicht zusätzlich geprüft (kooperatives Übungstool).
      return {
        ...state,
        sitzung: {
          ...state.sitzung,
          spieler: state.sitzung.spieler.map((spieler) =>
            spieler.id === action.spielerId
              ? { ...spieler, fuehrungsrolle: action.rolle }
              : spieler,
          ),
        },
      };

    case 'fahrzeugBesatzungGesetzt':
      return mitFahrzeug(state, action.fahrzeugId, (fahrzeug) => ({
        ...fahrzeug,
        besatzung: action.besatzung,
      }));

    case 'fahrzeugVerlegen': {
      const fahrzeug = state.fahrzeuge.find((eintrag) => eintrag.id === action.fahrzeugId);
      if (!fahrzeug || !istFahrzeugVerlegungMoeglich(fahrzeug.abschnitt, action.ziel)) return state;
      return mitFahrzeug(state, action.fahrzeugId, (eintrag) => verlegeFahrzeug(eintrag, action.ziel));
    }

    case 'fahrzeugGruppeZuweisen': {
      const fahrzeug = state.fahrzeuge.find((eintrag) => eintrag.id === action.fahrzeugId);
      if (!fahrzeug) return state;
      const naechster = mitFahrzeug(state, action.fahrzeugId, (eintrag) => ({
        ...eintrag,
        gruppenfuehrerId: action.gruppenfuehrerId ?? undefined,
      }));
      if (!action.gruppenfuehrerId) {
        return protokolliereRegie(
          naechster,
          `${FAHRZEUGTYP_INFO[fahrzeug.typ].label} keiner Gruppe mehr zugewiesen.`,
        );
      }
      const gruppenfuehrer = state.sitzung.spieler.find((s) => s.id === action.gruppenfuehrerId);
      return protokolliereRegie(
        naechster,
        `${FAHRZEUGTYP_INFO[fahrzeug.typ].label} der Gruppe von ${gruppenfuehrer?.name ?? 'Gruppenführer'} zugewiesen.`,
      );
    }

    case 'verbindungsfehlerSetzen':
      return { ...state, sitzung: { ...state.sitzung, verbindungsfehler: action.meldung } };

    case 'freigabemodusSetzen':
      return { ...state, freigabemodus: action.modus };

    case 'patientFreigeben': {
      const ziel: Einsatzabschnitt = state.freigabemodus === 'sofort' ? 'schadensstelle' : 'ablage';
      const naechster = mitPatient(state, action.patientId, (patient) =>
        freigebenPatient(patient, ziel, state.zeitSek),
      );
      return protokolliereRegie(naechster, `Patient ${action.patientId} freigegeben.`);
    }

    case 'alleVerdecktenFreigeben': {
      const ziel: Einsatzabschnitt = state.freigabemodus === 'sofort' ? 'schadensstelle' : 'ablage';
      const naechster = {
        ...state,
        patienten: state.patienten.map((patient) => freigebenPatient(patient, ziel, state.zeitSek)),
      };
      return protokolliereRegie(naechster, 'Alle verdeckten Patienten auf einmal freigegeben.');
    }

    // Ereignis-Injektion (→ `modell.ereignis`): drei von der Übungsleitung
    // live auslösbare Ereignisse - Fahrzeugausfall, Nachforderung und
    // Lageänderung. Reine Regie-Werkzeuge ohne eigene Rollenprüfung im
    // Reducer (wie die übrigen Regie-Aktionen bleibt das Gate im UI, → `ui.ereignissepanel`).

    case 'fahrzeugAusfallSetzen': {
      const fahrzeug = state.fahrzeuge.find((eintrag) => eintrag.id === action.fahrzeugId);
      const naechster = mitFahrzeug(state, action.fahrzeugId, (eintrag) => ({
        ...eintrag,
        ausgefallen: action.ausgefallen,
      }));
      if (!fahrzeug) return naechster;
      const label =
        FAHRZEUGTYP_INFO[fahrzeug.typ].label + (fahrzeug.kennung ? ` (${fahrzeug.kennung})` : '');
      return protokolliereRegie(
        naechster,
        action.ausgefallen ? `${label} als ausgefallen gemeldet.` : `${label} wieder einsatzbereit gemeldet.`,
      );
    }

    case 'fahrzeugNachfordern': {
      // Trifft zunächst im Bereitstellungsraum ein (→ `abschnitte.wege`) -
      // von dort per normaler Fahrzeugverlegung mit echter, geodatenbasierter
      // Anfahrtszeit weiter (→ `domain.geodaten`), sobald Besatzung zugewiesen ist.
      const naechster = {
        ...state,
        fahrzeuge: [
          ...state.fahrzeuge,
          fahrzeugAusVorlage({ id: erzeugeId(), typ: action.fahrzeugTyp }, 'bereitstellungsraum'),
        ],
      };
      return protokolliereRegie(
        naechster,
        `Nachforderung: ${FAHRZEUGTYP_INFO[action.fahrzeugTyp].label} angefordert.`,
      );
    }

    case 'ereignisAusloesen': {
      if (!state.szenario || state.ausgeloesteEreignisse.includes(action.ereignisId)) return state;
      const ereignis = state.szenario.ereignisse?.find((eintrag) => eintrag.id === action.ereignisId);
      if (!ereignis) return state;
      // Dieselbe Landestelle wie eine reguläre Freigabe (→ `modell.freigabemodus`)
      // - in einer Lage ohne RD an der Schadensstelle kommen auch Nachzügler
      // zunächst in der Ablage an.
      const ziel: Einsatzabschnitt = state.freigabemodus === 'sofort' ? 'schadensstelle' : 'ablage';
      const faktor = state.alleine ? SOLO_VERSCHLECHTERUNG_FAKTOR : 1;
      const naechster = {
        ...state,
        patienten: [
          ...state.patienten,
          ...ereignis.patienten.map((vorlage) =>
            patientAusVorlage(vorlage, faktor, ziel, state.zeitSek),
          ),
        ],
        ausgeloesteEreignisse: [...state.ausgeloesteEreignisse, action.ereignisId],
      };
      return protokolliereRegie(naechster, `Lageänderung ausgelöst: „${ereignis.titel}".`);
    }

    case 'zeltPlatzieren': {
      const baufeld = state.szenario?.baufeld ?? STANDARD_BAUFELD;
      const pruefeGrenzen =
        action.abschnitt === 'zelt_rot' ||
        action.abschnitt === 'zelt_gelb' ||
        action.abschnitt === 'zelt_gruen';
      if (
        !platzierungGueltig(
          { typ: action.flaechenTyp, abschnitt: action.abschnitt, xM: action.xM, yM: action.yM },
          state.flaechen,
          baufeld,
          pruefeGrenzen,
        )
      ) {
        return state;
      }
      const platziert: PlatzierteFlaeche = {
        id: action.id,
        typ: action.flaechenTyp,
        abschnitt: action.abschnitt,
        xM: action.xM,
        yM: action.yM,
        platziertVonSpielerId: action.spielerId,
      };
      const naechster = {
        ...state,
        flaechen: [
          ...state.flaechen.filter((flaeche) => flaeche.abschnitt !== action.abschnitt),
          platziert,
        ],
        // Erfüllt einen wartenden Befehl (→ `modell.flaechenbefehl`), falls diese
        // Platzierung dessen Ausführung war - sonst bleibt die Liste unverändert.
        flaechenBefehle: action.befehlId
          ? state.flaechenBefehle.filter((befehl) => befehl.id !== action.befehlId)
          : state.flaechenBefehle,
      };
      return protokolliereRegie(
        naechster,
        `${action.flaechenTyp}-Fläche für ${geoPunktName(action.abschnitt)} aufgestellt.`,
      );
    }

    case 'zeltEntfernen': {
      return {
        ...state,
        flaechen: state.flaechen.filter((flaeche) => flaeche.id !== action.id),
      };
    }

    case 'zeltBefehlErteilen': {
      const baufeld = state.szenario?.baufeld ?? STANDARD_BAUFELD;
      const pruefeGrenzen =
        action.abschnitt === 'zelt_rot' ||
        action.abschnitt === 'zelt_gelb' ||
        action.abschnitt === 'zelt_gruen';
      if (
        !platzierungGueltig(
          { typ: action.flaechenTyp, abschnitt: action.abschnitt, xM: action.xM, yM: action.yM },
          state.flaechen,
          baufeld,
          pruefeGrenzen,
        )
      ) {
        return state;
      }
      const befehl: FlaechenBefehl = {
        id: action.id,
        typ: action.flaechenTyp,
        abschnitt: action.abschnitt,
        xM: action.xM,
        yM: action.yM,
        zugfuehrerId: action.zugfuehrerId,
        gruppenfuehrerId: action.gruppenfuehrerId,
      };
      const gruppenfuehrer = state.sitzung.spieler.find((s) => s.id === action.gruppenfuehrerId);
      return protokolliereRegie(
        {
          ...state,
          // Ein neuer Befehl für denselben Abschnitt ersetzt einen noch offenen -
          // derselbe "ersetzt statt addiert"-Grundsatz wie bei `zeltPlatzieren`.
          flaechenBefehle: [
            ...state.flaechenBefehle.filter((eintrag) => eintrag.abschnitt !== action.abschnitt),
            befehl,
          ],
        },
        `Befehl an ${gruppenfuehrer?.name ?? 'Gruppenführer'}: ${action.flaechenTyp}-Fläche für ${geoPunktName(action.abschnitt)} bauen.`,
      );
    }

    case 'zeltBefehlAblehnen': {
      return {
        ...state,
        flaechenBefehle: state.flaechenBefehle.filter((befehl) => befehl.id !== action.id),
      };
    }

    case 'abschnittFuehrenBefehlErteilen': {
      const befehl: AbschnittFuehrenBefehl = {
        id: action.id,
        ziel: action.ziel,
        zugfuehrerId: action.zugfuehrerId,
        gruppenfuehrerId: action.gruppenfuehrerId,
      };
      const gruppenfuehrer = state.sitzung.spieler.find((s) => s.id === action.gruppenfuehrerId);
      return protokolliereRegie(
        {
          ...state,
          // Ein Gruppenführer kann jeweils nur einen offenen Führungsauftrag
          // haben - ein neuer ersetzt einen noch offenen.
          abschnittFuehrenBefehle: [
            ...state.abschnittFuehrenBefehle.filter(
              (eintrag) => eintrag.gruppenfuehrerId !== action.gruppenfuehrerId,
            ),
            befehl,
          ],
        },
        `Befehl an ${gruppenfuehrer?.name ?? 'Gruppenführer'}: ${geoPunktName(action.ziel)} führen.`,
      );
    }

    case 'abschnittFuehrenBefehlAusfuehren': {
      const befehl = state.abschnittFuehrenBefehle.find((eintrag) => eintrag.id === action.id);
      if (!befehl) return state;
      const gruppe = state.fahrzeuge.filter(
        (fahrzeug) => fahrzeug.gruppenfuehrerId === befehl.gruppenfuehrerId,
      );
      // Jedes Fahrzeug der Gruppe zieht für sich um - eines, das schon am Ziel
      // steht, bleibt unverändert; eines ohne direkten Weg (→
      // `istFahrzeugVerlegungMoeglich`) bleibt stehen, statt den ganzen
      // Befehl scheitern zu lassen.
      const naechster = {
        ...state,
        fahrzeuge: state.fahrzeuge.map((fahrzeug) => {
          if (fahrzeug.gruppenfuehrerId !== befehl.gruppenfuehrerId) return fahrzeug;
          if (fahrzeug.abschnitt === befehl.ziel) return fahrzeug;
          if (!istFahrzeugVerlegungMoeglich(fahrzeug.abschnitt, befehl.ziel)) return fahrzeug;
          return verlegeFahrzeug(fahrzeug, befehl.ziel);
        }),
        abschnittFuehrenBefehle: state.abschnittFuehrenBefehle.filter(
          (eintrag) => eintrag.id !== action.id,
        ),
      };
      const bewegt = gruppe.filter(
        (fahrzeug) =>
          fahrzeug.abschnitt !== befehl.ziel &&
          istFahrzeugVerlegungMoeglich(fahrzeug.abschnitt, befehl.ziel),
      ).length;
      const gruppenfuehrer = state.sitzung.spieler.find((s) => s.id === befehl.gruppenfuehrerId);
      return protokolliereRegie(
        naechster,
        `${gruppenfuehrer?.name ?? 'Gruppenführer'} führt jetzt ${geoPunktName(befehl.ziel)} (${bewegt} von ${gruppe.length} Fahrzeugen verlegt).`,
      );
    }

    case 'abschnittFuehrenBefehlAblehnen': {
      return {
        ...state,
        abschnittFuehrenBefehle: state.abschnittFuehrenBefehle.filter(
          (eintrag) => eintrag.id !== action.id,
        ),
      };
    }

    // Fahrzeug-Zuweisung und Transport-Freigabe sind hier bewusst ein
    // einziger Schritt (→ `modell.transport`) - kein separater
    // Genehmigungsvorgang. Nur strukturelle Wächter (Datenintegrität): die
    // Rechteprüfung (→ `darfFahrzeugeDisponieren`) bleibt UI-only, wie bei
    // jeder anderen Fahrzeugdisposition auch.
    case 'patientAbtransportieren': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      const fahrzeug = state.fahrzeuge.find((eintrag) => eintrag.id === action.fahrzeugId);
      if (!patient || !fahrzeug) return state;
      if (patient.abschnitt !== 'ausgangssichtung' || patient.status === 'verstorben') return state;
      if (sichtungOffen(patient)) return state;
      if (fahrzeug.abschnitt !== 'ausgangssichtung') return state;
      if (fahrzeug.typ !== 'rtw' && fahrzeug.typ !== 'ktw') return state;
      if (fahrzeug.transportierterPatientId) return state;

      let naechster = mitPatient(state, action.patientId, (eintrag) => ({
        ...verlegePatient(eintrag, 'transport', state.zeitSek),
        transportFahrzeugId: action.fahrzeugId,
      }));
      naechster = mitFahrzeug(naechster, action.fahrzeugId, (eintrag) => ({
        ...verlegeFahrzeug(eintrag, 'transport'),
        transportierterPatientId: action.patientId,
      }));
      const protokolliert = uebernimmVerlaufInSpielerprotokoll(
        state,
        naechster,
        [action.spielerId],
        action.patientId,
      );
      return protokolliereRegie(
        { ...protokolliert, ausgewaehlterPatientId: null },
        `${FAHRZEUGTYP_INFO[fahrzeug.typ].label} übernimmt Patient zum Transport - Abtransport freigegeben.`,
      );
    }

    case 'meldebuchEintragen': {
      const text = action.text.trim();
      if (!text) return state;
      return {
        ...state,
        meldebuch: [
          ...state.meldebuch,
          {
            id: action.id,
            bereich: action.bereich,
            text,
            zeitSek: state.zeitSek,
            spielerId: action.spielerId,
          },
        ],
      };
    }

    // Ersetzt statt zu addieren - dasselbe Muster wie FlaechenBefehl/
    // AbschnittFuehrenBefehl: eine neu berechnete Wegstrecke für ein Paar
    // (in beide Richtungen erkannt) ersetzt eine bestehende.
    case 'routeErstellen': {
      const ohneAlte = state.routen.filter(
        (route) =>
          !(
            (route.von === action.von && route.nach === action.nach) ||
            (route.von === action.nach && route.nach === action.von)
          ),
      );
      const route: Route = {
        id: action.id,
        von: action.von,
        nach: action.nach,
        distanzMeter: action.distanzMeter,
        geometrie: action.geometrie,
      };
      return protokolliereRegie(
        { ...state, routen: [...ohneAlte, route] },
        `Wegstrecke ${geoPunktName(action.von)} ↔ ${geoPunktName(action.nach)} angelegt (${Math.round(action.distanzMeter)} m).`,
      );
    }

    case 'sitzungStarten': {
      if (!state.szenario) return state;
      // Sofort: wie bisher direkt an der Schadensstelle sichtbar. Gestaffelt:
      // alle Patienten starten verdeckt (→ `modell.freigabemodus`) und werden
      // erst durch manuelle oder zeitgesteuerte Freigabe sichtbar.
      const startAbschnitt: Einsatzabschnitt =
        state.freigabemodus === 'sofort' ? 'schadensstelle' : 'verdeckt';
      const naechster = {
        ...state,
        phase: 'einsatz' as const,
        laufend: true,
        zeitSek: 0,
        ausgewaehlterAbschnitt: (state.freigabemodus === 'sofort' ? 'schadensstelle' : 'ablage') as Einsatzabschnitt,
        ausgewaehlterPatientId: null,
        patienten: state.szenario.patienten.map((vorlage) =>
          patientAusVorlage(vorlage, 1, startAbschnitt),
        ),
        routen: [],
        sitzung: { ...state.sitzung, status: 'laeuft' as const },
      };
      return protokolliereRegie(naechster, 'Übung gestartet.');
    }

    case 'sitzungVerlassen':
      return {
        ...ANFANGSZUSTAND,
        eigeneSzenarien: state.eigeneSzenarien,
        geschwindigkeit: state.geschwindigkeit,
        massnahmenrechte: state.massnahmenrechte,
      };

    case 'schnappschussAnwenden': {
      const s = action.schnappschuss;
      // Netzwerk garantiert keine Zustellreihenfolge: Ein verspätet
      // eintreffender älterer Schnappschuss darf einen bereits angewendeten
      // neueren nicht zurückdrehen (→ `state.schnappschuss`).
      if (s.folge <= state.schnappschussFolge) return state;
      return {
        ...state,
        phase: s.phase,
        szenario: s.szenario,
        zeitSek: s.zeitSek,
        laufend: s.laufend,
        geschwindigkeit: s.geschwindigkeit,
        patienten: s.patienten,
        fahrzeuge: s.fahrzeuge,
        massnahmenrechte: s.massnahmenrechte,
        delegationsanfragen: s.delegationsanfragen,
        rufgruppen: s.rufgruppen,
        kollegenanfragen: s.kollegenanfragen,
        freigabemodus: s.freigabemodus,
        routen: s.routen,
        ausgeloesteEreignisse: s.ausgeloesteEreignisse,
        regieProtokoll: s.regieProtokoll,
        spielerProtokoll: s.spielerProtokoll,
        flaechen: s.flaechen,
        flaechenBefehle: s.flaechenBefehle,
        abschnittFuehrenBefehle: s.abschnittFuehrenBefehle,
        meldebuch: s.meldebuch,
        schnappschussFolge: s.folge,
        // Ist der eigene ausgewählte Patient nicht mehr im gezeigten Abschnitt,
        // bleibt die Auswahl trotzdem lokal - die Ansicht prüft das selbst.
        sitzung: { ...state.sitzung, spieler: s.spieler, status: s.status },
      };
    }

    default: {
      // Zwingt jede neue Aktion zu einem eigenen `case`: Ohne diese Zeile
      // würde ein vergessener Fall stillschweigend zu `state` - ein Klick
      // ohne jede Wirkung, nicht mal ein Konsolenfehler zum Aufspüren.
      const nichtBehandelt: never = action;
      return nichtBehandelt;
    }
  }
}
