import { KATEGORIEN, KATEGORIE_LABEL, massnahmenDerKategorie } from '../../domain/massnahmen';
import { startwert } from '../../domain/simulation';
import { mstartAbweichung } from '../../domain/szenarioPruefung';
import { KOERPERREGION_TEXT, PUPILLEN_TEXT, SICHTUNGSKATEGORIEN } from '../../domain/types';
import { VITAL_META, VITAL_REIHENFOLGE } from '../../lib/format';
import { leeresProblem } from '../../lib/vorlagen';
import type {
  Koerperregion,
  MassnahmeId,
  PatientVorlage,
  Problem,
  Pupillenbefund,
  Sichtungskategorie,
  VitalKey,
} from '../../domain/types';

const KATEGORIE_AUSWAHL: Sichtungskategorie[] = ['SK1', 'SK2', 'SK3', 'SK4'];

const BEFUND_FELDER = [
  ['gehfaehig', 'Gehfähig'],
  ['kritischeBlutung', 'Kritische Blutung'],
  ['spontanatmung', 'Spontanatmung'],
  ['befolgtAufforderungen', 'Befolgt Aufforderungen'],
] as const;

interface Props {
  patient: PatientVorlage;
  onAendern: (patient: PatientVorlage) => void;
  onEntfernen: () => void;
}

/**
 * @anker ui.patienteditor Formular für einen Szenario-Patienten samt Problemen
 *
 * Die Referenzkategorie wird laufend gegen mSTaRT geprüft. Abweichungen sind
 * erlaubt, werden aber angezeigt - mit einer Schaltfläche zum Übernehmen.
 */
