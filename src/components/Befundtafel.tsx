import { DIAGNOSTIK, DIAGNOSTIK_FUER, istBekannt } from '../domain/diagnostik';
import { PUPILLEN_TEXT } from '../domain/types';
import { VITAL_META, VITAL_REIHENFOLGE, vitalFormat, vitalStufe } from '../lib/format';
import { istDiagnostikAktion } from '../state/zeitkosten';
import { useZeitkostenStatus, zeitkostenHintergrund } from '../state/useZeitkostenStatus';
import type { Befundschluessel, DiagnostikId, Patient } from '../domain/types';

interface Props {
  patient: Patient;
  /** Fehlt der Handler, ist die Tafel reine Anzeige (Übergabe, Abtransport). */
  onDiagnostik?: (diagnostikId: DiagnostikId) => void;
}

/**
 * @anker ui.befundtafel Nur was erhoben wurde, ist zu sehen - und ein Tipp erhebt es
 *
 * Die Tafel zeigt keinen Wert, den niemand gemessen hat. Ein nicht erhobener
 * Parameter steht als Strich da - sichtbar, dass er fehlt, aber ohne zu
 * verraten, ob er auffällig wäre.
 *
 * Sie ist zugleich die Bedienfläche für die Diagnostik: Ein Tippen auf das
 * leere Feld startet die Untersuchung, die diesen Wert liefert, und zeigt
 * vorher deren Preis in Sekunden. Damit braucht es keine getrennte
 * Diagnostikliste mehr - der Weg vom "das weiß ich nicht" zum "dann messe ich
 * es" ist ein Klick an genau der Stelle, an der die Frage entsteht.
 */
export function Befundtafel({ patient, onDiagnostik }: Props) {
  const gesperrt = patient.status === 'verstorben' || patient.status === 'transportiert';
  const zk = useZeitkostenStatus();
  const zkBeschaeftigt = zk.aktion !== null;

  /** Ein Feld der Tafel: entweder Wert oder Knopf mit Preis. */
  function feld(
    schluessel: Befundschluessel,
    inhalt: React.ReactNode,
    zusatz: { klasse?: string; kuerzel: string; titel: string },
  ) {
    const bekannt = istBekannt(patient, schluessel);
    const diagnostik = DIAGNOSTIK[DIAGNOSTIK_FUER[schluessel]];
    const zkEigen = zk.aktion !== null && istDiagnostikAktion(zk.aktion, patient.id, diagnostik.id);

    if (bekannt) {
      return (
        <div className={`vital ${zusatz.klasse ?? ''}`} title={zusatz.titel}>
          <span className="vital-kurz">{zusatz.kuerzel}</span>
          <span className="vital-wert">{inhalt}</span>
        </div>
      );
    }

    return (
      <button
        type="button"
        className="vital vital-unbekannt"
        style={zkEigen ? zeitkostenHintergrund(zk.anteil) : undefined}
        disabled={gesperrt || !onDiagnostik || (zkBeschaeftigt && !zkEigen)}
        aria-busy={zkEigen || undefined}
        title={`${diagnostik.label} · ${diagnostik.dauerSek} s`}
        onClick={() => onDiagnostik?.(diagnostik.id)}
      >
        <span className="vital-kurz">{zusatz.kuerzel}</span>
        <span className="vital-wert">
          <span className="vital-offen" aria-hidden="true">
            –
          </span>
          {onDiagnostik && (
            <small className="vital-preis">
              {zkEigen ? `noch ${zk.restSek} s` : `${diagnostik.dauerSek} s`}
            </small>
          )}
        </span>
      </button>
    );
  }

  const textbefunde: { schluessel: Befundschluessel; label: string; wert: string }[] = [
    {
      schluessel: 'pupillen',
      label: 'Pupillen',
      wert: PUPILLEN_TEXT[patient.pupillen ?? 'unauffaellig'],
    },
    {
      schluessel: 'auskultation',
      label: 'Auskultation',
      wert: patient.auskultation ?? 'seitengleich belüftet, keine Nebengeräusche',
    },
    {
      schluessel: 'ekg',
      label: 'EKG',
      wert: patient.ekg ?? 'Sinusrhythmus, keine Extrasystolen',
    },
  ];

  return (
    <div className="befundtafel">
      <div className="vitalmonitor">
        {VITAL_REIHENFOLGE.map((key) => {
          const meta = VITAL_META[key];
          return (
            <span key={key} className="vital-zelle">
              {feld(
                key,
                <>
                  {vitalFormat(key, patient.vitalwerte)}
                  <small>{meta.einheit}</small>
                </>,
                {
                  kuerzel: meta.kurz,
                  titel: meta.label,
                  klasse: `vital-${vitalStufe(key, patient.vitalwerte[key])}`,
                },
              )}
            </span>
          );
        })}
      </div>

      <dl className="textbefunde">
        {textbefunde.map((befund) => {
          const bekannt = istBekannt(patient, befund.schluessel);
          const diagnostik = DIAGNOSTIK[DIAGNOSTIK_FUER[befund.schluessel]];
          const zkEigen =
            zk.aktion !== null && istDiagnostikAktion(zk.aktion, patient.id, diagnostik.id);
          return (
            <div key={befund.label} className={bekannt ? '' : 'befund-offen'}>
              <dt>{befund.label}</dt>
              <dd>
                {bekannt ? (
                  befund.wert
                ) : (
                  <button
                    type="button"
                    className="befund-erheben"
                    style={zkEigen ? zeitkostenHintergrund(zk.anteil) : undefined}
                    disabled={gesperrt || !onDiagnostik || (zkBeschaeftigt && !zkEigen)}
                    aria-busy={zkEigen || undefined}
                    onClick={() => onDiagnostik?.(diagnostik.id)}
                  >
                    {zkEigen
                      ? `noch ${zk.restSek} s`
                      : onDiagnostik
                        ? `${diagnostik.label} · ${diagnostik.dauerSek} s`
                        : 'nicht erhoben'}
                  </button>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
