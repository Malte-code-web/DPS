import { useState } from 'react';
import {
  DIAGNOSTIK_GRUPPEN,
  GRUPPE_LABEL,
  diagnostikDerGruppe,
  diagnostikZeitSek,
} from '../domain/diagnostik';
import { zeitFormat } from '../lib/format';
import type { Diagnostikgruppe, DiagnostikId, Patient } from '../domain/types';

interface Props {
  patient: Patient;
  onDiagnostik: (diagnostikId: DiagnostikId) => void;
  /** Gruppen, die beim Öffnen bereits ausgeklappt sind. */
  standardOffen?: Diagnostikgruppe[];
}

/**
 * @anker ui.diagnostikliste Untersuchungen einzeln wählen - jede mit ihrem Preis
 *
 * Gleiche Bauart wie das xABCDE-Akkordeon der Maßnahmen, damit die Bedienung
 * vertraut bleibt. Jede Untersuchung trägt ihre Dauer sichtbar am Knopf: Der
 * Übende soll den Preis kennen, bevor er ihn bezahlt.
 */
export function Diagnostikliste({ patient, onDiagnostik, standardOffen = ['basis'] }: Props) {
  const [offen, setOffen] = useState<Set<Diagnostikgruppe>>(() => new Set(standardOffen));
  const gesperrt = patient.status === 'verstorben' || patient.status === 'transportiert';
  const erhoben = diagnostikZeitSek(patient);

  const umschalten = (gruppe: Diagnostikgruppe) =>
    setOffen((bisher) => {
      const naechste = new Set(bisher);
      if (naechste.has(gruppe)) naechste.delete(gruppe);
      else naechste.add(gruppe);
      return naechste;
    });

  return (
    <div className="diagnostik">
      {erhoben > 0 && (
        <p className="diagnostik-konto">
          Diagnostik an diesem Patienten: <strong>{zeitFormat(erhoben)}</strong>
        </p>
      )}

      {DIAGNOSTIK_GRUPPEN.map((gruppe) => {
        const eintraege = diagnostikDerGruppe(gruppe);
        const istOffen = offen.has(gruppe);
        const erledigt = eintraege.filter((eintrag) =>
          patient.durchgefuehrteDiagnostik.includes(eintrag.id),
        ).length;

        return (
          <div key={gruppe} className={`gruppe${istOffen ? ' gruppe-offen' : ''}`}>
            <button
              type="button"
              className="gruppe-kopf"
              aria-expanded={istOffen}
              onClick={() => umschalten(gruppe)}
            >
              <span className="gruppe-titel">{GRUPPE_LABEL[gruppe]}</span>
              {erledigt > 0 && (
                <span className="gruppe-erledigt">
                  {erledigt}/{eintraege.length}
                </span>
              )}
              <span className="gruppe-pfeil" aria-hidden="true">
                {istOffen ? '▾' : '▸'}
              </span>
            </button>

            {istOffen && (
              <div className="gruppe-inhalt">
                {eintraege.map((eintrag) => {
                  const fertig = patient.durchgefuehrteDiagnostik.includes(eintrag.id);
                  return (
                    <button
                      key={eintrag.id}
                      type="button"
                      className={`massnahme${fertig ? ' massnahme-erledigt' : ''}`}
                      disabled={gesperrt || fertig}
                      onClick={() => onDiagnostik(eintrag.id)}
                    >
                      <span className="massnahme-label">{eintrag.label}</span>
                      <span className="massnahme-dauer">
                        {fertig ? 'erhoben' : `${eintrag.dauerSek} s`}
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
