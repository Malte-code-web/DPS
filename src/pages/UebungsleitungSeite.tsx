import { useState } from 'react';
import { SZENARIEN } from '../domain/szenarien';
import { pruefeSzenario } from '../domain/szenarioPruefung';
import { baueKiPrompt } from '../lib/kiPrompt';
import { freieSzenarioId } from '../lib/speicher';
import { leeresSzenario } from '../lib/vorlagen';
import { useSimulation } from '../state/useSimulation';
import { SzenarioEditor } from './uebungsleitung/SzenarioEditor';
import type { Befund } from '../domain/szenarioPruefung';
import type { Szenario } from '../domain/types';

/**
 * @anker ui.uebungsleitung Szenarien anlegen, prüfen, ein- und ausgeben
 *
 * Drei Wege zu einem eigenen Szenario: von Hand anlegen, ein mitgeliefertes
 * duplizieren oder eine KI beauftragen und das Ergebnis importieren. Alles
 * läuft über dieselbe Prüfung.
 */
export function UebungsleitungSeite() {
  const { state, dispatch } = useSimulation();
  const [entwurf, setEntwurf] = useState<Szenario | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importBefunde, setImportBefunde] = useState<Befund[]>([]);
  const [kiOffen, setKiOffen] = useState(false);
  const [wunsch, setWunsch] = useState({
    lage: 'Zugunglück am Bahnhof, ein Waggon entgleist.',
    anzahl: 8,
    schwerpunkt: 'Mehrere Eingeklemmte, eine verzögerte Verschlechterung.',
  });

  const alleIds = [...SZENARIEN, ...state.eigeneSzenarien].map((szenario) => szenario.id);

  const sichere = (szenario: Szenario) => {
    const ohneAltes = state.eigeneSzenarien.filter((eintrag) => eintrag.id !== szenario.id);
    dispatch({ typ: 'eigeneSzenarienSetzen', szenarien: [...ohneAltes, szenario] });
    setEntwurf(null);
    setMeldung(`"${szenario.titel}" gesichert.`);
  };

  const entferne = (szenario: Szenario) => {
    dispatch({
      typ: 'eigeneSzenarienSetzen',
      szenarien: state.eigeneSzenarien.filter((eintrag) => eintrag.id !== szenario.id),
    });
    setMeldung(`"${szenario.titel}" gelöscht.`);
  };

  const dupliziere = (vorlage: Szenario) => {
    const id = freieSzenarioId(`${vorlage.titel} Kopie`, alleIds);
    setEntwurf({ ...structuredClone(vorlage), id, titel: `${vorlage.titel} (Kopie)` });
    setMeldung(null);
  };

  const exportiere = (szenario: Szenario) => {
    const datei = new Blob([JSON.stringify(szenario, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(datei);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${szenario.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importiere = () => {
    setImportBefunde([]);
    let daten: unknown;
    try {
      daten = JSON.parse(importText);
    } catch {
      setImportBefunde([
        { schwere: 'fehler', ort: 'Eingabe', text: 'Kein gültiges JSON - bitte vollständig einfügen.' },
      ]);
      return;
    }
    const ergebnis = pruefeSzenario(daten);
    setImportBefunde(ergebnis.befunde);
    if (!ergebnis.gueltig) return;

    const szenario = daten as Szenario;
    const id = alleIds.includes(szenario.id)
      ? freieSzenarioId(szenario.titel, alleIds)
      : szenario.id;
    setEntwurf({ ...szenario, id });
    setImportText('');
    setMeldung('Szenario geprüft - jetzt kontrollieren und sichern.');
  };

  if (entwurf) {
    return (
      <main className="uebungsleitung">
        <SzenarioEditor
          szenario={entwurf}
          onAendern={setEntwurf}
          onSichern={() => sichere(entwurf)}
          onVerwerfen={() => setEntwurf(null)}
        />
      </main>
    );
  }

  return (
    <main className="uebungsleitung">
      <header className="setup-kopf">
        <button type="button" onClick={() => dispatch({ typ: 'zurueckZumStart' })}>
          &larr; Startseite
        </button>
        <h1>Übungsleitung</h1>
        <p>
          Eigene Lagen bauen, prüfen und weitergeben. Jedes Szenario wird gegen dieselben Regeln
          geprüft wie die mitgelieferten - inklusive Abgleich der Referenzkategorie mit mSTaRT.
        </p>
      </header>

      {meldung && <p className="meldung">{meldung}</p>}

      <section className="szenarioliste">
        <h2>Eigene Szenarien</h2>
        {state.eigeneSzenarien.length === 0 ? (
          <p className="hinweis">Noch keine eigenen Szenarien.</p>
        ) : (
          state.eigeneSzenarien.map((szenario) => (
            <article key={szenario.id} className="szenario-karte">
              <h3>{szenario.titel}</h3>
              <p className="lagemeldung">{szenario.lagemeldung}</p>
              <div className="szenario-fuss">
                <span>{szenario.patienten.length} Betroffene</span>
                <div className="editor-aktionen">
                  <button type="button" onClick={() => setEntwurf(structuredClone(szenario))}>
                    Bearbeiten
                  </button>
                  <button type="button" onClick={() => exportiere(szenario)}>
                    Exportieren
                  </button>
                  <button type="button" className="gefahr" onClick={() => entferne(szenario)}>
                    Löschen
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
        <div className="editor-aktionen">
          <button
            type="button"
            className="primaer"
            onClick={() => {
              setEntwurf(leeresSzenario(freieSzenarioId('Neues Szenario', alleIds)));
              setMeldung(null);
            }}
          >
            Neues Szenario anlegen
          </button>
        </div>
      </section>

      <section className="szenarioliste">
        <h2>Als Vorlage verwenden</h2>
        {SZENARIEN.map((szenario) => (
          <article key={szenario.id} className="szenario-karte">
            <h3>{szenario.titel}</h3>
            <p className="lagemeldung">{szenario.lagemeldung}</p>
            <div className="szenario-fuss">
              <span>{szenario.patienten.length} Betroffene</span>
              <button type="button" onClick={() => dupliziere(szenario)}>
                Kopie bearbeiten
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="karte">
        <h3>Szenario von einer KI entwerfen lassen</h3>
        <p className="hinweis">
          Die App ruft selbst kein Modell auf. Sie erzeugt den vollständigen Auftrag mit allen
          Regeln und Maßnahmen-IDs; das Ergebnis fügst du unten wieder ein.
        </p>

        <button type="button" onClick={() => setKiOffen(!kiOffen)}>
          {kiOffen ? 'Auftrag ausblenden' : 'Auftrag erstellen'}
        </button>

        {kiOffen && (
          <>
            <div className="editor-zeile">
              <label>
                Lage
                <input
                  value={wunsch.lage}
                  onChange={(e) => setWunsch({ ...wunsch, lage: e.target.value })}
                />
              </label>
              <label>
                Betroffene
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={wunsch.anzahl}
                  onChange={(e) => setWunsch({ ...wunsch, anzahl: Number(e.target.value) })}
                />
              </label>
            </div>
            <label>
              Schwerpunkt
              <input
                value={wunsch.schwerpunkt}
                onChange={(e) => setWunsch({ ...wunsch, schwerpunkt: e.target.value })}
              />
            </label>
            <textarea className="ki-prompt" rows={10} readOnly value={baueKiPrompt(wunsch)} />
            <button
              type="button"
              className="primaer"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(baueKiPrompt(wunsch))
                  .then(() => setMeldung('Auftrag kopiert - in eine KI einfügen.'))
                  .catch(() => setMeldung('Kopieren nicht möglich - Text von Hand markieren.'));
              }}
            >
              Auftrag kopieren
            </button>
          </>
        )}
      </section>

      <section className="karte">
        <h3>Szenario einfügen oder importieren</h3>
        <textarea
          rows={6}
          placeholder="JSON hier einfügen"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        {importBefunde.length > 0 && (
          <ul className="pruefliste">
            {importBefunde.map((befund, index) => (
              <li key={index} className={`befund-${befund.schwere}`}>
                <span className="befund-ort">{befund.ort}</span>
                <span>{befund.text}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="editor-aktionen">
          <button type="button" className="primaer" disabled={!importText.trim()} onClick={importiere}>
            Prüfen und übernehmen
          </button>
          <label className="datei-knopf">
            Datei wählen
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const datei = e.target.files?.[0];
                if (datei) setImportText(await datei.text());
                e.target.value = '';
              }}
            />
          </label>
        </div>
      </section>
    </main>
  );
}
