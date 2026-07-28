import { VERLEGUNGSDAUER_SEK, istVerlegungMoeglich } from '../domain/abschnitte';
import { DIAGNOSTIK } from '../domain/diagnostik';
import { MASSNAHMEN } from '../domain/massnahmen';
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
  Sichtungskategorie,
  Szenario,
} from '../domain/types';

/** @anker state.phase Die Hauptzustände der Anwendung */
export type Phase =
  | 'start'
  | 'rolle'
  | 'anmeldung'
  | 'beitritt'
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
  | { typ: 'massnahmeDurchfuehren'; patientId: string; massnahmeId: MassnahmeId }
  | { typ: 'patientVerlegen'; patientId: string; ziel: Einsatzabschnitt }
  | { typ: 'abschnittWaehlen'; abschnitt: Einsatzabschnitt }
  | { typ: 'einsatzBeenden' }
  | { typ: 'zurueckZumSetup' }
  // --- Mehrspieler (→ `sitzung.modell`) ---
  | { typ: 'gemeinsamOeffnen' }
  | { typ: 'rolleWaehlen'; rolle: Rolle }
  | { typ: 'anmeldungAbschliessen'; name: string; eigeneId: string }
  | { typ: 'sitzungEroeffnen'; szenario: Szenario }
  | { typ: 'spielerBeitreten'; code: string; name: string; eigeneId: string }
  | { typ: 'spielerHinzugefuegt'; spieler: Spieler }
  | { typ: 'spielerEntfernt'; spielerId: string }
  | { typ: 'sitzungStarten' }
  | { typ: 'sitzungVerlassen' }
  | { typ: 'schnappschussAnwenden'; schnappschuss: Schnappschuss };

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
}

export function schnappschussAus(state: SimulationState): Schnappschuss {
  return {
    phase: state.phase,
    szenario: state.szenario,
    zeitSek: state.zeitSek,
    laufend: state.laufend,
    geschwindigkeit: state.geschwindigkeit,
    patienten: state.patienten,
    spieler: state.sitzung.spieler,
    status: state.sitzung.status,
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
      return { ...ANFANGSZUSTAND, geschwindigkeit: state.geschwindigkeit, eigeneSzenarien: state.eigeneSzenarien };

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
          wendeMassnahmeAn(patient, action.massnahmeId, state.zeitSek),
        ),
        MASSNAHMEN[action.massnahmeId].dauerSek,
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
      return {
        ...ANFANGSZUSTAND,
        geschwindigkeit: state.geschwindigkeit,
        eigeneSzenarien: state.eigeneSzenarien,
        modus: state.modus,
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
      return {
        ...state,
        phase: 'setup',
        sitzung: {
          ...state.sitzung,
          rolle: 'uebungsleiter',
          eigeneId: action.eigeneId,
          eigenerName: action.name,
        },
      };

    case 'sitzungEroeffnen': {
      const code = erzeugeCode();
      const selbst: Spieler = {
        id: state.sitzung.eigeneId ?? 'leiter',
        name: state.sitzung.eigenerName ?? 'Übungsleitung',
        rolle: 'uebungsleiter',
      };
      return {
        ...ANFANGSZUSTAND,
        eigeneSzenarien: state.eigeneSzenarien,
        geschwindigkeit: state.geschwindigkeit,
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
        },
      };
    }

    case 'spielerBeitreten':
      return {
        ...ANFANGSZUSTAND,
        eigeneSzenarien: state.eigeneSzenarien,
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
      };

    case 'schnappschussAnwenden': {
      const s = action.schnappschuss;
      return {
        ...state,
        phase: s.phase,
        szenario: s.szenario,
        zeitSek: s.zeitSek,
        laufend: s.laufend,
        geschwindigkeit: s.geschwindigkeit,
        patienten: s.patienten,
        // Ist der eigene ausgewählte Patient nicht mehr im gezeigten Abschnitt,
        // bleibt die Auswahl trotzdem lokal - die Ansicht prüft das selbst.
        sitzung: { ...state.sitzung, spieler: s.spieler, status: s.status },
      };
    }

    default:
      return state;
  }
}
