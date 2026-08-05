import {
  MASSNAHMEN,
  QUALIFIKATION_LABEL,
  fehlendeVoraussetzung,
  voraussetzungKurz,
} from '../domain/massnahmen';
import { monitorPrioritaet } from '../domain/monitor';
import { massnahmeGesperrtWegenQualifikation } from '../domain/qualifikation';
import { radialispulsTastbar } from '../domain/triage';
import { useDelegationsAnfrage } from '../state/useDelegationsAnfrage';
import { useSimulation } from '../state/useSimulation';
import { DelegationAnfrageAuswahl } from './DelegationAnfrageAuswahl';
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

/**
 * Die beiden voraussetzungsfreien Sofortgriffe der Schadensstelle: kritische
 * Blutung stillen und den Mundraum einsehen. Der eigentliche Atemwegstubus
 * wirkt erst nach der Mundraumkontrolle (→ `sim.effektnurbeiproblem`) und
 * bleibt deshalb der Patientenseite vorbehalten.
 */
const SOFORT_IDS: MassnahmeId[] = ['tourniquet', 'mundraumkontrolle'];

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
 * öffnen: die beiden voraussetzungsfreien Sofortgriffe und die
 * Sichtungskategorie der aktuellen Station.
 */
export function PatientKarte({ patient, onAuswahl }: Props) {
  const { state, dispatch } = useSimulation();
  const { offenFuer, setOffenFuer, istDelegiert, kandidatenFuer, anfragen } = useDelegationsAnfrage();
  const eigeneQualifikation = state.sitzung.aktiv
    ? (state.sitzung.spieler.find((s) => s.id === state.sitzung.eigeneId)?.qualifikation ?? 'basis')
    : null;
  const verstorben = patient.status === 'verstorben';
  const kategorie = verstorben ? 'EX' : patient.gesichtetAls;
  const gesperrt = verstorben || patient.status === 'transportiert';
  const alarmStufe = monitorPrioritaet(patient);
  const klassen = [
    'patient-karte',
    verstorben ? 'patient-karte-verstorben' : '',
    verstorben ? 'rand-EX' : patient.gesichtetAls ? `rand-${patient.gesichtetAls}` : 'rand-offen',
    patient.sichtungFinal ? 'patient-karte-final' : '',
    alarmStufe ? `patient-karte-alarm patient-karte-alarm-${alarmStufe}` : '',
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

      <button type="button" className="patient-karte-oeffnen" onClick={() => onAuswahl(patient.id)}>
        <div className="patient-kopf">
          <span className="patient-id">{patient.id}</span>
          {alarmStufe && (
            <span
              className={`monitor-alarm-marke monitor-alarm-marke-${alarmStufe}`}
              title="Monitoralarm"
            >
              ▲ {alarmStufe === 'hoch' ? 'Alarm' : 'Warnung'}
            </span>
          )}
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
          const recht = state.massnahmenrechte[id] ??
            ({ qualifikation: massnahme.qualifikation, delegationsziel: 'basis' } as const);
          const bereitsDurchgefuehrt = patient.durchgefuehrteMassnahmen.includes(id);
          const fehlt = fehlendeVoraussetzung(massnahme, patient.durchgefuehrteMassnahmen);
          const delegiert = istDelegiert(patient.delegierteMassnahmen, id);
          const qualifikationFehlt = massnahmeGesperrtWegenQualifikation(
            recht,
            eigeneQualifikation,
            delegiert,
          );
          const kannAnfragen =
            state.sitzung.aktiv &&
            qualifikationFehlt &&
            recht.delegationsziel !== null &&
            !bereitsDurchgefuehrt &&
            fehlt === null;
          const anfrageOffen = offenFuer === id;

          return (
            <div key={id} className="patient-karte-sofort-eintrag">
              <button
                type="button"
                className={`massnahme massnahme-${massnahme.art}${
                  bereitsDurchgefuehrt ? ' massnahme-erledigt' : ''
                }`}
                disabled={
                  gesperrt || bereitsDurchgefuehrt || fehlt !== null || (qualifikationFehlt && !kannAnfragen)
                }
                aria-expanded={kannAnfragen ? anfrageOffen : undefined}
                onClick={() => {
                  if (kannAnfragen) {
                    setOffenFuer(anfrageOffen ? null : id);
                    return;
                  }
                  dispatch({ typ: 'massnahmeDurchfuehren', patientId: patient.id, massnahmeId: id });
                }}
              >
                <span className="massnahme-label">{massnahme.label}</span>
                <span className="massnahme-dauer">
                  {bereitsDurchgefuehrt
                    ? 'durchgeführt'
                    : fehlt
                      ? voraussetzungKurz(fehlt)
                      : kannAnfragen
                        ? 'Freigabe anfragen'
                        : qualifikationFehlt
                          ? `erfordert ${QUALIFIKATION_LABEL[recht.qualifikation]}`
                          : `${massnahme.dauerSek} s`}
                </span>
              </button>

              {anfrageOffen && (
                <DelegationAnfrageAuswahl
                  massnahmeLabel={massnahme.label}
                  kandidaten={kandidatenFuer(recht)}
                  onAnfragen={(angefragteId) => anfragen(patient, id, angefragteId)}
                  onAbbrechen={() => setOffenFuer(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      <Verlegung patient={patient} />
    </div>
  );
}
