import { useState } from 'react';
import {
  delegationsKandidaten,
  istFuerSpielerDelegiert,
} from '../domain/qualifikation';
import type { MassnahmeRecht } from '../domain/qualifikation';
import { erzeugeId } from '../domain/sitzung';
import { useSimulation } from './useSimulation';
import type { DelegationsFreigabe, MassnahmeId, Patient } from '../domain/types';

/**
 * @anker state.delegationsanfrage Gemeinsame Logik hinter jedem "Anfragen"-Knopf
 *
 * Bündelt, was alle vier Maßnahmen-Ansichten (Maßnahmenliste, Sofortmaßnahmen,
 * Analgesie-/Notfallnarkoseauswahl, Patientenkarte) für die Delegationsanfrage
 * gleich brauchen: welche Maßnahme gerade zur Anfrage offen steht, wer als
 * Ziel infrage kommt, und das Senden der Anfrage selbst.
 */
export function useDelegationsAnfrage() {
  const { state, dispatch } = useSimulation();
  const [offenFuer, setOffenFuer] = useState<MassnahmeId | null>(null);

  const istDelegiert = (delegierteMassnahmen: DelegationsFreigabe[], massnahmeId: MassnahmeId) =>
    istFuerSpielerDelegiert(delegierteMassnahmen, massnahmeId, state.sitzung.eigeneId);

  const kandidatenFuer = (recht: MassnahmeRecht) =>
    delegationsKandidaten(
      recht,
      state.sitzung.spieler,
      state.sitzung.eigeneId,
      state.ausgewaehlterAbschnitt,
    );

  const anfragen = (patient: Patient, massnahmeId: MassnahmeId, angefragteId: string) => {
    if (!state.sitzung.eigeneId) return;
    dispatch({
      typ: 'delegationAnfragen',
      id: erzeugeId(),
      patientId: patient.id,
      massnahmeId,
      anfragendeId: state.sitzung.eigeneId,
      angefragteId,
    });
    setOffenFuer(null);
  };

  return { offenFuer, setOffenFuer, istDelegiert, kandidatenFuer, anfragen };
}
