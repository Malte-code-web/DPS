import { useState } from 'react';
import {
  KATEGORIEN,
  KATEGORIE_LABEL,
  MASSNAHMEN,
  QUALIFIKATION_LABEL,
  fehlendeVoraussetzung,
  massnahmenDerKategorie,
  voraussetzungKurz,
} from '../domain/massnahmen';
import { darfDelegieren, massnahmeGesperrtWegenQualifikation } from '../domain/qualifikation';
import type { MassnahmeRecht } from '../domain/qualifikation';
import { useSimulation } from '../state/useSimulation';
import type {
  Massnahme,
  MassnahmeId,
  Massnahmenart,
  MassnahmenKategorie,
  Patient,
} from '../domain/types';

interface Props {
  patient: Patient;
  onMassnahme: (massnahmeId: MassnahmeId) => void;
  /** Gruppen, die beim Öffnen der Seite bereits ausgeklappt sind. */
  standardOffen?: MassnahmenKategorie[];
  /**
   * Nur Maßnahmen dieser Art zeigen. Ohne Angabe alle. So trennt die Ansicht
   * Handgriffe/Eingriffe (Maßnahmen) von den Medikamenten in eigene Reiter.
   */
  arten?: Massnahmenart[];
}

/**
 * @anker ui.massnahmenliste Das einklappbare xABCDE-Akkordeon
 *
 * Der Maßnahmenkatalog nach xABCDE, gruppenweise einklappbar. Über `arten`
 * trennt die Ansicht Handgriffe/Eingriffe (Maßnahmenreiter) von den Medikamenten
 * (eigener Reiter); eine in diesem Reiter leere Gruppe fällt ganz weg.
 *
 * Die Gruppen starten eingeklappt - der Reiter öffnet ruhig, nicht mit einer
 * Wand aus Knöpfen. Der lebensrettende Griff wartet ohnehin nicht hier, sondern
 * steht an der Schadensstelle dauerhaft im Sofortpanel (→ `ui.sofortmassnahmen`).
 * Wer explizit eine Gruppe offen starten will, gibt sie über `standardOffen` an.
 *
 * Jede Zeile trägt drei Angaben: die Dauer, die nötige Qualifikation und - wenn
 * eine Voraussetzung fehlt - deren Kurztext (→ `voraussetzungKurz`). Die
 * SAA-Details (Indikation, Dosierung) liegen hinter einem eigenen Knopf und sind
 * bewusst zugeklappt: Nachschlagewissen ja, Hinweis auf diesen Patienten nein.
 */
export function Massnahmenliste({ patient, onMassnahme, standardOffen = [], arten }: Props) {
  const { state, dispatch } = useSimulation();
  const [offen, setOffen] = useState<Set<MassnahmenKategorie>>(() => new Set(standardOffen));
  const [detail, setDetail] = useState<MassnahmeId | null>(null);
  const gesperrt = patient.status === 'verstorben' || patient.status === 'transportiert';
  // Nur innerhalb einer Sitzung gilt die Qualifikationssperre überhaupt
  // (→ `domain.qualifikation`); im Einzel-/Teamspiel bleibt alles frei wählbar.
  const eigeneQualifikation = state.sitzung.aktiv
    ? (state.sitzung.spieler.find((s) => s.id === state.sitzung.eigeneId)?.qualifikation ?? 'basis')
    : null;

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

  const zeile = (massnahme: Massnahme) => {
    // Katalog-Stufe als Rückfall, falls eine Maßnahme ausnahmsweise fehlt
    // (z. B. veraltete Szenariodaten) - im Regelfall deckt
    // standardMassnahmenrechte() jede Katalog-Maßnahme ab.
    const recht: MassnahmeRecht =
      state.massnahmenrechte[massnahme.id] ??
      ({ qualifikation: massnahme.qualifikation, delegationsstufe: massnahme.qualifikation } as const);
    const bereitsDurchgefuehrt = patient.durchgefuehrteMassnahmen.includes(massnahme.id);
    const fehlt = fehlendeVoraussetzung(massnahme, patient.durchgefuehrteMassnahmen);
    const delegiert = patient.delegierteMassnahmen.includes(massnahme.id);
    const qualifikationFehlt = massnahmeGesperrtWegenQualifikation(
      recht,
      eigeneQualifikation,
      delegiert,
    );
    const zeigeDelegieren =
      state.sitzung.aktiv &&
      darfDelegieren(recht, eigeneQualifikation) &&
      recht.qualifikation !== 'basis' &&
      !delegiert &&
      !bereitsDurchgefuehrt &&
      fehlt === null;
    const detailOffen = detail === massnahme.id;
    const hatDetails = Boolean(massnahme.indikation ?? massnahme.dosierung);

    return (
      <div key={massnahme.id} className="massnahme-zeile">
        <button
          type="button"
          className={`massnahme massnahme-${massnahme.art}${
            bereitsDurchgefuehrt ? ' massnahme-erledigt' : ''
          }`}
          disabled={gesperrt || bereitsDurchgefuehrt || fehlt !== null || qualifikationFehlt}
          onClick={() => onMassnahme(massnahme.id)}
        >
          <span className="massnahme-label">
            {massnahme.label}
            {recht.qualifikation !== 'basis' && (
              <span className={`qualifikation qualifikation-${recht.qualifikation}`}>
                {QUALIFIKATION_LABEL[recht.qualifikation]}
                {delegiert && ' · delegiert'}
              </span>
            )}
          </span>
          <span className="massnahme-dauer">
            {bereitsDurchgefuehrt
              ? 'durchgeführt'
              : fehlt
                ? // Kurz halten - der Knopf darf nicht überlaufen. Welche
                  // Voraussetzung genau fehlt, steht im SAA-Detail.
                  voraussetzungKurz(fehlt)
                : qualifikationFehlt
                  ? `erfordert ${QUALIFIKATION_LABEL[recht.qualifikation]}`
                  : `${massnahme.dauerSek} s`}
          </span>
        </button>

        {zeigeDelegieren && (
          <button
            type="button"
            className="massnahme-delegieren"
            title={`${massnahme.label} für diesen Patienten freigeben`}
            onClick={() =>
              dispatch({ typ: 'massnahmeDelegieren', patientId: patient.id, massnahmeId: massnahme.id })
            }
          >
            Freigeben
          </button>
        )}

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

  return (
    <div className="massnahmen">
      {KATEGORIEN.map((kategorie) => {
        const gruppe = massnahmenDerKategorie(kategorie).filter(
          (massnahme) => !arten || arten.includes(massnahme.art),
        );
        // Reiter, in dem eine Gruppe leer bleibt (z. B. keine Medikamente in
        // der Kategorie), gar nicht erst als Kopf zeigen.
        if (gruppe.length === 0) return null;
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

            {istOffen && <div className="gruppe-inhalt">{gruppe.map(zeile)}</div>}
          </div>
        );
      })}
    </div>
  );
}
