import { MASSNAHMEN } from '../domain/massnahmen';
import { radialispulsTastbar } from '../domain/triage';
import { useSimulation } from '../state/useSimulation';
import { SichtungsBadge } from './SichtungsBadge';
import { Verlegung } from './Verlegung';
import { SICHTUNGSKATEGORIEN } from '../domain/types';
import type { MassnahmeId, Patient, PatientStatus, Sichtungskategorie } from '../domain/types';

const STATUS_LABEL: Record<PatientStatus, string> = {
  unbehandelt: 'nicht gesichtet',
  gesichtet: 'gesichtet',
  in_behandlung: 'in Behandlung',
  transportiert: 'übergeben',
  verstorben: 'verstorben',
};

/** Dieselben Farbreiter wie auf der Anhängekarte. */
const AUSWAHL: Sichtungskategorie[] = ['SK1', 'SK2', 'SK3', 'SK4', 'EX'];

/** Dieselben zwei lebensrettenden Sofortmaßnahmen wie auf der Patientenseite. */
const SOFORT_IDS: MassnahmeId[] = ['tourniquet', 'guedeltubus'];

interface Props {
  patient: Patient;
  onAuswahl: (patientId: string) => void;
}

/**
 * @anker ui.patientkarte Kachel der Patientenliste - Einfärbung wie die Anhängekarte
 *
 * Dieselbe Logik wie auf der Anhängekarte (→ `ui.einfaerbung`): vorläufige
 * Sichtung färbt nur die obere Hälfte der Kachel, die endgültige Sichtung die
 * ganze Fläche. Die Farbreiter oben sind dieselben wie auf der Karte am
 * Patienten - so bleibt die Kachel schon aus der Ferne erkennbar.
 *
 * Zusätzlich direkt auf der Kachel bedienbar, ohne die Patientenseite zu
 * öffnen: die beiden lebensrettenden Sofortmaßnahmen (→ `ui.sofortmassnahmen`)
 * und die Sichtungskategorie der aktuellen Station.
 */
export function PatientKarte({ patient, onAuswahl }: Props) {
  const { dispatch } = useSimulation();
  const verstorben = patient.status === 'verstorben';
  const kategorie = verstorben ? 'EX' : patient.gesichtetAls;
  const gesperrt = verstorben || patient.status === 'transportiert';
  const klassen = [
    'patient-karte',
    verstorben ? 'patient-karte-verstorben' : '',
    verstorben ? 'rand-EX' : patient.gesichtetAls ? `rand-${patient.gesichtetAls}` : 'rand-offen',
    patient.sichtungFinal ? 'patient-karte-final' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={klassen}>
      <div
        className={`patient-karte-reiter${
          patient.sichtungFinal ? ' patient-karte-reiter-final' : ''
        }`}
        aria-hidden="true"
      >
        {AUSWAHL.map((eintrag) => (
          <span
            key={eintrag}
            className={`reiter sk-${eintrag}${kategorie === eintrag ? ' reiter-aktiv' : ''}`}
          />
        ))}
      </div>

      <button
        type="button"
        className="patient-karte-oeffnen"
        onClick={() => onAuswahl(patient.id)}
      >
        <div className="patient-kopf">
          <span className="patient-id">{patient.id}</span>
          {verstorben ? (
            <SichtungsBadge kategorie="EX" kompakt />
          ) : patient.gesichtetAls ? (
            <SichtungsBadge kategorie={patient.gesichtetAls} kompakt />
          ) : (
            <span className="sk-badge sk-offen">offen</span>
          )}
        </div>
        <div className="patient-name">
          {patient.name}, {patient.alter} J.
        </div>
        <p className="patient-kurzbefund">{patient.kurzbefund}</p>
        <div className="patient-befunde">
          <span>{patient.gehfaehig ? 'gehfähig' : 'nicht gehfähig'}</span>
          <span>{patient.spontanatmung ? 'Atmung vorhanden' : 'keine Atmung'}</span>
          <span>
            {radialispulsTastbar(patient.vitalwerte) ? 'Radialispuls tastbar' : 'kein Radialispuls'}
          </span>
        </div>
        <div className="patient-status">
          <span>{STATUS_LABEL[patient.status]}</span>
          <span className="patient-oeffnen">Öffnen &rarr;</span>
        </div>
      </button>

      <div className="patient-karte-sichtung">
        {AUSWAHL.map((eintragKategorie) => (
          <button
            key={eintragKategorie}
            type="button"
            className={`sichtungskasten sk-${eintragKategorie}${
              kategorie === eintragKategorie ? ' sichtungskasten-gewaehlt' : ''
            }`}
            disabled={verstorben || patient.sichtungFinal}
            title={SICHTUNGSKATEGORIEN[eintragKategorie].bezeichnung}
            onClick={() =>
              dispatch({
                typ: 'patientSichten',
                patientId: patient.id,
                kategorie: eintragKategorie,
                final: false,
              })
            }
          >
            {SICHTUNGSKATEGORIEN[eintragKategorie].kuerzel}
          </button>
        ))}
      </div>

      <div className="patient-karte-sofort">
        {SOFORT_IDS.map((id) => {
          const massnahme = MASSNAHMEN[id];
          const bereitsDurchgefuehrt = patient.durchgefuehrteMassnahmen.includes(id);

          return (
            <button
              key={id}
              type="button"
              className={`massnahme massnahme-${massnahme.art}${
                bereitsDurchgefuehrt ? ' massnahme-erledigt' : ''
              }`}
              disabled={gesperrt || bereitsDurchgefuehrt}
              onClick={() =>
                dispatch({ typ: 'massnahmeDurchfuehren', patientId: patient.id, massnahmeId: id })
              }
            >
              <span className="massnahme-label">{massnahme.label}</span>
              <span className="massnahme-dauer">
                {bereitsDurchgefuehrt ? 'durchgeführt' : `${massnahme.dauerSek} s`}
              </span>
            </button>
          );
        })}
      </div>

      <Verlegung patient={patient} />
    </div>
  );
}
