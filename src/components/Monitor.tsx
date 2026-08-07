import { MASSNAHMEN } from '../domain/massnahmen';
import {
  MONITOR_VITALS,
  monitorAlarme,
  monitorAngeschlossen,
  monitorPrioritaet,
} from '../domain/monitor';
import { VITAL_META, vitalFormat, vitalStufe } from '../lib/format';
import { istMassnahmeAktion } from '../state/zeitkosten';
import { useZeitkostenStatus, zeitkostenHintergrund } from '../state/useZeitkostenStatus';
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
  // Solange eine eingeklemmte Person noch nicht gerettet ist, sind nur
  // Kommunikation/Diagnostik möglich, kein Monitor anschließen
  // (→ `modell.eingeklemmtstatus`).
  const gesperrt =
    patient.status === 'verstorben' ||
    patient.status === 'transportiert' ||
    Boolean(patient.eingeklemmt && !patient.eingeklemmt.gerettet);
  const zk = useZeitkostenStatus();
  const zkBeschaeftigt = zk.aktion !== null;

  if (!monitorAngeschlossen(patient)) {
    const zkEigen = zk.aktion !== null && istMassnahmeAktion(zk.aktion, patient.id, 'monitoring');
    return (
      <section className="monitor monitor-aus" aria-label="Patientenmonitor">
        <div className="monitor-kopf">
          <span className="monitor-titel">Monitor</span>
          <span className="monitor-status monitor-status-aus">nicht angeschlossen</span>
        </div>
        <button
          type="button"
          className="monitor-anschluss"
          style={zkEigen ? zeitkostenHintergrund(zk.anteil) : undefined}
          disabled={gesperrt || (zkBeschaeftigt && !zkEigen)}
          aria-busy={zkEigen || undefined}
          onClick={onAnschliessen}
        >
          <span>Monitor anschließen</span>
          <span className="monitor-anschluss-dauer">
            {zkEigen ? `noch ${zk.restSek} s` : `${MASSNAHMEN.monitoring.dauerSek} s`}
          </span>
        </button>
      </section>
    );
  }

  const alarme = monitorAlarme(patient);
  const prioritaet = monitorPrioritaet(patient);
  const imAlarm = prioritaet !== null;

  return (
    <section
      className={`monitor${prioritaet ? ` monitor-alarm monitor-alarm-${prioritaet}` : ''}`}
      aria-label="Patientenmonitor"
    >
      <div className="monitor-kopf">
        <span className="monitor-titel">Monitor</span>
        <span
          className={`monitor-status${prioritaet ? ` monitor-status-alarm monitor-status-${prioritaet}` : ''}`}
          role="status"
        >
          {prioritaet === 'hoch' ? 'Alarm' : prioritaet === 'mittel' ? 'Warnung' : 'überwacht'}
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
