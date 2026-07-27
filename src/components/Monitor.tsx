import { MASSNAHMEN } from '../domain/massnahmen';
import { MONITOR_VITALS, monitorAlarme, monitorAngeschlossen } from '../domain/monitor';
import { VITAL_META, vitalFormat, vitalStufe } from '../lib/format';
import type { Patient } from '../domain/types';

interface Props {
  patient: Patient;
  /** Schließt den Monitor an (führt die Maßnahme durch). */
  onAnschliessen: () => void;
}

/**
 * @anker ui.monitor Der Monitor in der Übersicht - Knopf zum Anschließen, dann live
 *
 * Das Feld steht immer in der Übersicht, damit der Monitor auffindbar ist:
 * Solange er nicht läuft, trägt es den Knopf zum Anschließen; danach zeigt es
 * seine Werte fortlaufend - ohne dass man sie erhebt. Die Werte färben sich wie
 * überall nach ihrer Stufe; ein kritischer Wert löst zugleich den Alarm aus
 * (→ `monitor.alarme`). Der Ton dazu kommt nur, wer im selben Abschnitt steht
 * (→ `ui.monitoralarm`) - dieses Feld zeigt den Alarm dagegen immer.
 */
export function Monitor({ patient, onAnschliessen }: Props) {
  const gesperrt = patient.status === 'verstorben' || patient.status === 'transportiert';

  if (!monitorAngeschlossen(patient)) {
    return (
      <section className="monitor monitor-aus" aria-label="Patientenmonitor">
        <div className="monitor-kopf">
          <span className="monitor-titel">Monitor</span>
          <span className="monitor-status monitor-status-aus">nicht angeschlossen</span>
        </div>
        <button
          type="button"
          className="monitor-anschluss"
          disabled={gesperrt}
          onClick={onAnschliessen}
        >
          <span>Monitor anschließen</span>
          <span className="monitor-anschluss-dauer">{MASSNAHMEN.monitoring.dauerSek} s</span>
        </button>
      </section>
    );
  }

  const alarme = monitorAlarme(patient);
  const imAlarm = alarme.length > 0;

  return (
    <section className={`monitor${imAlarm ? ' monitor-alarm' : ''}`} aria-label="Patientenmonitor">
      <div className="monitor-kopf">
        <span className="monitor-titel">Monitor</span>
        <span className={`monitor-status${imAlarm ? ' monitor-status-alarm' : ''}`} role="status">
          {imAlarm ? 'Alarm' : 'überwacht'}
        </span>
      </div>
      <div className="monitor-werte">
        {MONITOR_VITALS.map((key) => (
          <div
            key={key}
            className={`monitor-wert vital-${vitalStufe(key, patient.vitalwerte[key])}`}
            title={VITAL_META[key].label}
          >
            <span className="monitor-kurz">{VITAL_META[key].kurz}</span>
            <span className="monitor-zahl">
              {vitalFormat(key, patient.vitalwerte)}
              <small>{VITAL_META[key].einheit}</small>
            </span>
          </div>
        ))}
      </div>
      {imAlarm && (
        <p className="monitor-alarmtext" role="alert">
          {alarme
            .map(
              (alarm) =>
                `${VITAL_META[alarm.vital].kurz} ${alarm.richtung === 'hoch' ? 'zu hoch' : 'zu niedrig'}`,
            )
            .join(' · ')}
        </p>
      )}
    </section>
  );
}
