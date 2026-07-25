import { useEffect, useState } from 'react';
import { Ersteindruck } from '../components/Ersteindruck';
import { Massnahmenliste } from '../components/Massnahmenliste';
import { SichtungsBadge } from '../components/SichtungsBadge';
import { Vitalmonitor } from '../components/Vitalmonitor';
import {
  UNTERSUCHUNGSDAUER_SEK,
  aktiveProbleme,
  gebundeneZeitSek,
  individualmedizinZeitSek,
} from '../domain/simulation';
import { SICHTUNGSKATEGORIEN } from '../domain/types';
import { zeitFormat } from '../lib/format';
import { useSimulation } from '../state/useSimulation';
import type { MassnahmenKategorie, Patient, Sichtungskategorie } from '../domain/types';

const SICHTUNGSAUSWAHL: Sichtungskategorie[] = ['SK1', 'SK2', 'SK3', 'SK4'];

/** In der Ersteinschätzung sind nur die lebensrettenden Gruppen aufgeklappt. */
const OFFEN_ERSTEINSCHAETZUNG: MassnahmenKategorie[] = ['x', 'A'];
const OFFEN_VERSORGUNG: MassnahmenKategorie[] = ['x', 'A', 'B', 'C', 'D', 'E'];

type Stufe = 'ersteinschaetzung' | 'versorgung';

/**
 * Patientenseite in zwei Stufen.
 *
 * Stufe 1 zeigt den ersten Eindruck, die Sichtungskategorie und den
 * Maßnahmenkatalog nach xABCDE - mit x und A aufgeklappt, alles Weitere
 * eingeklappt, aber sichtbar. Genau darin liegt die Versuchung: Der Weg in
 * die Individualmedizin ist ein Klick auf eine Gruppe, nichts hält davon ab.
 * Bezahlt wird über die Einsatzzeit, die für alle weiterläuft.
 */
export function PatientSeite({ patient }: { patient: Patient }) {
  const { state, dispatch } = useSimulation();
  const [stufe, setStufe] = useState<Stufe>('ersteinschaetzung');

  const verstorben = patient.status === 'verstorben';
  const randKlasse = verstorben
    ? 'rand-EX'
    : patient.gesichtetAls
      ? `rand-${patient.gesichtetAls}`
      : 'rand-offen';

  const position = state.patienten.findIndex((eintrag) => eintrag.id === patient.id);
  const vorheriger = state.patienten[position - 1];
  const naechster = state.patienten[position + 1];

  const zurueckZurListe = () => dispatch({ typ: 'patientWaehlen', patientId: null });

  // Escape führt zurück - erst eine Stufe, dann zur Schadensstelle.
  useEffect(() => {
    const beiTaste = (ereignis: KeyboardEvent) => {
      if (ereignis.key !== 'Escape') return;
      if (stufe === 'versorgung') {
        setStufe('ersteinschaetzung');
      } else {
        dispatch({ typ: 'patientWaehlen', patientId: null });
      }
    };
    window.addEventListener('keydown', beiTaste);
    return () => window.removeEventListener('keydown', beiTaste);
  }, [dispatch, stufe]);

  return (
    <div className="patientseite">
      <nav className="patientseite-nav">
        <button type="button" onClick={zurueckZurListe}>
          &larr; Schadensstelle
        </button>
        <div className="patientseite-blaettern">
          <button
            type="button"
            disabled={!vorheriger}
            onClick={() =>
              vorheriger && dispatch({ typ: 'patientWaehlen', patientId: vorheriger.id })
            }
          >
            &larr; Vorheriger
          </button>
          <span className="patientseite-zaehler">
            {position + 1} von {state.patienten.length}
          </span>
          <button
            type="button"
            disabled={!naechster}
            onClick={() =>
              naechster && dispatch({ typ: 'patientWaehlen', patientId: naechster.id })
            }
          >
            Nächster &rarr;
          </button>
        </div>
      </nav>

      <header
        className={`patientseite-kopf ${randKlasse}${
          verstorben ? ' patientseite-kopf-verstorben' : ''
        }`}
      >
        <div>
          <span className="patient-id">{patient.id}</span>
          <h2>
            {patient.name}, {patient.alter} J. ({patient.geschlecht})
          </h2>
          <p className="detail-befund">{patient.kurzbefund}</p>
        </div>
        {verstorben ? (
          <SichtungsBadge kategorie="EX" />
        ) : patient.gesichtetAls ? (
          <SichtungsBadge kategorie={patient.gesichtetAls} />
        ) : (
          <span className="sk-badge sk-offen">nicht gesichtet</span>
        )}
      </header>

      {stufe === 'ersteinschaetzung' ? (
        <Ersteinschaetzung
          patient={patient}
          verstorben={verstorben}
          aufVersorgung={() => setStufe('versorgung')}
          aufNaechsten={() =>
            naechster
              ? dispatch({ typ: 'patientWaehlen', patientId: naechster.id })
              : zurueckZurListe()
          }
          naechsterName={naechster ? `${naechster.id} ${naechster.name}` : null}
        />
      ) : (
        <Versorgung
          patient={patient}
          verstorben={verstorben}
          zurueck={() => setStufe('ersteinschaetzung')}
        />
      )}
    </div>
  );
}

