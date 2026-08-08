import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface Props {
  titel: string;
  /** Kurzer Stand neben dem Titel, z. B. "3 wartend". */
  marke?: string;
  onSchliessen: () => void;
  children: ReactNode;
}

/**
 * @anker ui.regiebereichsseite Regie-Bereiche als eigene Seite - dasselbe Muster wie ui.bereichsseite
 *
 * Ablaufsteuerung, Freigabe, Gebundene Kräfte, Offene Anfragen und
 * Funkkanäle (→ `ui.gesamtlagebild`) wechseln sich hier genauso wie
 * Diagnostik/Maßnahmen/Verlegung in der Patientenansicht (→ `ui.bereichsseite`) -
 * dieselbe Vollbildseite mit stehendem Kopf, nur ohne Patientenbezug.
 */
export function RegieBereichsseite({ titel, marke, onSchliessen, children }: Props) {
  useEffect(() => {
    const beiTaste = (ereignis: KeyboardEvent) => {
      if (ereignis.key !== 'Escape') return;
      ereignis.stopPropagation();
      onSchliessen();
    };
    window.addEventListener('keydown', beiTaste, true);
    return () => window.removeEventListener('keydown', beiTaste, true);
  }, [onSchliessen]);

  return (
    <div className="bereichsseite" role="dialog" aria-label={titel}>
      <header className="bereichsseite-kopf">
        <button type="button" onClick={onSchliessen}>
          &larr; Zurück
        </button>
        <div className="bereichsseite-titel">
          <h2>{titel}</h2>
          {marke && <span>{marke}</span>}
        </div>
      </header>
      <div className="bereichsseite-inhalt">{children}</div>
    </div>
  );
}
