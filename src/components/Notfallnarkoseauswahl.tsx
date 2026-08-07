import { useState } from 'react';
import {
  MASSNAHMEN,
  QUALIFIKATION_LABEL,
  fehlendeVoraussetzung,
  voraussetzungKurz,
} from '../domain/massnahmen';
import { NOTFALLNARKOSE, NOTFALLNARKOSE_INDUKTION, gewichtVon } from '../domain/dosierung';
import { MASSNAHME_MATERIAL, MATERIAL_LABEL, materialVerfuegbar } from '../domain/material';
import {
  massnahmeGesperrtWegenQualifikation,
  notfallnarkoseTeamVerfuegbar,
} from '../domain/qualifikation';
import type { MassnahmeRecht } from '../domain/qualifikation';
import { useDelegationsAnfrage } from '../state/useDelegationsAnfrage';
import { useSimulation } from '../state/useSimulation';
import { istMassnahmeAktion, istMassnahmeAusSammlung } from '../state/zeitkosten';
import { useZeitkostenStatus, zeitkostenHintergrund } from '../state/useZeitkostenStatus';
import { DelegationAnfrageAuswahl } from './DelegationAnfrageAuswahl';
import { Dosiseingabe } from './Dosiseingabe';
import type { Massnahme, MassnahmeId, Patient } from '../domain/types';

interface Props {
  patient: Patient;
  onMassnahme: (massnahmeId: MassnahmeId, dosisMg?: number) => void;
}

/**
 * @anker ui.notfallnarkoseauswahl Induktionsmittel wählen, dann relaxieren - erst mit vollem Team
 *
 * Zwei Stufen hinter einem Button „Notfallnarkose": zuerst eines der drei
 * Induktionsmittel (→ `NOTFALLNARKOSE_INDUKTION`) wählen und dosieren - jede
 * Zeile bleibt gesperrt, solange kein Team aus RS + NotSan + NotArzt
 * gleichzeitig anwesend ist (→ `benoetigtTeam`, `notfallnarkoseTeamVerfuegbar`).
 * Sobald ein Mittel gegeben ist, erscheint Rocuronium als nächster Schritt
 * (eigene `benoetigtEinesVon`-Prüfung genügt dort - das Team stand ja schon
 * für die Induktion). Die eigentliche Intubation bleibt ein normaler
 * Katalogeintrag im Maßnahmen-Reiter (→ `intubation.benoetigtEinesVon`).
 */
