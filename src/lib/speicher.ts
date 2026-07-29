import { vervollstaendigeMassnahmenrechte } from '../domain/massnahmenrechte';
import { pruefeSzenario } from '../domain/szenarioPruefung';
import type { Massnahmenrechte } from '../domain/massnahmenrechte';
import type { Szenario } from '../domain/types';

/**
 * @anker speicher.szenarien Eigene Szenarien im Browser sichern
 *
 * Bewusst schlicht: localStorage, ein Schlüssel, eine Fassungsnummer. Die App
 * hat keinen Server - was die Übungsleitung baut, bleibt auf ihrem Gerät und
 * wird zum Weitergeben als JSON exportiert.
 */
const SCHLUESSEL = 'dps.eigeneSzenarien.v1';

export function ladeEigeneSzenarien(): Szenario[] {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (!roh) return [];
    const daten: unknown = JSON.parse(roh);
    if (!Array.isArray(daten)) return [];
    // Beschädigte Einträge werden übersprungen statt die Liste zu verlieren.
    return daten.filter((eintrag): eintrag is Szenario => pruefeSzenario(eintrag).gueltig);
  } catch {
    return [];
  }
}

export function sichereEigeneSzenarien(szenarien: Szenario[]): boolean {
  try {
    localStorage.setItem(SCHLUESSEL, JSON.stringify(szenarien));
    return true;
  } catch {
    // Privater Modus oder voller Speicher - der Aufrufer meldet es.
    return false;
  }
}

/**
 * @anker speicher.massnahmenrechte Zuletzt eingestellte Qualifikations- und
 * Delegationsschwellen je Maßnahme auf dem Gerät der Übungsleitung sichern
 *
 * Dieselbe Idee wie bei eigenen Szenarien: lokal, ein Schlüssel, eine
 * Fassungsnummer. Der zuletzt eingestellte Stand wird bei der nächsten
 * Sitzung vorgeschlagen (→ `ui.massnahmenrechte`), bleibt aber jederzeit
 * änderbar - nichts wird für eine Sitzung festgeschrieben.
 */
const RECHTE_SCHLUESSEL = 'dps.massnahmenrechte.v1';

export function ladeMassnahmenrechte(): Massnahmenrechte {
  try {
    const roh = localStorage.getItem(RECHTE_SCHLUESSEL);
    return vervollstaendigeMassnahmenrechte(roh ? JSON.parse(roh) : null);
  } catch {
    return vervollstaendigeMassnahmenrechte(null);
  }
}

export function sichereMassnahmenrechte(rechte: Massnahmenrechte): boolean {
  try {
    localStorage.setItem(RECHTE_SCHLUESSEL, JSON.stringify(rechte));
    return true;
  } catch {
    return false;
  }
}

/** Erzeugt eine im Bestand noch freie Szenario-ID aus dem Titel. */
export function freieSzenarioId(titel: string, vorhanden: string[]): string {
  const basis =
    titel
      .toLowerCase()
      .replace(/[äöüß]/g, (zeichen) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' })[zeichen] ?? zeichen)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'szenario';

  if (!vorhanden.includes(basis)) return basis;
  let nummer = 2;
  while (vorhanden.includes(`${basis}-${nummer}`)) nummer += 1;
  return `${basis}-${nummer}`;
}
