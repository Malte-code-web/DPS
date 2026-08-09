import { istFahrzeugVerlegungMoeglich, istVerlegungMoeglich } from '../domain/abschnitte';
import { DIAGNOSTIK } from '../domain/diagnostik';
import { verlegungsdauerSek } from '../domain/geodaten';
import { MASSNAHMEN } from '../domain/massnahmen';
import { sichtungOffen } from '../domain/simulation';
import { STANDARD_BAUFELD, groesseVon, platzierungGueltig } from '../domain/flaechen';
import type { DiagnostikId, Einsatzabschnitt, FlaechenTypId, MassnahmeId, ZeltTypId } from '../domain/types';
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
      return verlegungsdauerSek(state.routen, patient.abschnitt, action.ziel);
    }

    case 'fahrzeugVerlegen': {
      const fahrzeug = state.fahrzeuge.find((eintrag) => eintrag.id === action.fahrzeugId);
      if (!fahrzeug || !istFahrzeugVerlegungMoeglich(fahrzeug.abschnitt, action.ziel)) return 0;
      return verlegungsdauerSek(state.routen, fahrzeug.abschnitt, action.ziel);
    }

    case 'zeltPlatzieren': {
      const baufeld = state.szenario?.baufeld ?? STANDARD_BAUFELD;
      const pruefeGrenzen =
        action.abschnitt === 'zelt_rot' ||
        action.abschnitt === 'zelt_gelb' ||
        action.abschnitt === 'zelt_gruen';
      const gueltig = platzierungGueltig(
        { typ: action.flaechenTyp, abschnitt: action.abschnitt, xM: action.xM, yM: action.yM },
        state.flaechen,
        baufeld,
        pruefeGrenzen,
      );
      if (!gueltig) return 0;
      return groesseVon(action.flaechenTyp).aufbauSek;
    }

    case 'abschnittFuehrenBefehlAusfuehren': {
      const befehl = state.abschnittFuehrenBefehle.find((eintrag) => eintrag.id === action.id);
      if (!befehl) return 0;
      const dauern = state.fahrzeuge
        .filter(
          (fahrzeug) =>
            fahrzeug.gruppenfuehrerId === befehl.gruppenfuehrerId &&
            fahrzeug.abschnitt !== befehl.ziel &&
            istFahrzeugVerlegungMoeglich(fahrzeug.abschnitt, befehl.ziel),
        )
        .map((fahrzeug) => verlegungsdauerSek(state.routen, fahrzeug.abschnitt, befehl.ziel));
      // Ein Konvoi kommt an, wenn das langsamste Fahrzeug ankommt - nicht die
      // Summe aller Einzelverlegungen.
      return dauern.length === 0 ? 0 : Math.max(...dauern);
    }

    case 'patientAbtransportieren': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      const fahrzeug = state.fahrzeuge.find((eintrag) => eintrag.id === action.fahrzeugId);
      if (!patient || !fahrzeug) return 0;
      if (patient.abschnitt !== 'ausgangssichtung' || patient.status === 'verstorben') return 0;
      if (sichtungOffen(patient)) return 0;
      if (fahrzeug.abschnitt !== 'ausgangssichtung') return 0;
      if (fahrzeug.typ !== 'rtw' && fahrzeug.typ !== 'ktw') return 0;
      if (fahrzeug.transportierterPatientId) return 0;
      return verlegungsdauerSek(state.routen, 'ausgangssichtung', 'transport');
    }

    // Wiederverwendet dieselbe Dauer wie die bestehende Fahrzeugrettung
    // (→ `domain.massnahmen`, `fahrzeugrettung`) - beides ist im Kern derselbe
    // Vorgang, nur diesmal durch die Feuerwehr statt den RD durchgeführt.
    case 'rettungDurchfuehren': {
      const patient = state.patienten.find((eintrag) => eintrag.id === action.patientId);
      if (!patient?.eingeklemmt || patient.eingeklemmt.gerettet) return 0;
      return RETTUNGSDAUER_SEK;
    }

    default:
      return 0;
  }
}

