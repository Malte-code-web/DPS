import { FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import { MASSNAHMEN } from '../domain/massnahmen';
import { SICHTUNGSKATEGORIEN } from '../domain/types';
import { ZAEHL_REIHENFOLGE, zaehleSichtung } from '../lib/auswertung';
import { useSimulation } from '../state/useSimulation';
import type { FahrzeugTyp } from '../domain/types';

const SK_FARBE: Record<string, string> = {
  SK1: 'var(--sk1)',
  SK2: 'var(--sk2)',
  SK3: 'var(--sk3)',
  SK4: 'var(--sk4)',
  EX: 'var(--ex)',
  offen: 'var(--rand)',
};

/**
 * @anker ui.kennzahlenleiste Vier Kacheln als Ersteindruck des Gesamtlagebilds
 *
 * Dieselben Zahlen, die anderswo verstreut stehen (Sichtungszähler in der
 * Einsatzleiste, Fahrzeuge in der Abschnittsleiste, Anfragen nur als Toast),
 * an einer Stelle gebündelt - der erste Blick der Regie auf die Lage
 * (→ `ui.gesamtlagebild`).
 */
export function Kennzahlenleiste() {
  const { state } = useSimulation();
  const zaehler = zaehleSichtung(state.patienten);
  const gesamt = state.patienten.length;

  const kraefte = state.sitzung.spieler.filter((spieler) => spieler.rolle === 'spieler');
  const gebundeneKraefte = kraefte.filter(
    (spieler) => spieler.gebundenBis !== undefined && spieler.gebundenBis > state.zeitSek,
  ).length;

  const fahrzeugeNachTyp = new Map<FahrzeugTyp, number>();
  for (const fahrzeug of state.fahrzeuge) {
    fahrzeugeNachTyp.set(fahrzeug.typ, (fahrzeugeNachTyp.get(fahrzeug.typ) ?? 0) + 1);
  }
  const fahrzeugZeile = [...fahrzeugeNachTyp.entries()]
    .map(([typ, anzahl]) => `${anzahl}× ${FAHRZEUGTYP_INFO[typ].label}`)
    .join(' · ');

  const anfragenLabels = [
    ...state.delegationsanfragen.map((anfrage) => MASSNAHMEN[anfrage.massnahmeId].label),
    ...state.kollegenanfragen.map((anfrage) =>
      anfrage.massnahmeId ? MASSNAHMEN[anfrage.massnahmeId].label : 'Rettung',
    ),
  ];
  const anfragenGesamt = anfragenLabels.length;

  return (
    <section className="kennzahlen" aria-label="Kennzahlen">
      <div className="kz-kachel">
        <span className="kz-label">Patienten gesamt</span>
        <span className="kz-wert">{gesamt}</span>
        {gesamt > 0 && (
          <div className="sk-balken">
            {ZAEHL_REIHENFOLGE.map(
              (schluessel) =>
                zaehler[schluessel] > 0 && (
                  <span
                    key={schluessel}
                    style={{ width: `${(zaehler[schluessel] / gesamt) * 100}%`, background: SK_FARBE[schluessel] }}
                  />
                ),
            )}
          </div>
        )}
        <span className="kz-unterzeile">
          {ZAEHL_REIHENFOLGE.filter((schluessel) => zaehler[schluessel] > 0)
            .map(
              (schluessel) =>
                `${zaehler[schluessel]} ${schluessel === 'offen' ? 'offen' : `SK ${SICHTUNGSKATEGORIEN[schluessel].kuerzel}`}`,
            )
            .join(' · ') || 'keine Patienten'}
        </span>
      </div>

      <div className="kz-kachel">
        <span className="kz-label">Kräfte im Einsatz</span>
        <span className="kz-wert">{kraefte.length}</span>
        <span className="kz-unterzeile">
          {gebundeneKraefte > 0 && (
            <span style={{ color: 'var(--warn)', fontWeight: 700 }}>{gebundeneKraefte} gebunden</span>
          )}
          {gebundeneKraefte > 0 && ' · '}
          {kraefte.length - gebundeneKraefte} frei verfügbar
        </span>
      </div>

      <div className="kz-kachel">
        <span className="kz-label">Fahrzeuge vor Ort</span>
        <span className="kz-wert">{state.fahrzeuge.length}</span>
        <span className="kz-unterzeile">{fahrzeugZeile || 'keine Fahrzeuge'}</span>
      </div>

      <div className="kz-kachel">
        <span className="kz-label">Offene Anfragen</span>
        <span className={anfragenGesamt > 0 ? 'kz-wert warn' : 'kz-wert'}>{anfragenGesamt}</span>
        <span className="kz-unterzeile">
          {[...new Set(anfragenLabels)].join(' · ') || 'keine offenen Anfragen'}
        </span>
      </div>
    </section>
  );
}
