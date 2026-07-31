import type { FahrzeugTyp, FahrzeugVorlage } from './types';

/**
 * @anker domain.manvstufen MANV-Stufen des Kreises Steinfurt -> kumulativer Fahrzeugbestand
 *
 * Quelle: „Vorplanung für die Bewältigung großer (medizinischer)
 * Schadenslagen im Kreis Steinfurt" (MANV-Konzept, Stand 05.12.2019),
 * Abschnitt 5 „Alarmierungsstufen" (5.1-5.5). Die dortigen Stufen listen
 * zusätzlich Einsatzeinheiten, Patiententransportzüge und Behandlungs-/
 * Betreuungsplatz-Bereitschaften - bewusst nicht Teil dieser Tabelle (nur
 * Kernfahrzeuge, → ROADMAP.md Baustein 4). GW-San/GW-Log sind an feste
 * Kreis-Standorte gebunden statt an die Schadenslage skaliert und deshalb
 * nur manuell zuweisbar, nicht Teil der Stufen-Automatik.
 */
export type ManvStufeId = 'manv10' | 'manv20' | 'manv30' | 'manv50' | 'manv50plus';

export interface ManvStufeInfo {
  id: ManvStufeId;
  label: string;
  patientenBereich: string;
  bestand: Partial<Record<FahrzeugTyp, number>>;
}

export const MANV_STUFEN: Record<ManvStufeId, ManvStufeInfo> = {
  manv10: {
    id: 'manv10',
    label: 'MANV-10',
    patientenBereich: '5-10 Patienten',
    bestand: { rtw: 3, nef: 2, ktw: 1, gw_rett: 1 },
  },
  manv20: {
    id: 'manv20',
    label: 'MANV-20',
    patientenBereich: '11-20 Patienten',
    bestand: { rtw: 6, nef: 4, ktw: 2, gw_rett: 2 },
  },
  manv30: {
    id: 'manv30',
    label: 'MANV-30',
    patientenBereich: '21-30 Patienten',
    bestand: { rtw: 6, nef: 4, ktw: 2, gw_rett: 2, elw2: 1 },
  },
  manv50: {
    id: 'manv50',
    label: 'MANV-50',
    patientenBereich: '31-50 Patienten',
    bestand: { rtw: 6, nef: 4, ktw: 2, gw_rett: 2, ab_manv: 1, elw2: 1 },
  },
  manv50plus: {
    id: 'manv50plus',
    label: 'MANV-50plus',
    patientenBereich: 'ab 51 Patienten',
    bestand: { rtw: 6, nef: 4, ktw: 2, gw_rett: 2, ab_manv: 1, elw2: 1 },
  },
};

export const MANV_STUFEN_LISTE: ManvStufeInfo[] = [
  MANV_STUFEN.manv10,
  MANV_STUFEN.manv20,
  MANV_STUFEN.manv30,
  MANV_STUFEN.manv50,
  MANV_STUFEN.manv50plus,
];

/** Erzeugt die Fahrzeug-Vorlagen einer Stufe, IDs `rtw-1`, `rtw-2`, ... */
export function fahrzeugeFuerStufe(stufe: ManvStufeId): FahrzeugVorlage[] {
  const bestand = MANV_STUFEN[stufe].bestand;
  const fahrzeuge: FahrzeugVorlage[] = [];
  for (const [typ, anzahl] of Object.entries(bestand) as [FahrzeugTyp, number][]) {
    for (let i = 1; i <= anzahl; i += 1) {
      fahrzeuge.push({ id: `${typ}-${i}`, typ });
    }
  }
  return fahrzeuge;
}
