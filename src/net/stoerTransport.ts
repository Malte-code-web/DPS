import type { SitzungsNachricht } from './protokoll';
import type { Sitzungstransport, TransportFabrik } from './sitzungstransport';

/**
 * @anker net.stoertransport Ein Kanal, der absichtlich kaputt geht
 *
 * Der lokale `BroadcastChannel` (→ `net.lokal`) stellt verlässlich und in der
 * richtigen Reihenfolge zu; ein echtes Netz tut das nicht, zeigt es aber nur
 * zufällig und unwiederholbar. Genau diese Fälle sind bei einem
 * Delta-Verfahren (→ `net.delta`) die gefährlichen: Wer eine Nachricht
 * verpasst, kann die nächste nicht mehr anwenden.
 *
 * Dieser Transport erzeugt sie deshalb absichtlich und reproduzierbar -
 * Verlust, Verdopplung und Vertauschung, gesteuert von einem festen
 * Zufallskeim. Er ist ausschließlich für Tests gedacht; im Betrieb wählt
 * `waehleTransport` (→ `net.auswahl`) nie diesen hier.
 */
export interface Stoerprofil {
  /** Anteil der Nachrichten, die verloren gehen (0 … 1). */
  verlust: number;
  /** Anteil der Nachrichten, die zusätzlich ein zweites Mal ankommen. */
  verdopplung: number;
  /** Anteil der Nachrichten, die hinter die nächste zurückgestellt werden. */
  vertauschung: number;
}

/** Ein winziger, deterministischer Zufall (Mulberry32) - gleicher Keim, gleicher Lauf. */
export function erzeugeZufall(keim: number): () => number {
  let zustand = keim >>> 0;
  return () => {
    zustand = (zustand + 0x6d2b79f5) >>> 0;
    let t = zustand;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Ein Bus, an dem mehrere Teilnehmer hängen - wie der echte Rundruf: Wer
 * sendet, erreicht alle anderen, nie sich selbst.
 */
export interface Stoerbus {
  fabrik: TransportFabrik;
  /** Stellt zurückgehaltene (vertauschte) Nachrichten zu - Ende eines Laufs. */
  beruhige(): void;
  /** Zähler für die Auswertung im Test. */
  gesendet: number;
  zugestellt: number;
  verloren: number;
  bytes: number;
}

export function erzeugeStoerbus(profil: Stoerprofil, keim = 1): Stoerbus {
  const zufall = erzeugeZufall(keim);
  const empfaenger: ((nachricht: SitzungsNachricht) => void)[] = [];
  // Zurückgestellte Nachrichten samt ihrer Empfängerliste - sie kommen eine
  // Zustellung später dran und drehen so die Reihenfolge um.
  let zurueckgestellt: { nachricht: SitzungsNachricht; ausser: number }[] = [];

  const bus: Stoerbus = {
    fabrik: (_code, onNachricht, onStatus) => {
      const eigenerIndex = empfaenger.length;
      empfaenger.push(onNachricht);
      onStatus?.('verbunden');
      const transport: Sitzungstransport = {
        senden(nachricht) {
          bus.gesendet += 1;
          bus.bytes += JSON.stringify(nachricht).length;
          zustellen(nachricht, eigenerIndex);
        },
        schliessen() {
          empfaenger[eigenerIndex] = () => {};
        },
      };
      return transport;
    },
    beruhige() {
      const offen = zurueckgestellt;
      zurueckgestellt = [];
      for (const { nachricht, ausser } of offen) austragen(nachricht, ausser);
    },
    gesendet: 0,
    zugestellt: 0,
    verloren: 0,
    bytes: 0,
  };

  function austragen(nachricht: SitzungsNachricht, ausser: number) {
    bus.zugestellt += 1;
    // Über eine Kopie iterieren: Ein Empfänger darf beim Verarbeiten selbst
    // senden (genau das tut die Nachforderung), ohne die Schleife zu stören.
    const ziele = [...empfaenger];
    for (let i = 0; i < ziele.length; i += 1) {
      if (i !== ausser) ziele[i]!(JSON.parse(JSON.stringify(nachricht)) as SitzungsNachricht);
    }
  }

  function zustellen(nachricht: SitzungsNachricht, ausser: number) {
    if (zufall() < profil.verlust) {
      bus.verloren += 1;
      return;
    }
    // Erst das zuvor Zurückgestellte - dadurch überholt die neuere Nachricht
    // die ältere nur dann, wenn diese zurückgestellt wurde.
    if (zufall() < profil.vertauschung) {
      zurueckgestellt.push({ nachricht, ausser });
      return;
    }
    const offen = zurueckgestellt;
    zurueckgestellt = [];
    austragen(nachricht, ausser);
    for (const eintrag of offen) austragen(eintrag.nachricht, eintrag.ausser);
    if (zufall() < profil.verdopplung) austragen(nachricht, ausser);
  }

  return bus;
}
