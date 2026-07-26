import { SichtungsBadge } from './SichtungsBadge';
import { abschnittInfo } from '../domain/abschnitte';
import { gebundeneZeitSek, individualmedizinZeitSek } from '../domain/simulation';
import { zeitFormat } from '../lib/format';
import type { Patient } from '../domain/types';

/**
 * @anker ui.anhaengekarte Der Kopf der Patientenseite im Stil der Verletztenanhängekarte
 *
 * Nachgebaut ist die Idee, nicht das Formular: ein farbiger Streifen für die
 * Sichtungskategorie, daneben in einer Zeile alles, was auf der echten Karte
 * oben steht - Kennung, Name, Alter, Geschlecht, Aufenthaltsort.
 *
 * Bewusst flach gehalten. Der Kopf stand vorher über drei Zeilen und schob den
 * eigentlichen Inhalt nach unten; auf dem Telefon war die halbe erste Bildhöhe
 * verbraucht, bevor ein einziger Befund zu sehen war.
 */
export function Anhaengekarte({ patient }: { patient: Patient }) {
  const verstorben = patient.status === 'verstorben';
  const kategorie = verstorben ? 'EX' : patient.gesichtetAls;
  const gebunden = gebundeneZeitSek(patient);
  const individual = individualmedizinZeitSek(patient);

  return (
    <header
      className={`anhaengekarte rand-${kategorie ?? 'offen'}${
        verstorben ? ' anhaengekarte-verstorben' : ''
      }`}
    >
      <div className="anhaengekarte-kopf">
        <span className="anhaengekarte-id">{patient.id}</span>
        <h2>
          {patient.name}
          <span className="anhaengekarte-person">
            {patient.alter} J. · {patient.geschlecht}
          </span>
        </h2>
        {kategorie ? (
          <SichtungsBadge kategorie={kategorie} />
        ) : (
          <span className="sk-badge sk-offen">nicht gesichtet</span>
        )}
      </div>

      <p className="anhaengekarte-befund">{patient.kurzbefund}</p>

      <dl className="anhaengekarte-fuss">
        <div>
          <dt>Abschnitt</dt>
          <dd>{abschnittInfo(patient.abschnitt).name}</dd>
        </div>
        <div>
          <dt>Gebunden</dt>
          <dd>{zeitFormat(gebunden)}</dd>
        </div>
        {individual > 0 && (
          <div className="anhaengekarte-individual">
            <dt>Individualmedizin</dt>
            <dd>{zeitFormat(individual)}</dd>
          </div>
        )}
      </dl>
    </header>
  );
}
