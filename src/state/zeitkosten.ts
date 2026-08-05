import { VERLEGUNGSDAUER_SEK, istVerlegungMoeglich } from '../domain/abschnitte';
import { DIAGNOSTIK } from '../domain/diagnostik';
import { MASSNAHMEN } from '../domain/massnahmen';
import { sichtungOffen } from '../domain/simulation';
import type { SimulationAction, SimulationState } from './reducer';

/**
 * @anker state.zeitkosten Wie lange eine Handlung den Handelnden bindet
 *
 * Dieselben Wächter wie die jeweiligen Fälle im Reducer (→ `state.reducer`):
 * Was der Reducer ohnehin verwerfen würde (z. B. eine Verlegung ohne
 * bestätigte Sichtung), kostet hier ebenfalls nichts - der Aufrufer
 * (→ `state.provider`) darf die Aktion dann sofort durchreichen, statt einen
 * Timer für ein wirkungsloses No-op zu starten.
 *
 * Bewusst getrennt von der Zeit, die vergeht: Diese Funktion sagt nur, *wie
 * lange* eine Handlung dauert. Dass diese Dauer die Einsatzuhr für alle
 * Patienten mitlaufen lässt, übernimmt inzwischen ausschließlich der
 * Echtzeit-Takt (`case 'tick'`) während der Wartezeit - nicht mehr der
 * Reducer-Fall selbst.
 */
export function zeitkostenSek(state: SimulationState, action: SimulationAction): number {
  switch (action.typ) {
    case 'diagnostikDurchfuehren': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      if (!patient || patient.durchgefuehrteDiagnostik.includes(action.diagnostikId)) return 0;
      return DIAGNOSTIK[action.diagnostikId].dauerSek;
    }

    // Die Sichtung selbst kostet bewusst keine Zeit mehr - der Vorgang ist
    // reines Einschätzen und Ankreuzen, kein Handgriff am Patienten. Zeit
    // kostet weiterhin die anschließende Verlegung (→ `patientVerlegen`
    // unten), nicht die Kategorisierung.
    case 'patientSichten':
      return 0;

    case 'massnahmeDurchfuehren': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      if (!patient) return 0;
      return MASSNAHMEN[action.massnahmeId].dauerSek;
    }

    case 'patientVerlegen': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      if (!patient || !istVerlegungMoeglich(patient.abschnitt, action.ziel)) return 0;
      if (sichtungOffen(patient)) return 0;
      return VERLEGUNGSDAUER_SEK;
    }

    case 'fahrzeugVerlegen': {
      const fahrzeug = state.fahrzeuge.find((eintrag) => eintrag.id === action.fahrzeugId);
      if (!fahrzeug || !istVerlegungMoeglich(fahrzeug.abschnitt, action.ziel)) return 0;
      return VERLEGUNGSDAUER_SEK;
    }

    default:
      return 0;
  }
}

/** Anzeigetext für den Beschäftigt-Hinweis (→ `ui.einsatzseite`) während der Wartezeit. */
export function zeitkostenLabel(action: SimulationAction): string {
  switch (action.typ) {
    case 'diagnostikDurchfuehren':
      return DIAGNOSTIK[action.diagnostikId].label;
    case 'massnahmeDurchfuehren':
      return MASSNAHMEN[action.massnahmeId].label;
    case 'patientVerlegen':
      return 'Verlegung';
    case 'fahrzeugVerlegen':
      return 'Fahrzeug verlegen';
    default:
      return '';
  }
}
