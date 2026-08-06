import { useEffect, useRef, useState } from 'react';
import { useSimulation } from './useSimulation';
import type { FunkSignalNachricht } from './context';

/** Kein eigener TURN-Dienst vorhanden - nur öffentliches STUN (→ ROADMAP.md, Baustein 5). */
const ICE_SERVER = { urls: 'stun:stun.l.google.com:19302' };

/** In manchen eingebetteten Vorschau-Umgebungen (Sandbox-iframe) schlicht nicht vorhanden. */
const WEBRTC_VERFUEGBAR = typeof RTCPeerConnection !== 'undefined';

export type Verbindungsstatus = 'verbindet' | 'verbunden' | 'getrennt';

export interface Kanalmitglied {
  teilnehmerId: string;
  name: string;
  verbindung: Verbindungsstatus;
}

interface Peer {
  verbindung: RTCPeerConnection;
  audio: HTMLAudioElement;
}

/**
 * @anker state.sprechfunk WebRTC-Mesh für einen gewählten Rufgruppen-Kanal
 *
 * Jede Person verbindet sich direkt mit jeder anderen im selben Kanal (Mesh,
 * kein eigener Medienserver) - die Zielliste kommt aus `state.rufgruppen`
 * (→ `modell.rufgruppe`), die eigentliche Verbindung läuft komplett am
 * Reducer vorbei über `aufFunkSignal`/`sendeFunkSignal`
 * (→ `net.funksignal`). Gegen doppelte Verbindungsversuche entscheidet die
 * lexikographisch kleinere `teilnehmerId`, wer das Angebot erzeugt - beide
 * Seiten kommen unabhängig voneinander auf dieselbe Regel, ohne sich
 * abstimmen zu müssen.
 */
