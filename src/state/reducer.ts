import { istVerlegungMoeglich } from '../domain/abschnitte';
import { fahrzeugAusVorlage, verlegeFahrzeug } from '../domain/fahrzeuge';
import { standardMassnahmenrechte } from '../domain/massnahmenrechte';
import { verbraucheMaterial } from '../domain/material';
import { fahrzeugeFuerStufe } from '../domain/manvStufen';
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
  erzeugeCode,
  erzeugeId,
  mitSpieler,
  ohneSpieler,
} from '../domain/sitzung';
import type { Rolle, Sitzungszustand, Spieler } from '../domain/sitzung';
import type {
  DelegationsAnfrage,
  DiagnostikId,
  Einsatzabschnitt,
  Fahrzeug,
  FahrzeugTyp,
  FahrzeugVorlage,
  Fuehrungsrolle,
  Funkmeldung,
  FunkmeldungKategorie,
  MassnahmeId,
  Patient,
  Qualifikation,
  Sichtungskategorie,
  Szenario,
} from '../domain/types';

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
   * Protokoll des Funkkanals (→ `modell.funkmeldung`, `ui.funk`) - jede
   * Person sieht alle Einträge, wie beim echten BOS-Funk.
   */
  funkmeldungen: Funkmeldung[];
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
  funkmeldungen: [],
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
  | { typ: 'diagnostikDurchfuehren'; patientId: string; diagnostikId: DiagnostikId }
  | { typ: 'patientSichten'; patientId: string; kategorie: Sichtungskategorie; final?: boolean }
  | {
      typ: 'massnahmeDurchfuehren';
      patientId: string;
      massnahmeId: MassnahmeId;
      /** Nur bei Maßnahmen mit Dosisreferenz relevant (→ `domain.dosierung`). */
      dosisMg?: number;
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
      typ: 'funkmeldungSenden';
      id: string;
      kategorie: FunkmeldungKategorie;
      abschnitt: Einsatzabschnitt;
      absenderId: string;
      absenderName: string;
      text: string;
      sichtungsstand?: Partial<Record<Sichtungskategorie | 'offen', number>>;
      bezugId?: string;
    }
  | { typ: 'patientVerlegen'; patientId: string; ziel: Einsatzabschnitt }
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
  /** Protokoll des Funkkanals (→ `modell.funkmeldung`). */
  funkmeldungen: Funkmeldung[];
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
    funkmeldungen: state.funkmeldungen,
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
      return {
        ...state,
        zeitSek: state.zeitSek + action.dtSek,
        patienten: state.patienten.map((patient) =>
          simuliereZeitraum(patient, state.zeitSek, action.dtSek),
        ),
      };
    }

    case 'pauseUmschalten':
      return { ...state, laufend: !state.laufend };

    case 'geschwindigkeitSetzen':
      return { ...state, geschwindigkeit: action.wert };

    case 'patientWaehlen':
      return { ...state, ausgewaehlterPatientId: action.patientId };

    case 'diagnostikDurchfuehren': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      if (!patient || patient.durchgefuehrteDiagnostik.includes(action.diagnostikId)) {
        return state;
      }
      return mitPatient(state, action.patientId, (eintrag) =>
        fuehreDiagnostikDurch(eintrag, action.diagnostikId, state.zeitSek),
      );
    }

    case 'patientSichten': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      if (!patient) return state;
      return mitPatient(state, action.patientId, (eintrag) =>
        sichtePatient(eintrag, action.kategorie, state.zeitSek, action.final),
      );
    }

    case 'massnahmeDurchfuehren': {
      const behandelter = state.patienten.find((patient) => patient.id === action.patientId);
      if (!behandelter) return state;
      return {
        ...mitPatient(state, action.patientId, (patient) =>
          wendeMassnahmeAn(patient, action.massnahmeId, state.zeitSek, action.dosisMg),
        ),
        fahrzeuge: verbraucheMaterial(state.fahrzeuge, action.massnahmeId, behandelter.abschnitt),
      };
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

    case 'funkmeldungSenden':
      // Dedupliziert über die Meldungs-Id, falls dieselbe Nachricht (z. B.
      // nach einer verlorenen Bestätigung, → `state.aktionsbestaetigung`)
      // erneut ankommt.
      if (state.funkmeldungen.some((eintrag) => eintrag.id === action.id)) return state;
      return {
        ...state,
        funkmeldungen: [
          ...state.funkmeldungen,
          {
            id: action.id,
            kategorie: action.kategorie,
            abschnitt: action.abschnitt,
            absenderId: action.absenderId,
            absenderName: action.absenderName,
            text: action.text,
            sichtungsstand: action.sichtungsstand,
            bezugId: action.bezugId,
            // Host-Uhr ist maßgeblich, nicht die Uhr des Absenders.
            zeitSek: state.zeitSek,
          },
        ],
      };

    case 'patientVerlegen': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      if (!patient || !istVerlegungMoeglich(patient.abschnitt, action.ziel)) return state;
      // Ohne bestätigte Sichtung wird niemand weitergereicht.
      if (sichtungOffen(patient)) return state;
      const verlegt = mitPatient(state, action.patientId, (eintrag) =>
        verlegePatient(eintrag, action.ziel, state.zeitSek),
      );
      // Nach der Verlegung zurück in die Liste des bearbeiteten Abschnitts:
      // Dort warten die übrigen Patienten.
      return { ...verlegt, ausgewaehlterPatientId: null };
    }

    case 'abschnittWaehlen':
      return { ...state, ausgewaehlterAbschnitt: action.abschnitt, ausgewaehlterPatientId: null };

    case 'einsatzBeenden':
      return { ...state, phase: 'debriefing', laufend: false, ausgewaehlterPatientId: null };

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
        fahrzeuge: state.fahrzeugWunsch.map(fahrzeugAusVorlage),
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

    case 'spielerBeitreten':
      return {
        ...ANFANGSZUSTAND,
        eigeneSzenarien: state.eigeneSzenarien,
        geschwindigkeit: state.geschwindigkeit,
        massnahmenrechte: state.massnahmenrechte,
        modus: 'digital',
        phase: 'wartebereich',
        sitzung: {
          aktiv: true,
          rolle: 'spieler',
          code: action.code,
          eigeneId: action.eigeneId,
          eigenerName: action.name,
          spieler: [],
          status: 'wartet',
          verbindungsfehler: null,
        },
      };

    case 'spielerHinzugefuegt':
      return {
        ...state,
        sitzung: { ...state.sitzung, spieler: mitSpieler(state.sitzung.spieler, action.spieler) },
      };

    case 'spielerEntfernt':
      return {
        ...state,
        sitzung: { ...state.sitzung, spieler: ohneSpieler(state.sitzung.spieler, action.spielerId) },
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
      if (!fahrzeug || !istVerlegungMoeglich(fahrzeug.abschnitt, action.ziel)) return state;
      return mitFahrzeug(state, action.fahrzeugId, (eintrag) => verlegeFahrzeug(eintrag, action.ziel));
    }

    case 'verbindungsfehlerSetzen':
      return { ...state, sitzung: { ...state.sitzung, verbindungsfehler: action.meldung } };

    case 'sitzungStarten':
      if (!state.szenario) return state;
      return {
        ...state,
        phase: 'einsatz',
        laufend: true,
        zeitSek: 0,
        ausgewaehlterAbschnitt: 'schadensstelle',
        ausgewaehlterPatientId: null,
        patienten: state.szenario.patienten.map((vorlage) => patientAusVorlage(vorlage)),
        sitzung: { ...state.sitzung, status: 'laeuft' },
      };

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
        funkmeldungen: s.funkmeldungen,
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
