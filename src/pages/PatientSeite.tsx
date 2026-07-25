import { useEffect, useState } from 'react';
import { Massnahmenuebersicht } from '../components/Massnahmenuebersicht';
import { SichtungsBadge } from '../components/SichtungsBadge';
import { abschnittInfo } from '../domain/abschnitte';
import { useSimulation } from '../state/useSimulation';
import { Ausgangssichtung } from './patient/Ausgangssichtung';
import { Eingangssichtung } from './patient/Eingangssichtung';
import { Ersteinschaetzung } from './patient/Ersteinschaetzung';
import { Versorgung } from './patient/Versorgung';
import type { Patient } from '../domain/types';

/**
 * @anker ui.patientseite Weiche: welcher Abschnitt zeigt welche Ansicht
 *
 * Rahmen der Patientenseite: Navigation, Kopfzeile und die zum aktuellen
 * Einsatzabschnitt passende Ansicht.
 *
 *   Schadensstelle    -> Ersteinschätzung, dahinter erweiterte Versorgung
 *   Eingangssichtung  -> Sichten und einem Zelt zuweisen
 *   Zelt              -> Diagnostik und Behandlung
 *   Ausgangssichtung  -> Übergabe, schnelle Maßnahmen, Abschlusssichtung
 *   Abtransport       -> abgeschlossen, nur noch Einsicht
 */
export function PatientSeite({ patient }: { patient: Patient }) {
  const { state, dispatch } = useSimulation();
  const [erweitert, setErweitert] = useState(false);

  const abschnitt = abschnittInfo(patient.abschnitt);
  const verstorben = patient.status === 'verstorben';
  const randKlasse = verstorben
    ? 'rand-EX'
    : patient.gesichtetAls
      ? `rand-${patient.gesichtetAls}`
      : 'rand-offen';

  // Nur Patienten desselben Abschnitts sind über die Blättern-Schaltflächen erreichbar.
  const nachbarn = state.patienten.filter(
    (eintrag) => eintrag.abschnitt === patient.abschnitt,
  );
  const position = nachbarn.findIndex((eintrag) => eintrag.id === patient.id);
  const vorheriger = nachbarn[position - 1];
  const naechster = nachbarn[position + 1];

  const zurueckZurListe = () => dispatch({ typ: 'patientWaehlen', patientId: null });

  // Escape führt zurück - erst aus der erweiterten Versorgung, dann zur Liste.
  useEffect(() => {
    const beiTaste = (ereignis: KeyboardEvent) => {
      if (ereignis.key !== 'Escape') return;
      if (erweitert) {
        setErweitert(false);
      } else {
        dispatch({ typ: 'patientWaehlen', patientId: null });
      }
    };
    window.addEventListener('keydown', beiTaste);
    return () => window.removeEventListener('keydown', beiTaste);
  }, [dispatch, erweitert]);

  return (
    <div className="patientseite">
      <nav className="patientseite-nav">
        <button type="button" onClick={zurueckZurListe}>
          &larr; {abschnitt.name}
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
            {position + 1} von {nachbarn.length}
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
          <span className="patient-id">
            {patient.id} · {abschnitt.name}
          </span>
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

      <Abschnittsansicht
        patient={patient}
        erweitert={erweitert}
        setErweitert={setErweitert}
        aufNaechsten={() =>
          naechster
            ? dispatch({ typ: 'patientWaehlen', patientId: naechster.id })
            : zurueckZurListe()
        }
        naechsterName={naechster ? `${naechster.id} ${naechster.name}` : null}
      />
    </div>
  );
}

interface AnsichtProps {
  patient: Patient;
  erweitert: boolean;
  setErweitert: (wert: boolean) => void;
  aufNaechsten: () => void;
  naechsterName: string | null;
}

function Abschnittsansicht({
  patient,
  erweitert,
  setErweitert,
  aufNaechsten,
  naechsterName,
}: AnsichtProps) {
  switch (patient.abschnitt) {
    case 'schadensstelle':
      return erweitert ? (
        <Versorgung patient={patient} zurueck={() => setErweitert(false)} />
      ) : (
        <Ersteinschaetzung
          patient={patient}
          aufVersorgung={() => setErweitert(true)}
          aufNaechsten={aufNaechsten}
          naechsterName={naechsterName}
        />
      );

    case 'eingangssichtung':
      return <Eingangssichtung patient={patient} />;

    case 'zelt_rot':
    case 'zelt_gelb':
    case 'zelt_gruen':
      return <Versorgung patient={patient} ueberschrift="Diagnostik" />;

    case 'ausgangssichtung':
      return <Ausgangssichtung patient={patient} />;

    case 'transport':
    default:
      return (
        <div className="stufe">
          <section className="karte">
            <h3>Abgeschlossen</h3>
            <p className="hinweis">
              Der Patient hat den Behandlungsplatz verlassen. Sein Zustand verändert sich nicht
              mehr.
            </p>
            <Massnahmenuebersicht patient={patient} />
          </section>
        </div>
      );
  }
}