/** Dauer der Feuerwehr-Rettung, sobald Material und Kolleg:innen bereitstehen. */
export const RETTUNGSDAUER_SEK = MASSNAHMEN.fahrzeugrettung.dauerSek;

/** Anzeigetext für den Beschäftigt-Hinweis auf anderen Knöpfen während der Wartezeit. */
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
    case 'zeltPlatzieren':
      return `${groesseVon(action.flaechenTyp).bezeichnung} aufbauen`;
    case 'abschnittFuehrenBefehlAusfuehren':
      return 'Abschnitt führen';
    case 'patientAbtransportieren':
      return 'Transport organisieren';
    case 'rettungDurchfuehren':
      return 'Rettung';
    default:
      return '';
  }
}

/**
 * @anker state.zeitkostenabgleich Erkennt den eigenen Knopf im laufenden Timer
 *
 * Der Zeitkosten-Timer (→ `state.zeitkostentimer`) trägt die vollständige
 * Aktion, nicht nur eine Kennung - diese Wächter fragen gezielt "bin ich das
 * gerade?", statt eine generische Aktions-Gleichheit zu prüfen. So kann der
 * Countdown genau am angeklickten Knopf laufen (→ `ui.massnahmenliste` u. a.),
 * ohne ein eigenes Vergleichsschema für jede Aktionsart zu erfinden.
 */
export function istMassnahmeAktion(
  aktion: SimulationAction,
  patientId: string,
  massnahmeId: MassnahmeId,
): boolean {
  return (
    aktion.typ === 'massnahmeDurchfuehren' &&
    aktion.patientId === patientId &&
    aktion.massnahmeId === massnahmeId
  );
}

/** Wie `istMassnahmeAktion`, aber für einen ganzen Sammel-Button (Analgesie, Notfallnarkose). */
export function istMassnahmeAusSammlung(
  aktion: SimulationAction,
  patientId: string,
  massnahmeIds: readonly MassnahmeId[],
): boolean {
  return (
    aktion.typ === 'massnahmeDurchfuehren' &&
    aktion.patientId === patientId &&
    massnahmeIds.includes(aktion.massnahmeId)
  );
}

export function istDiagnostikAktion(
  aktion: SimulationAction,
  patientId: string,
  diagnostikId: DiagnostikId,
): boolean {
  return (
    aktion.typ === 'diagnostikDurchfuehren' &&
    aktion.patientId === patientId &&
    aktion.diagnostikId === diagnostikId
  );
}

export function istPatientVerlegenAktion(
  aktion: SimulationAction,
  patientId: string,
  ziel: Einsatzabschnitt,
): boolean {
  return aktion.typ === 'patientVerlegen' && aktion.patientId === patientId && aktion.ziel === ziel;
}

export function istFahrzeugVerlegenAktion(
  aktion: SimulationAction,
  fahrzeugId: string,
  ziel: Einsatzabschnitt,
): boolean {
  return (
    aktion.typ === 'fahrzeugVerlegen' && aktion.fahrzeugId === fahrzeugId && aktion.ziel === ziel
  );
}

export function istRettungAktion(aktion: SimulationAction, patientId: string): boolean {
  return aktion.typ === 'rettungDurchfuehren' && aktion.patientId === patientId;
}

export function istZeltPlatzierenAktion(
  aktion: SimulationAction,
  flaechenTyp: ZeltTypId | FlaechenTypId,
): boolean {
  return aktion.typ === 'zeltPlatzieren' && aktion.flaechenTyp === flaechenTyp;
}

export function istAbschnittFuehrenAktion(aktion: SimulationAction, befehlId: string): boolean {
  return aktion.typ === 'abschnittFuehrenBefehlAusfuehren' && aktion.id === befehlId;
}

export function istPatientAbtransportierenAktion(
  aktion: SimulationAction,
  patientId: string,
  fahrzeugId: string,
): boolean {
  return (
    aktion.typ === 'patientAbtransportieren' &&
    aktion.patientId === patientId &&
    aktion.fahrzeugId === fahrzeugId
  );
}
