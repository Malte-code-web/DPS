import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polyline, Popup, Rectangle, TileLayer, Tooltip, useMap, useMapEvent } from 'react-leaflet';
import { erzeugeTaktischesZeichen } from 'taktische-zeichen-core';
import { erzeugeId } from '../domain/sitzung';
import { geoPunktName, geoZuLokalM, lokalMZuGeo } from '../domain/geodaten';
import { gruppenfuehrerListe as gruppenfuehrerListeVon } from '../domain/fuehrung';
import {
  FAHRZEUG_FLAECHENBEDARF_QM,
  STANDARD_BAUFELD,
  groesseVon,
  platzierungGueltig,
  verfuegbareFlaecheQm,
} from '../domain/flaechen';
import { ZEICHEN_JE_ABSCHNITT } from '../domain/taktischeZeichen';
import { useSimulation } from '../state/useSimulation';
import { useZeitkostenStatus, zeitkostenHintergrund } from '../state/useZeitkostenStatus';
import { ZeltTypAuswahl } from './ZeltTypAuswahl';
import type { Einsatzabschnitt, FlaechenAbschnitt, FlaechenTypId, GeoPosition, ZeltTypId } from '../domain/types';

const FLAECHEN_ABSCHNITTE: FlaechenAbschnitt[] = [
  'zelt_rot',
  'zelt_gelb',
  'zelt_gruen',
  'ablage',
  'bereitstellungsraum',
  'eingangssichtung',
  'ausgangssichtung',
  'transport',
];
const FLAECHEN_ABSCHNITT_SET = new Set<Einsatzabschnitt>(FLAECHEN_ABSCHNITTE);
const ZELT_ABSCHNITTE = new Set<FlaechenAbschnitt>(['zelt_rot', 'zelt_gelb', 'zelt_gruen']);

const FLAECHEN_FARBEN: Record<FlaechenAbschnitt, string> = {
  zelt_rot: 'var(--sk1)',
  zelt_gelb: 'var(--sk2)',
  zelt_gruen: 'var(--sk3)',
  ablage: 'var(--warn)',
  bereitstellungsraum: 'var(--akzent)',
  eingangssichtung: 'var(--text-leise)',
  ausgangssichtung: 'var(--text-leise)',
  transport: 'var(--ok)',
};

/** Nur die Wege, deren Distanz eine eigene Führungsentscheidung ist - nicht jeder Schritt zwischen zwei Nachbarzelten. */
const SIDEBAR_MINDESTABSTAND_M = 60;

const TAKTISCHES_ZEICHEN_CACHE = new Map<string, L.DivIcon>();

/** Erzeugt (und memoisiert) ein `L.DivIcon` aus einem taktischen Zeichen (→ `domain.taktischezeichen`). */
function taktischesZeichenIcon(abschnitt: Einsatzabschnitt): L.DivIcon {
  const cached = TAKTISCHES_ZEICHEN_CACHE.get(abschnitt);
  if (cached) return cached;

  const spec = ZEICHEN_JE_ABSCHNITT[abschnitt] ?? { grundzeichen: 'stelle' as const };
  const bild = erzeugeTaktischesZeichen(spec);
  // Die XML-Deklaration ist außerhalb eines vollständigen Dokuments überflüssig
  // und würde beim Einfügen in HTML als Fremdkörper geparst.
  const svgMarkup = bild.toString().replace(/^<\?xml[^>]*\?>\s*/, '');
  const randfarbe = FLAECHEN_FARBEN[abschnitt as FlaechenAbschnitt];
  const [breiteM, hoeheM] = bild.size;
  const rand = randfarbe && ZELT_ABSCHNITTE.has(abschnitt as FlaechenAbschnitt) ? 3 : 0;
  const html = rand
    ? `<div style="border:${rand}px solid ${randfarbe};border-radius:8px;background:#fff;line-height:0">${svgMarkup}</div>`
    : svgMarkup;
  const icon = L.divIcon({
    html,
    className: 'tz-marker',
    iconSize: [breiteM + rand * 2, hoeheM + rand * 2],
    iconAnchor: [(breiteM + rand * 2) / 2, hoeheM + rand * 2],
  });
  TAKTISCHES_ZEICHEN_CACHE.set(abschnitt, icon);
  return icon;
}

