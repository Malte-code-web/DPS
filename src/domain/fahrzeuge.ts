import type { Einsatzabschnitt, Fahrzeug, FahrzeugTyp, FahrzeugVorlage } from './types';

/**
 * @anker domain.fahrzeuge Fahrzeuge entstehen aus Vorlagen und durchlaufen dieselben Abschnitte wie Patienten
 *
 * Kernfahrzeuge nach dem MANV-Konzept Kreis Steinfurt, Abschnitt 3
 * „Verfügbare Ressourcen" - Kapazität und Mindestbesatzung sind hier rein
 * informativ (Anzeige, keine erzwungene Regel); die Besatzungszuweisung
 * bleibt in dieser Ausbaustufe freiwillige Sorgfalt der Übungsleitung/des
 * Zugführers, kein hartes Limit (→ ROADMAP.md, Baustein 4).
 */
export interface FahrzeugTypInfo {
  typ: FahrzeugTyp;
  label: string;
  /** Kurzbeschreibung von Kapazität/Zweck, wie im MANV-Konzept beschrieben. */
  info: string;
}

export const FAHRZEUGTYP_INFO: Record<FahrzeugTyp, FahrzeugTypInfo> = {
  rtw: { typ: 'rtw', label: 'RTW', info: 'Rettungswagen - 1 liegender Patient, Besatzung RS/NotSan + Fahrer' },
  nef: { typ: 'nef', label: 'NEF', info: 'Notarzt-Einsatzfahrzeug - kein Patiententransport, Besatzung Notärztin/-arzt + Fahrer' },
  ktw: { typ: 'ktw', label: 'KTW', info: 'Krankentransportwagen - bis zu 2 sitzende oder 1 liegender Patient' },
  gw_rett: { typ: 'gw_rett', label: 'GW-Rett', info: 'Gerätewagen Rettungsdienst - Material für 13 Patienten' },
  gw_san: { typ: 'gw_san', label: 'GW-San', info: 'Gerätewagen Sanitätsdienst - Material für 25 Patienten' },
  ab_manv: { typ: 'ab_manv', label: 'AB-MANV', info: 'Abrollbehälter MANV - Material für 25 Patienten' },
  elw2: { typ: 'elw2', label: 'ELW 2', info: 'Einsatzleitwagen 2 - Führung/IuK' },
  gw_log: { typ: 'gw_log', label: 'GW-Log', info: 'Gerätewagen Logistik' },
};

export const FAHRZEUGTYPEN: FahrzeugTyp[] = [
  'rtw',
  'nef',
  'ktw',
  'gw_rett',
  'gw_san',
  'ab_manv',
  'elw2',
  'gw_log',
];

/** Vorlage -> Laufzeit-Fahrzeug, startet an der Schadensstelle ohne Besatzung. */
export function fahrzeugAusVorlage(vorlage: FahrzeugVorlage): Fahrzeug {
  return { ...vorlage, abschnitt: 'schadensstelle', besatzung: [] };
}

/** Wie `verlegePatient` in simulation.ts, aber ohne Sichtungs-/Status-Prüfung - Fahrzeuge werden nicht gesichtet. */
export function verlegeFahrzeug(fahrzeug: Fahrzeug, ziel: Einsatzabschnitt): Fahrzeug {
  if (fahrzeug.abschnitt === ziel) return fahrzeug;
  return { ...fahrzeug, abschnitt: ziel };
}
