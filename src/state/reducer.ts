import { VERLEGUNGSDAUER_SEK, istVerlegungMoeglich } from '../domain/abschnitte';
import { DIAGNOSTIK } from '../domain/diagnostik';
import { MASSNAHMEN } from '../domain/massnahmen';
import {
  SICHTUNGSDAUER_SEK,
  fuehreDiagnostikDurch,
  sichtungOffen,
  patientAusVorlage,
  sichtePatient,
  simuliereSchritt,
  simuliereZeitraum,
  verlegePatient,
  wendeMassnahmeAn,
} from '../domain/simulation';
import type { Trainingsmodus } from '../domain/modi';
import type {
  DiagnostikId,
  Einsatzabschnitt,
  MassnahmeId,
  Patient,
  Sichtungskategorie,
  Szenario,
} from '../domain/types';

/** @anker state.phase Die Hauptzustände der Anwendung */
export type Phase = 'start' | 'setup' | 'einsatz' | 'debriefing' | 'uebungsleitung';

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
};

/** @anker state.aktionen Alles, was der Übende auslösen kann */
export type SimulationAction =
  | { typ: 'modusWaehlen'; modus: Trainingsmodus }
  | { typ: 'uebungsleitungOeffnen' }
  | { typ: 'zurueckZumStart' }
  | { typ: 'eigeneSzenarienSetzen'; szenarien: Szenario[] }
  | { typ: 'szenarioStarten'; szenario: Szenario }
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
  | { typ: 'zurueckZumSetup' };

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

    case 'szenarioStarten':
      return {
        ...ANFANGSZUSTAND,
        geschwindigkeit: state.geschwindigkeit,
        eigeneSzenarien: state.eigeneSzenarien,
        modus: state.modus ?? 'digital',
        phase: 'einsatz',
        szenario: action.szenario,
        laufend: true,
        ausgewaehlterAbschnitt: 'schadensstelle',
        patienten: action.szenario.patienten.map(patientAusVorlage),
      };

    case 'tick': {
      if (!state.laufend || state.phase !== 'einsatz') return state;
      const zeitSek = state.zeitSek + action.dtSek;
      return {
        ...state,
        zeitSek,
        patienten: state.patienten.map((patient) =>
          simuliereSchritt(patient, action.dtSek, zeitSek),
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

    default:
      return state;
  }
}
