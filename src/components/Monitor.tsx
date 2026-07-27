import { MONITOR_VITALS, monitorAlarme } from '../domain/monitor';
import { VITAL_META, vitalFormat, vitalStufe } from '../lib/format';
import type { Patient } from '../domain/types';

/**
 * @anker ui.monitor Der angeschlossene Monitor in der Übersicht
 *
 * Solange der Monitor läuft, stehen seine Werte fortlaufend in der Übersicht -
 * ohne dass man sie erhebt. Die Werte färben sich wie überall nach ihrer Stufe;
 * ein kritischer Wert löst zugleich den Alarm aus (→ `monitor.alarme`). Der Ton
 * dazu kommt nur, wer im selben Abschnitt steht (→ `ui.monitoralarm`) - dieses
 * Feld zeigt den Alarm dagegen immer, auch aus der Ferne.
 */
export function Monitor({ patient }: { patient: Patient }) {
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
