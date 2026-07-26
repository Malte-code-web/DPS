import { useMemo, useState } from 'react';
import { HORIZONT_MIN, pruefeDynamik } from '../../domain/szenarioDynamik';
import { pruefeSzenario } from '../../domain/szenarioPruefung';
import { leererPatient, naechstePatientenNummer } from '../../lib/vorlagen';
import { PatientEditor } from './PatientEditor';
import type { PatientVorlage, Szenario } from '../../domain/types';

interface Props {
  szenario: Szenario;
  onAendern: (szenario: Szenario) => void;
  onSichern: () => void;
  onVerwerfen: () => void;
}

/**
 * @anker ui.szenarioeditor Formular für ein ganzes Szenario mit laufender Prüfung
 *
 * Gesichert werden kann nur ein Szenario ohne Fehler. Warnungen - etwa eine
 * bewusst abweichende Referenzkategorie - halten nicht auf.
 *
 * Neben der formalen Prüfung läuft der Probelauf: jeder Patient wird
 * unbehandelt und bestversorgt durchgespielt, damit sichtbar wird, ob die Lage
 * überhaupt Zeitdruck erzeugt.
 */
export function SzenarioEditor({ szenario, onAendern, onSichern, onVerwerfen }: Props) {
  const [offenerPatient, setOffenerPatient] = useState<string | null>(
    szenario.patienten[0]?.id ?? null,
  );
  const ergebnis = pruefeSzenario(szenario);
  const fehler = ergebnis.befunde.filter((befund) => befund.schwere === 'fehler');

  // Der Probelauf rechnet - er läuft nur auf strukturell heilen Szenarien.
  const dynamik = useMemo(
    () => (pruefeSzenario(szenario).gueltig ? pruefeDynamik(szenario) : null),
    [szenario],
  );

  const alleBefunde = [...ergebnis.befunde, ...(dynamik?.befunde ?? [])];
  const warnungen = alleBefunde.filter((befund) => befund.schwere === 'warnung');

  const setzePatient = (index: number, patient: PatientVorlage) =>
    onAendern({
      ...szenario,
      patienten: szenario.patienten.map((vorhanden, i) => (i === index ? patient : vorhanden)),
    });

  const patientHinzufuegen = () => {
    const neuer = leererPatient(naechstePatientenNummer(szenario));
    onAendern({ ...szenario, patienten: [...szenario.patienten, neuer] });
    setOffenerPatient(neuer.id);
  };

  return (
    <div className="editor">
      <div className="editor-leiste">
        <button type="button" onClick={onVerwerfen}>
          &larr; Verwerfen
        </button>
        <span className="editor-status">
          {fehler.length > 0
            ? `${fehler.length} Fehler`
            : warnungen.length > 0
              ? `${warnungen.length} Hinweise`
              : 'Alles stimmig'}
        </span>
        <button type="button" className="primaer" disabled={fehler.length > 0} onClick={onSichern}>
          Szenario sichern
        </button>
      </div>

      <section className="karte">
        <h3>Lage</h3>
        <label>
          Titel
          <input value={szenario.titel} onChange={(e) => onAendern({ ...szenario, titel: e.target.value })} />
        </label>
        <label>
          Lagemeldung
          <textarea
            rows={3}
            value={szenario.lagemeldung}
            onChange={(e) => onAendern({ ...szenario, lagemeldung: e.target.value })}
          />
        </label>
        <label>
          Hinweis für die Übungsleitung
          <textarea
            rows={2}
            value={szenario.einsatzhinweis}
            onChange={(e) => onAendern({ ...szenario, einsatzhinweis: e.target.value })}
          />
        </label>
      </section>

      {alleBefunde.length > 0 && (
        <section className="karte">
          <h3>Prüfung</h3>
          <ul className="pruefliste">
            {alleBefunde.map((befund, index) => (
              <li key={index} className={`befund-${befund.schwere}`}>
                <span className="befund-ort">{befund.ort}</span>
                <span>{befund.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dynamik && (
        <section className="karte">
          <h3>Probelauf über {HORIZONT_MIN} Minuten</h3>
          <p className="hinweis">
            Jeder Patient wird zweimal durchgespielt: ohne jede Hilfe und mit allen passenden
            Maßnahmen sofort.
          </p>
          <div className="tabelle-scroll">
            <table className="probelauf">
              <thead>
                <tr>
                  <th scope="col">Patient</th>
                  <th scope="col">SK</th>
                  <th scope="col">ohne Hilfe</th>
                  <th scope="col">versorgt</th>
                </tr>
              </thead>
              <tbody>
                {dynamik.patienten.map((eintrag) => (
                  <tr key={eintrag.id}>
                    <td>
                      {eintrag.id} · {eintrag.name}
                    </td>
                    <td>{eintrag.erwarteteSK.replace('SK', '')}</td>
                    <td>
                      {eintrag.todUnbehandeltMin !== null
                        ? `† nach ${eintrag.todUnbehandeltMin} min`
                        : eintrag.veraendertSich
                          ? 'überlebt, verschlechtert sich'
                          : 'unverändert'}
                    </td>
                    <td>
                      {eintrag.todBehandeltMin !== null
                        ? `† nach ${eintrag.todBehandeltMin} min`
                        : 'gerettet'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="karte">
        <h3>Patienten ({szenario.patienten.length})</h3>
        <div className="editor-patientenliste">
          {szenario.patienten.map((patient, index) => {
            const offen = offenerPatient === patient.id;
            return (
              <div key={index} className={`gruppe${offen ? ' gruppe-offen' : ''}`}>
                <button
                  type="button"
                  className="gruppe-kopf"
                  aria-expanded={offen}
                  onClick={() => setOffenerPatient(offen ? null : patient.id)}
                >
                  <span className="gruppe-kuerzel">{patient.erwarteteSK.replace('SK', '')}</span>
                  <span className="gruppe-titel">
                    {patient.id} · {patient.name}
                  </span>
                  <span className="gruppe-pfeil" aria-hidden="true">
                    {offen ? '▾' : '▸'}
                  </span>
                </button>
                {offen && (
                  <div className="gruppe-inhalt">
                    <PatientEditor
                      patient={patient}
                      onAendern={(neu) => setzePatient(index, neu)}
                      onEntfernen={() =>
                        onAendern({
                          ...szenario,
                          patienten: szenario.patienten.filter((_, i) => i !== index),
                        })
                      }
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="editor-aktionen">
          <button type="button" onClick={patientHinzufuegen}>
            Patient hinzufügen
          </button>
        </div>
      </section>
    </div>
  );
}
