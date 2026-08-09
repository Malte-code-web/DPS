import { ABSCHNITTE } from '../domain/abschnitte';
import { SICHTUNGSKATEGORIEN } from '../domain/types';
import { useSimulation } from '../state/useSimulation';
import type { Einsatzabschnitt, Sichtungskategorie } from '../domain/types';

const SK_REIHENFOLGE: Sichtungskategorie[] = ['SK1', 'SK2', 'SK3', 'SK4', 'EX'];

interface Props {
  onAbschnittWaehlen: (abschnittId: Einsatzabschnitt) => void;
}

/**
 * @anker ui.abschnittekurzuebersicht Kacheln ohne Kräfte-/Fahrzeugdetails
 *
 * Der einzige Navigationsweg der Zugführer-Ansicht (→ `ui.zugfuehrerseite`)
 * in die Abschnitt-Detailsicht - die Lagekarte (→ `ui.lagekarte`) steht
 * daneben als eigene Ansicht im selben Seitenleisten-Menü, nimmt selbst aber
 * keinen Klick zum Wechseln entgegen. Dieselben Kacheln wie `ui.abschnitteuebersicht`,
 * aber bewusst ohne die dort passiv sichtbare Kräfte- und Fahrzeugliste - der
 * Zugführer soll das aktiv abfragen (→ `FahrzeugStatusPanel`,
 * `KraefteStatusPanel`), nicht beiläufig beim bloßen Öffnen der Seite
 * vorgesetzt bekommen.
 */
export function AbschnitteKurzuebersicht({ onAbschnittWaehlen }: Props) {
  const { state } = useSimulation();

  return (
    <div>
      <p className="abschnitt-eyebrow">Einsatzabschnitte</p>
      <div className="abschnitte-grid">
        {ABSCHNITTE.map((abschnitt) => {
          const patienten = state.patienten.filter((patient) => patient.abschnitt === abschnitt.id);
          const skChips = SK_REIHENFOLGE.map((kategorie) => ({
            kategorie,
            anzahl: patienten.filter((patient) =>
              kategorie === 'EX'
                ? patient.status === 'verstorben'
                : patient.status !== 'verstorben' && patient.gesichtetAls === kategorie,
            ).length,
          })).filter((eintrag) => eintrag.anzahl > 0);
          const hervorgehoben = patienten.some(
            (patient) => patient.gesichtetAls === 'SK1' && patient.status !== 'verstorben',
          );

          return (
            <article
              key={abschnitt.id}
              className={`abschnitt-karte${hervorgehoben ? ' hervorgehoben' : ''}`}
            >
              <button
                type="button"
                className="abschnitt-karte-oeffnen"
                onClick={() => onAbschnittWaehlen(abschnitt.id)}
              >
                <div className="abschnitt-kopf">
                  <div>
                    <div className="abschnitt-name">{abschnitt.name}</div>
                    <p className="abschnitt-aufgabe">{abschnitt.aufgabe}</p>
                  </div>
                  <span className="abschnitt-anzahl">{patienten.length}</span>
                </div>
              </button>

              {skChips.length > 0 && (
                <div className="sk-chips">
                  {skChips.map(({ kategorie, anzahl }) => (
                    <span key={kategorie} className={`sk-chip sk-chip-${kategorie.toLowerCase()}`}>
                      SK {SICHTUNGSKATEGORIEN[kategorie].kuerzel} · {anzahl}
                    </span>
                  ))}
                </div>
              )}

              {patienten.length === 0 && <p className="abschnitt-leer">Zurzeit unbesetzt.</p>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
