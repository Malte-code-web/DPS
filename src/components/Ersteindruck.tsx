import { radialispulsTastbar } from '../domain/triage';
import type { Patient } from '../domain/types';

interface Befund {
  frage: string;
  antwort: string;
  auffaellig: boolean;
}

/**
 * @anker ui.ersteindruck Die fünf Befunde der Vorsichtung, ohne Messwerte
 *
 * Was eine Einsatzkraft in den ersten Sekunden ohne Gerät feststellt.
 * Genau diese vier Befunde braucht der tacSTART-Algorithmus - Messwerte
 * gehören ausdrücklich nicht dazu.
 */
export function Ersteindruck({ patient }: { patient: Patient }) {
  const befunde: Befund[] = [
    {
      frage: 'Gehfähig?',
      antwort: patient.gehfaehig ? 'geht selbstständig' : 'liegt, geht nicht',
      auffaellig: !patient.gehfaehig,
    },
    {
      frage: 'Kritische Blutung?',
      antwort: patient.kritischeBlutung ? 'ja, bedrohlich' : 'keine sichtbar',
      auffaellig: patient.kritischeBlutung,
    },
    {
      frage: 'Atmung?',
      antwort: patient.spontanatmung ? 'Spontanatmung vorhanden' : 'keine Spontanatmung',
      auffaellig: !patient.spontanatmung,
    },
    {
      frage: 'Radialispuls?',
      antwort: radialispulsTastbar(patient.vitalwerte) ? 'tastbar' : 'nicht tastbar',
      auffaellig: !radialispulsTastbar(patient.vitalwerte),
    },
    {
      frage: 'Reagiert?',
      antwort: patient.befolgtAufforderungen
        ? 'befolgt Aufforderungen'
        : 'befolgt keine Aufforderungen',
      auffaellig: !patient.befolgtAufforderungen,
    },
  ];

  return (
    <div className="ersteindruck">
      {befunde.map((befund) => (
        <div
          key={befund.frage}
          className={`befund${befund.auffaellig ? ' befund-auffaellig' : ''}`}
        >
          <span className="befund-frage">{befund.frage}</span>
          <span className="befund-antwort">{befund.antwort}</span>
        </div>
      ))}
    </div>
  );
}
