import { useState } from 'react';
import {
  KATEGORIEN,
  KATEGORIE_LABEL,
  MASSNAHMEN,
  QUALIFIKATION_LABEL,
  fehlendeVoraussetzung,
  massnahmenDerKategorie,
} from '../domain/massnahmen';
import type { Massnahme, MassnahmeId, MassnahmenKategorie, Patient } from '../domain/types';

/** Zusätzlich zur xABCDE-Gruppierung ein eigener Reiter für alle Medikamente. */
type Gruppenschluessel = MassnahmenKategorie | 'medikamente';

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
 *
 * Jede Zeile trägt drei Angaben: die Dauer, die nötige Qualifikation und - bei
 * Medikamenten - ob die Voraussetzung erfüllt ist. Die SAA-Details (Indikation,
 * Dosierung) liegen hinter einem eigenen Knopf und sind bewusst zugeklappt:
 * Nachschlagewissen ja, Hinweis auf diesen Patienten nein.
 */
export function Massnahmenliste({ patient, onMassnahme, standardOffen = [] }: Props) {
  const [offen, setOffen] = useState<Set<Gruppenschluessel>>(() => new Set(standardOffen));
  const [detail, setDetail] = useState<MassnahmeId | null>(null);
  const gesperrt = patient.status === 'verstorben' || patient.status === 'transportiert';

  const umschalten = (gruppe: Gruppenschluessel) =>
    setOffen((bisher) => {
      const naechste = new Set(bisher);
      if (naechste.has(gruppe)) {
        naechste.delete(gruppe);
      } else {
        naechste.add(gruppe);
      }
      return naechste;
    });

  const zeile = (massnahme: Massnahme) => {
    const bereitsDurchgefuehrt = patient.durchgefuehrteMassnahmen.includes(massnahme.id);
    const fehlt = fehlendeVoraussetzung(massnahme, patient.durchgefuehrteMassnahmen);
    const detailOffen = detail === massnahme.id;
    const hatDetails = Boolean(massnahme.indikation ?? massnahme.dosierung);

    return (
      <div key={massnahme.id} className="massnahme-zeile">
        <button
          type="button"
          className={`massnahme massnahme-${massnahme.art}${
            bereitsDurchgefuehrt ? ' massnahme-erledigt' : ''
          }`}
          disabled={gesperrt || bereitsDurchgefuehrt || fehlt !== null}
          onClick={() => onMassnahme(massnahme.id)}
        >
          <span className="massnahme-label">
            {massnahme.label}
            {massnahme.qualifikation !== 'basis' && (
              <span className={`qualifikation qualifikation-${massnahme.qualifikation}`}>
                {QUALIFIKATION_LABEL[massnahme.qualifikation]}
              </span>
            )}
          </span>
          <span className="massnahme-dauer">
            {bereitsDurchgefuehrt
              ? 'durchgeführt'
              : fehlt
                ? // Kurz halten - der Knopf darf nicht überlaufen. Welche
                  // Zugänge zählen, steht im SAA-Detail.
                  'Zugang nötig'
                : `${massnahme.dauerSek} s`}
          </span>
        </button>

        {hatDetails && (
          <button
            type="button"
            className="massnahme-info"
            aria-expanded={detailOffen}
            aria-label={`SAA zu ${massnahme.label}`}
            onClick={() => setDetail(detailOffen ? null : massnahme.id)}
          >
            SAA
          </button>
        )}

        {detailOffen && (
          <dl className="saa-detail">
            {massnahme.indikation && (
              <div>
                <dt>Indikation</dt>
                <dd>{massnahme.indikation}</dd>
              </div>
            )}
            {massnahme.dosierung && (
              <div>
                <dt>Dosierung</dt>
                <dd>{massnahme.dosierung}</dd>
              </div>
            )}
            {massnahme.benoetigtEinesVon && (
              <div>
                <dt>Voraussetzung</dt>
                <dd>
                  {massnahme.benoetigtEinesVon.map((id) => MASSNAHMEN[id].label).join(' oder ')}
                </dd>
              </div>
            )}
            <div>
              <dt>Hinweis</dt>
              <dd>{massnahme.hinweis}</dd>
            </div>
          </dl>
        )}
      </div>
    );
  };

  // Medikamente bekommen einen eigenen Reiter statt in ihrer xABCDE-Gruppe
  // aufzugehen - die Kategorie-Zuordnung selbst bleibt unverändert, sie steuert
  // weiterhin z. B. den PatientEditor und die Simulation. Die Sauerstoffgabe
  // bleibt bewusst bei Beatmung, da sie dort erwartet wird.
  const istEigeneMedikamentengruppe = (massnahme: Massnahme) =>
    massnahme.art === 'medikament' && massnahme.id !== 'sauerstoffgabe';

  const medikamente = KATEGORIEN.flatMap((kategorie) =>
    massnahmenDerKategorie(kategorie).filter(istEigeneMedikamentengruppe),
  );

  const gruppenKopf = (
    schluessel: Gruppenschluessel,
    kuerzel: string,
    titel: string,
    gruppe: Massnahme[],
  ) => {
    const istOffen = offen.has(schluessel);
    const erledigt = gruppe.filter((massnahme) =>
      patient.durchgefuehrteMassnahmen.includes(massnahme.id),
    ).length;

    return (
      <div key={schluessel} className={`gruppe${istOffen ? ' gruppe-offen' : ''}`}>
        <button
          type="button"
          className="gruppe-kopf"
          aria-expanded={istOffen}
          onClick={() => umschalten(schluessel)}
        >
          <span className="gruppe-kuerzel">{kuerzel}</span>
          <span className="gruppe-titel">{titel}</span>
          {erledigt > 0 && (
            <span className="gruppe-erledigt">
              {erledigt}/{gruppe.length}
            </span>
          )}
          <span className="gruppe-pfeil" aria-hidden="true">
            {istOffen ? '▾' : '▸'}
          </span>
        </button>

        {istOffen && <div className="gruppe-inhalt">{gruppe.map(zeile)}</div>}
      </div>
    );
  };

  return (
    <div className="massnahmen">
      {KATEGORIEN.map((kategorie) => {
        const gruppe = massnahmenDerKategorie(kategorie).filter(
          (massnahme) => !istEigeneMedikamentengruppe(massnahme),
        );
        return gruppenKopf(kategorie, kategorie, KATEGORIE_LABEL[kategorie], gruppe);
      })}
      {gruppenKopf('medikamente', '💊', 'Medikamente', medikamente)}
    </div>
  );
}
