import { useState } from 'react';
import { sichtungNachMstart } from '../domain/triage';
import { SichtungsBadge } from './SichtungsBadge';
import type { Patient } from '../domain/types';

/**
 * Lernhilfe: legt die Entscheidungskette des mSTaRT-Algorithmus offen.
 * Bewusst eingeklappt, damit zuerst selbst gesichtet wird.
 */
export function MstartAssistent({ patient }: { patient: Patient }) {
  const [sichtbar, setSichtbar] = useState(false);
  const ergebnis = sichtungNachMstart(patient);

  return (
    <section className="assistent">
      <button type="button" className="assistent-schalter" onClick={() => setSichtbar(!sichtbar)}>
        {sichtbar ? 'mSTaRT-Hilfe ausblenden' : 'mSTaRT-Hilfe einblenden'}
      </button>

      {sichtbar && (
        <div className="assistent-inhalt">
          <ol className="assistent-schritte">
            {ergebnis.schritte.map((schritt) => (
              <li key={schritt.frage} className={schritt.entscheidend ? 'schritt-entscheidend' : ''}>
                <span className="schritt-frage">{schritt.frage}</span>
                <span className="schritt-antwort">{schritt.antwort}</span>
              </li>
            ))}
          </ol>
          <div className="assistent-ergebnis">
            Algorithmus-Ergebnis: <SichtungsBadge kategorie={ergebnis.kategorie} />
          </div>
        </div>
      )}
    </section>
  );
}
