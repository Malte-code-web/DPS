import { MASSNAHMEN } from '../domain/massnahmen';
import { SICHTUNGSSTELLE_LABEL } from '../domain/abschnitte';
import { zeitFormat } from '../lib/format';
import type { Patient } from '../domain/types';

/**
 * Was am Patienten bisher geschehen ist: vergebene Sichtungskategorien und
 * durchgeführte Maßnahmen. Grundlage jeder Übergabe.
 */
export function Massnahmenuebersicht({ patient }: { patient: Patient }) {
  const massnahmen = patient.durchgefuehrteMassnahmen.map((id) => MASSNAHMEN[id]);

  return (
    <div className="uebersicht">
      <div className="uebersicht-block">
        <h4>Sichtungen</h4>
        {patient.sichtungsverlauf.length === 0 ? (
          <p className="hinweis">Noch nicht gesichtet.</p>
        ) : (
          <ul className="uebersicht-liste">
            {patient.sichtungsverlauf.map((eintrag, index) => (
              <li key={`${eintrag.stelle}-${index}`}>
                <span>{SICHTUNGSSTELLE_LABEL[eintrag.stelle]}</span>
                <span className={`sk-badge sk-${eintrag.kategorie}`}>{eintrag.kategorie}</span>
                <time>{zeitFormat(eintrag.zeitSek)}</time>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="uebersicht-block">
        <h4>Durchgeführte Maßnahmen</h4>
        {massnahmen.length === 0 ? (
          <p className="hinweis">Keine Maßnahmen durchgeführt.</p>
        ) : (
          <ul className="uebersicht-liste">
            {massnahmen.map((massnahme, index) => (
              <li key={`${massnahme.id}-${index}`}>
                <span className="uebersicht-kuerzel">{massnahme.kategorie}</span>
                <span>{massnahme.label}</span>
                <time>{massnahme.dauerSek} s</time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
