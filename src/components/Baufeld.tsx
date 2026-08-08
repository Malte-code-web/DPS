import { useState } from 'react';
import { abschnittInfo } from '../domain/abschnitte';
import { erzeugeId } from '../domain/sitzung';
import {
  FAHRZEUG_FLAECHENBEDARF_QM,
  STANDARD_BAUFELD,
  ZELTTYPEN,
  platzierungGueltig,
  verfuegbareFlaecheQm,
} from '../domain/zelte';
import { useSimulation } from '../state/useSimulation';
import { useZeitkostenStatus, zeitkostenHintergrund } from '../state/useZeitkostenStatus';
import { ZeltTypAuswahl } from './ZeltTypAuswahl';
import type { ZeltAbschnitt, ZeltTypId } from '../domain/types';

const ZELT_FARBEN: { abschnitt: ZeltAbschnitt; farbe: string }[] = [
  { abschnitt: 'zelt_rot', farbe: 'var(--sk1)' },
  { abschnitt: 'zelt_gelb', farbe: 'var(--sk2)' },
  { abschnitt: 'zelt_gruen', farbe: 'var(--sk3)' },
];

/** Rastergröße für die Tipp-Platzierung - grob genug für Tippziele auf einem Smartphone. */
const RASTER_SCHRITT_M = 5;

/**
 * @anker ui.baufeld Der Zugführer platziert echte Zeltgrößen im Baufeld
 *
 * Eigenständige, maßstabsgetreue Fläche in lokalen Metern (→ `domain.zelte`),
 * unabhängig von der lat/lon-basierten `Kartenansicht.tsx` - deren
 * Koordinaten sind bewusst nur schematisch und nicht mit `Route.distanzMeter`
 * konsistent (→ `modell.route`), eine maßstabsgetreue Platzierung darauf
 * aufzubauen würde diese Ungenauigkeit sichtbar machen. Läuft deshalb auch
 * für Szenarien ganz ohne `geodaten`.
 *
 * Zwei-Schritt-Auswahl ohne Drag (mobil-tauglich): erst Zeltgröße wählen
 * (→ `ZeltTypAuswahl`), dann eine gültige Rasterzelle antippen. Eine
 * Platzierung ersetzt automatisch ein vorhandenes Zelt derselben Farbe.
 * Das Flächenbudget (→ `domain.verfuegbareFlaecheQm`) ist eine weiche
 * Warnung, keine Sperre - passend zum kooperativen Charakter der Übung.
 *
 * Der Aufbau kostet echte Zeit (→ `state.zeitkosten`, `ZELTTYPEN.aufbauSek`) -
 * wie jede andere zeitkostende Handlung im echten Countdown, nicht sofort
 * sichtbar. Solange er läuft, bleiben weitere Platzierungen gesperrt
 * (dieselbe `zkBeschaeftigt`-Konvention wie in `ui.verlegung`).
 */
export function Baufeld() {
  const { state, dispatch } = useSimulation();
  const baufeld = state.szenario?.baufeld ?? STANDARD_BAUFELD;
  const zelte = state.zeltPlatzierungen;
  const [auswahlFarbe, setAuswahlFarbe] = useState<ZeltAbschnitt | null>(null);
  const [platzierModus, setPlatzierModus] = useState<{
    abschnitt: ZeltAbschnitt;
    typ: ZeltTypId;
  } | null>(null);
  const zk = useZeitkostenStatus();
  const zkZelt = zk.aktion?.typ === 'zeltPlatzieren' ? zk.aktion : null;
  const zkBeschaeftigt = zk.aktion !== null;

  const verfuegbareQm = verfuegbareFlaecheQm(baufeld, zelte, state.fahrzeuge.length);
  const knapp = verfuegbareQm < FAHRZEUG_FLAECHENBEDARF_QM;

  const rasterZellen: { xM: number; yM: number }[] = [];
  if (platzierModus) {
    const info = ZELTTYPEN[platzierModus.typ];
    for (let y = 0; y + info.tiefeM <= baufeld.tiefeM; y += RASTER_SCHRITT_M) {
      for (let x = 0; x + info.breiteM <= baufeld.breiteM; x += RASTER_SCHRITT_M) {
        rasterZellen.push({ xM: x, yM: y });
      }
    }
  }

  const platzieren = (xM: number, yM: number) => {
    if (!platzierModus) return;
    dispatch({
      typ: 'zeltPlatzieren',
      id: erzeugeId(),
      zeltTyp: platzierModus.typ,
      abschnitt: platzierModus.abschnitt,
      xM,
      yM,
      spielerId: state.sitzung.eigeneId ?? undefined,
    });
    setPlatzierModus(null);
  };

  const nochOffeneFarben = ZELT_FARBEN.filter(
    (eintrag) => !zelte.some((zelt) => zelt.abschnitt === eintrag.abschnitt),
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

          {zelte.map((zelt) => {
            const info = ZELTTYPEN[zelt.typ];
            const farbe = ZELT_FARBEN.find((eintrag) => eintrag.abschnitt === zelt.abschnitt)?.farbe;
            return (
              <g
                key={zelt.id}
                className="baufeld-zelt"
                onClick={() => dispatch({ typ: 'zeltEntfernen', id: zelt.id })}
              >
                <title>Zum Entfernen antippen</title>
                <rect
                  x={zelt.xM}
                  y={zelt.yM}
                  width={info.breiteM}
                  height={info.tiefeM}
                  style={{ fill: farbe }}
                  vectorEffect="non-scaling-stroke"
                />
                <text
                  x={zelt.xM + info.breiteM / 2}
                  y={zelt.yM + info.tiefeM / 2}
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
              const info = ZELTTYPEN[platzierModus.typ];
              const gueltig = platzierungGueltig(
                {
                  typ: platzierModus.typ,
                  abschnitt: platzierModus.abschnitt,
                  xM: zelle.xM,
                  yM: zelle.yM,
                },
                zelte,
                baufeld,
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
          {ZELTTYPEN[zkZelt.zeltTyp].bezeichnung}-Zelt für {abschnittInfo(zkZelt.abschnitt).name} wird
          aufgebaut - noch {zk.restSek} s
        </p>
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
      ) : (
        !zkZelt &&
        nochOffeneFarben.length > 0 && (
          <div className="baufeld-farb-knoepfe">
            {nochOffeneFarben.map((eintrag) => (
              <button
                key={eintrag.abschnitt}
                type="button"
                disabled={zkBeschaeftigt}
                onClick={() => setAuswahlFarbe(eintrag.abschnitt)}
              >
                Zelt für {abschnittInfo(eintrag.abschnitt).name} platzieren
              </button>
            ))}
          </div>
        )
      )}

      {auswahlFarbe && (
        <ZeltTypAuswahl
          abschnitt={auswahlFarbe}
          onWaehlen={(typ) => {
            setPlatzierModus({ abschnitt: auswahlFarbe, typ });
            setAuswahlFarbe(null);
          }}
          onAbbrechen={() => setAuswahlFarbe(null)}
        />
      )}
    </div>
  );
}