/** Ziehgriff der bewegbaren Bau-Vorschau (→ `ui.lagekarte.bauen`) - bewusst kein taktisches Zeichen, damit klar bleibt: das steht noch nicht wirklich da. */
const VORSCHAU_ICON = L.divIcon({
  html: '<div class="vorschau-griff"></div>',
  className: 'vorschau-marker',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** Ruft `map.invalidateSize()` auf, sobald sich der Kartencontainer verändert - z. B. beim Ein-/Ausklappen der Regie-Seitenleiste (→ `ui.gesamtlagebild`). Leaflet merkt eine reine CSS-Größenänderung des Elternelements sonst nicht selbst. */
function KartenGroessenBeobachter() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const beobachter = new ResizeObserver(() => map.invalidateSize());
    beobachter.observe(container);
    return () => beobachter.disconnect();
  }, [map]);
  return null;
}

function KartenKlickHandler({ aktiv, onKlick }: { aktiv: boolean; onKlick: (position: GeoPosition) => void }) {
  useMapEvent('click', (ereignis) => {
    if (!aktiv) return;
    onKlick({ lat: ereignis.latlng.lat, lon: ereignis.latlng.lng });
  });
  return null;
}

/**
 * @anker ui.lagekarte Echte, maßstabsgetreue Lagekarte statt Kartenansicht/Baufeld
 *
 * Ersetzt die schematische `Kartenansicht` und das abstrakte, lokale
 * `Baufeld` durch eine einzige echte Karte (OpenStreetMap-Kacheln über
 * React-Leaflet) - der Maßstab ergibt sich automatisch aus echten
 * Koordinaten statt aus einer separat gepflegten, potenziell
 * widersprüchlichen Distanzangabe. Eine Übung beginnt bewusst nur mit der
 * Schadensstelle sichtbar (taktisches Zeichen nach DV 102, →
 * `domain.taktischezeichen`) - jeder weitere Abschnitt erscheint (Marker wie
 * Route) erst, sobald dort wirklich eine Fläche steht, nicht schon vorher als
 * Platzhalter. Danach übernimmt ein maßstabsgetreues Rechteck
 * (→ `domain.geodaten.projektion`, `lokalMZuGeo`) an der echten Baustelle die
 * Stelle des Markers.
 *
 * @anker ui.lagekarte.bauen Bauen per Kartenklick statt Knopfliste
 *
 * Ein Kartenklick öffnet an genau dieser Stelle ein Leaflet-Popup mit den
 * noch offenen Abschnitten zur Auswahl - kein fester Knopf pro Abschnitt
 * mehr. Nach der Abschnittswahl folgt wie gehabt `ZeltTypAuswahl` (welche
 * Größe), danach aber keine sofortige Platzierung mehr: eine ziehbare
 * Vorschau (Rechteck + Ziehgriff-Marker) erscheint am Klickpunkt und lässt
 * sich frei auf der Karte verschieben, live grün/rot eingefärbt je nachdem,
 * ob die aktuelle Stelle gültig ist (→ `domain.platzierungGueltig`). Erst ein
 * bewusstes "Bauort bestätigen" löst - wie im bisherigen Baufeld - die
 * Auftragstaktik-Entscheidung (→ `ui.baufeld.befehl`) und den echten
 * Bau-Countdown (→ `state.zeitkosten`) aus; "Abbrechen" verwirft die Vorschau
 * ohne jede Aktion. All das nur bei `interaktiv` (Zugführer) - die Regie
 * (→ `ui.gesamtlagebild`) sieht dieselbe Karte rein lesend.
 */
