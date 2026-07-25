import { VERLEGUNGSDAUER_SEK, istVerlegungMoeglich } from '../domain/abschnitte';
import { MASSNAHMEN } from '../domain/massnahmen';
import {
  SICHTUNGSDAUER_SEK,
  UNTERSUCHUNGSDAUER_SEK,
  patientAusVorlage,
  sichtePatient,
  simuliereSchritt,
  simuliereZeitraum,
  verlegePatient,
  untersuchePatient,
  wendeMassnahmeAn,
} from '../domain/simulation';
import { findeSzenario } from '../domain/szenarien';
import type {
  Einsatzabschnitt,
  MassnahmeId,
  Patient,
  Sichtungskategorie,
} from '../domain/types';

export type Phase = 'setup' | 'einsatz' | 'debriefing';

/** @anker state.zustand Der gesamte Zustand einer laufenden Übung */
export interface SimulationState {
  phase: Phase;
  szenarioId: string | null;
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
  phase: 'setup',
  szenarioId: null,
  zeitSek: 0,
  laufend: false,
  // Jede Handlung kostet zusaetzlich ihre eigene Dauer - der Zeitraffer darf
  // deshalb moderat bleiben, sonst laeuft die Lage davon.
  geschwindigkeit: 2,
  patienten: [],
  ausgewaehlterPatientId: null,
  ausgewaehlterAbschnitt: 'schadensstelle',
};

/** @anker state.aktionen Alles, was der Übende auslösen kann */
export type SimulationAction =
  | { typ: 'szenarioStarten'; szenarioId: string }
  | { typ: 'tick'; dtSek: number }
  | { typ: 'pauseUmschalten' }
  | { typ: 'geschwindigkeitSetzen'; wert: number }
  | { typ: 'patientWaehlen'; patientId: string | null }
  | { typ: 'patientUntersuchen'; patientId: string }
  | { typ: 'patientSichten'; patientId: string; kategorie: Sichtungskategorie }
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
    case 'szenarioStarten': {
      const szenario = findeSzenario(action.szenarioId);
      if (!szenario) return state;
      return {
        ...ANFANGSZUSTAND,
        geschwindigkeit: state.geschwindigkeit,
        phase: 'einsatz',
        szenarioId: szenario.id,
        laufend: true,
        ausgewaehlterAbschnitt: 'schadensstelle',
        patienten: szenario.patienten.map(patientAusVorlage),
      };
    }

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

    case 'patientUntersuchen': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      if (!patient || patient.untersucht) return state;
      return zeitVergehen(
        mitPatient(state, action.patientId, (eintrag) =>
          untersuchePatient(eintrag, state.zeitSek),
        ),
        UNTERSUCHUNGSDAUER_SEK,
      );
    }

    case 'patientSichten': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      // Nur die erste Sichtung kostet Zeit, ein Korrigieren der Kategorie nicht.
      const dauerSek = patient?.gesichtetUmSek === null ? SICHTUNGSDAUER_SEK : 0;
      return zeitVergehen(
        mitPatient(state, action.patientId, (eintrag) =>
          sichtePatient(eintrag, action.kategorie, state.zeitSek),
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
      return { ...ANFANGSZUSTAND, geschwindigkeit: state.geschwindigkeit };

    default:
      return state;
  }
}