export function Notfallnarkoseauswahl({ patient, onMassnahme }: Props) {
  const { state, dispatch } = useSimulation();
  const [offen, setOffen] = useState(false);
  const [gewaehlt, setGewaehlt] = useState<MassnahmeId | null>(null);
  const { offenFuer, setOffenFuer, istDelegiert, kandidatenFuer, anfragen } = useDelegationsAnfrage();
  const zk = useZeitkostenStatus();
  const zkBeschaeftigt = zk.aktion !== null;
  // Wie in der Analgesieauswahl: zugeklappt zeigt der Sammel-Button den
  // Countdown, weil `verabreichen` das Panel nach jeder Dosis schließt.
  const zkEigenGesamt =
    zk.aktion !== null && istMassnahmeAusSammlung(zk.aktion, patient.id, NOTFALLNARKOSE);

  // Solange eine eingeklemmte Person noch nicht gerettet ist, sind nur
  // Kommunikation/Diagnostik möglich, keine körperkontakt-/materialbasierte
  // Maßnahme (→ `modell.eingeklemmtstatus`).
  const gesperrt =
    patient.status === 'verstorben' ||
    patient.status === 'transportiert' ||
    Boolean(patient.eingeklemmt && !patient.eingeklemmt.gerettet);
  // Nur innerhalb einer Sitzung gilt die Qualifikationssperre überhaupt
  // (→ `domain.qualifikation`) - identisch zur Prüfung in Massnahmenliste.
  const eigeneQualifikation = state.sitzung.aktiv
    ? (state.sitzung.spieler.find((s) => s.id === state.sitzung.eigeneId)?.qualifikation ?? 'basis')
    : null;
  const gewichtKg = gewichtVon(patient);
  const teamVerfuegbar = notfallnarkoseTeamVerfuegbar(state.sitzung.aktiv, state.sitzung.spieler);

  const induktionsmittel = NOTFALLNARKOSE_INDUKTION.map((id) => MASSNAHMEN[id]);
  const induktionGegeben = NOTFALLNARKOSE_INDUKTION.some((id) =>
    patient.durchgefuehrteMassnahmen.includes(id),
  );
  const kandidaten = induktionGegeben
    ? [...induktionsmittel, MASSNAHMEN.rocuronium]
    : induktionsmittel;

  const rechtVon = (massnahme: Massnahme): MassnahmeRecht =>
    state.massnahmenrechte[massnahme.id] ??
    ({ qualifikation: massnahme.qualifikation, delegationsziel: 'basis' } as const);

  // Eigene, noch offene Anfrage für dieses Induktionsmittel bei diesem
  // Patienten - solange sie besteht, wartet die Gabe auf ein vollständiges
  // Team (→ `modell.kollegenanfrage`, `massnahmeMitTeamStarten`).
  const eigeneOffeneAnfrage = (massnahmeId: MassnahmeId) =>
    state.kollegenanfragen.some(
      (anfrage) =>
        anfrage.grund === 'narkose' &&
        anfrage.patientId === patient.id &&
        anfrage.massnahmeId === massnahmeId &&
        anfrage.anfragendeId === state.sitzung.eigeneId,
    );

  const verabreichen = (massnahmeId: MassnahmeId, dosisMg: number) => {
    const massnahme = MASSNAHMEN[massnahmeId];
    if (massnahme.benoetigtTeam && state.sitzung.eigeneId) {
      // Wirkung und Materialverbrauch treten erst ein, wenn das Team
      // vollständig ist (→ `state.reducer`, `kollegenanfrageAnnehmen`) - kein
      // sofortiges `onMassnahme` wie bei jeder anderen Maßnahme.
      dispatch({
        typ: 'massnahmeMitTeamStarten',
        patientId: patient.id,
        massnahmeId,
        anfragendeId: state.sitzung.eigeneId,
        dosisMg,
      });
    } else {
      onMassnahme(massnahmeId, dosisMg);
    }
    setGewaehlt(null);
    // Nach Rocuronium ist die Sequenz abgeschlossen - die Intubation folgt als
    // eigene Zeile im Maßnahmen-Reiter, nicht mehr hier.
    if (massnahmeId === 'rocuronium') setOffen(false);
  };

  return (
    <div className="massnahme-zeile analgesie-auswahl">
      <button
        type="button"
        className="massnahme massnahme-medikament"
        style={!offen && zkEigenGesamt ? zeitkostenHintergrund(zk.anteil) : undefined}
        aria-expanded={offen}
        aria-busy={(!offen && zkEigenGesamt) || undefined}
        disabled={gesperrt}
        onClick={() => setOffen((bisher) => !bisher)}
      >
        <span className="massnahme-label">Notfallnarkose</span>
        <span className="massnahme-dauer">
          {!offen && zkEigenGesamt ? `noch ${zk.restSek} s` : offen ? 'einklappen' : 'Mittel wählen'}
        </span>
      </button>

      {offen && (
        <div className="analgesie-mittel">
          {kandidaten.map((massnahme) => {
            const recht = rechtVon(massnahme);
            const bereitsDurchgefuehrt = patient.durchgefuehrteMassnahmen.includes(massnahme.id);
            const fehlt = fehlendeVoraussetzung(massnahme, patient.durchgefuehrteMassnahmen);
            const delegiert = istDelegiert(patient.delegierteMassnahmen, massnahme.id);
            const qualifikationFehlt = massnahmeGesperrtWegenQualifikation(
              recht,
              eigeneQualifikation,
              delegiert,
            );
            const teamFehlt = Boolean(massnahme.benoetigtTeam) && !teamVerfuegbar;
            const materialFehlt = !materialVerfuegbar(massnahme.id, patient.abschnitt, state.fahrzeuge);
            const wartetAufTeam = eigeneOffeneAnfrage(massnahme.id);
            const kannAnfragen =
              state.sitzung.aktiv &&
              qualifikationFehlt &&
              recht.delegationsziel !== null &&
              !bereitsDurchgefuehrt &&
              !teamFehlt &&
              !materialFehlt &&
              fehlt === null;
            const anfrageOffen = offenFuer === massnahme.id;
            const zkEigen = zk.aktion !== null && istMassnahmeAktion(zk.aktion, patient.id, massnahme.id);
            const gesperrtHier =
              gesperrt ||
              bereitsDurchgefuehrt ||
              fehlt !== null ||
              teamFehlt ||
              materialFehlt ||
              wartetAufTeam ||
              (qualifikationFehlt && !kannAnfragen) ||
              (zkBeschaeftigt && !zkEigen);
            const istGewaehlt = gewaehlt === massnahme.id;

            return (
              <div key={massnahme.id} className="analgesie-mittel-zeile">
                <button
                  type="button"
                  className={`massnahme massnahme-medikament${istGewaehlt ? ' massnahme-aktiv' : ''}`}
                  style={zkEigen ? zeitkostenHintergrund(zk.anteil) : undefined}
                  disabled={gesperrtHier}
                  aria-busy={zkEigen || undefined}
                  aria-expanded={kannAnfragen ? anfrageOffen : undefined}
                  onClick={() => {
                    if (kannAnfragen) {
                      setOffenFuer(anfrageOffen ? null : massnahme.id);
                      return;
                    }
                    setGewaehlt(massnahme.id);
                  }}
                >
                  <span className="massnahme-label">
                    {massnahme.label}
                    {recht.qualifikation !== 'basis' && (
                      <span className={`qualifikation qualifikation-${recht.qualifikation}`}>
                        {QUALIFIKATION_LABEL[recht.qualifikation]}
                      </span>
                    )}
                  </span>
                  <span className="massnahme-dauer">
                    {zkEigen
                      ? `noch ${zk.restSek} s`
                      : wartetAufTeam
                        ? 'wartet auf Team …'
                        : bereitsDurchgefuehrt
                          ? 'durchgeführt'
                          : fehlt
                            ? voraussetzungKurz(fehlt)
                            : kannAnfragen
                              ? 'Freigabe anfragen'
                              : qualifikationFehlt
                                ? `erfordert ${QUALIFIKATION_LABEL[recht.qualifikation]}`
                                : teamFehlt
                                  ? 'Team: RS + NotSan + Notärztin nötig'
                                  : materialFehlt
                                    ? `${MATERIAL_LABEL[MASSNAHME_MATERIAL[massnahme.id]!]} alle`
                                    : (massnahme.indikation ?? `${massnahme.dauerSek} s`)}
                  </span>
                </button>

                {anfrageOffen && (
                  <DelegationAnfrageAuswahl
                    massnahmeLabel={massnahme.label}
                    kandidaten={kandidatenFuer(recht)}
                    onAnfragen={(angefragteId) => anfragen(patient, massnahme.id, angefragteId)}
                    onAbbrechen={() => setOffenFuer(null)}
                  />
                )}

                {istGewaehlt && (
                  <Dosiseingabe
                    massnahmeId={massnahme.id}
                    gewichtKg={gewichtKg}
                    onVerabreichen={(dosisMg) => verabreichen(massnahme.id, dosisMg)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