export function Lagekarte({ interaktiv = true }: { interaktiv?: boolean }) {
  const { state, dispatch } = useSimulation();
  const schluesselpunkte = state.szenario?.geodaten?.schluesselpunkte;

  // Bauablauf: Kartenklick → Baumenü (welcher Abschnitt?) → Zelttypauswahl (welche Größe?)
  // → bewegbare Vorschau (wo genau, ziehbar) → Bestätigung → Auftragstaktik-Entscheidung
  // → echter Bau. Jeder Schritt ersetzt den vorigen, nie zwei gleichzeitig offen.
  const [bauMenuPosition, setBauMenuPosition] = useState<GeoPosition | null>(null);
  const [typAuswahl, setTypAuswahl] = useState<{ abschnitt: FlaechenAbschnitt; klickPunkt: GeoPosition } | null>(
    null,
  );
  const [vorschau, setVorschau] = useState<{
    abschnitt: FlaechenAbschnitt;
    typ: ZeltTypId | FlaechenTypId;
    position: GeoPosition;
  } | null>(null);
  const [zielAuswahl, setZielAuswahl] = useState<{
    abschnitt: FlaechenAbschnitt;
    typ: ZeltTypId | FlaechenTypId;
    xM: number;
    yM: number;
  } | null>(null);
  const [entscheidung, setEntscheidung] = useState<{
    abschnitt: FlaechenAbschnitt;
    typ: ZeltTypId | FlaechenTypId;
    xM: number;
    yM: number;
  } | null>(null);

  const zk = useZeitkostenStatus();
  const zkZelt = zk.aktion?.typ === 'zeltPlatzieren' ? zk.aktion : null;
  const zkBeschaeftigt = zk.aktion !== null;

  if (!schluesselpunkte || Object.keys(schluesselpunkte).length === 0) {
    return <p className="hinweis">Für dieses Szenario sind keine Geodaten hinterlegt.</p>;
  }

  const ursprung: GeoPosition =
    state.szenario?.geodaten?.ursprung ??
    schluesselpunkte.schadensstelle ??
    (Object.values(schluesselpunkte)[0] as GeoPosition);

  const baufeld = state.szenario?.baufeld ?? STANDARD_BAUFELD;
  const flaechen = state.flaechen;
  const punkte = Object.entries(schluesselpunkte) as [Einsatzabschnitt, GeoPosition][];

  const gruppenfuehrerListe = gruppenfuehrerListeVon(state.sitzung.spieler);
  const eigeneBefehle = state.flaechenBefehle.filter(
    (befehl) => befehl.zugfuehrerId === state.sitzung.eigeneId,
  );

  const verfuegbareQm = verfuegbareFlaecheQm(baufeld, flaechen, state.fahrzeuge.length);
  const knapp = verfuegbareQm < FAHRZEUG_FLAECHENBEDARF_QM;

  const befehlErteilenAn = (gruppenfuehrerId: string) => {
    if (!zielAuswahl) return;
    dispatch({
      typ: 'zeltBefehlErteilen',
      id: erzeugeId(),
      flaechenTyp: zielAuswahl.typ,
      abschnitt: zielAuswahl.abschnitt,
      xM: zielAuswahl.xM,
      yM: zielAuswahl.yM,
      zugfuehrerId: state.sitzung.eigeneId ?? '',
      gruppenfuehrerId,
    });
    setZielAuswahl(null);
  };

  const selbstBauen = () => {
    if (!entscheidung) return;
    dispatch({
      typ: 'zeltPlatzieren',
      id: erzeugeId(),
      flaechenTyp: entscheidung.typ,
      abschnitt: entscheidung.abschnitt,
      xM: entscheidung.xM,
      yM: entscheidung.yM,
      spielerId: state.sitzung.eigeneId ?? undefined,
    });
    setEntscheidung(null);
  };

  const befehlWaehlen = () => {
    if (!entscheidung) return;
    if (gruppenfuehrerListe.length === 1) {
      dispatch({
        typ: 'zeltBefehlErteilen',
        id: erzeugeId(),
        flaechenTyp: entscheidung.typ,
        abschnitt: entscheidung.abschnitt,
        xM: entscheidung.xM,
        yM: entscheidung.yM,
        zugfuehrerId: state.sitzung.eigeneId ?? '',
        gruppenfuehrerId: gruppenfuehrerListe[0]!.id,
      });
      setEntscheidung(null);
      return;
    }
    setZielAuswahl(entscheidung);
    setEntscheidung(null);
  };

  const abschnitteInBearbeitung = new Set([
    ...flaechen.map((flaeche) => flaeche.abschnitt),
    ...state.flaechenBefehle.map((befehl) => befehl.abschnitt),
  ]);
  const nochOffeneAbschnitte = FLAECHEN_ABSCHNITTE.filter(
    (abschnitt) => !abschnitteInBearbeitung.has(abschnitt),
  );

  const kannBauMenuOeffnen =
    !zkBeschaeftigt &&
    !bauMenuPosition &&
    !typAuswahl &&
    !vorschau &&
    !entscheidung &&
    !zielAuswahl &&
    nochOffeneAbschnitte.length > 0;

  const vorschauXY = vorschau ? geoZuLokalM(ursprung, vorschau.position) : null;
  const vorschauInfo = vorschau ? groesseVon(vorschau.typ) : null;
  const vorschauEckeB =
    vorschau && vorschauXY && vorschauInfo
      ? lokalMZuGeo(ursprung, vorschauXY.xM + vorschauInfo.breiteM, vorschauXY.yM + vorschauInfo.tiefeM)
      : null;
  const vorschauGueltig =
    vorschau && vorschauXY
      ? platzierungGueltig(
          { typ: vorschau.typ, abschnitt: vorschau.abschnitt, xM: vorschauXY.xM, yM: vorschauXY.yM },
          flaechen,
          baufeld,
          ZELT_ABSCHNITTE.has(vorschau.abschnitt),
        )
      : false;

  const bauortBestaetigen = () => {
    if (!vorschau || !vorschauXY || !vorschauGueltig) return;
    const { xM, yM } = vorschauXY;
    if (gruppenfuehrerListe.length === 0) {
      dispatch({
        typ: 'zeltPlatzieren',
        id: erzeugeId(),
        flaechenTyp: vorschau.typ,
        abschnitt: vorschau.abschnitt,
        xM,
        yM,
        spielerId: state.sitzung.eigeneId ?? undefined,
      });
      setVorschau(null);
      return;
    }
    setEntscheidung({ abschnitt: vorschau.abschnitt, typ: vorschau.typ, xM, yM });
    setVorschau(null);
  };

  const vorschauAbbrechen = () => {
    setVorschau(null);
  };

  /**
   * Wo ein Abschnitt gerade wirklich auf der Karte steht - nur die
   * Schadensstelle (vom Szenario vorgegeben) und bereits gebaute Flächen
   * (am echten Mittelpunkt des gebauten Rechtecks) sind sichtbar. Ein noch
   * nicht gebauter Abschnitt hat keine Position - weder Marker noch Route
   * zeigen dorthin, bis wirklich etwas steht (→ `ui.lagekarte.bauen`).
   */
  const sichtbarePosition = (abschnitt: Einsatzabschnitt): GeoPosition | undefined => {
    if (!FLAECHEN_ABSCHNITT_SET.has(abschnitt)) return schluesselpunkte[abschnitt];
    const flaeche = flaechen.find((f) => f.abschnitt === abschnitt);
    if (!flaeche) return undefined;
    const info = groesseVon(flaeche.typ);
    return lokalMZuGeo(ursprung, flaeche.xM + info.breiteM / 2, flaeche.yM + info.tiefeM / 2);
  };

  const baufeldEckeA = lokalMZuGeo(ursprung, 0, 0);
  const baufeldEckeB = lokalMZuGeo(ursprung, baufeld.breiteM, baufeld.tiefeM);

  return (
    <div className="baufeld-block">
      <div className={`karten-rahmen${kannBauMenuOeffnen ? ' karten-rahmen-platziermodus' : ''}`}>
        <MapContainer center={[ursprung.lat, ursprung.lon]} zoom={18} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
          />
          <KartenGroessenBeobachter />
          {interaktiv && <KartenKlickHandler aktiv={kannBauMenuOeffnen} onKlick={setBauMenuPosition} />}

          <Rectangle
            bounds={[
              [baufeldEckeA.lat, baufeldEckeA.lon],
              [baufeldEckeB.lat, baufeldEckeB.lon],
            ]}
            pathOptions={{ color: 'var(--rand)', fill: false, dashArray: '4 3', weight: 2 }}
            interactive={false}
          >
            <Tooltip sticky>
              Baufeld ({baufeld.breiteM} × {baufeld.tiefeM} m)
            </Tooltip>
          </Rectangle>

          {state.routen.map((route) => {
            const von = sichtbarePosition(route.von);
            const nach = sichtbarePosition(route.nach);
            if (!von || !nach) return null;
            const gesperrt = route.status === 'gesperrt';
            return (
              <Polyline
                key={route.id}
                positions={[
                  [von.lat, von.lon],
                  [nach.lat, nach.lon],
                ]}
                pathOptions={
                  gesperrt ? { color: 'var(--warn)', dashArray: '6 4', weight: 3 } : { color: 'var(--rand)', weight: 3 }
                }
                interactive={false}
              >
                {route.distanzMeter >= SIDEBAR_MINDESTABSTAND_M && (
                  <Tooltip permanent direction="center" className="distanz-tooltip">
                    {gesperrt ? 'gesperrt' : `≈ ${Math.round(route.distanzMeter)} m`}
                  </Tooltip>
                )}
              </Polyline>
            );
          })}

          {punkte
            .filter(([abschnitt]) => !FLAECHEN_ABSCHNITT_SET.has(abschnitt))
            .map(([abschnitt, position]) => {
              const patientenAnzahl = state.patienten.filter((p) => p.abschnitt === abschnitt).length;
              const fahrzeugAnzahl = state.fahrzeuge.filter((f) => f.abschnitt === abschnitt).length;
              return (
                <Marker key={abschnitt} position={[position.lat, position.lon]} icon={taktischesZeichenIcon(abschnitt)}>
                  <Tooltip permanent direction="top">
                    <b>{geoPunktName(abschnitt)}</b>
                    <br />
                    {patientenAnzahl > 0 && `${patientenAnzahl} Pat.`}
                    {patientenAnzahl > 0 && fahrzeugAnzahl > 0 && ' · '}
                    {fahrzeugAnzahl > 0 && `${fahrzeugAnzahl} Fzg.`}
                    {patientenAnzahl === 0 && fahrzeugAnzahl === 0 && 'unbesetzt'}
                  </Tooltip>
                </Marker>
              );
            })}

          {flaechen.map((flaeche) => {
            const info = groesseVon(flaeche.typ);
            const eckeA = lokalMZuGeo(ursprung, flaeche.xM, flaeche.yM);
            const eckeB = lokalMZuGeo(ursprung, flaeche.xM + info.breiteM, flaeche.yM + info.tiefeM);
            const farbe = FLAECHEN_FARBEN[flaeche.abschnitt];
            const patientenAnzahl = state.patienten.filter((p) => p.abschnitt === flaeche.abschnitt).length;
            const fahrzeugAnzahl = state.fahrzeuge.filter((f) => f.abschnitt === flaeche.abschnitt).length;
            return (
              <Rectangle
                key={flaeche.id}
                bounds={[
                  [eckeA.lat, eckeA.lon],
                  [eckeB.lat, eckeB.lon],
                ]}
                pathOptions={{ color: farbe, fillColor: farbe, fillOpacity: 0.55, weight: 2 }}
                eventHandlers={
                  interaktiv ? { click: () => dispatch({ typ: 'zeltEntfernen', id: flaeche.id }) } : undefined
                }
              >
                <Tooltip sticky>
                  <b>
                    {info.bezeichnung} - {geoPunktName(flaeche.abschnitt)}
                  </b>
                  <br />
                  {patientenAnzahl > 0 && `${patientenAnzahl} Pat.`}
                  {patientenAnzahl > 0 && fahrzeugAnzahl > 0 && ' · '}
                  {fahrzeugAnzahl > 0 && `${fahrzeugAnzahl} Fzg.`}
                  {patientenAnzahl === 0 && fahrzeugAnzahl === 0 && 'unbesetzt'}
                  {interaktiv && ' - antippen zum Entfernen'}
                </Tooltip>
              </Rectangle>
            );
          })}

          {interaktiv && bauMenuPosition && (
            <Popup
              position={[bauMenuPosition.lat, bauMenuPosition.lon]}
              eventHandlers={{ remove: () => setBauMenuPosition(null) }}
            >
              <div className="lagekarte-bau-menue">
                <p className="lagekarte-bau-menue-titel">Was hier bauen?</p>
                {nochOffeneAbschnitte.map((abschnitt) => (
                  <button
                    key={abschnitt}
                    type="button"
                    onClick={() => {
                      setTypAuswahl({ abschnitt, klickPunkt: bauMenuPosition });
                      setBauMenuPosition(null);
                    }}
                  >
                    {geoPunktName(abschnitt)}
                  </button>
                ))}
              </div>
            </Popup>
          )}

          {interaktiv && vorschau && vorschauEckeB && (
            <>
              <Rectangle
                bounds={[
                  [vorschau.position.lat, vorschau.position.lon],
                  [vorschauEckeB.lat, vorschauEckeB.lon],
                ]}
                pathOptions={{
                  color: vorschauGueltig ? 'var(--ok)' : 'var(--sk1)',
                  fillColor: vorschauGueltig ? 'var(--ok)' : 'var(--sk1)',
                  fillOpacity: 0.25,
                  dashArray: '5 4',
                  weight: 2,
                }}
                interactive={false}
              />
              <Marker
                position={[vorschau.position.lat, vorschau.position.lon]}
                icon={VORSCHAU_ICON}
                draggable
                eventHandlers={{
                  drag: (ereignis) => {
                    const { lat, lng } = (ereignis.target as L.Marker).getLatLng();
                    setVorschau((bisher) => (bisher ? { ...bisher, position: { lat, lon: lng } } : bisher));
                  },
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {knapp && (
        <p className="hinweis hinweis-warn">
          Kaum noch Platz für weitere Fahrzeuge im Baufeld ({Math.max(0, Math.round(verfuegbareQm))}{' '}
          m² frei).
        </p>
      )}

      {zkZelt && (
        <p className="hinweis baufeld-aufbau-laeuft" style={zeitkostenHintergrund(zk.anteil)}>
          {groesseVon(zkZelt.flaechenTyp).bezeichnung} für {geoPunktName(zkZelt.abschnitt)} wird
          aufgebaut - noch {zk.restSek} s
        </p>
      )}

      {!interaktiv ? null : (
        <>
          {eigeneBefehle.length > 0 && (
            <ul className="baufeld-befehle-liste">
              {eigeneBefehle.map((befehl) => {
                const gruppenfuehrer = state.sitzung.spieler.find((s) => s.id === befehl.gruppenfuehrerId);
                return (
                  <li key={befehl.id} className="baufeld-befehl-zeile">
                    <span>
                      Befehl an {gruppenfuehrer?.name ?? 'Gruppenführer'}: {groesseVon(befehl.typ).bezeichnung}
                      {' '}für {geoPunktName(befehl.abschnitt)} - wartet auf Ausführung
                    </span>
                    <button
                      type="button"
                      onClick={() => dispatch({ typ: 'zeltBefehlAblehnen', id: befehl.id })}
                    >
                      Zurückziehen
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {vorschau ? (
            <>
              <p className="hinweis">
                Griff auf der Karte ziehen, um den Standort für {geoPunktName(vorschau.abschnitt)} festzulegen.
              </p>
              {!vorschauGueltig && (
                <p className="hinweis hinweis-fehler" role="alert">
                  Diese Stelle überschneidet eine andere Fläche oder liegt außerhalb des Baufelds.
                </p>
              )}
              <div className="baufeld-ziel-knoepfe">
                <button type="button" className="primaer" disabled={!vorschauGueltig} onClick={bauortBestaetigen}>
                  Bauort bestätigen
                </button>
                <button type="button" className="baufeld-abbrechen" onClick={vorschauAbbrechen}>
                  Abbrechen
                </button>
              </div>
            </>
          ) : entscheidung ? (
            <div className="panel zelttyp-auswahl">
              <div className="panel-titel">
                <h2>Wie bauen?</h2>
              </div>
              <div className="baufeld-ziel-knoepfe">
                <button type="button" onClick={befehlWaehlen}>
                  Befehl an Gruppenführer geben
                </button>
                <button type="button" onClick={selbstBauen}>
                  Selbst bauen (Mikromanagement)
                </button>
              </div>
              <button type="button" className="zelttyp-abbrechen" onClick={() => setEntscheidung(null)}>
                Abbrechen
              </button>
            </div>
          ) : zielAuswahl ? (
            <div className="panel zelttyp-auswahl">
              <div className="panel-titel">
                <h2>Befehl an wen?</h2>
              </div>
              <div className="baufeld-ziel-knoepfe">
                {gruppenfuehrerListe.map((gruppenfuehrer) => (
                  <button
                    type="button"
                    key={gruppenfuehrer.id}
                    onClick={() => befehlErteilenAn(gruppenfuehrer.id)}
                  >
                    {gruppenfuehrer.name}
                  </button>
                ))}
              </div>
              <button type="button" className="zelttyp-abbrechen" onClick={() => setZielAuswahl(null)}>
                Abbrechen
              </button>
            </div>
          ) : (
            kannBauMenuOeffnen && (
              <p className="hinweis">Karte antippen, um dort etwas zu bauen.</p>
            )
          )}

          {typAuswahl && (
            <ZeltTypAuswahl
              abschnitt={typAuswahl.abschnitt}
              onWaehlen={(typ) => {
                setVorschau({ abschnitt: typAuswahl.abschnitt, typ, position: typAuswahl.klickPunkt });
                setTypAuswahl(null);
              }}
              onAbbrechen={() => setTypAuswahl(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
