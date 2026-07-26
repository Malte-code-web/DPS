import { istBekannt } from '../domain/diagnostik';
import { PUPILLEN_TEXT } from '../domain/types';
import { VITAL_META, VITAL_REIHENFOLGE, vitalFormat, vitalStufe } from '../lib/format';
import type { Patient } from '../domain/types';

/**
 * @anker ui.befundtafel Nur was erhoben wurde, ist zu sehen
 *
 * Die Tafel zeigt keinen Wert, den niemand gemessen hat. Ein nicht erhobener
 * Parameter steht als Strich da - sichtbar, dass er fehlt, aber ohne zu
 * verraten, ob er auffällig wäre.
 *
 * Das ist der Unterschied zum früheren Monitor, der nach einem einzigen Klick
 * alle Werte gleichzeitig anzeigte. Wer jetzt den Blutdruck wissen will, muss
 * ihn messen - und die 45 Sekunden dafür bezahlen alle anderen Patienten mit.
 */
export function Befundtafel({ patient }: { patient: Patient }) {
  const textbefunde: { label: string; wert: string; da: boolean }[] = [
    {
      label: 'Pupillen',
      wert: PUPILLEN_TEXT[patient.pupillen ?? 'unauffaellig'],
      da: istBekannt(patient, 'pupillen'),
    },
    {
      label: 'Auskultation',
      wert: patient.auskultation ?? 'seitengleich belüftet, keine Nebengeräusche',
      da: istBekannt(patient, 'auskultation'),
    },
    {
      label: 'EKG',
      wert: patient.ekg ?? 'Sinusrhythmus, keine Extrasystolen',
      da: istBekannt(patient, 'ekg'),
    },
  ];

  return (
    <div className="befundtafel">
      <div className="vitalmonitor">
        {VITAL_REIHENFOLGE.map((key) => {
          const meta = VITAL_META[key];
          const bekannt = istBekannt(patient, key);
          const stufe = bekannt ? vitalStufe(key, patient.vitalwerte[key]) : 'unbekannt';
          return (
            <div key={key} className={`vital vital-${stufe}`} title={meta.label}>
              <span className="vital-kurz">{meta.kurz}</span>
              <span className="vital-wert">
                {bekannt ? (
                  <>
                    {vitalFormat(key, patient.vitalwerte)}
                    <small>{meta.einheit}</small>
                  </>
                ) : (
                  <span className="vital-offen" aria-label="nicht erhoben">
                    –
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <dl className="textbefunde">
        {textbefunde.map((befund) => (
          <div key={befund.label} className={befund.da ? '' : 'befund-offen'}>
            <dt>{befund.label}</dt>
            <dd>{befund.da ? befund.wert : 'nicht erhoben'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
