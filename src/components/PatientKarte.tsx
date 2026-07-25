import { radialispulsTastbar } from '../domain/triage';
import { SichtungsBadge } from './SichtungsBadge';
import type { Patient, PatientStatus } from '../domain/types';

const STATUS_LABEL: Record<PatientStatus, string> = {
  unbehandelt: 'nicht gesichtet',
  gesichtet: 'gesichtet',
  in_behandlung: 'in Behandlung',
  transportiert: 'übergeben',
  verstorben: 'verstorben',
};

interface Props {
  patient: Patient;
  onAuswahl: (patientId: string) => void;
}

export function PatientKarte({ patient, onAuswahl }: Props) {
  const verstorben = patient.status === 'verstorben';
  const klassen = [
    'patient-karte',
    verstorben ? 'patient-karte-verstorben' : '',
    verstorben ? 'rand-EX' : patient.gesichtetAls ? `rand-${patient.gesichtetAls}` : 'rand-offen',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={klassen} onClick={() => onAuswahl(patient.id)}>
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
  );
}
