import type {
  FachaufgabeId,
  GrundzeichenId,
  OrganisationId,
  SymbolId,
} from 'taktische-zeichen-core';
import type { Einsatzabschnitt } from './types';

/** Eingabe für `erzeugeTaktischesZeichen` (→ `taktische-zeichen-core`) - ein Teilausschnitt der vollen `TaktischesZeichen`-Spezifikation, hier bewusst auf das reduziert, was für die Einsatzabschnitte gebraucht wird. */
export interface TaktischesZeichenSpec {
  grundzeichen?: GrundzeichenId;
  organisation?: OrganisationId;
  fachaufgabe?: FachaufgabeId;
  symbol?: SymbolId;
}

/**
 * @anker domain.taktischezeichen DV-102-Symbole je Einsatzabschnitt
 *
 * Zuordnung auf echte taktische Zeichen (→ `taktische-zeichen-core`,
 * geprüft gegen die installierten Typdefinitionen, nicht geraten):
 * `ortsfeste-stelle` (Stelle/Einrichtung, ortsfest) ist das Grundzeichen für
 * jede feste Einrichtung am Behandlungsplatz, `organisation: hilfsorganisation`
 * passt am ehesten zum zivilen Rettungsdienst-Kontext (kein eigenes
 * "Rettungsdienst"-Symbol in der Bibliothek). Die drei Behandlungszelte
 * teilen sich das Symbol `zelt` - ihre Farbunterscheidung (Rot/Gelb/Grün)
 * kommt nicht aus der Bibliothek (das Grundzeichen `ortsfeste-stelle` nimmt
 * keine `farbe`), sondern aus einem eigenen Rand um das Symbol
 * (→ `ui.lagekarte`). Schadensstelle nutzt das eigenständige Grundzeichen
 * `gefahr` (akzeptiert `farbe`, Standardfarbe bereits Rot).
 */
export const ZEICHEN_JE_ABSCHNITT: Partial<Record<Einsatzabschnitt, TaktischesZeichenSpec>> = {
  schadensstelle: { grundzeichen: 'gefahr' },
  ablage: { grundzeichen: 'ortsfeste-stelle', organisation: 'hilfsorganisation', symbol: 'sammeln' },
  bereitstellungsraum: {
    grundzeichen: 'ortsfeste-stelle',
    organisation: 'hilfsorganisation',
    fachaufgabe: 'logistik',
  },
  eingangssichtung: {
    grundzeichen: 'ortsfeste-stelle',
    organisation: 'hilfsorganisation',
    symbol: 'sichten',
  },
  zelt_rot: { grundzeichen: 'ortsfeste-stelle', organisation: 'hilfsorganisation', symbol: 'zelt' },
  zelt_gelb: { grundzeichen: 'ortsfeste-stelle', organisation: 'hilfsorganisation', symbol: 'zelt' },
  zelt_gruen: { grundzeichen: 'ortsfeste-stelle', organisation: 'hilfsorganisation', symbol: 'zelt' },
  ausgangssichtung: {
    grundzeichen: 'ortsfeste-stelle',
    organisation: 'hilfsorganisation',
    symbol: 'sichten',
  },
  transport: {
    grundzeichen: 'ortsfeste-stelle',
    organisation: 'hilfsorganisation',
    symbol: 'transport',
  },
};
