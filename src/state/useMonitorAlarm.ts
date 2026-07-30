import { useEffect, useRef } from 'react';
import type { Alarmstufe } from '../domain/monitor';

/**
 * Notenfrequenzen (gleichstufige Stimmung, a' = 440 Hz). Der Alarm ist auf C
 * aufgebaut - anschlagreich genug, um sich durchzusetzen, aber nicht schrill.
 */
const NOTE = {
  C5: 523.25,
  E5: 659.26,
  G5: 783.99,
  C6: 1046.5,
} as const;

interface Puls {
  note: number;
  start: number;
  dauer: number;
}

interface Muster {
  melodie: Puls[];
  sequenzMs: number;
}

/**
 * @anker ui.alarmmelodie Zwei corpuls³-nahe Alarmmuster nach IEC 60601-1-8
 *
 * Zwei Muster wie am corpuls³ und nach IEC 60601-1-8, je nach Priorität:
 *
 * - **hoch (rot)**: fünf Pulse (drei - kurze Lücke - zwei), höher gestimmt,
 *   drängend, kurze Wiederholpause. Der klassische "roter Alarm"-Klang.
 * - **mittel (gelb)**: drei Pulse, tiefer gestimmt, ruhiger, mit deutlich
 *   längerer Pause dazwischen - da ist etwas, aber nicht sofort lebensbedrohlich.
 *
 * Bewusst nachgebaut, kein Originalton - ein Sample dürfte hier weder liegen
 * noch klingen. Jeder Puls ist harmonisch angereichert (Grundton plus zwei
 * Obertöne), damit es nach Monitor klingt und nicht nach Rechteckpiepser.
 */
const MUSTER: Record<Alarmstufe, Muster> = {
  hoch: {
    melodie: [
      { note: NOTE.C6, start: 0.0, dauer: 0.15 },
      { note: NOTE.G5, start: 0.22, dauer: 0.15 },
      { note: NOTE.E5, start: 0.44, dauer: 0.15 },
      { note: NOTE.C6, start: 0.8, dauer: 0.15 },
      { note: NOTE.G5, start: 1.02, dauer: 0.2 },
    ],
    sequenzMs: 1600,
  },
  mittel: {
    melodie: [
      { note: NOTE.G5, start: 0.0, dauer: 0.17 },
      { note: NOTE.E5, start: 0.26, dauer: 0.17 },
      { note: NOTE.C5, start: 0.52, dauer: 0.22 },
    ],
    sequenzMs: 3200,
  },
};

/** Relative Lautstärke der Obertöne - gibt dem Ton seinen Monitor-Charakter. */
const OBERTOENE: { faktor: number; anteil: number }[] = [
  { faktor: 1, anteil: 1 },
  { faktor: 2, anteil: 0.3 },
  { faktor: 3, anteil: 0.12 },
];

/**
 * @anker ui.monitoralarm Der Alarmton - gestaffelt und nur im selben Abschnitt
 *
 * Ein Monitor alarmiert überall sichtbar, aber hörbar nur dort, wo jemand
 * steht. Deshalb entscheidet nicht der Alarm selbst über den Ton, sondern die
 * aufrufende Ansicht: Sie übergibt die höchste Alarmstufe, die im gerade
 * gezeigten Einsatzabschnitt ansteht - oder null, wenn es dort still bleiben soll.
 *
 * Der Ton entsteht im Browser (Web Audio, ohne Audiodatei): je nach Stufe das
 * gelbe oder rote Muster (→ `ui.alarmmelodie`), das sich wiederholt. Ein
 * pausierter Einsatz ist still - dann steht die ganze Lage.
 */
export function useMonitorAlarm(stufe: Alarmstufe | null): void {
  const kontextRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const intervallRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Bereits geplante, aber noch nicht verklungene Oszillatoren - beim Wechsel
  // der Alarmstufe (z. B. anderer Abschnitt, neue Eskalation) sonst hörbar
  // zwei Melodien gleichzeitig, weil `spieleSequenz` bis zu `sequenzMs` im
  // Voraus plant (→ Fund bei der Codeprüfung: Cleanup stoppte nur den Timer).
  const aktiveOszillatorenRef = useRef<OscillatorNode[]>([]);

  useEffect(() => {
    const stoppen = () => {
      if (intervallRef.current !== null) {
        clearInterval(intervallRef.current);
        intervallRef.current = null;
      }
      for (const oszillator of aktiveOszillatorenRef.current) {
        try {
          oszillator.stop();
        } catch {
          /* bereits verklungen */
        }
      }
      aktiveOszillatorenRef.current = [];
    };

    if (!stufe) {
      stoppen();
      return;
    }
    const muster = MUSTER[stufe];

    const AudioKontext =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioKontext) return;

    if (!kontextRef.current) {
      try {
        kontextRef.current = new AudioKontext();
        masterRef.current = kontextRef.current.createGain();
        masterRef.current.gain.value = 0.28;
        masterRef.current.connect(kontextRef.current.destination);
      } catch {
        return;
      }
    }
    const kontext = kontextRef.current;
    const master = masterRef.current;
    if (!master) return;
    void kontext.resume().catch(() => {});

    /** Ein einzelner Alarmpuls mit weicher Hüllkurve, damit es nicht knackt. */
    const spielePuls = (note: number, startAbs: number, dauer: number) => {
      const huelle = kontext.createGain();
      huelle.connect(master);
      const spitze = 0.9;
      huelle.gain.setValueAtTime(0.0001, startAbs);
      huelle.gain.exponentialRampToValueAtTime(spitze, startAbs + 0.01);
      huelle.gain.setValueAtTime(spitze, startAbs + dauer - 0.04);
      huelle.gain.exponentialRampToValueAtTime(0.0001, startAbs + dauer);

      for (const oberton of OBERTOENE) {
        const oszillator = kontext.createOscillator();
        oszillator.type = 'sine';
        oszillator.frequency.value = note * oberton.faktor;
        const mischung = kontext.createGain();
        mischung.gain.value = oberton.anteil;
        oszillator.connect(mischung).connect(huelle);
        oszillator.start(startAbs);
        oszillator.stop(startAbs + dauer + 0.02);
      }
    };

    const spieleSequenz = () => {
      try {
        const start = kontext.currentTime + 0.03;
        for (const puls of muster.melodie) {
          spielePuls(puls.note, start + puls.start, puls.dauer);
        }
      } catch {
        /* Ohne Audioausgabe (z. B. Tests) bleibt es still. */
      }
    };

    spieleSequenz();
    intervallRef.current = setInterval(spieleSequenz, muster.sequenzMs);
    return stoppen;
  }, [stufe]);

  // Den Audiokontext beim endgültigen Verlassen schließen.
  useEffect(
    () => () => {
      void kontextRef.current?.close().catch(() => {});
    },
    [],
  );
}
