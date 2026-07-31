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
  /**
   * Sollbesatzung (Anzahl Plätze für die Dropdown-Zuweisung im Wartebereich) -
   * damit sich jedes Fahrzeug in der Übung komplett besetzen lässt:
   * - RTW/NEF/KTW: reguläre Doppelbesetzung (Fahrer/-in + Transportführer/-in
   *   bzw. Notärztin/Notarzt), nach dem MANV-Konzept Kreis Steinfurt (→ `info`).
   * - GW-Rett: nur Fahrer/-in + Maschinist/-in (2) - ein kreiseigenes
   *   Reservefahrzeug, das durch dienstfreie hauptamtliche RD-Kräfte besetzt
   *   wird, keine ganze Gruppe (FF Hörstel, Gerätewagen Rettungsdienst
   *   GW-RettD: Besatzung „1:2").
   * - GW-San/GW-Log: Doppelkabine für eine Staffel, 1 Staffelführer/-in + 5 (6) -
   *   diese Fahrzeuge gehören zu einer kompletten Sanitäts-/Logistikgruppe der
   *   Hilfsorganisationen, die als Ganzes mitfährt (Wikipedia „Gerätewagen
   *   Sanität"; GW-L KatS-Typenblatt).
   * - AB-MANV: der Abrollbehälter selbst hat keine Besatzung, gezählt wird die
   *   Standardbesatzung des tragenden Wechselladerfahrzeugs, Führer/-in +
   *   Maschinist/-in (2) (DIN 14505; Wikipedia „Wechselladerfahrzeug").
   * - ELW 2: Führungsgruppe, mindestens sechs Besatzungsmitglieder
   *   (Beobachter, vier Funker, ein Techniker) (Wikipedia „Einsatzleitwagen").
   */
  sollbesatzung: number;
}

export const FAHRZEUGTYP_INFO: Record<FahrzeugTyp, FahrzeugTypInfo> = {
  rtw: { typ: 'rtw', label: 'RTW', info: 'Rettungswagen - 1 liegender Patient, Besatzung RS/NotSan + Fahrer', sollbesatzung: 2 },
  nef: { typ: 'nef', label: 'NEF', info: 'Notarzt-Einsatzfahrzeug - kein Patiententransport, Besatzung Notärztin/-arzt + Fahrer', sollbesatzung: 2 },
  ktw: { typ: 'ktw', label: 'KTW', info: 'Krankentransportwagen - bis zu 2 sitzende oder 1 liegender Patient', sollbesatzung: 2 },
  gw_rett: { typ: 'gw_rett', label: 'GW-Rett', info: 'Gerätewagen Rettungsdienst - Material für 13 Patienten, Besatzung Fahrer/-in + Maschinist/-in', sollbesatzung: 2 },
  gw_san: { typ: 'gw_san', label: 'GW-San', info: 'Gerätewagen Sanitätsdienst - Material für 25 Patienten, Doppelkabine für eine Staffel (1 Staffelführer/-in + 5)', sollbesatzung: 6 },
  ab_manv: { typ: 'ab_manv', label: 'AB-MANV', info: 'Abrollbehälter MANV - Material für 25 Patienten, Besatzung des tragenden Wechselladerfahrzeugs (Führer/-in + Maschinist/-in)', sollbesatzung: 2 },
  elw2: { typ: 'elw2', label: 'ELW 2', info: 'Einsatzleitwagen 2 - Führung/IuK, Führungsgruppe mit mindestens sechs Plätzen', sollbesatzung: 6 },
  gw_log: { typ: 'gw_log', label: 'GW-Log', info: 'Gerätewagen Logistik - Doppelkabine für eine Staffel (1 Staffelführer/-in + 5)', sollbesatzung: 6 },
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
