import { geoPunktName } from '../domain/geodaten';
import { useSimulation } from '../state/useSimulation';
import type { Einsatzabschnitt, GeoPosition } from '../domain/types';

const MARKER_FARBE: Partial<Record<Einsatzabschnitt, string>> = {
  schadensstelle: 'var(--sk1)',
  ablage: 'var(--warn)',
  bereitstellungsraum: 'var(--akzent)',
  eingangssichtung: 'var(--text-leise)',
  zelt_rot: 'var(--sk1)',
  zelt_gelb: 'var(--sk2)',
  zelt_gruen: 'var(--sk3)',
  ausgangssichtung: 'var(--text-leise)',
  transport: 'var(--ok)',
};

/** Nur die Wege, deren Distanz eine eigene Führungsentscheidung ist - nicht jeder Schritt zwischen zwei Nachbarzelten. */
const SIDEBAR_MINDESTABSTAND_M = 60;

interface Punkt {
  abschnitt: Einsatzabschnitt;
  position: GeoPosition;
  xProzent: number;
  yProzent: number;
}

/**
 * @anker ui.kartenansicht Schematische Kartenansicht als zweite Sicht auf dieselbe Lage
 *
 * Keine echten Kartenkacheln - eine schematische Darstellung aus den
 * Szenario-Koordinaten (→ `domain.geodaten`), normalisiert auf die
 * verfügbare Fläche. Zeigt dieselben Zahlen wie die Kacheln-Ansicht
 * (→ `ui.abschnitteuebersicht`), nur räumlich statt tabellarisch - die
 * eigentliche Führungsleistung ist hier die Entfernung: wo baut man den
 * Behandlungsplatz auf, wie weit ist der Bereitstellungsraum, welche
 * Zufahrt ist blockiert.
 */
export function Kartenansicht() {
  const { state } = useSimulation();
  const schluesselpunkte = state.szenario?.geodaten?.schluesselpunkte;

  if (!schluesselpunkte || Object.keys(schluesselpunkte).length === 0) {
    return <p className="hinweis">Für dieses Szenario sind keine Geodaten hinterlegt.</p>;
  }

  const eintraege = Object.entries(schluesselpunkte) as [Einsatzabschnitt, GeoPosition][];
  const lats = eintraege.map(([, position]) => position.lat);
  const lons = eintraege.map(([, position]) => position.lon);
  const latSpanne = Math.max(...lats) - Math.min(...lats) || 1;
  const lonSpanne = Math.max(...lons) - Math.min(...lons) || 1;
  // Ein wenig Rand, damit kein Marker direkt am Kartenrand klebt.
  const RAND_PROZENT = 12;
  const spanne = 100 - 2 * RAND_PROZENT;

  const punkte: Punkt[] = eintraege.map(([abschnitt, position]) => ({
    abschnitt,
    position,
    xProzent: RAND_PROZENT + ((position.lon - Math.min(...lons)) / lonSpanne) * spanne,
    // Höherer Breitengrad = weiter nördlich = weiter oben auf der Karte.
    yProzent: RAND_PROZENT + (1 - (position.lat - Math.min(...lats)) / latSpanne) * spanne,
  }));
  const punktVon = (abschnitt: Einsatzabschnitt) => punkte.find((punkt) => punkt.abschnitt === abschnitt);

  const anzeigeRouten = state.routen.filter(
    (route) =>
      route.distanzMeter >= SIDEBAR_MINDESTABSTAND_M && punktVon(route.von) && punktVon(route.nach),
  );

  return (
    <div className="karten-rahmen">
      <svg className="routen-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        {state.routen.map((route) => {
          const von = punktVon(route.von);
          const nach = punktVon(route.nach);
          if (!von || !nach) return null;
          const gesperrt = route.status === 'gesperrt';
          return (
            <line
              key={route.id}
              x1={von.xProzent}
              y1={von.yProzent}
              x2={nach.xProzent}
              y2={nach.yProzent}
              className={gesperrt ? 'route-linie route-linie-gesperrt' : 'route-linie'}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {state.routen.map((route) => {
        const von = punktVon(route.von);
        const nach = punktVon(route.nach);
        if (!von || !nach || route.distanzMeter < SIDEBAR_MINDESTABSTAND_M) return null;
        return (
          <span
            key={route.id}
            className="distanz-label"
            style={{ left: `${(von.xProzent + nach.xProzent) / 2}%`, top: `${(von.yProzent + nach.yProzent) / 2}%` }}
          >
            {route.status === 'gesperrt' ? 'gesperrt' : `≈ ${Math.round(route.distanzMeter)} m`}
          </span>
        );
      })}

      {punkte.map((punkt) => {
        const patientenAnzahl = state.patienten.filter((p) => p.abschnitt === punkt.abschnitt).length;
        const fahrzeugAnzahl = state.fahrzeuge.filter((f) => f.abschnitt === punkt.abschnitt).length;
        return (
          <div
            key={punkt.abschnitt}
            className="marker"
            style={{ left: `${punkt.xProzent}%`, top: `${punkt.yProzent}%` }}
          >
            <span className="marker-pin" style={{ background: MARKER_FARBE[punkt.abschnitt] }} />
            <span className="marker-etikett">
              <b>{geoPunktName(punkt.abschnitt)}</b>
              <span>
                {patientenAnzahl > 0 && `${patientenAnzahl} Pat.`}
                {patientenAnzahl > 0 && fahrzeugAnzahl > 0 && ' · '}
                {fahrzeugAnzahl > 0 && `${fahrzeugAnzahl} Fzg.`}
                {patientenAnzahl === 0 && fahrzeugAnzahl === 0 && 'unbesetzt'}
              </span>
            </span>
          </div>
        );
      })}

      <div className="legende">
        <div className="legende-zeile">
          <span className="legende-punkt" style={{ background: 'var(--sk1)' }} />
          Gefahrenstelle
        </div>
        <div className="legende-zeile">
          <span className="legende-punkt" style={{ background: 'var(--warn)' }} />
          Ablage
        </div>
        <div className="legende-zeile">
          <span className="legende-punkt" style={{ background: 'var(--akzent)' }} />
          Bereitstellungsraum
        </div>
        {anzeigeRouten.some((route) => route.status === 'gesperrt') && (
          <div className="legende-zeile">
            <span className="legende-linie legende-linie-gesperrt" />
            Zufahrt gesperrt (Zeitaufschlag, keine Blockade)
          </div>
        )}
      </div>
    </div>
  );
}
