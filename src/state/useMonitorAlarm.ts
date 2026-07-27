import { useEffect, useRef } from 'react';

/**
 * Notenfrequenzen (gleichstufige Stimmung, a' = 440 Hz). Der Alarm ist auf C
 * aufgebaut - anschlagreich genug, um sich durchzusetzen, aber nicht schrill.
 */
const NOTE = {
  E5: 659.26,
  G5: 783.99,
  C6: 1046.5,
} as const;

/**
 * Ein Puls der Alarmmelodie: Note, Startzeit ab Sequenzbeginn und Dauer (in s).
 *
 * @anker ui.alarmmelodie corpuls³-naher Monitorton nach IEC 60601-1-8
 *
 * Angelehnt an den Melodiealarm nach IEC 60601-1-8, an dem sich Rettungsdienst-
 * Monitore wie der corpuls³ orientieren: ein Bündel aus fünf Pulsen (drei -
 * kurze Lücke - zwei), das sich wiederholt. Bewusst nachgebaut, kein Originalton
 * - ein Sample dürfte hier weder liegen noch klingen. Die Pulse sind harmonisch
 * angereichert (Grundton plus zwei Obertöne), damit es nach Monitor klingt und
 * nicht nach Rechteckpiepser.
 */
const ALARM_MELODIE: { note: number; start: number; dauer: number }[] = [
  { note: NOTE.C6, start: 0.0, dauer: 0.15 },
  { note: NOTE.G5, start: 0.22, dauer: 0.15 },
  { note: NOTE.E5, start: 0.44, dauer: 0.15 },
  { note: NOTE.C6, start: 0.8, dauer: 0.15 },
  { note: NOTE.G5, start: 1.02, dauer: 0.2 },
];

/** Länge einer Sequenz inkl. Pause bis zur Wiederholung (in ms). */
const SEQUENZ_MS = 1600;

/** Relative Lautstärke der Obertöne - gibt dem Ton seinen Monitor-Charakter. */
const OBERTOENE: { faktor: number; anteil: number }[] = [
  { faktor: 1, anteil: 1 },
  { faktor: 2, anteil: 0.3 },
  { faktor: 3, anteil: 0.12 },
];

/**
 * @anker ui.monitoralarm Der Alarmton - nur im selben Abschnitt zu hören
 *
 * Ein Monitor alarmiert überall sichtbar, aber hörbar nur dort, wo jemand
 * steht. Deshalb entscheidet nicht der Alarm selbst über den Ton, sondern die
 * aufrufende Ansicht: Sie übergibt `aktiv` nur dann true, wenn ein alarmierter,
 * überwachter Patient im gerade angezeigten Einsatzabschnitt liegt.
 *
 * Der Ton entsteht im Browser (Web Audio, ohne Audiodatei): die corpuls³-nahe
 * Alarmmelodie (→ `ui.alarmmelodie`) wiederholt sich, solange `aktiv` gilt. Ein
 * pausierter Einsatz ist still - dann steht die ganze Lage.
 */
export function useMonitorAlarm(aktiv: boolean): void {
  const kontextRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
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
        for (const puls of ALARM_MELODIE) {
          spielePuls(puls.note, start + puls.start, puls.dauer);
        }
      } catch {
        /* Ohne Audioausgabe (z. B. Tests) bleibt es still. */
      }
    };

    spieleSequenz();
    intervallRef.current = setInterval(spieleSequenz, SEQUENZ_MS);
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
