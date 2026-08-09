import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, Polyline, Rectangle, TileLayer, Tooltip, useMap, useMapEvent } from 'react-leaflet';
import { erzeugeTaktischesZeichen } from 'taktische-zeichen-core';
import { erzeugeId } from '../domain/sitzung';
import { geoPunktName, geoZuLokalM, lokalMZuGeo } from '../domain/geodaten';
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
 * widersprüchlichen Distanzangabe. Taktische Symbole nach DV 102
 * (→ `domain.taktischezeichen`, Bibliothek `taktische-zeichen-core`)
 * markieren die Schlüsselpunkte, solange dafür keine Fläche platziert ist -
 * danach übernimmt ein maßstabsgetreues Rechteck (→ `domain.geodaten.projektion`,
 * `lokalMZuGeo`) dieselbe Stelle.
 *
 * Die Platzierung läuft wie im bisherigen Baufeld über eine
 * Zwei-Schritt-Auswahl (Größe wählen, dann Standort antippen - hier ein
 * echter Kartenklick statt einer Rasterzelle) inklusive Auftragstaktik
 * (→ `ui.baufeld.befehl`) und echtem Bau-Countdown (→ `state.zeitkosten`) -
 * nur bei `interaktiv` (Zugführer), die Regie (→ `ui.gesamtlagebild`) sieht
 * dieselbe Karte rein lesend.
 */
export function Lagekarte({ interaktiv = true }: { interaktiv?: boolean }) {
  const { state, dispatch } = useSimulation();
  const schluesselpunkte = state.szenario?.geodaten?.schluesselpunkte;

  const [auswahlAbschnitt, setAuswahlAbschnitt] = useState<FlaechenAbschnitt | null>(null);
  const [platzierModus, setPlatzierModus] = useState<{
    abschnitt: FlaechenAbschnitt;
    typ: ZeltTypId | FlaechenTypId;
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
  const [fehler, setFehler] = useState<string | null>(null);

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

  const gruppenfuehrerListe = state.sitzung.spieler.filter(
    (spieler) => spieler.rolle === 'spieler' && spieler.fuehrungsrolle === 'gruppenfuehrer',
  );
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

  const kartenKlick = (position: GeoPosition) => {
    if (!platzierModus) return;
    const { xM, yM } = geoZuLokalM(ursprung, position);
    const gueltig = platzierungGueltig(
      { typ: platzierModus.typ, abschnitt: platzierModus.abschnitt, xM, yM },
      flaechen,
      baufeld,
      ZELT_ABSCHNITTE.has(platzierModus.abschnitt),
    );
    if (!gueltig) {
      setFehler('Diese Stelle überschneidet eine andere Fläche oder liegt außerhalb des Baufelds.');
      return;
    }
    setFehler(null);
    if (gruppenfuehrerListe.length === 0) {
      dispatch({
        typ: 'zeltPlatzieren',
        id: erzeugeId(),
        flaechenTyp: platzierModus.typ,
        abschnitt: platzierModus.abschnitt,
        xM,
        yM,
        spielerId: state.sitzung.eigeneId ?? undefined,
      });
      setPlatzierModus(null);
      return;
    }
    setEntscheidung({ abschnitt: platzierModus.abschnitt, typ: platzierModus.typ, xM, yM });
    setPlatzierModus(null);
  };

  const abschnitteInBearbeitung = new Set([
    ...flaechen.map((flaeche) => flaeche.abschnitt),
    ...state.flaechenBefehle.map((befehl) => befehl.abschnitt),
  ]);
  const nochOffeneAbschnitte = FLAECHEN_ABSCHNITTE.filter(
    (abschnitt) => !abschnitteInBearbeitung.has(abschnitt),
  );

  const baufeldEckeA = lokalMZuGeo(ursprung, 0, 0);
  const baufeldEckeB = lokalMZuGeo(ursprung, baufeld.breiteM, baufeld.tiefeM);

  return (
    <div className="baufeld-block">
      <div className={`karten-rahmen${platzierModus ? ' karten-rahmen-platziermodus' : ''}`}>
        <MapContainer center={[ursprung.lat, ursprung.lon]} zoom={18} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
          />
          <KartenGroessenBeobachter />
          {interaktiv && (
            <KartenKlickHandler aktiv={platzierModus !== null && !zkBeschaeftigt} onKlick={kartenKlick} />
          )}

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
            const von = schluesselpunkte[route.von];
            const nach = schluesselpunkte[route.nach];
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
            .filter(
              ([abschnitt]) =>
                !(FLAECHEN_ABSCHNITT_SET.has(abschnitt) && abschnitteInBearbeitung.has(abschnitt as FlaechenAbschnitt)),
            )
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
                  {info.bezeichnung} - {geoPunktName(flaeche.abschnitt)}
                  {patientenAnzahl > 0 && ` (${patientenAnzahl} Pat.)`}
                  {interaktiv && ' - antippen zum Entfernen'}
                </Tooltip>
              </Rectangle>
            );
          })}
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
          {fehler && (
            <p className="hinweis hinweis-fehler" role="alert">
              {fehler}
            </p>
          )}

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

          {platzierModus ? (
            <p className="hinweis">
              Karte antippen, um den Standort für {geoPunktName(platzierModus.abschnitt)} festzulegen.
            </p>
          ) : null}

          {platzierModus ? (
            <button
              type="button"
              className="baufeld-abbrechen"
              disabled={zkBeschaeftigt}
              onClick={() => {
                setPlatzierModus(null);
                setFehler(null);
              }}
            >
              Platzierung abbrechen
            </button>
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
            !zkZelt &&
            nochOffeneAbschnitte.length > 0 && (
              <div className="baufeld-farb-knoepfe">
                {nochOffeneAbschnitte.map((abschnitt) => (
                  <button
                    key={abschnitt}
                    type="button"
                    disabled={zkBeschaeftigt}
                    onClick={() => setAuswahlAbschnitt(abschnitt)}
                  >
                    Fläche für {geoPunktName(abschnitt)} platzieren
                  </button>
                ))}
              </div>
            )
          )}

          {auswahlAbschnitt && (
            <ZeltTypAuswahl
              abschnitt={auswahlAbschnitt}
              onWaehlen={(typ) => {
                setPlatzierModus({ abschnitt: auswahlAbschnitt, typ });
                setAuswahlAbschnitt(null);
              }}
              onAbbrechen={() => setAuswahlAbschnitt(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
