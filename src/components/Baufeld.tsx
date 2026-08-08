import { useState } from 'react';
import { erzeugeId } from '../domain/sitzung';
import { geoPunktName } from '../domain/geodaten';
import {
  FAHRZEUG_FLAECHENBEDARF_QM,
  STANDARD_BAUFELD,
  groesseVon,
  platzierungGueltig,
  verfuegbareFlaecheQm,
} from '../domain/flaechen';
import { useSimulation } from '../state/useSimulation';
import { useZeitkostenStatus, zeitkostenHintergrund } from '../state/useZeitkostenStatus';
import { ZeltTypAuswahl } from './ZeltTypAuswahl';
import type { FlaechenAbschnitt, FlaechenTypId, ZeltTypId } from '../domain/types';

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

const ZELT_ABSCHNITTE: Set<FlaechenAbschnitt> = new Set(['zelt_rot', 'zelt_gelb', 'zelt_gruen']);

/** Rastergröße für die Tipp-Platzierung - grob genug für Tippziele auf einem Smartphone. */
const RASTER_SCHRITT_M = 5;

/**
 * @anker ui.baufeld Der Zugführer platziert echte Zelt- und Flächengrößen im Baufeld
 *
 * Eigenständige, maßstabsgetreue Fläche in lokalen Metern (→ `domain.flaechen`),
 * unabhängig von der lat/lon-basierten `Kartenansicht.tsx` - deren
 * Koordinaten sind bewusst nur schematisch und nicht mit `Route.distanzMeter`
 * konsistent (→ `modell.route`), eine maßstabsgetreue Platzierung darauf
 * aufzubauen würde diese Ungenauigkeit sichtbar machen. Läuft deshalb auch
 * für Szenarien ganz ohne `geodaten`.
 *
 * Zwei-Schritt-Auswahl ohne Drag (mobil-tauglich): erst Größe wählen
 * (→ `ZeltTypAuswahl`), dann eine gültige Rasterzelle antippen. Eine
 * Platzierung ersetzt automatisch eine vorhandene für denselben Abschnitt.
 * Alle acht Abschnitte (die drei Behandlungszelte plus Ablage,
 * Bereitstellungsraum, Ein-/Ausgangssichtung, Transport) laufen über
 * dieselbe Platzierung - nur die drei Zeltfarben werden gegen die
 * Baufeld-Grenze geprüft (→ `domain.platzierungGueltig`, `pruefeGrenzen`),
 * die übrigen fünf liegen oft weit außerhalb dieser engen Fläche. Das
 * Flächenbudget (→ `domain.verfuegbareFlaecheQm`) ist eine weiche Warnung,
 * keine Sperre - passend zum kooperativen Charakter der Übung.
 *
 * Der Aufbau kostet echte Zeit (→ `state.zeitkosten`, `groesseVon().aufbauSek`) -
 * wie jede andere zeitkostende Handlung im echten Countdown, nicht sofort
 * sichtbar. Solange er läuft, bleiben weitere Platzierungen gesperrt
 * (dieselbe `zkBeschaeftigt`-Konvention wie in `ui.verlegung`).
 *
 * @anker ui.baufeld.befehl Auftragstaktik statt Direktbau, wenn ein Gruppenführer mitspielt
 *
 * Sitzt in der Sitzung mindestens eine Person mit der Führungsrolle
 * Gruppenführer, baut der Zugführer nicht mehr selbst: Größe und Ort werden
 * wie gehabt festgelegt, aber statt `zeltPlatzieren` löst das einen Befehl
 * aus (→ `modell.flaechenbefehl`), den der Gruppenführer über eine eigene
 * Benachrichtigung annehmen muss (→ `ui.zeltbefehlbenachrichtigung`) - erst
 * dann läuft der echte Bau-Countdown, jetzt bei der ausführenden Person statt
 * beim befehlenden Zugführer. Bei mehreren Gruppenführern wählt der
 * Zugführer eine Zielperson. Ohne jeden Gruppenführer in der Sitzung bleibt
 * der Direktbau als Rückfall erhalten (dieselbe Blast-Radius-Begrenzung wie
 * bei `domain.zugfuehrungaktiv`).
 *
 * Sitzt mindestens ein Gruppenführer in der Sitzung, entscheidet der
 * Zugführer nach jeder Standortwahl neu, ob er wie vorgesehen einen Befehl
 * gibt oder ausnahmsweise selbst baut ("Mikromanagement") - keine feste
 * Betriebsart, sondern eine bewusste Wahl pro Platzierung, damit
 * Auftragstaktik der Normalfall bleibt, ohne die grundsätzliche Möglichkeit
 * zum Eingreifen zu verbauen.
 */
