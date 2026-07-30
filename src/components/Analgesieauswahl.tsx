import { useState } from 'react';
import {
  MASSNAHMEN,
  QUALIFIKATION_LABEL,
  fehlendeVoraussetzung,
  voraussetzungKurz,
} from '../domain/massnahmen';
import { ANALGETIKA, empfohleneDosisMg, gewichtVon } from '../domain/dosierung';
import { massnahmeGesperrtWegenQualifikation } from '../domain/qualifikation';
import type { MassnahmeRecht } from '../domain/qualifikation';
import { useSimulation } from '../state/useSimulation';
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
  const [dosis, setDosis] = useState('');

  const gesperrt = patient.status === 'verstorben' || patient.status === 'transportiert';
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

  const waehle = (id: MassnahmeId) => {
    setGewaehlt(id);
    setDosis(String(empfohleneDosisMg(id, gewichtKg)));
  };

  const dosisNum = Number(dosis.replace(',', '.'));
  const dosisGueltig = Number.isFinite(dosisNum) && dosisNum > 0;

  const verabreichen = () => {
    if (!gewaehlt || !dosisGueltig) return;
    onMassnahme(gewaehlt, dosisNum);
    setGewaehlt(null);
    setOffen(false);
  };

  return (
    <div className="massnahme-zeile analgesie-auswahl">
      <button
        type="button"
        className="massnahme massnahme-medikament"
        aria-expanded={offen}
        disabled={gesperrt}
        onClick={() => setOffen((bisher) => !bisher)}
      >
        <span className="massnahme-label">Analgesie</span>
        <span className="massnahme-dauer">{offen ? 'einklappen' : 'Mittel wählen'}</span>
      </button>

      {offen && (
        <div className="analgesie-mittel">
          {kandidaten.map((massnahme) => {
            const recht = rechtVon(massnahme);
            const bereitsDurchgefuehrt = patient.durchgefuehrteMassnahmen.includes(massnahme.id);
            const fehlt = fehlendeVoraussetzung(massnahme, patient.durchgefuehrteMassnahmen);
            const delegiert = patient.delegierteMassnahmen.includes(massnahme.id);
            const qualifikationFehlt = massnahmeGesperrtWegenQualifikation(
              recht,
              eigeneQualifikation,
              delegiert,
            );
            const gesperrtHier = gesperrt || bereitsDurchgefuehrt || fehlt !== null || qualifikationFehlt;
            const istGewaehlt = gewaehlt === massnahme.id;

            return (
              <div key={massnahme.id} className="analgesie-mittel-zeile">
                <button
                  type="button"
                  className={`massnahme massnahme-medikament${istGewaehlt ? ' massnahme-aktiv' : ''}`}
                  disabled={gesperrtHier}
                  onClick={() => waehle(massnahme.id)}
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
                    {bereitsDurchgefuehrt
                      ? 'durchgeführt'
                      : fehlt
                        ? voraussetzungKurz(fehlt)
                        : qualifikationFehlt
                          ? `erfordert ${QUALIFIKATION_LABEL[recht.qualifikation]}`
                          : (massnahme.indikation ?? `${massnahme.dauerSek} s`)}
                  </span>
                </button>

                {istGewaehlt && (
                  <div className="analgesie-dosis">
                    <label>
                      Dosis in mg
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.5"
                        value={dosis}
                        onChange={(event) => setDosis(event.target.value)}
                      />
                    </label>
                    <span className="analgesie-dosis-hinweis">
                      {dosisGueltig
                        ? `${(dosisNum / gewichtKg).toFixed(3)} mg/kg bei ${gewichtKg} kg Körpergewicht`
                        : `Gewicht: ${gewichtKg} kg`}
                    </span>
                    <button
                      type="button"
                      className="analgesie-verabreichen"
                      disabled={!dosisGueltig}
                      onClick={verabreichen}
                    >
                      Verabreichen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