/** Übergabe an die Eingangssichtung des Behandlungsplatzes. */
function UebergabeButton({ patient, verstorben }: { patient: Patient; verstorben: boolean }) {
  const { dispatch } = useSimulation();
  const uebergeben = patient.status === 'transportiert';

  return (
    <button
      type="button"
      className={`uebergabe-button${uebergeben ? ' uebergabe-erfolgt' : ''}`}
      disabled={verstorben || uebergeben}
      onClick={() => dispatch({ typ: 'patientTransportieren', patientId: patient.id })}
    >
      {uebergeben ? 'An Eingangssichtung übergeben' : 'Übergabe an: Eingangssichtung'}
    </button>
  );
}

/* --- Stufe 1: Ersteinschätzung ------------------------------------ */

interface ErsteinschaetzungProps {
  patient: Patient;
  verstorben: boolean;
  aufVersorgung: () => void;
  aufNaechsten: () => void;
  naechsterName: string | null;
}

function Ersteinschaetzung({
  patient,
  verstorben,
  aufVersorgung,
  aufNaechsten,
  naechsterName,
}: ErsteinschaetzungProps) {
  const { dispatch } = useSimulation();
  const gesichtet = patient.gesichtetAls !== null;

  return (
    <div className="stufe stufe-erst">
      <section className="karte karte-eindruck">
        <h3>Erster Eindruck</h3>
        <Ersteindruck patient={patient} />
      </section>

      <section className="karte karte-massnahmen">
        <h3>Maßnahmen</h3>
        <Massnahmenliste
          patient={patient}
          standardOffen={OFFEN_ERSTEINSCHAETZUNG}
          onMassnahme={(massnahmeId) =>
            dispatch({ typ: 'massnahmeDurchfuehren', patientId: patient.id, massnahmeId })
          }
        />
      </section>

      <section className="karte karte-sichtung">
        <h3>Sichtungskategorie vergeben</h3>
        <div className="sichtung-buttons">
          {SICHTUNGSAUSWAHL.map((kategorie) => (
            <button
              key={kategorie}
              type="button"
              className={`sichtung-button sk-${kategorie}${
                patient.gesichtetAls === kategorie ? ' sichtung-gewaehlt' : ''
              }`}
              disabled={verstorben}
              onClick={() => dispatch({ typ: 'patientSichten', patientId: patient.id, kategorie })}
            >
              SK {SICHTUNGSKATEGORIEN[kategorie].kuerzel}
              <small>{SICHTUNGSKATEGORIEN[kategorie].bezeichnung}</small>
            </button>
          ))}
        </div>
        <UebergabeButton patient={patient} verstorben={verstorben} />
      </section>

      <div className="stufe-abschluss">
        {/* Erst nach vergebener Kategorie ist Weitergehen die richtige Hauptaktion. */}
        <button
          type="button"
          className={`weiter-button${gesichtet ? ' primaer' : ''}`}
          onClick={aufNaechsten}
        >
          {gesichtet ? 'Weiter zum nächsten Patienten' : 'Ohne Sichtung weitergehen'}
          <small>{naechsterName ?? 'zurück zur Schadensstelle'}</small>
        </button>

        <button type="button" className="verlockung" onClick={aufVersorgung}>
          Erweiterte Versorgung
        </button>
      </div>
    </div>
  );
}

/* --- Stufe 2: Individualmedizin ----------------------------------- */

interface VersorgungProps {
  patient: Patient;
  verstorben: boolean;
  zurueck: () => void;
}

function Versorgung({ patient, verstorben, zurueck }: VersorgungProps) {
  const { state, dispatch } = useSimulation();
  const offeneProbleme = aktiveProbleme(patient, state.zeitSek);
  const geloesteProbleme = patient.probleme.filter((problem) =>
    patient.behandelteProbleme.includes(problem.id),
  );
  const individualzeit = individualmedizinZeitSek(patient);

  return (
    <div className="stufe">
      <div className="versorgung-leiste">
        <button type="button" onClick={zurueck}>
          &larr; Ersteinschätzung
        </button>
        <span className="zeitkonto">
          An diesem Patienten gebunden: <strong>{zeitFormat(gebundeneZeitSek(patient))}</strong>
          {individualzeit > 0 && (
            <em> · davon {zeitFormat(individualzeit)} Individualmedizin</em>
          )}
        </span>
      </div>

      <div className="patientseite-raster">
        <section className="karte karte-befund">
          <h3>Untersuchung</h3>
          {!patient.untersucht ? (
            <button
              type="button"
              className="primaer"
              disabled={verstorben}
              onClick={() => dispatch({ typ: 'patientUntersuchen', patientId: patient.id })}
            >
              Patient untersuchen
              <small>{UNTERSUCHUNGSDAUER_SEK} s</small>
            </button>
          ) : (
            <>
              <p className="detail-befund">{patient.untersuchungsbefund}</p>
              <Vitalmonitor vitalwerte={patient.vitalwerte} />
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
            </>
          )}
        </section>

        <section className="karte karte-massnahmen">
          <h3>Maßnahmen</h3>
          <Massnahmenliste
            patient={patient}
            standardOffen={OFFEN_VERSORGUNG}
            onMassnahme={(massnahmeId) =>
              dispatch({ typ: 'massnahmeDurchfuehren', patientId: patient.id, massnahmeId })
            }
          />
          <UebergabeButton patient={patient} verstorben={verstorben} />
        </section>

        <section className="karte karte-protokoll">
          <h3>Verlaufsprotokoll</h3>
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
        </section>
      </div>
    </div>
  );
}
