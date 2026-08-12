import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { SZENARIEN } from '../domain/szenarien';
import { supabaseKonfiguriert } from './supabaseClient';
import type { SitzungsNachricht } from './protokoll';
import type { Sitzungstransport } from './sitzungstransport';
import { ANFANGSZUSTAND, schnappschussAus, simulationReducer } from '../state/reducer';
import type { SchnappschussFelder, SimulationAction, SimulationState } from '../state/reducer';
import { fehltZwischenstueck, naechsteNachricht } from '../state/schnappschussDelta';

/**
 * @anker net.livetest Echter Durchlauf über Supabase Realtime - nur mit Zugang
 *
 * Alle anderen Tests laufen ohne Netz; der Stör-Transport
 * (→ `net.stoertransport`) beweist die Konvergenz reproduzierbar, aber gegen
 * einen nachgebauten Kanal. Dieser Test beantwortet die eine Frage, die kein
 * Nachbau beantworten kann: Trägt das Delta-Verfahren (→ `net.delta`) auch
 * über die echte Leitung - mit echter Laufzeit, echter Zustellreihenfolge und
 * der 256-kB-Obergrenze eines Broadcasts?
 *
 *   VITE_SUPABASE_URL=… VITE_SUPABASE_ANON_KEY=… npm test
 *
 * Ohne `.env` überspringt er sich selbst, damit die normale Testsuite
 * netzfrei bleibt.
 */
const busunfall = SZENARIEN.find((szenario) => szenario.id === 'busunfall-b31')!;

/**
 * Der Supabase-Transport hängt sich an `visibilitychange`, um nach einem
 * Wechsel aus dem Hintergrund sofort neu zu verbinden (→ `net.supabase`).
 * Im Testlauf gibt es kein Dokument - eine schlanke Attrappe genügt, damit die
 * echte Transportdatei unverändert geprüft werden kann statt einer Kopie.
 */