export function PatientEditor({ patient, onAendern, onEntfernen }: Props) {
  const abweichung = mstartAbweichung(patient);

  const setze = <K extends keyof PatientVorlage>(feld: K, wert: PatientVorlage[K]) =>
    onAendern({ ...patient, [feld]: wert });

  const setzeVital = (key: VitalKey, wert: number) =>
    onAendern({ ...patient, startVitalwerte: { ...patient.startVitalwerte, [key]: wert } });

  const setzeProblem = (index: number, problem: Problem) =>
    onAendern({
      ...patient,
      probleme: patient.probleme.map((vorhanden, i) => (i === index ? problem : vorhanden)),
    });

  return (
    <div className="editor-patient">
      <div className="editor-zeile">
        <label>
          Kennung
          <input value={patient.id} onChange={(e) => setze('id', e.target.value)} />
        </label>
        <label>
          Name
          <input value={patient.name} onChange={(e) => setze('name', e.target.value)} />
        </label>
        <label>
          Alter
          <input
            type="number"
            min={0}
            max={120}
            value={patient.alter}
            onChange={(e) => setze('alter', Number(e.target.value))}
          />
        </label>
        <label>
          Geschlecht
          <select
            value={patient.geschlecht}
            onChange={(e) => setze('geschlecht', e.target.value as PatientVorlage['geschlecht'])}
          >
            <option value="w">weiblich</option>
            <option value="m">männlich</option>
            <option value="d">divers</option>
          </select>
        </label>
      </div>

      <label>
        Kurzbefund (erster Blick)
        <textarea
          rows={2}
          value={patient.kurzbefund}
          onChange={(e) => setze('kurzbefund', e.target.value)}
        />
      </label>

      <label>
        Untersuchungsbefund (Bodycheck)
        <textarea
          rows={2}
          value={patient.untersuchungsbefund}
          onChange={(e) => setze('untersuchungsbefund', e.target.value)}
        />
      </label>

      <span className="editor-untertitel">
        Ergebnisse der einzelnen Untersuchungen - leer heißt unauffällig
      </span>
      <div className="editor-zeile">
        <label>
          Pupillen
          <select
            value={patient.pupillen ?? 'unauffaellig'}
            onChange={(e) => setze('pupillen', e.target.value as Pupillenbefund)}
          >
            {(Object.keys(PUPILLEN_TEXT) as Pupillenbefund[]).map((wert) => (
              <option key={wert} value={wert}>
                {PUPILLEN_TEXT[wert]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Auskultation
          <input
            value={patient.auskultation ?? ''}
            placeholder="seitengleich belüftet"
            onChange={(e) => setze('auskultation', e.target.value || undefined)}
          />
        </label>
        <label>
          EKG
          <input
            value={patient.ekg ?? ''}
            placeholder="Sinusrhythmus"
            onChange={(e) => setze('ekg', e.target.value || undefined)}
          />
        </label>
      </div>

      <h4>Befunde der Vorsichtung</h4>
      <div className="editor-schalter">
        {BEFUND_FELDER.map(([feld, beschriftung]) => (
          <label key={feld} className="editor-haken">
            <input
              type="checkbox"
              checked={patient[feld]}
              onChange={(e) => setze(feld, e.target.checked)}
            />
            {beschriftung}
          </label>
        ))}
      </div>

      <h4>Startwerte</h4>
      <div className="editor-vitalwerte">
        {VITAL_REIHENFOLGE.map((key) => (
          <label key={key}>
            {VITAL_META[key].kurz}
            <input
              type="number"
              step={key === 'rekapzeit' || key === 'temperatur' ? 0.1 : 1}
              // Die später ergänzten Werte dürfen in der Vorlage fehlen.
              value={startwert(patient.startVitalwerte, key)}
              onChange={(e) => setzeVital(key, Number(e.target.value))}
            />
          </label>
        ))}
      </div>

      <h4>Referenzkategorie</h4>
      <div className="editor-kategorien">
        {KATEGORIE_AUSWAHL.map((kategorie) => (
          <button
            key={kategorie}
            type="button"
            className={`sichtung-button sk-${kategorie}${
              patient.erwarteteSK === kategorie ? ' sichtung-gewaehlt' : ''
            }`}
            onClick={() => setze('erwarteteSK', kategorie)}
          >
            SK {SICHTUNGSKATEGORIEN[kategorie].kuerzel}
            <small>{SICHTUNGSKATEGORIEN[kategorie].bezeichnung}</small>
          </button>
        ))}
      </div>
      {abweichung ? (
        <p className="editor-abweichung">
          mSTaRT ergibt aus diesen Startwerten <strong>{abweichung}</strong>.
          <button type="button" onClick={() => setze('erwarteteSK', abweichung)}>
            Übernehmen
          </button>
        </p>
      ) : (
        <p className="editor-stimmig">Referenzkategorie stimmt mit mSTaRT überein.</p>
      )}

      <h4>Probleme</h4>
      {patient.probleme.length === 0 && (
        <p className="hinweis">
          Ohne Problem bleibt der Patient über die gesamte Übung unverändert.
        </p>
      )}
      {patient.probleme.map((problem, index) => (
        <ProblemEditor
          key={index}
          problem={problem}
          onAendern={(neu) => setzeProblem(index, neu)}
          onEntfernen={() =>
            onAendern({
              ...patient,
              probleme: patient.probleme.filter((_, i) => i !== index),
            })
          }
        />
      ))}

      <div className="editor-aktionen">
        <button
          type="button"
          onClick={() =>
            onAendern({
              ...patient,
              probleme: [...patient.probleme, leeresProblem(patient.probleme.length + 1)],
            })
          }
        >
          Problem hinzufügen
        </button>
        <button type="button" className="gefahr" onClick={onEntfernen}>
          Patient entfernen
        </button>
      </div>
    </div>
  );
}

interface ProblemProps {
  problem: Problem;
  onAendern: (problem: Problem) => void;
  onEntfernen: () => void;
}

function ProblemEditor({ problem, onAendern, onEntfernen }: ProblemProps) {
  const umschalten = (id: MassnahmeId) => {
    const enthalten = problem.behandeltDurch.includes(id);
    onAendern({
      ...problem,
      behandeltDurch: enthalten
        ? problem.behandeltDurch.filter((vorhanden) => vorhanden !== id)
        : [...problem.behandeltDurch, id],
    });
  };

  const setzeVerlauf = (key: VitalKey, roh: string) => {
    const verlauf = { ...problem.verlauf };
    if (roh === '') {
      delete verlauf[key];
    } else {
      verlauf[key] = Number(roh);
    }
    onAendern({ ...problem, verlauf });
  };

  return (
    <div className="editor-problem">
      <div className="editor-zeile">
        <label>
          Kennung
          <input value={problem.id} onChange={(e) => onAendern({ ...problem, id: e.target.value })} />
        </label>
        <label>
          Bezeichnung
          <input
            value={problem.label}
            onChange={(e) => onAendern({ ...problem, label: e.target.value })}
          />
        </label>
        <label>
          Wirkt ab Minute
          <input
            type="number"
            min={0}
            value={problem.startetNachMin ?? 0}
            onChange={(e) => {
              const wert = Number(e.target.value);
              const { startetNachMin, ...rest } = problem;
              void startetNachMin;
              onAendern(wert > 0 ? { ...rest, startetNachMin: wert } : rest);
            }}
          />
        </label>
      </div>

      <label>
        Befund
        <input
          value={problem.beschreibung}
          onChange={(e) => onAendern({ ...problem, beschreibung: e.target.value })}
        />
      </label>

      <div className="editor-zeile">
        <label>
          Körperregion
          <select
            value={problem.koerperregion ?? ''}
            onChange={(e) => {
              const { koerperregion, ...rest } = problem;
              void koerperregion;
              onAendern(
                e.target.value
                  ? { ...rest, koerperregion: e.target.value as Koerperregion }
                  : rest,
              );
            }}
          >
            <option value="">ohne Markierung</option>
            {(Object.keys(KOERPERREGION_TEXT) as Koerperregion[]).map((region) => (
              <option key={region} value={region}>
                {KOERPERREGION_TEXT[region]}
              </option>
            ))}
          </select>
        </label>
        <label className="editor-haken">
          <input
            type="checkbox"
            checked={problem.offensichtlich ?? false}
            onChange={(e) => {
              const { offensichtlich, ...rest } = problem;
              void offensichtlich;
              onAendern(e.target.checked ? { ...rest, offensichtlich: true } : rest);
            }}
          />
          Offensichtlich – sofort im Körperschema, ohne Bodycheck
        </label>
      </div>
      <span className="editor-untertitel">
        Was die Einsatzkraft vorfindet - nicht, was sie tun soll. Die Anwendung
        sagt während der Übung nichts vor.
      </span>

      <span className="editor-untertitel">Veränderung pro Minute, solange unbehandelt</span>
      <div className="editor-vitalwerte">
        {VITAL_REIHENFOLGE.map((key) => (
          <label key={key}>
            {VITAL_META[key].kurz}
            <input
              type="number"
              step={0.1}
              value={problem.verlauf[key] ?? ''}
              placeholder="0"
              onChange={(e) => setzeVerlauf(key, e.target.value)}
            />
          </label>
        ))}
      </div>

      <span className="editor-untertitel">Wird behoben durch</span>
      <div className="editor-massnahmen">
        {KATEGORIEN.map((kategorie) => (
          <div key={kategorie}>
            <span className="editor-gruppe">{KATEGORIE_LABEL[kategorie]}</span>
            {massnahmenDerKategorie(kategorie).map((massnahme) => (
              <label key={massnahme.id} className="editor-haken">
                <input
                  type="checkbox"
                  checked={problem.behandeltDurch.includes(massnahme.id)}
                  onChange={() => umschalten(massnahme.id)}
                />
                {massnahme.label}
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="editor-aktionen">
        <button type="button" className="gefahr" onClick={onEntfernen}>
          Problem entfernen
        </button>
      </div>
    </div>
  );
}
