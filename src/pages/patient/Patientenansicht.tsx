import { useState } from 'react';
import { Anhaengekarte } from '../../components/Anhaengekarte';
import { Befundtafel } from '../../components/Befundtafel';
import { Massnahmenliste } from '../../components/Massnahmenliste';
import { Monitor } from '../../components/Monitor';
import { Sofortmassnahmen } from '../../components/Sofortmassnahmen';
import { Koerperschema } from '../../components/Koerperschema';
import { Massnahmenuebersicht } from '../../components/Massnahmenuebersicht';
import { Verlegung } from '../../components/Verlegung';
import { Bereichsseite } from './Bereichsseite';
import { diagnostikZeitSek, istBekannt } from '../../domain/diagnostik';
import { MASSNAHMEN } from '../../domain/massnahmen';
import { moeglicheZiele } from '../../domain/abschnitte';
import { aktiveProbleme, sichtungOffen } from '../../domain/simulation';
import { zeitFormat } from '../../lib/format';
import { useSimulation } from '../../state/useSimulation';
import { KOERPERREGION_TEXT } from '../../domain/types';
import type { Massnahmenart, Patient } from '../../domain/types';

/**
 * Der Maßnahmenreiter zeigt Handgriffe und Eingriffe, die Medikamente stehen im
 * eigenen Reiter. So bleibt jede Liste kurz und die Trennung sichtbar.
 */
const MASSNAHMEN_ARTEN: Massnahmenart[] = ['basis', 'invasiv'];
const MEDIKAMENT_ARTEN: Massnahmenart[] = ['medikament'];

type Bereich = 'diagnostik' | 'massnahmen' | 'medikamente' | 'verlegung' | 'verlauf' | null;

/**
 * @anker ui.patientenansicht Anhängekarte plus Knöpfe - eine Ansicht für alle Abschnitte
 *
 * Die Karte ist die Übersicht, alles Weitere liegt hinter fünf Knöpfen:
 * Diagnostik, Maßnahmen, Medikamente, Verlegung, Verlauf. Jeder öffnet eine
 * **eigene Seite** (→ `ui.bereichsseite`) statt eines Blocks darunter - so
 * bleibt die Übersicht auf einem Bildschirm, egal wie lang der
 * Maßnahmenkatalog wird. Handgriffe/Eingriffe und Medikamente sind auf zwei
 * Reiter getrennt, damit jede Liste kurz bleibt.
 *
 * Solange der Patient an der Schadensstelle liegt, stehen die lebensrettenden
 * Sofortmaßnahmen (→ `ui.sofortmassnahmen`) dauerhaft unter der Karte - der
 * Griff, der zählt, wartet nicht hinter einem Reiter.
 *
 * Damit gibt es keine getrennten Ansichten je Einsatzabschnitt mehr. Was sich
 * unterscheidet, ist ohnehin nur, welche Verlegungsziele erlaubt sind und
 * welche Sichtungszeile gerade dran ist - beides steht in der Domäne, nicht in
 * fast gleichen Komponenten.
 *
 * Der didaktische Kern bleibt: Die Karte zeigt nur den Ersteindruck, also das,
 * was ohne Gerät zu sehen ist. Wer Messwerte will, muss die Diagnostik öffnen
 * und bezahlt sie mit Einsatzzeit.
 */
