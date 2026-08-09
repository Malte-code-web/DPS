interface Props {
  ansicht:
    | 'kacheln'
    | 'karte'
    | 'gruppen'
    | 'freigabe'
    | 'gebunden'
    | 'anfragen'
    | 'funk'
    | 'ereignisse'
    | 'fahrzeuge'
    | 'kraefte'
    | 'kennzahlen';
}

const GEMEINSAME_ATTRIBUTE = {
  viewBox: '0 0 20 20',
  width: 20,
  height: 20,
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/**
 * @anker ui.ansichtsmenueicons Icons für die Seitenleisten-Ansichtsmenüs
 *
 * Schlichte, einfarbige Strich-Icons (kein Icon-Set eingebunden) - bleiben
 * auch im eingeklappten Menü (→ `ui.gesamtlagebild`, `ui.zugfuehrerseite`)
 * sichtbar und unterscheidbar, wenn die Beschriftung wegfällt. Von beiden
 * Seitenleisten-Ansichtsmenüs geteilt statt je eigenem Icon-Satz.
 */
export function AnsichtsmenueIcon({ ansicht }: Props) {
  switch (ansicht) {
    case 'kacheln':
      return (
        <svg {...GEMEINSAME_ATTRIBUTE}>
          <rect x="3" y="3" width="6" height="6" rx="1" />
          <rect x="11" y="3" width="6" height="6" rx="1" />
          <rect x="3" y="11" width="6" height="6" rx="1" />
          <rect x="11" y="11" width="6" height="6" rx="1" />
        </svg>
      );
    case 'karte':
      return (
        <svg {...GEMEINSAME_ATTRIBUTE}>
          <path d="M10 2.5c-3.2 0-5.8 2.5-5.8 5.8 0 4.3 5.8 9.2 5.8 9.2s5.8-4.9 5.8-9.2c0-3.3-2.6-5.8-5.8-5.8z" />
          <circle cx="10" cy="8.3" r="2" />
        </svg>
      );
    case 'gruppen':
      return (
        <svg {...GEMEINSAME_ATTRIBUTE}>
          <circle cx="10" cy="5" r="2.2" />
          <circle cx="4.5" cy="15.5" r="1.8" />
          <circle cx="15.5" cy="15.5" r="1.8" />
          <path d="M10 7.2v2.3M10 9.5l-4.6 4.4M10 9.5l4.6 4.4" />
        </svg>
      );
    case 'freigabe':
      return (
        <svg {...GEMEINSAME_ATTRIBUTE}>
          <circle cx="10" cy="10" r="7.3" />
          <path d="M6.5 10.2l2.4 2.4 4.6-5.2" />
        </svg>
      );
    case 'gebunden':
      return (
        <svg {...GEMEINSAME_ATTRIBUTE}>
          <rect x="2.3" y="7" width="8.4" height="6" rx="3" />
          <rect x="9.3" y="7" width="8.4" height="6" rx="3" />
        </svg>
      );
    case 'anfragen':
      return (
        <svg {...GEMEINSAME_ATTRIBUTE}>
          <path d="M3 5h14a1 1 0 011 1v7.4a1 1 0 01-1 1H9l-3.6 3v-3H3a1 1 0 01-1-1V6a1 1 0 011-1z" />
        </svg>
      );
    case 'funk':
      return (
        <svg {...GEMEINSAME_ATTRIBUTE}>
          <circle cx="10" cy="15.2" r="1.3" fill="currentColor" stroke="none" />
          <path d="M6.6 12.6a4.8 4.8 0 016.8 0" />
          <path d="M4 9.8a8.5 8.5 0 0112 0" />
        </svg>
      );
    case 'ereignisse':
      return (
        <svg {...GEMEINSAME_ATTRIBUTE}>
          <path d="M10 3.2 17.5 16.3H2.5L10 3.2z" />
          <line x1="10" y1="8" x2="10" y2="11.5" />
          <circle cx="10" cy="14" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'fahrzeuge':
      return (
        <svg {...GEMEINSAME_ATTRIBUTE}>
          <path d="M2.5 14V10.5a1 1 0 011-1h9.4l2.3 2.1a1 1 0 01.3.7V14" />
          <path d="M2.5 14h12.5" />
          <circle cx="6" cy="15.3" r="1.6" />
          <circle cx="13.2" cy="15.3" r="1.6" />
        </svg>
      );
    case 'kraefte':
      return (
        <svg {...GEMEINSAME_ATTRIBUTE}>
          <circle cx="10" cy="6.5" r="3.2" />
          <path d="M4 17c0-3.6 2.7-6 6-6s6 2.4 6 6" />
        </svg>
      );
    case 'kennzahlen':
      return (
        <svg {...GEMEINSAME_ATTRIBUTE}>
          <rect x="3.3" y="11" width="3" height="6" rx="0.6" fill="currentColor" stroke="none" />
          <rect x="8.5" y="6.5" width="3" height="10.5" rx="0.6" fill="currentColor" stroke="none" />
          <rect x="13.7" y="3" width="3" height="14" rx="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}