export function Baufeld() {
  const { state, dispatch } = useSimulation();
  const baufeld = state.szenario?.baufeld ?? STANDARD_BAUFELD;
  const flaechen = state.flaechen;
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
  const zk = useZeitkostenStatus();
  const zkZelt = zk.aktion?.typ === 'zeltPlatzieren' ? zk.aktion : null;
  const zkBeschaeftigt = zk.aktion !== null;

  const gruppenfuehrerListe = state.sitzung.spieler.filter(
    (spieler) => spieler.rolle === 'spieler' && spieler.fuehrungsrolle === 'gruppenfuehrer',
  );
  const eigeneBefehle = state.flaechenBefehle.filter(
    (befehl) => befehl.zugfuehrerId === state.sitzung.eigeneId,
  );

  const verfuegbareQm = verfuegbareFlaecheQm(baufeld, flaechen, state.fahrzeuge.length);
  const knapp = verfuegbareQm < FAHRZEUG_FLAECHENBEDARF_QM;

  const rasterZellen: { xM: number; yM: number }[] = [];
  if (platzierModus) {
    const info = groesseVon(platzierModus.typ);
    for (let y = 0; y + info.tiefeM <= baufeld.tiefeM; y += RASTER_SCHRITT_M) {
      for (let x = 0; x + info.breiteM <= baufeld.breiteM; x += RASTER_SCHRITT_M) {
        rasterZellen.push({ xM: x, yM: y });
      }
    }
  }

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

  const platzieren = (xM: number, yM: number) => {
    if (!platzierModus) return;
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

  return (
    <div className="baufeld-block">
      <p className="abschnitt-eyebrow">
        Baufeld ({baufeld.breiteM} × {baufeld.tiefeM} m)
      </p>
      <div className="baufeld-rahmen">
        <svg
          className="baufeld-svg"
          viewBox={`0 0 ${baufeld.breiteM} ${baufeld.tiefeM}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect
            x={0}
            y={0}
            width={baufeld.breiteM}
            height={baufeld.tiefeM}
            className="baufeld-grenze"
            vectorEffect="non-scaling-stroke"
          />

          {flaechen.map((flaeche) => {
            const info = groesseVon(flaeche.typ);
            const farbe = FLAECHEN_FARBEN[flaeche.abschnitt];
            return (
              <g
                key={flaeche.id}
                className="baufeld-zelt"
                onClick={() => dispatch({ typ: 'zeltEntfernen', id: flaeche.id })}
              >
                <title>Zum Entfernen antippen</title>
                <rect
                  x={flaeche.xM}
                  y={flaeche.yM}
                  width={info.breiteM}
                  height={info.tiefeM}
                  style={{ fill: farbe }}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={flaeche.xM + info.breiteM / 2}
                  y={flaeche.yM + info.tiefeM / 2}
                  className="baufeld-zelt-label"
                >
                  {info.bezeichnung}
                </text>
              </g>
            );
          })}

          {platzierModus &&
            !zkBeschaeftigt &&
            rasterZellen.map((zelle) => {
              const info = groesseVon(platzierModus.typ);
              const gueltig = platzierungGueltig(
                {
                  typ: platzierModus.typ,
                  abschnitt: platzierModus.abschnitt,
                  xM: zelle.xM,
                  yM: zelle.yM,
                },
                flaechen,
                baufeld,
                ZELT_ABSCHNITTE.has(platzierModus.abschnitt),
              );
              return (
                <rect
                  key={`${zelle.xM}-${zelle.yM}`}
                  x={zelle.xM}
                  y={zelle.yM}
                  width={info.breiteM}
                  height={info.tiefeM}
                  className={
                    gueltig
                      ? 'baufeld-raster-zelle'
                      : 'baufeld-raster-zelle baufeld-raster-ungueltig'
                  }
                  vectorEffect="non-scaling-stroke"
                  onClick={() => gueltig && platzieren(zelle.xM, zelle.yM)}
                />
              );
            })}
        </svg>
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
        <button
          type="button"
          className="baufeld-abbrechen"
          disabled={zkBeschaeftigt}
          onClick={() => setPlatzierModus(null)}
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
    </div>
  );
}