export function Patientenansicht({ patient }: { patient: Patient }) {
  const { state, dispatch } = useSimulation();
  const [bereich, setBereich] = useState<Bereich>(null);

  const gesperrt = patient.status === 'verstorben' || patient.status === 'transportiert';
  const anSchadensstelle = patient.abschnitt === 'schadensstelle';
  const offeneProbleme = aktiveProbleme(patient, state.zeitSek);
  const geloesteProbleme = patient.probleme.filter((problem) =>
    patient.behandelteProbleme.includes(problem.id),
  );
  const erhoben = diagnostikZeitSek(patient);
  const erledigteMassnahmen = patient.durchgefuehrteMassnahmen.length;
  const gegebeneMedikamente = patient.durchgefuehrteMassnahmen.filter(
    (id) => MASSNAHMEN[id].art === 'medikament',
  ).length;
  const zieleOffen = moeglicheZiele(patient.abschnitt).length;
  const sichtungFehlt = sichtungOffen(patient);

  const umschalten = (wahl: Exclude<Bereich, null>) =>
    setBereich((bisher) => (bisher === wahl ? null : wahl));

  return (
    <div className="stufe">
      <Anhaengekarte patient={patient} />

      {anSchadensstelle && (
        <Sofortmassnahmen
          patient={patient}
          onMassnahme={(massnahmeId) =>
            dispatch({ typ: 'massnahmeDurchfuehren', patientId: patient.id, massnahmeId })
          }
        />
      )}

      <Monitor
        patient={patient}
        onAnschliessen={() =>
          dispatch({ typ: 'massnahmeDurchfuehren', patientId: patient.id, massnahmeId: 'monitoring' })
        }
      />

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
          aria-selected={bereich === 'medikamente'}
          className={bereich === 'medikamente' ? 'bereich-aktiv' : ''}
          onClick={() => umschalten('medikamente')}
        >
          Medikamente
          <span className="bereich-marke">
            {gegebeneMedikamente > 0 ? `${gegebeneMedikamente} gegeben` : 'keine'}
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
        <button
          type="button"
          role="tab"
          aria-selected={bereich === 'verlauf'}
          className={bereich === 'verlauf' ? 'bereich-aktiv' : ''}
          onClick={() => umschalten('verlauf')}
        >
          Verlauf
          <span className="bereich-marke">{patient.verlauf.length} Einträge</span>
        </button>
      </div>

      {bereich === 'diagnostik' && (
        <Bereichsseite
          patient={patient}
          titel="Diagnostik"
          marke={erhoben > 0 ? `${zeitFormat(erhoben)} erhoben` : 'nichts erhoben'}
          onSchliessen={() => setBereich(null)}
        >
          <p className="hinweis hinweis-knapp">Leeres Feld antippen, um den Wert zu erheben.</p>
          <Befundtafel
            patient={patient}
            onDiagnostik={(diagnostikId) =>
              dispatch({ typ: 'diagnostikDurchfuehren', patientId: patient.id, diagnostikId })
            }
          />

          <Koerperschema patient={patient} />

          {istBekannt(patient, 'koerper') ? (
            <>
              <p className="detail-befund">{patient.untersuchungsbefund}</p>
              {offeneProbleme.length > 0 && (
                <ul className="problemliste">
                  {offeneProbleme.map((problem) => (
                    <li key={problem.id}>
                      <strong>
                        {problem.label}
                        {problem.koerperregion && (
                          <span className="problem-region">
                            {KOERPERREGION_TEXT[problem.koerperregion]}
                          </span>
                        )}
                      </strong>
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
        </Bereichsseite>
      )}

      {bereich === 'massnahmen' && (
        <Bereichsseite
          patient={patient}
          titel="Maßnahmen"
          marke={`${erledigteMassnahmen} durchgeführt`}
          onSchliessen={() => setBereich(null)}
        >
          <Massnahmenliste
            patient={patient}
            arten={MASSNAHMEN_ARTEN}
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
        </Bereichsseite>
      )}

      {bereich === 'medikamente' && (
        <Bereichsseite
          patient={patient}
          titel="Medikamente"
          marke={`${gegebeneMedikamente} gegeben`}
          onSchliessen={() => setBereich(null)}
        >
          <p className="hinweis hinweis-knapp">
            Medikamente nach SAA - viele setzen einen i.v.-Zugang voraus. Fehlt er, ist der Knopf
            gesperrt.
          </p>
          <Massnahmenliste
            patient={patient}
            arten={MEDIKAMENT_ARTEN}
            onMassnahme={(massnahmeId) =>
              dispatch({ typ: 'massnahmeDurchfuehren', patientId: patient.id, massnahmeId })
            }
          />
        </Bereichsseite>
      )}

      {bereich === 'verlegung' && (
        <Bereichsseite
          patient={patient}
          titel="Verlegung"
          marke={sichtungFehlt ? 'Sichtung offen' : 'Sichtung bestätigt'}
          onSchliessen={() => setBereich(null)}
        >
          {sichtungFehlt ? (
            <p className="hinweis warnung-text">
              Vor der Verlegung muss die Sichtung an dieser Station bestätigt werden – zurück auf
              die Anhängekarte, in der markierten Zeile.
            </p>
          ) : (
            <p className="hinweis hinweis-knapp">
              Sichtung bestätigt. Das zur Kategorie passende Ziel ist hervorgehoben.
            </p>
          )}
          <Verlegung patient={patient} />
        </Bereichsseite>
      )}

      {bereich === 'verlauf' && (
        <Bereichsseite
          patient={patient}
          titel="Verlaufsprotokoll"
          marke={`${patient.verlauf.length} Einträge`}
          onSchliessen={() => setBereich(null)}
        >
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
        </Bereichsseite>
      )}
    </div>
  );
}
