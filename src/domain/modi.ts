/**
 * @anker modi.liste Die Trainingsmodi und ihr Ausbaustand
 *
 * Langfristig soll DPS mehrere Trainingsformen tragen. Heute ist nur die
 * digitale Übung ausgebaut; die übrigen Modi stehen bereits zur Auswahl,
 * damit der Rahmen steht und die Ausbaurichtung sichtbar bleibt.
 */
export type Trainingsmodus = 'digital' | 'fuehrungskraefte' | 'realuebung';

export type Ausbaustand = 'verfuegbar' | 'in_vorbereitung';

export interface ModusInfo {
  id: Trainingsmodus;
  name: string;
  kurzbeschreibung: string;
  /** Wer damit übt. */
  zielgruppe: string;
  /** Was der Modus können soll - auch das, was noch fehlt. */
  geplant: string[];
  stand: Ausbaustand;
}

export const TRAININGSMODI: ModusInfo[] = [
  {
    id: 'digital',
    name: 'Digitale Übung',
    kurzbeschreibung:
      'Eine vollständige MANV-Lage am Bildschirm: sichten, versorgen, den Behandlungsplatz betreiben.',
    zielgruppe: 'Einsatzkräfte im Rettungsdienst und Sanitätsdienst, einzeln oder in Kleingruppen',
    geplant: [
      'Vorsichtung nach mSTaRT an der Schadensstelle',
      'Behandlungsplatz mit Eingangssichtung, drei Zelten und Ausgangssichtung',
      'Debriefing mit Auswertung der Sichtung und der gebundenen Zeit',
    ],
    stand: 'verfuegbar',
  },
  {
    id: 'fuehrungskraefte',
    name: 'Führungskräfte',
    kurzbeschreibung:
      'Führen statt behandeln: Lagebeurteilung, Kräfteeinteilung, Nachforderung und Meldungen.',
    zielgruppe: 'Organisatorische Leitung, Leitender Notarzt, Zugführung, Abschnittsleitungen',
    geplant: [
      'Lagemeldungen absetzen und Kräfte disponieren, statt einzelne Patienten zu versorgen',
      'Aufbau des Behandlungsplatzes als Entscheidung: wann, wo, mit welchen Kräften',
      'Sichtungsergebnisse als aggregierte Lage statt als Einzelpatient',
    ],
    stand: 'in_vorbereitung',
  },
  {
    id: 'realuebung',
    name: 'Realübung',
    kurzbeschreibung:
      'Begleitung einer Übung vor Ort: Mimen tragen die Patientendaten, die App führt Verlauf und Auswertung.',
    zielgruppe: 'Übungsleitung und Auswertung bei Übungen mit Mimen im Gelände',
    geplant: [
      'Patientenkarten für Mimen aus dem Szenario erzeugen und drucken',
      'Sichtungen und Maßnahmen vor Ort erfassen, mehrere Geräte gleichzeitig',
      'Auswertung wie in der digitalen Übung, aber mit echten Zeiten aus dem Gelände',
    ],
    stand: 'in_vorbereitung',
  },
];

export function modusInfo(id: Trainingsmodus): ModusInfo {
  const info = TRAININGSMODI.find((modus) => modus.id === id);
  if (!info) throw new Error(`Unbekannter Trainingsmodus: ${id}`);
  return info;
}
