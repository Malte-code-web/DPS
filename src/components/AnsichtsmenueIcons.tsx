interface Props {
  ansicht: 'kacheln' | 'karte' | 'freigabe' | 'gebunden' | 'anfragen' | 'funk' | 'ereignisse';
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
 * @anker ui.regiemenueicons Icons für das Regie-Ansichts-Menü
 *
 * Schlichte, einfarbige Strich-Icons (kein Icon-Set eingebunden) - bleiben
 * auch im eingeklappten Menü (→ `ui.gesamtlagebild`) sichtbar und
 * unterscheidbar, wenn die Beschriftung wegfällt.
 */
export function RegieMenueIcon({ ansicht }: Props) {
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
    default:
      return null;
  }
}