export function useSprechfunk(kanal: string | null): {
  mitglieder: Kanalmitglied[];
  sprechenAktiv: boolean;
  sprechenUmschalten: () => void;
  mikrofonFehler: string | null;
} {
  const { state, aufFunkSignal, sendeFunkSignal } = useSimulation();
  const eigeneId = state.sitzung.eigeneId;

  const peersRef = useRef<Map<string, Peer>>(new Map());
  const mikrofonRef = useRef<MediaStream | null>(null);
  const [sprechenAktiv, setSprechenAktiv] = useState(false);
  const [verbindungen, setVerbindungen] = useState<Map<string, Verbindungsstatus>>(new Map());

  const zielListe = kanal
    ? state.rufgruppen.filter((m) => m.kanal === kanal && m.teilnehmerId !== eigeneId)
    : [];
  // Als String-Schlüssel gebündelt, damit der Effekt nur bei einer echten
  // Änderung der Zielliste neu läuft, nicht bei jedem Schnappschuss.
  const zielSchluessel = zielListe
    .map((m) => m.teilnehmerId)
    .sort()
    .join(',');

  function schliessePeer(teilnehmerId: string) {
    const peer = peersRef.current.get(teilnehmerId);
    if (!peer) return;
    peer.verbindung.close();
    peer.audio.srcObject = null;
    peer.audio.remove();
    peersRef.current.delete(teilnehmerId);
    setVerbindungen((bisher) => {
      const naechste = new Map(bisher);
      naechste.delete(teilnehmerId);
      return naechste;
    });
  }

  function erzeugePeer(teilnehmerId: string, eigeneId: string): Peer {
    const verbindung = new RTCPeerConnection({ iceServers: [ICE_SERVER] });
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.style.display = 'none';
    document.body.appendChild(audio);

    const mikrofon = mikrofonRef.current;
    if (mikrofon) {
      for (const track of mikrofon.getTracks()) verbindung.addTrack(track, mikrofon);
    }

    verbindung.onicecandidate = (event) => {
      if (event.candidate) {
        sendeFunkSignal(teilnehmerId, { art: 'icecandidate', kandidat: event.candidate.toJSON() });
      }
    };
    verbindung.ontrack = (event) => {
      audio.srcObject = event.streams[0] ?? null;
      audio.play().catch(() => {});
    };
    verbindung.onconnectionstatechange = () => {
      const status: Verbindungsstatus =
        verbindung.connectionState === 'connected'
          ? 'verbunden'
          : verbindung.connectionState === 'connecting' || verbindung.connectionState === 'new'
            ? 'verbindet'
            : 'getrennt';
      setVerbindungen((bisher) => new Map(bisher).set(teilnehmerId, status));
    };

    const peer = { verbindung, audio };
    peersRef.current.set(teilnehmerId, peer);
    setVerbindungen((bisher) => new Map(bisher).set(teilnehmerId, 'verbindet'));

    // Deterministische Anruf-Regel: die kleinere Id ruft an.
    if (eigeneId < teilnehmerId) {
      verbindung
        .createOffer()
        .then((angebot) => verbindung.setLocalDescription(angebot))
        .then(() => {
          const sdp = verbindung.localDescription?.sdp;
          if (sdp) sendeFunkSignal(teilnehmerId, { art: 'angebot', sdp });
        });
    }

    return peer;
  }

  // Mikrofon einmal je Sitzung anfordern, sobald erstmals ein Kanal gewählt
  // wird. `mikrofonAbgeschlossen` ist bewusst reaktiver State (nicht nur der
  // Ref) und wird SOWOHL bei Erfolg als auch bei Fehlschlag gesetzt - der
  // Peer-Abgleich unten wartet nur, bis der Versuch abgeschlossen ist, nicht
  // bis er geglückt ist: ohne eigenes Mikrofon (Berechtigung verweigert,
  // keine Hardware, in einer eingebetteten Vorschau ohne Mikrofon-Erlaubnis)
  // bleibt der Empfang trotzdem möglich, nur das eigene Senden nicht. Ohne
  // dieses Verhalten blieb die Verbindung bei einem gescheiterten
  // Mikrofonzugriff für BEIDE Seiten für immer aus - kein Angebot wurde je
  // erzeugt, ohne jede Fehlermeldung (→ `mikrofonFehler`).
  const [mikrofonAbgeschlossen, setMikrofonAbgeschlossen] = useState(false);
  const [mikrofonFehler, setMikrofonFehler] = useState<string | null>(null);
  useEffect(() => {
    if (!kanal) return;
    if (mikrofonRef.current) {
      setMikrofonAbgeschlossen(true);
      return;
    }
    if (!WEBRTC_VERFUEGBAR) {
      setMikrofonFehler('Sprachfunktion wird in dieser Umgebung nicht unterstützt.');
      setMikrofonAbgeschlossen(true);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMikrofonFehler('Kein Mikrofonzugriff in dieser Umgebung möglich - Empfang bleibt trotzdem möglich.');
      setMikrofonAbgeschlossen(true);
      return;
    }
    let abgebrochen = false;
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (abgebrochen) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        for (const track of stream.getTracks()) track.enabled = false;
        mikrofonRef.current = stream;
        setMikrofonAbgeschlossen(true);
      })
      .catch((fehler: unknown) => {
        if (abgebrochen) return;
        console.error('Sprechfunk: Mikrofonzugriff fehlgeschlagen', fehler);
        setMikrofonFehler('Mikrofonzugriff verweigert oder nicht verfügbar - Empfang bleibt trotzdem möglich.');
        setMikrofonAbgeschlossen(true);
      });
    return () => {
      abgebrochen = true;
    };
  }, [kanal]);

  // Peer-Verbindungen mit der aktuellen Zielliste abgleichen.
  useEffect(() => {
    if (!eigeneId || !kanal || !mikrofonAbgeschlossen || !WEBRTC_VERFUEGBAR) return;
    const ziele = new Set(zielSchluessel ? zielSchluessel.split(',') : []);
    for (const teilnehmerId of ziele) {
      if (!peersRef.current.has(teilnehmerId)) erzeugePeer(teilnehmerId, eigeneId);
    }
    for (const teilnehmerId of [...peersRef.current.keys()]) {
      if (!ziele.has(teilnehmerId)) schliessePeer(teilnehmerId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eigeneId, kanal, zielSchluessel, mikrofonAbgeschlossen]);

  // Kanal verlassen (null) oder Sitzung beendet: alle Verbindungen schließen,
  // Mikrofon-Tracks stoppen.
  useEffect(() => {
    if (kanal) return;
    for (const teilnehmerId of [...peersRef.current.keys()]) schliessePeer(teilnehmerId);
    if (mikrofonRef.current) {
      for (const track of mikrofonRef.current.getTracks()) track.stop();
      mikrofonRef.current = null;
    }
    setSprechenAktiv(false);
    setMikrofonAbgeschlossen(false);
    setMikrofonFehler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanal]);

  useEffect(
    () => () => {
      for (const teilnehmerId of [...peersRef.current.keys()]) schliessePeer(teilnehmerId);
      if (mikrofonRef.current) {
        for (const track of mikrofonRef.current.getTracks()) track.stop();
        mikrofonRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Eingehende Signalisierung: Angebot, Antwort, ICE-Kandidat.
  useEffect(() => {
    if (!eigeneId || !WEBRTC_VERFUEGBAR) return;
    const hoerer = async (nachricht: FunkSignalNachricht) => {
      if (nachricht.anId !== eigeneId || nachricht.vonId === eigeneId) return;
      let peer = peersRef.current.get(nachricht.vonId);
      if (!peer && nachricht.daten.art === 'angebot') {
        peer = erzeugePeer(nachricht.vonId, eigeneId);
      }
      if (!peer) return;
      const { daten } = nachricht;
      if (daten.art === 'angebot') {
        await peer.verbindung.setRemoteDescription({ type: 'offer', sdp: daten.sdp });
        const antwort = await peer.verbindung.createAnswer();
        await peer.verbindung.setLocalDescription(antwort);
        const sdp = peer.verbindung.localDescription?.sdp;
        if (sdp) sendeFunkSignal(nachricht.vonId, { art: 'antwort', sdp });
      } else if (daten.art === 'antwort') {
        await peer.verbindung.setRemoteDescription({ type: 'answer', sdp: daten.sdp });
      } else if (daten.art === 'icecandidate') {
        await peer.verbindung.addIceCandidate(daten.kandidat).catch(() => {});
      }
    };
    return aufFunkSignal(hoerer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eigeneId, aufFunkSignal, sendeFunkSignal]);

  const sprechenUmschalten = () => {
    const mikrofon = mikrofonRef.current;
    if (!mikrofon) return;
    const naechsterZustand = !sprechenAktiv;
    for (const track of mikrofon.getTracks()) track.enabled = naechsterZustand;
    setSprechenAktiv(naechsterZustand);
  };

  const mitglieder: Kanalmitglied[] = zielListe.map((m) => ({
    teilnehmerId: m.teilnehmerId,
    name: m.teilnehmerName,
    verbindung: verbindungen.get(m.teilnehmerId) ?? 'verbindet',
  }));

  return { mitglieder, sprechenAktiv, sprechenUmschalten, mikrofonFehler };
}