function dokumentAttrappeSetzen(): void {
  if ('document' in globalThis) return;
  (globalThis as Record<string, unknown>).document = {
    visibilityState: 'visible',
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}

function spiele(...aktionen: SimulationAction[]): SimulationState {
  return aktionen.reduce((state, aktion) => simulationReducer(state, aktion), ANFANGSZUSTAND);
}

function imEinsatz(): SimulationState {
  return spiele(
    { typ: 'gemeinsamOeffnen' },
    { typ: 'rolleWaehlen', rolle: 'uebungsleiter' },
    { typ: 'anmeldungAbschliessen', name: 'OrgL Live', eigeneId: 'leiter-1' },
    { typ: 'modusWaehlen', modus: 'digital' },
    { typ: 'massnahmenrechteAbgeschlossen' },
    { typ: 'szenarioFuerSitzungWaehlen', szenario: busunfall },
    { typ: 'manvStufeGewaehlt', stufe: 'manv50plus' },
    { typ: 'fahrzeugkonfigurationAbgeschlossen' },
    { typ: 'sitzungStarten' },
  );
}

function frischerClient(id: string): SimulationState {
  return {
    ...ANFANGSZUSTAND,
    sitzung: {
      aktiv: true,
      rolle: 'spieler',
      code: 'LIVE',
      eigeneId: id,
      eigenerName: id,
      spieler: [],
      status: 'wartet',
      verbindungsfehler: null,
    },
  };
}

const warte = (ms: number) => new Promise((fertig) => setTimeout(fertig, ms));

describe.skipIf(!supabaseKonfiguriert)('Synchronisation über echtes Supabase Realtime', () => {
  it(
    'bringt zwei Mitspieler und einen Nachzügler auf denselben Stand',
    async () => {
      dokumentAttrappeSetzen();
      const { erzeugeSupabaseTransportMit } = await import('./supabaseTransport');

      // Je Teilnehmer ein eigener Client - im Betrieb sitzen Host und
      // Mitspielende in verschiedenen Browsern, und ein Broadcast kommt nie am
      // eigenen Socket zurück.
      const url = import.meta.env.VITE_SUPABASE_URL as string;
      const schluessel = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      // Nur, was zum Aufräumen gebraucht wird: `ReturnType<typeof createClient>`
      // trüge die Vorgabe-Typparameter und passt deshalb nicht zum Ergebnis des
      // tatsächlichen Aufrufs.
      const clients: { removeAllChannels: () => Promise<unknown> }[] = [];
      const eigenerTransport = () => {
        const client = createClient(url, schluessel);
        clients.push(client);
        return erzeugeSupabaseTransportMit(client);
      };

      // Eigener Code je Lauf, damit parallele Läufe sich nicht in die Quere kommen.
      const code = `T${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const offen: Sitzungstransport[] = [];
      const gemessen = { nachrichten: 0, bytes: 0, groesste: 0, vollbilder: 0, pulse: 0 };

      // ---- Host ----
      let hostState = imEinsatz();
      let hostFolge = 0;
      let letzteFelder: SchnappschussFelder | null = null;
      let hostTransport: Sitzungstransport;

      const sendeHost = (nachricht: SitzungsNachricht) => {
        const groesse = new TextEncoder().encode(JSON.stringify(nachricht)).length;
        gemessen.nachrichten += 1;
        gemessen.bytes += groesse;
        gemessen.groesste = Math.max(gemessen.groesste, groesse);
        if (nachricht.typ === 'schnappschussPuls') gemessen.pulse += 1;
        if (nachricht.typ === 'schnappschuss' && nachricht.schnappschuss.basis === 0) {
          gemessen.vollbilder += 1;
        }
        hostTransport.senden(nachricht);
      };

      const sendeVollbild = () => {
        const felder = schnappschussAus(hostState);
        hostFolge += 1;
        letzteFelder = felder;
        sendeHost({
          typ: 'schnappschuss',
          schnappschuss: { folge: hostFolge, basis: 0, felder },
        });
      };

      let hostVerbunden = false;
      hostTransport = eigenerTransport()(
        code,
        (nachricht) => {
          if (nachricht.typ === 'vollbildAnfordern') sendeVollbild();
        },
        (status) => {
          if (status === 'verbunden') hostVerbunden = true;
        },
      );
      offen.push(hostTransport);

      const verteile = () => {
        const felder = schnappschussAus(hostState);
        const nachricht = naechsteNachricht(letzteFelder, felder, hostFolge);
        if (!nachricht) return;
        hostFolge = nachricht.folge;
        letzteFelder = felder;
        sendeHost({ typ: 'schnappschuss', schnappschuss: nachricht });
      };

      // ---- Mitspieler ----
      type Mitspieler = { id: string; state: SimulationState; transport: Sitzungstransport };
      const mitspieler: Mitspieler[] = [];
      const nimmTeil = (id: string) => {
        const eintrag: Mitspieler = {
          id,
          state: frischerClient(id),
          transport: undefined as unknown as Sitzungstransport,
        };
        eintrag.transport = eigenerTransport()(code, (nachricht) => {
          if (nachricht.typ === 'schnappschuss') {
            if (fehltZwischenstueck(nachricht.schnappschuss, eintrag.state.schnappschussFolge)) {
              eintrag.transport.senden({ typ: 'vollbildAnfordern', spielerId: id });
              return;
            }
            eintrag.state = simulationReducer(eintrag.state, {
              typ: 'schnappschussAnwenden',
              schnappschuss: nachricht.schnappschuss,
            });
          } else if (nachricht.typ === 'schnappschussPuls') {
            if (nachricht.folge > eintrag.state.schnappschussFolge) {
              eintrag.transport.senden({ typ: 'vollbildAnfordern', spielerId: id });
            }
          }
        });
        offen.push(eintrag.transport);
        mitspieler.push(eintrag);
        return eintrag;
      };

      try {
        nimmTeil('s-1');
        nimmTeil('s-2');

        // Auf den Websocket-Handshake warten - der Transport stellt bis dahin
        // in seine eigene Warteschlange (→ `net.supabase`).
        for (let versuch = 0; versuch < 60 && !hostVerbunden; versuch += 1) await warte(250);
        expect(hostVerbunden, 'Host ist mit Supabase verbunden').toBe(true);
        await warte(1500);

        verteile();
        await warte(800);

        // ---- Einsatz laufen lassen ----
        for (let takt = 0; takt < 40; takt += 1) {
          hostState = simulationReducer(hostState, { typ: 'tick', dtSek: 0.5 });
          if (takt % 10 === 0) {
            hostState = simulationReducer(hostState, {
              typ: 'meldebuchEintragen',
              id: `m-${takt}`,
              bereich: 'kraefte',
              text: `Lagemeldung ${takt}`,
              spielerId: 'leiter-1',
            });
          }
          verteile();
          await warte(60);
        }
        await warte(1500);

        for (const person of mitspieler) {
          expect(schnappschussAus(person.state), `${person.id} nach dem Einsatz`).toEqual(
            schnappschussAus(hostState),
          );
        }

        // ---- Nachzügler mitten im Einsatz ----
        const nachzuegler = nimmTeil('s-3');
        await warte(1500);
        // Wie im Betrieb: Der Host schickt bei einem Beitritt ein Vollbild.
        sendeVollbild();
        await warte(1500);
        expect(schnappschussAus(nachzuegler.state), 'Nachzügler holt auf').toEqual(
          schnappschussAus(hostState),
        );

        // ---- Puls repariert einen künstlich zurückgefallenen Client ----
        mitspieler[0]!.state = { ...mitspieler[0]!.state, schnappschussFolge: 1, zeitSek: 0 };
        sendeHost({ typ: 'schnappschussPuls', folge: hostFolge });
        await warte(2500);
        expect(schnappschussAus(mitspieler[0]!.state), 'Puls hat repariert').toEqual(
          schnappschussAus(hostState),
        );

        // ---- Einsatzende: Auswertungsdaten kommen erst jetzt ----
        expect(schnappschussAus(hostState).regieProtokoll).toEqual([]);
        hostState = simulationReducer(hostState, { typ: 'einsatzBeenden' });
        verteile();
        await warte(1500);
        for (const person of mitspieler) {
          expect(person.state.regieProtokoll.length, `${person.id} hat das Regieprotokoll`)
            .toBeGreaterThan(0);
          expect(schnappschussAus(person.state)).toEqual(schnappschussAus(hostState));
        }

        console.log(
          `\n[live] ${gemessen.nachrichten} Nachrichten, ` +
            `${(gemessen.bytes / 1024).toFixed(1)} kB gesamt, ` +
            `Mittel ${(gemessen.bytes / gemessen.nachrichten / 1024).toFixed(2)} kB, ` +
            `größte ${(gemessen.groesste / 1024).toFixed(1)} kB, ` +
            `${gemessen.vollbilder} Vollbild(er)`,
        );
        // Der Sinn des Umbaus: kein Broadcast in der Nähe der 256-kB-Grenze.
        expect(gemessen.groesste).toBeLessThan(256 * 1024);
      } finally {
        for (const transport of offen) transport.schliessen();
        for (const client of clients) await client.removeAllChannels();
      }
    },
    120_000,
  );
});
