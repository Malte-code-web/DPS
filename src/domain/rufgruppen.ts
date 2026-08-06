export interface RufgruppeInfo {
  id: string;
  name: string;
}

/**
 * @anker domain.rufgruppen Feste Kanalliste für den Sprechfunk
 *
 * Anders als der Maßnahmenkatalog oder die Fahrzeug-Bestückung nicht aus
 * einer realen Quelle übernommen - ein sinnvoller Standard mit drei freien
 * Kanälen und einem Führungskanal, wie bei echten Sprechgruppen üblich.
 * Keine Übungsleitungs-Einstellung in dieser Version (→ `ui.sprechfunk`).
 */
export const RUFGRUPPEN: RufgruppeInfo[] = [
  { id: 'kanal-1', name: 'Kanal 1' },
  { id: 'kanal-2', name: 'Kanal 2' },
  { id: 'kanal-3', name: 'Kanal 3' },
  { id: 'fuehrung', name: 'Führung' },
];
