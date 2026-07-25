import { useState } from 'react';
import { KATEGORIEN, KATEGORIE_LABEL, massnahmenDerKategorie } from '../domain/massnahmen';
import type { MassnahmeId, MassnahmenKategorie, Patient } from '../domain/types';

interface Props {
  patient: Patient;
  onMassnahme: (massnahmeId: MassnahmeId) => void;
  /** Gruppen, die beim Öffnen der Seite bereits ausgeklappt sind. */
  standardOffen?: MassnahmenKategorie[];
}

/**
 * @anker ui.massnahmenliste Das einklappbare xABCDE-Akkordeon
 *
 * Der vollständige Maßnahmenkatalog nach xABCDE, gruppenweise einklappbar.
 *
 * Welche Gruppen offen starten, entscheidet die aufrufende Ansicht: in der
 * Ersteinschätzung nur x und A, damit der lehrbuchgerechte Griff sofort da
 * ist - der Rest bleibt sichtbar, aber eingeklappt.
 */
export function Massnahmenliste({ patient, onMassnahme, standardOffen = [] }: Props) {
  const [offen, setOffen] = useState<Set<MassnahmenKategorie>>(() => new Set(standardOffen));
  const gesperrt = patient.status === 'verstorben' || patient.status === 'transportiert';

  const umschalten = (kategorie: MassnahmenKategorie) =>
    setOffen((bisher) => {
      const naechste = new Set(bisher);
      if (naechste.has(kategorie)) {
        naechste.delete(kategorie);
      } else {
        naechste.add(kategorie);
      }
      return naechste;
    });

  return (
    <div className="massnahmen">
      {KATEGORIEN.map((kategorie) => {
        const gruppe = massnahmenDerKategorie(kategorie);
        const istOffen = offen.has(kategorie);
        const erledigt = gruppe.filter((massnahme) =>
          patient.durchgefuehrteMassnahmen.includes(massnahme.id),
        ).length;

        return (
          <div key={kategorie} className={`gruppe${istOffen ? ' gruppe-offen' : ''}`}>
            <button
              type="button"
              className="gruppe-kopf"
              aria-expanded={istOffen}
              onClick={() => umschalten(kategorie)}
            >
              <span className="gruppe-kuerzel">{kategorie}</span>
              <span className="gruppe-titel">{KATEGORIE_LABEL[kategorie]}</span>
              {erledigt > 0 && (
                <span className="gruppe-erledigt">
                  {erledigt}/{gruppe.length}
                </span>
              )}
              <span className="gruppe-pfeil" aria-hidden="true">
                {istOffen ? '▾' : '▸'}
              </span>
            </button>

            {istOffen && (
              <div className="gruppe-inhalt">
                {gruppe.map((massnahme) => {
                  const bereitsDurchgefuehrt = patient.durchgefuehrteMassnahmen.includes(
                    massnahme.id,
                  );
                  return (
                    <button
                      key={massnahme.id}
                      type="button"
                      className={`massnahme${bereitsDurchgefuehrt ? ' massnahme-erledigt' : ''}`}
                      disabled={gesperrt || bereitsDurchgefuehrt}
                      onClick={() => onMassnahme(massnahme.id)}
                    >
                      <span className="massnahme-label">{massnahme.label}</span>
                      <span className="massnahme-dauer">
                        {bereitsDurchgefuehrt ? 'durchgeführt' : `${massnahme.dauerSek} s`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
