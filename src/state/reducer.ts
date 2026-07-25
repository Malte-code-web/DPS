import {
  patientAusVorlage,
  sichtePatient,
  simuliereSchritt,
  transportierePatient,
  untersuchePatient,
  wendeMassnahmeAn,
} from '../domain/simulation';
import { findeSzenario } from '../domain/szenarien';
import type { MassnahmeId, Patient, Sichtungskategorie } from '../domain/types';

export type Phase = 'setup' | 'einsatz' | 'debriefing';

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
}

export const ANFANGSZUSTAND: SimulationState = {
  phase: 'setup',
  szenarioId: null,
  zeitSek: 0,
  laufend: false,
  geschwindigkeit: 4,
  patienten: [],
  ausgewaehlterPatientId: null,
};

export type SimulationAction =
  | { typ: 'szenarioStarten'; szenarioId: string }
  | { typ: 'tick'; dtSek: number }
  | { typ: 'pauseUmschalten' }
  | { typ: 'geschwindigkeitSetzen'; wert: number }
  | { typ: 'patientWaehlen'; patientId: string | null }
  | { typ: 'patientUntersuchen'; patientId: string }
  | { typ: 'patientSichten'; patientId: string; kategorie: Sichtungskategorie }
  | { typ: 'massnahmeDurchfuehren'; patientId: string; massnahmeId: MassnahmeId }
  | { typ: 'patientTransportieren'; patientId: string }
  | { typ: 'einsatzBeenden' }
  | { typ: 'zurueckZumSetup' };

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

    case 'patientUntersuchen':
      return mitPatient(state, action.patientId, (patient) =>
        untersuchePatient(patient, state.zeitSek),
      );

    case 'patientSichten':
      return mitPatient(state, action.patientId, (patient) =>
        sichtePatient(patient, action.kategorie, state.zeitSek),
      );

    case 'massnahmeDurchfuehren':
      return mitPatient(state, action.patientId, (patient) =>
        wendeMassnahmeAn(patient, action.massnahmeId, state.zeitSek),
      );

    case 'patientTransportieren':
      return mitPatient(state, action.patientId, (patient) =>
        transportierePatient(patient, state.zeitSek),
      );

    case 'einsatzBeenden':
      return { ...state, phase: 'debriefing', laufend: false, ausgewaehlterPatientId: null };

    case 'zurueckZumSetup':
      return { ...ANFANGSZUSTAND, geschwindigkeit: state.geschwindigkeit };

    default:
      return state;
  }
}
