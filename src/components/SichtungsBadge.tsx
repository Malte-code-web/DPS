import { SICHTUNGSKATEGORIEN } from '../domain/types';
import type { Sichtungskategorie } from '../domain/types';

interface Props {
  kategorie: Sichtungskategorie;
  /** Nur das Kürzel anzeigen (für enge Layouts). */
  kompakt?: boolean;
}

export function SichtungsBadge({ kategorie, kompakt = false }: Props) {
  const info = SICHTUNGSKATEGORIEN[kategorie];
  const text =
    kategorie === 'EX' ? 'Verstorben' : kompakt ? `SK ${info.kuerzel}` : `SK ${info.kuerzel} - ${info.bezeichnung}`;

  return (
    <span className={`sk-badge sk-${kategorie}`} title={`${info.bezeichnung} - ${info.behandlung}`}>
      {kompakt && kategorie === 'EX' ? 'EX' : text}
    </span>
  );
}
