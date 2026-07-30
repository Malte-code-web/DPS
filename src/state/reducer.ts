import { VERLEGUNGSDAUER_SEK, istVerlegungMoeglich } from '../domain/abschnitte';
import { DIAGNOSTIK } from '../domain/diagnostik';
import { MASSNAHMEN } from '../domain/massnahmen';
import { standardMassnahmenrechte } from '../domain/massnahmenrechte';
import {
  SICHTUNGSDAUER_SEK,
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
  mitSpieler,
  ohneSpieler,
} from '../domain/sitzung';
import type { Rolle, Sitzungszustand, Spieler } from '../domain/sitzung';
import type {
  DiagnostikId,
  Einsatzabschnitt,
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
  | 'massnahmenrechte'
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
  | { typ: 'massnahmeDelegieren'; patientId: string; massnahmeId: MassnahmeId }
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
  | { typ: 'sitzungEroeffnen'; szenario: Szenario }
  | { typ: 'spielerBeitreten'; code: string; name: string; eigeneId: string }
  | { typ: 'spielerHinzugefuegt'; spieler: Spieler }
  | { typ: 'spielerEntfernt'; spielerId: string }
  | { typ: 'spielerQualifikationSetzen'; spielerId: string; qualifikation: Qualifikation }
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
  spieler: Spieler[];
  status: Sitzungszustand['status'];
  /** Damit alle Clients dieselben Sperren durchsetzen, nicht nur der Host. */
  massnahmenrechte: Massnahmenrechte;
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
    spieler: state.sitzung.spieler,
    status: state.sitzung.status,
    massnahmenrechte: state.massnahmenrechte,
  };
}

/**
 * @anker state.zeit Kernmechanik: jede Handlung lässt die Uhr für alle laufen
 *
 * Laesst Einsatzzeit verstreichen - fuer alle Patienten gleichzeitig.
 *
 * Das ist der Kern der Uebung: Wer sich an einem Patienten festarbeitet,
 * verliert die Zeit bei allen anderen. Eine Intubation kostet drei Minuten,
 * in denen nebenan jemand verbluten kann.
 */
function zeitVergehen(state: SimulationState, dauerSek: number): SimulationState {
  if (dauerSek <= 0) return state;
  return {
    ...state,
    zeitSek: state.zeitSek + dauerSek,
    patienten: state.patienten.map((patient) =>
      simuliereZeitraum(patient, state.zeitSek, dauerSek),
    ),
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

/** @anker state.reducer Wie Aktionen den Zustand verändern, inklusive Zeitkosten */
export function simulationReducer(
  state: SimulationState,
  action: SimulationAction,
): SimulationState {
  switch (action.typ) {
    case 'modusWaehlen':
      return {
        ...state,
        modus: action.modus,
        // Nur die digitale Übung führt weiter; die übrigen Modi zeigen
        // vorerst nur, was sie können sollen.
        phase: action.modus === 'digital' ? 'setup' : 'start',
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
      return zeitVergehen(
        mitPatient(state, action.patientId, (eintrag) =>
          fuehreDiagnostikDurch(eintrag, action.diagnostikId, state.zeitSek),
        ),
        DIAGNOSTIK[action.diagnostikId].dauerSek,
      );
    }

    case 'patientSichten': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      if (!patient) return state;
      // Jede Station sichtet einmal - ein Korrigieren an derselben Stelle nicht.
      const dauerSek = sichtungOffen(patient) ? SICHTUNGSDAUER_SEK : 0;
      return zeitVergehen(
        mitPatient(state, action.patientId, (eintrag) =>
          sichtePatient(eintrag, action.kategorie, state.zeitSek, action.final),
        ),
        dauerSek,
      );
    }

    case 'massnahmeDurchfuehren':
      return zeitVergehen(
        mitPatient(state, action.patientId, (patient) =>
          wendeMassnahmeAn(patient, action.massnahmeId, state.zeitSek, action.dosisMg),
        ),
        MASSNAHMEN[action.massnahmeId].dauerSek,
      );

    case 'massnahmeDelegieren':
      // Freigabe durch Rücksprache - kostet keine Einsatzzeit (→ `domain.qualifikation`).
      return mitPatient(state, action.patientId, (patient) =>
        patient.delegierteMassnahmen.includes(action.massnahmeId)
          ? patient
          : {
              ...patient,
              delegierteMassnahmen: [...patient.delegierteMassnahmen, action.massnahmeId],
            },
      );

    case 'patientVerlegen': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      if (!patient || !istVerlegungMoeglich(patient.abschnitt, action.ziel)) return state;
      // Ohne bestätigte Sichtung wird niemand weitergereicht.
      if (sichtungOffen(patient)) return state;
      const verlegt = zeitVergehen(
        mitPatient(state, action.patientId, (eintrag) =>
          verlegePatient(eintrag, action.ziel, state.zeitSek),
        ),
        VERLEGUNGSDAUER_SEK,
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
      // Erst die Maßnahmenrechte (Grundeinstellungen, → `ui.massnahmenrechte`) -
      // die gelten unabhängig vom Szenario und sind der erste Schritt.
      return {
        ...state,
        phase: 'massnahmenrechte',
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

    case 'sitzungEroeffnen': {
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
        szenario: action.szenario,
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
        massnahmenrechte: s.massnahmenrechte,
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
