import { abschnittInfo, sichtungsstelleIn } from '../domain/abschnitte';
import { sichtungOffen } from '../domain/simulation';
import { SICHTUNGSKATEGORIEN } from '../domain/types';
import { zeitFormat } from '../lib/format';
import { useSimulation } from '../state/useSimulation';
import type { Patient, Sichtungskategorie, Sichtungsstelle } from '../domain/types';

const AUSWAHL: Sichtungskategorie[] = ['SK1', 'SK2', 'SK3', 'SK4', 'EX'];

/** Die vier Sichtungen der Anhängekarte, in der Reihenfolge des Einsatzes. */
const ZEILEN: { stelle: Sichtungsstelle; nummer: string; titel: string }[] = [
  { stelle: 'vorsichtung', nummer: '1.', titel: 'Vorsichtung' },
  { stelle: 'eingangssichtung', nummer: '2.', titel: 'Eingangssichtung' },
  { stelle: 'nachsichtung', nummer: '3.', titel: 'Nachsichtung' },
  { stelle: 'ausgangssichtung', nummer: '4.', titel: 'Ausgangssichtung' },
];

/**
 * @anker ui.anhaengekarte Die Übersicht als Verletztenanhängekarte
 *
 * Nachgebaut ist die Patienten-Anhängetasche, wie sie im MANV am Patienten
 * hängt: oben die Farbreiter der Kategorien, darunter die Kennung, das
 * Körperschema und - der eigentliche Kern - **vier Sichtungszeilen** mit je
 * I, II, III, IV, EX und der Uhrzeit.
 *
 * Gesichtet wird direkt hier: ein Klick auf das Kästchen der Kategorie in der
 * Zeile der aktuellen Station. Es gibt keine getrennte Sichtungsauswahl mehr -
 * die Karte ist das Bedienelement, so wie im Einsatz der Stift auf der Karte.
 *
 * @anker ui.einfaerbung Halb eingefärbt heißt vorläufig, ganz heißt endgültig
 *
 * Die Fläche der Karte trägt die Kategorie: bei vorläufiger Sichtung die obere
 * Hälfte, nach der endgültigen Sichtung die ganze Karte. Damit ist auf einen
 * Blick zu sehen, wer noch nachgesichtet werden muss.
 */
export function Anhaengekarte({ patient }: { patient: Patient }) {
  const { dispatch } = useSimulation();
  const verstorben = patient.status === 'verstorben';
  const kategorie = verstorben ? 'EX' : patient.gesichtetAls;
  const aktuelleStelle = sichtungsstelleIn(patient.abschnitt);
  const offen = sichtungOffen(patient);

  /** Der letzte Eintrag je Sichtungsstelle. */
  const eintragVon = (stelle: Sichtungsstelle) =>
    [...patient.sichtungsverlauf].reverse().find((eintrag) => eintrag.stelle === stelle) ?? null;

  const sichte = (neu: Sichtungskategorie, final: boolean) =>
    dispatch({ typ: 'patientSichten', patientId: patient.id, kategorie: neu, final });

  return (
    <section
      className={`anhaengekarte rand-${kategorie ?? 'offen'}${
        patient.sichtungFinal ? ' anhaengekarte-final' : ''
      }${verstorben ? ' anhaengekarte-verstorben' : ''}`}
    >
      {/* Farbreiter wie die herausstehenden Laschen der echten Tasche */}
      <div className="anhaengekarte-reiter" aria-hidden="true">
        {AUSWAHL.map((eintrag) => (
          <span
            key={eintrag}
            className={`reiter sk-${eintrag}${kategorie === eintrag ? ' reiter-aktiv' : ''}`}
          />
        ))}
      </div>

      <div className="anhaengekarte-oben">
        <div className="anhaengekarte-kennung">
          <span className="kennung-label">Kennung</span>
          <strong>{patient.id}</strong>
        </div>
        <div className="anhaengekarte-person">
          <h2>{patient.name}</h2>
          <span>
            {patient.alter} Jahre · {patient.geschlecht === 'w' ? 'weiblich' : patient.geschlecht === 'm' ? 'männlich' : 'divers'}
          </span>
        </div>
        <Koerperschema />
      </div>

      <p className="anhaengekarte-befund">{patient.kurzbefund}</p>

      <div className="sichtungszeilen">
        {ZEILEN.map((zeile) => {
          const eintrag = eintragVon(zeile.stelle);
          const dran = zeile.stelle === aktuelleStelle && !verstorben;
          return (
            <div
              key={zeile.stelle}
              className={`sichtungszeile${dran ? ' sichtungszeile-dran' : ''}${
                eintrag ? '' : ' sichtungszeile-leer'
              }`}
            >
              <span className="sichtungszeile-titel">
                <span className="sichtungszeile-nummer">{zeile.nummer}</span> {zeile.titel}
              </span>
              <div className="sichtungszeile-kaesten">
                {AUSWAHL.map((eintragKategorie) => {
                  const gewaehlt = eintrag?.kategorie === eintragKategorie;
                  return (
                    <button
                      key={eintragKategorie}
                      type="button"
                      className={`sichtungskasten sk-${eintragKategorie}${
                        gewaehlt ? ' sichtungskasten-gewaehlt' : ''
                      }`}
                      disabled={!dran || patient.sichtungFinal}
                      title={SICHTUNGSKATEGORIEN[eintragKategorie].bezeichnung}
                      onClick={() => sichte(eintragKategorie, false)}
                    >
                      {SICHTUNGSKATEGORIEN[eintragKategorie].kuerzel}
                    </button>
                  );
                })}
              </div>
              <span className="sichtungszeile-zeit">
                {eintrag ? zeitFormat(eintrag.zeitSek) : '--:--'}
                {eintrag?.final && <em> endgültig</em>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="anhaengekarte-fuss">
        <span className="anhaengekarte-ort">{abschnittInfo(patient.abschnitt).name}</span>
        {patient.sichtungFinal ? (
          <span className="anhaengekarte-endgueltig">Endgültig gesichtet</span>
        ) : (
          <button
            type="button"
            className="anhaengekarte-final-knopf"
            disabled={verstorben || patient.gesichtetAls === null}
            onClick={() => patient.gesichtetAls && sichte(patient.gesichtetAls, true)}
          >
            Als endgültig markieren
          </button>
        )}
        {offen && !verstorben && (
          <span className="anhaengekarte-offen">Sichtung an dieser Station offen</span>
        )}
      </div>
    </section>
  );
}

/** Körperschema der Anhängekarte - Vorder- und Rückansicht. */
function Koerperschema() {
  const figur = (versatz: number) => (
    <g transform={`translate(${versatz} 0)`}>
      <circle cx="14" cy="8" r="6" />
      <path d="M14 14 L14 40 M4 20 L24 20 M14 40 L7 62 M14 40 L21 62" />
    </g>
  );

  return (
    <svg
      className="koerperschema"
      viewBox="0 0 60 68"
      role="img"
      aria-label="Körperschema, Vorder- und Rückansicht"
    >
      {figur(1)}
      {figur(31)}
    </svg>
  );
}
