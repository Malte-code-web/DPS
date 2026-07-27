import { useEffect, useRef } from 'react';

/**
 * @anker ui.monitoralarm Der Alarmton - nur im selben Abschnitt zu hören
 *
 * Ein Monitor alarmiert überall sichtbar, aber hörbar nur dort, wo jemand
 * steht. Deshalb entscheidet nicht der Alarm selbst über den Ton, sondern die
 * aufrufende Ansicht: Sie übergibt `aktiv` nur dann true, wenn ein alarmierter,
 * überwachter Patient im gerade angezeigten Einsatzabschnitt liegt.
 *
 * Der Ton entsteht im Browser (Web Audio, ohne Audiodatei) und pulst, solange
 * `aktiv` gilt. Ein pausierter Einsatz ist still - dann steht die ganze Lage.
 */
export function useMonitorAlarm(aktiv: boolean): void {
  const kontextRef = useRef<AudioContext | null>(null);
  const intervallRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stoppen = () => {
      if (intervallRef.current !== null) {
        clearInterval(intervallRef.current);
        intervallRef.current = null;
      }
    };

    if (!aktiv) {
      stoppen();
      return;
    }

    const AudioKontext =
      window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioKontext) return;

    if (!kontextRef.current) {
      try {
        kontextRef.current = new AudioKontext();
      } catch {
        return;
      }
    }
    const kontext = kontextRef.current;
    void kontext.resume().catch(() => {});

    const piepen = () => {
      try {
        const oszillator = kontext.createOscillator();
        const lautstaerke = kontext.createGain();
        oszillator.type = 'square';
        oszillator.frequency.value = 880;
        const jetzt = kontext.currentTime;
        // Kurze, harte Hüllkurve - ein Monitorpiepser, kein Dauerton.
        lautstaerke.gain.setValueAtTime(0.0001, jetzt);
        lautstaerke.gain.exponentialRampToValueAtTime(0.18, jetzt + 0.02);
        lautstaerke.gain.exponentialRampToValueAtTime(0.0001, jetzt + 0.22);
        oszillator.connect(lautstaerke).connect(kontext.destination);
        oszillator.start(jetzt);
        oszillator.stop(jetzt + 0.24);
      } catch {
        /* Ohne Audioausgabe (z. B. Tests) bleibt es still. */
      }
    };

    piepen();
    intervallRef.current = setInterval(piepen, 1300);
    return stoppen;
  }, [aktiv]);

  // Den Audiokontext beim endgültigen Verlassen schließen.
  useEffect(
    () => () => {
      void kontextRef.current?.close().catch(() => {});
    },
    [],
  );
}
