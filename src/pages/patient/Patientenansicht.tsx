import { useState } from 'react';
import { Anhaengekarte } from '../../components/Anhaengekarte';
import { Befundtafel } from '../../components/Befundtafel';
import { Ersteindruck } from '../../components/Ersteindruck';
import { Massnahmenliste } from '../../components/Massnahmenliste';
import { Massnahmenuebersicht } from '../../components/Massnahmenuebersicht';
import { Verlegung } from '../../components/Verlegung';
import { diagnostikZeitSek, istBekannt } from '../../domain/diagnostik';
import { moeglicheZiele } from '../../domain/abschnitte';
import { aktiveProbleme, sichtungOffen } from '../../domain/simulation';
import { zeitFormat } from '../../lib/format';
import { useSimulation } from '../../state/useSimulation';
import type { MassnahmenKategorie, Patient } from '../../domain/types';

/** In der Ersteinschätzung sind nur die lebensrettenden Gruppen aufgeklappt. */
const SOFORT: MassnahmenKategorie[] = ['x', 'A'];

type Bereich = 'diagnostik' | 'massnahmen' | 'verlegung' | null;

/**
 * @anker ui.patientenansicht Anhängekarte plus drei Knöpfe - eine Ansicht für alle Abschnitte
 *
 * Die Karte ist die Übersicht, alles Weitere liegt hinter drei Knöpfen:
 * Diagnostik, Maßnahmen, Verlegung. Immer nur einer ist offen.
 *
 * Damit gibt es keine getrennten Ansichten je Einsatzabschnitt mehr. Was sich
 * unterscheidet, ist ohnehin nur, welche Verlegungsziele erlaubt sind und
 * welche Sichtungszeile gerade dran ist - beides steht in der Domäne, nicht in
 * vier fast gleichen Komponenten.
 *
 * Der didaktische Kern bleibt: Die Karte zeigt nur den Ersteindruck, also das,
 * was ohne Gerät zu sehen ist. Wer Messwerte will, muss die Diagnostik öffnen
 * und bezahlt sie mit Einsatzzeit.
 */
export function Patientenansicht({ patient }: { patient: Patient }) {
  const { state, dispatch } = useSimulation();
  const [bereich, setBereich] = useState<Bereich>(null);

  const gesperrt = patient.status === 'verstorben' || patient.status === 'transportiert';
  const offeneProbleme = aktiveProbleme(patient, state.zeitSek);
  const geloesteProbleme = patient.probleme.filter((problem) =>
    patient.behandelteProbleme.includes(problem.id),
  );
  const erhoben = diagnostikZeitSek(patient);
  const erledigteMassnahmen = patient.durchgefuehrteMassnahmen.length;
  const zieleOffen = moeglicheZiele(patient.abschnitt).length;
  const sichtungFehlt = sichtungOffen(patient);

  const umschalten = (wahl: Exclude<Bereich, null>) =>
    setBereich((bisher) => (bisher === wahl ? null : wahl));

  return (
    <div className="stufe">
      <Anhaengekarte patient={patient} />

      <section className="karte karte-eindruck">
        <h3>Erster Eindruck</h3>
        <Ersteindruck patient={patient} />
      </section>

      <div className="bereichswahl" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={bereich === 'diagnostik'}
          className={bereich === 'diagnostik' ? 'bereich-aktiv' : ''}
          onClick={() => umschalten('diagnostik')}
        >
          Diagnostik
          <span className="bereich-marke">{erhoben > 0 ? zeitFormat(erhoben) : 'nichts erhoben'}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={bereich === 'massnahmen'}
          className={bereich === 'massnahmen' ? 'bereich-aktiv' : ''}
          onClick={() => umschalten('massnahmen')}
        >
          Maßnahmen
          <span className="bereich-marke">
            {erledigteMassnahmen > 0 ? `${erledigteMassnahmen} durchgeführt` : 'keine'}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={bereich === 'verlegung'}
          className={`${bereich === 'verlegung' ? 'bereich-aktiv' : ''}${
            sichtungFehlt && zieleOffen > 0 ? ' bereich-wartet' : ''
          }`}
          disabled={zieleOffen === 0}
          onClick={() => umschalten('verlegung')}
        >
          Verlegung
          <span className="bereich-marke">
            {zieleOffen === 0
              ? 'abgeschlossen'
              : sichtungFehlt
                ? 'Sichtung offen'
                : `${zieleOffen} Ziele`}
          </span>
        </button>
      </div>

      {bereich === 'diagnostik' && (
        <section className="karte karte-befund">
          <p className="hinweis hinweis-knapp">Leeres Feld antippen, um den Wert zu erheben.</p>
          <Befundtafel
            patient={patient}
            onDiagnostik={(diagnostikId) =>
              dispatch({ typ: 'diagnostikDurchfuehren', patientId: patient.id, diagnostikId })
            }
          />

          {istBekannt(patient, 'koerper') ? (
            <>
              <p className="detail-befund">{patient.untersuchungsbefund}</p>
              {offeneProbleme.length > 0 && (
                <ul className="problemliste">
                  {offeneProbleme.map((problem) => (
                    <li key={problem.id}>
                      <strong>{problem.label}</strong>
                      <span>{problem.beschreibung}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <button
              type="button"
              className="bodycheck-knopf"
              disabled={gesperrt}
              onClick={() =>
                dispatch({
                  typ: 'diagnostikDurchfuehren',
                  patientId: patient.id,
                  diagnostikId: 'bodycheck',
                })
              }
            >
              <span>Bodycheck – Ganzkörperbefund erheben</span>
              <span className="massnahme-dauer">60 s</span>
            </button>
          )}

          {geloesteProbleme.length > 0 && (
            <ul className="problemliste problemliste-geloest">
              {geloesteProbleme.map((problem) => (
                <li key={problem.id}>
                  <strong>{problem.label}</strong>
                  <span>versorgt</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {bereich === 'massnahmen' && (
        <section className="karte karte-massnahmen">
          <Massnahmenliste
            patient={patient}
            standardOffen={SOFORT}
            onMassnahme={(massnahmeId) =>
              dispatch({ typ: 'massnahmeDurchfuehren', patientId: patient.id, massnahmeId })
            }
          />
          {erledigteMassnahmen > 0 && (
            <>
              <h3>Bisher durchgeführt</h3>
              <Massnahmenuebersicht patient={patient} />
            </>
          )}
        </section>
      )}

      {bereich === 'verlegung' && (
        <section className="karte karte-verlegung">
          {sichtungFehlt ? (
            <p className="hinweis warnung-text">
              Vor der Verlegung muss die Sichtung an dieser Station bestätigt werden – oben auf
              der Anhängekarte in der markierten Zeile.
            </p>
          ) : (
            <p className="hinweis hinweis-knapp">
              Sichtung bestätigt. Das zur Kategorie passende Ziel ist hervorgehoben.
            </p>
          )}
          <Verlegung patient={patient} />
        </section>
      )}

      <section className="karte karte-protokoll">
        <details>
          <summary>
            Verlaufsprotokoll
            <span className="karte-nebentitel">{patient.verlauf.length} Einträge</span>
          </summary>
          {patient.verlauf.length === 0 ? (
            <p className="hinweis">Noch keine Einträge.</p>
          ) : (
            <ul className="protokoll">
              {patient.verlauf.map((eintrag, index) => (
                <li key={`${eintrag.zeitSek}-${index}`}>
                  <time>{zeitFormat(eintrag.zeitSek)}</time>
                  <span>{eintrag.text}</span>
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>
    </div>
  );
}
