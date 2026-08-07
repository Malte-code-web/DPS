import { useState } from 'react';
import {
  MASSNAHMEN,
  QUALIFIKATION_LABEL,
  fehlendeVoraussetzung,
  voraussetzungKurz,
} from '../domain/massnahmen';
import { ANALGETIKA, gewichtVon } from '../domain/dosierung';
import { MASSNAHME_MATERIAL, MATERIAL_LABEL, materialVerfuegbar } from '../domain/material';
import { massnahmeGesperrtWegenQualifikation } from '../domain/qualifikation';
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
 * @anker ui.analgesieauswahl Ein Sammel-Button statt sechs Einzelknöpfe
 *
 * Morphin, Fentanyl, Nalbuphin, Esketamin, Paracetamol und Ibuprofen
 * (→ `domain.analgetika`) stehen nicht mehr einzeln in der Medikamentenliste,
 * sondern hinter einem Button „Analgesie": aufklappen zeigt die erreichbaren
 * Mittel, ein Mittel wählen klappt die Dosis-Eingabe auf. Die Dosis
 * (→ `domain.dosierung`) entscheidet über Wirkung, keine Wirkung oder
 * Überdosierung - das Rechnen ist Teil der Übung, nicht nur das Klicken.
 */
export function Analgesieauswahl({ patient, onMassnahme }: Props) {
  const { state } = useSimulation();
  const [offen, setOffen] = useState(false);
  const [gewaehlt, setGewaehlt] = useState<MassnahmeId | null>(null);
  const { offenFuer, setOffenFuer, istDelegiert, kandidatenFuer, anfragen } = useDelegationsAnfrage();
  const zk = useZeitkostenStatus();
  const zkBeschaeftigt = zk.aktion !== null;
  // Läuft der Timer für eines der Analgetika, zeigt der zugeklappte
  // Sammel-Button den Countdown - die einzelne Zeile ist dann nicht mehr zu
  // sehen, da `verabreichen` das Panel beim Absenden der Dosis schließt.
  const zkEigenGesamt = zk.aktion !== null && istMassnahmeAusSammlung(zk.aktion, patient.id, ANALGETIKA);

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

  const kandidaten = ANALGETIKA.map((id) => MASSNAHMEN[id]);

  const rechtVon = (massnahme: Massnahme): MassnahmeRecht =>
    state.massnahmenrechte[massnahme.id] ??
    ({ qualifikation: massnahme.qualifikation, delegationsziel: 'basis' } as const);

  const verabreichen = (massnahmeId: MassnahmeId, dosisMg: number) => {
    onMassnahme(massnahmeId, dosisMg);
    setGewaehlt(null);
    setOffen(false);
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
        <span className="massnahme-label">Analgesie</span>
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
            const materialFehlt = !materialVerfuegbar(massnahme.id, patient.abschnitt, state.fahrzeuge);
            const kannAnfragen =
              state.sitzung.aktiv &&
              qualifikationFehlt &&
              recht.delegationsziel !== null &&
              !bereitsDurchgefuehrt &&
              !materialFehlt &&
              fehlt === null;
            const anfrageOffen = offenFuer === massnahme.id;
            const zkEigen = zk.aktion !== null && istMassnahmeAktion(zk.aktion, patient.id, massnahme.id);
            const gesperrtHier =
              gesperrt ||
              bereitsDurchgefuehrt ||
              fehlt !== null ||
              materialFehlt ||
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
                      : bereitsDurchgefuehrt
                        ? 'durchgeführt'
                        : fehlt
                          ? voraussetzungKurz(fehlt)
                          : kannAnfragen
                            ? 'Freigabe anfragen'
                            : qualifikationFehlt
                              ? `erfordert ${QUALIFIKATION_LABEL[recht.qualifikation]}`
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
