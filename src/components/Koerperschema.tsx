import { istBekannt } from '../domain/diagnostik';
import { KOERPERREGION_TEXT } from '../domain/types';
import type { Koerperregion, Patient } from '../domain/types';

/**
 * @anker ui.koerperschema Wo am Patienten etwas ist - Vorder- und Rückansicht
 *
 * Das Schema der Anhängekarte, aber nicht als Zierde: Nach dem Bodycheck
 * markiert es die Körperregion jedes gefundenen Problems. Offene Probleme
 * pulsieren rot, versorgte stehen grün und gefüllt da.
 *
 * Ohne Bodycheck bleibt es leer - wo etwas ist, weiß man eben erst, wenn man
 * nachgesehen hat.
 *
 * Seitenangaben gelten für den Patienten: Auf der Vorderansicht liegt sein
 * rechter Arm links im Bild, weil man ihm gegenübersteht.
 */

/** Ankerpunkte im Koordinatensystem der beiden Figuren. */
const PUNKTE: Record<Koerperregion, { x: number; y: number }> = {
  kopf: { x: 25, y: 11 },
  hals: { x: 25, y: 22 },
  thorax: { x: 25, y: 34 },
  abdomen: { x: 25, y: 48 },
  becken: { x: 25, y: 59 },
  // Vorderansicht: Patient steht uns gegenüber, seine Rechte ist unsere Linke.
  arm_rechts: { x: 10, y: 45 },
  arm_links: { x: 40, y: 45 },
  bein_rechts: { x: 19, y: 85 },
  bein_links: { x: 31, y: 85 },
  // Auf der Rückansicht (zweite Figur, um 55 versetzt).
  ruecken: { x: 80, y: 40 },
};

function Figur({ versatz }: { versatz: number }) {
  return (
    <g transform={`translate(${versatz} 0)`}>
      <circle cx="25" cy="11" r="8" />
      <path d="M25 19 v5" />
      <path d="M15 24 h20 v34 h-20 z" />
      <path d="M15 26 L8 52 M35 26 L42 52" />
      <path d="M20 58 L18 104 M30 58 L32 104" />
      <path d="M15 104 h6 M29 104 h6" />
    </g>
  );
}

export function Koerperschema({ patient }: { patient: Patient }) {
  const bekannt = istBekannt(patient, 'koerper');

  const markierungen = bekannt
    ? patient.probleme
        .filter((problem) => problem.koerperregion)
        .map((problem) => ({
          id: problem.id,
          label: problem.label,
          region: problem.koerperregion!,
          versorgt: patient.behandelteProbleme.includes(problem.id),
        }))
    : [];

  return (
    <figure className="koerperschema-rahmen">
      <svg
        className="koerperschema"
        viewBox="0 0 110 112"
        role="img"
        aria-label={
          bekannt
            ? `Körperschema: ${markierungen.map((m) => `${m.label} am ${KOERPERREGION_TEXT[m.region]}`).join(', ') || 'keine Auffälligkeit markiert'}`
            : 'Körperschema, noch kein Bodycheck durchgeführt'
        }
      >
        <g className="koerper-umriss">
          <Figur versatz={0} />
          <Figur versatz={55} />
        </g>

        {markierungen.map((markierung) => {
          const punkt = PUNKTE[markierung.region];
          return (
            <g
              key={markierung.id}
              className={`koerper-marke${markierung.versorgt ? ' koerper-marke-versorgt' : ''}`}
            >
              <circle cx={punkt.x} cy={punkt.y} r="6" />
              <title>
                {markierung.label} · {KOERPERREGION_TEXT[markierung.region]}
                {markierung.versorgt ? ' · versorgt' : ''}
              </title>
            </g>
          );
        })}
      </svg>
      <figcaption>{bekannt ? 'vorn · hinten' : 'Bodycheck offen'}</figcaption>
    </figure>
  );
}
