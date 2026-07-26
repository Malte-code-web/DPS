import { useState } from 'react';
import { SZENARIEN } from '../domain/szenarien';
import { pruefeSzenario } from '../domain/szenarioPruefung';
import { freieSzenarioId } from '../lib/speicher';
import { leeresSzenario } from '../lib/vorlagen';
import { useSimulation } from '../state/useSimulation';
import { KiGenerator } from './uebungsleitung/KiGenerator';
import { SzenarioEditor } from './uebungsleitung/SzenarioEditor';
import type { Befund } from '../domain/szenarioPruefung';
import type { Szenario } from '../domain/types';

/**
 * @anker ui.uebungsleitung Szenarien anlegen, prüfen, ein- und ausgeben
 *
 * Drei Wege zu einem eigenen Szenario: von Hand anlegen, ein mitgeliefertes
 * duplizieren oder eine KI beauftragen. Alles läuft über dieselbe Prüfung.
 */
export function UebungsleitungSeite() {
  const { state, dispatch } = useSimulation();
  const [entwurf, setEntwurf] = useState<Szenario | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [importText, setImportText] = useState('');
  const [importBefunde, setImportBefunde] = useState<Befund[]>([]);

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

      <KiGenerator
        onEntwurf={(szenario) =>
          setEntwurf({
            ...szenario,
            id: alleIds.includes(szenario.id)
              ? freieSzenarioId(szenario.titel, alleIds)
              : szenario.id,
          })
        }
        onMeldung={setMeldung}
      />

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
