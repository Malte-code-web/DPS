export interface RufgruppeInfo {
  id: string;
  name: string;
  /**
   * Nur für Übungsleitung und Beobachter wählbar (→ `domain.regiefuehrend`) -
   * erscheint in der normalen Kanalwahl der Spieler-Oberfläche gar nicht
   * erst, genau wie der Abschnitt `verdeckt` in keiner Abschnittsliste
   * auftaucht.
   */
  nurRegie?: boolean;
}

/**
 * @anker domain.rufgruppen Feste Kanalliste für den Sprechfunk
 *
 * Anders als der Maßnahmenkatalog oder die Fahrzeug-Bestückung nicht aus
 * einer realen Quelle übernommen - ein sinnvoller Standard mit drei freien
 * Kanälen und einem Führungskanal, wie bei echten Sprechgruppen üblich.
 * Keine Übungsleitungs-Einstellung in dieser Version (→ `ui.sprechfunk`).
 * Der Regie-Kanal ist dieselbe Sprechfunk-Infrastruktur, nur rollen-gefiltert -
 * Übungsleitung und Beobachter:innen können sich dort untereinander
 * absprechen, getrennt von allen anderen Kanälen.
 */
export const RUFGRUPPEN: RufgruppeInfo[] = [
  { id: 'kanal-1', name: 'Kanal 1' },
  { id: 'kanal-2', name: 'Kanal 2' },
  { id: 'kanal-3', name: 'Kanal 3' },
  { id: 'fuehrung', name: 'Führung' },
  { id: 'regie', name: 'Regie', nurRegie: true },
];
