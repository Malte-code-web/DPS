import { ABSCHNITTE } from '../domain/abschnitte';
import { formatStaerke, staerkemeldung } from '../domain/fuehrung';
import { FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import { QUALIFIKATION_LABEL } from '../domain/massnahmen';
import { SICHTUNGSKATEGORIEN } from '../domain/types';
import { useSimulation } from '../state/useSimulation';
import type { Einsatzabschnitt, Sichtungskategorie } from '../domain/types';

const SK_REIHENFOLGE: Sichtungskategorie[] = ['SK1', 'SK2', 'SK3', 'SK4', 'EX'];

interface Props {
  onAbschnittWaehlen: (abschnittId: Einsatzabschnitt) => void;
}

/**
 * @anker ui.abschnitteuebersicht Eine Kachel je Einsatzabschnitt - Kern des Gesamtlagebilds
 *
 * Fasst zusammen, was sonst nur nacheinander über die Abschnittsleiste
 * einsehbar wäre: Patientenzahl samt Sichtungsverteilung, anwesende Kräfte
 * (mit Bindungs-Marker, → `modell.gebunden`) und Fahrzeuge. Eine Kachel hebt
 * sich hervor, wenn dort ein SK-I-Patient liegt oder jemand gebunden ist -
 * beides Stellen, an denen die Regie am ehesten eingreifen muss. Der Kopf
 * jeder Kachel ist klickbar und wechselt in die gewohnte Abschnitt-Detailsicht.
 */
export function AbschnitteUebersicht({ onAbschnittWaehlen }: Props) {
  const { state } = useSimulation();

  return (
    <div>
      <p className="abschnitt-eyebrow">Einsatzabschnitte</p>
      <div className="abschnitte-grid">
        {ABSCHNITTE.map((abschnitt) => {
          const patienten = state.patienten.filter((patient) => patient.abschnitt === abschnitt.id);
          const kraefte = state.sitzung.spieler.filter(
            (spieler) => spieler.rolle === 'spieler' && spieler.aktuellerAbschnitt === abschnitt.id,
          );
          const fahrzeuge = state.fahrzeuge.filter((fahrzeug) => fahrzeug.abschnitt === abschnitt.id);
          const skChips = SK_REIHENFOLGE.map((kategorie) => ({
            kategorie,
            anzahl: patienten.filter((patient) =>
              kategorie === 'EX'
                ? patient.status === 'verstorben'
                : patient.status !== 'verstorben' && patient.gesichtetAls === kategorie,
            ).length,
          })).filter((eintrag) => eintrag.anzahl > 0);
          const gebundeneKraefte = kraefte.filter(
            (spieler) => spieler.gebundenBis !== undefined && spieler.gebundenBis > state.zeitSek,
          );
          const hervorgehoben =
            patienten.some((patient) => patient.gesichtetAls === 'SK1' && patient.status !== 'verstorben') ||
            gebundeneKraefte.length > 0;

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

              {kraefte.length > 0 && (
                <>
                  <hr className="abschnitt-trenner" />
                  <ul className="kraefte-liste">
                    {kraefte.map((spieler) => {
                      const gebunden =
                        spieler.gebundenBis !== undefined && spieler.gebundenBis > state.zeitSek;
                      return (
                        <li key={spieler.id} className="kraft-zeile">
                          <span>
                            <span className="kraft-name">{spieler.name}</span>{' '}
                            <span className="kraft-qual">{QUALIFIKATION_LABEL[spieler.qualifikation]}</span>
                          </span>
                          {gebunden && <span className="gebunden-marker">{spieler.gebundenGrund}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {fahrzeuge.length > 0 && (
                <>
                  <hr className="abschnitt-trenner" />
                  <ul className="fahrzeug-liste">
                    {fahrzeuge.map((fahrzeug) => (
                      <li key={fahrzeug.id} className="fahrzeug-zeile">
                        <b>{FAHRZEUGTYP_INFO[fahrzeug.typ].label}</b>
                        <span>
                          Stärke {formatStaerke(staerkemeldung(fahrzeug.besatzung, state.sitzung.spieler))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {kraefte.length === 0 && fahrzeuge.length === 0 && patienten.length === 0 && (
                <p className="abschnitt-leer">Zurzeit unbesetzt.</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
