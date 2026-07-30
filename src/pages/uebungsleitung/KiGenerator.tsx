import { useRef, useState } from 'react';
import { erzeugeSzenario, KiFehler } from '../../lib/kiClient';
import { baueKiPrompt } from '../../lib/kiPrompt';
import {
  KI_MODELLE,
  ladeKiZugang,
  loescheKiZugang,
  sichereKiZugang,
  zugangVollstaendig,
} from '../../lib/kiZugang';
import type { Befund } from '../../domain/szenarioPruefung';
import type { Szenario } from '../../domain/types';
import type { PromptWunsch } from '../../lib/kiPrompt';

/**
 * @anker ui.kigenerator Vom Modell erzeugen lassen - Zugang, Lauf, Befunde
 *
 * Der Weg über ein Sprachmodell: Lage frei beschreiben, Knopf drücken,
 * fertiges Szenario im Editor. Kostet Geld und braucht Netz - wer beides nicht
 * will, nimmt den Baukasten (→ `ui.baukasten`). Der Umweg über die
 * Zwischenablage bleibt für Geräte ohne hinterlegten Zugang bestehen.
 */
export interface KiGeneratorProps {
  onEntwurf: (szenario: Szenario) => void;
  onMeldung: (text: string) => void;
}

export function KiGenerator({ onEntwurf, onMeldung }: KiGeneratorProps) {
  const [zugang, setZugang] = useState(() => ladeKiZugang());
  const [zugangOffen, setZugangOffen] = useState(false);
  const [kopierOffen, setKopierOffen] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [protokoll, setProtokoll] = useState<string[]>([]);
  const [befunde, setBefunde] = useState<Befund[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const abbruch = useRef<AbortController | null>(null);

  const [wunsch, setWunsch] = useState<PromptWunsch>({
    lage: 'Zugunglück am Bahnhof, ein Waggon entgleist.',
    anzahl: 8,
    schwerpunkt: 'Mehrere Eingeklemmte, eine verzögerte Verschlechterung.',
  });

  const bereit = zugangVollstaendig(zugang);

  const aendereZugang = (teil: Partial<typeof zugang>) => {
    const naechster = { ...zugang, ...teil };
    setZugang(naechster);
    sichereKiZugang(naechster);
  };

  const starte = async () => {
    setLaeuft(true);
    setProtokoll([]);
    setBefunde([]);
    setFehler(null);
    abbruch.current = new AbortController();

    try {
      const ergebnis = await erzeugeSzenario({
        wunsch,
        zugang,
        melde: (text) => setProtokoll((bisher) => [...bisher, text]),
        signal: abbruch.current.signal,
      });
      setBefunde(ergebnis.befunde);
      onEntwurf(ergebnis.szenario);
      onMeldung(
        ergebnis.befunde.length === 0
          ? `Szenario erzeugt und geprüft (${ergebnis.versuche} Durchgänge) - jetzt kontrollieren und sichern.`
          : `Szenario erzeugt, ${ergebnis.befunde.length} Hinweise bleiben offen - bitte im Editor ansehen.`,
      );
    } catch (problem) {
      setFehler(problem instanceof KiFehler ? problem.message : 'Unerwarteter Fehler.');
    } finally {
      setLaeuft(false);
      abbruch.current = null;
    }
  };

  return (
    <>
      <p className="hinweis">
        Die App schickt den Auftrag direkt an das Modell, prüft das Ergebnis und spielt jeden
        Patienten durch. Was nicht stimmt, geht automatisch zur Nachbesserung zurück. Braucht
        einen eigenen API-Schlüssel und verursacht Kosten je Szenario.
      </p>

      <div className="editor-zeile">
        <label>
          Lage
          <input
            value={wunsch.lage}
            disabled={laeuft}
            onChange={(e) => setWunsch({ ...wunsch, lage: e.target.value })}
          />
        </label>
        <label>
          Betroffene
          <input
            type="number"
            min={1}
            max={30}
            disabled={laeuft}
            value={wunsch.anzahl}
            onChange={(e) => setWunsch({ ...wunsch, anzahl: Number(e.target.value) })}
          />
        </label>
      </div>
      <label>
        Schwerpunkt
        <input
          value={wunsch.schwerpunkt}
          disabled={laeuft}
          onChange={(e) => setWunsch({ ...wunsch, schwerpunkt: e.target.value })}
        />
      </label>

      <div className="editor-aktionen">
        <button
          type="button"
          className="primaer"
          disabled={laeuft || !bereit || !wunsch.lage.trim()}
          onClick={() => void starte()}
        >
          {laeuft ? 'Erzeuge …' : 'Szenario erzeugen'}
        </button>
        {laeuft && (
          <button type="button" onClick={() => abbruch.current?.abort()}>
            Abbrechen
          </button>
        )}
        <button type="button" onClick={() => setZugangOffen(!zugangOffen)}>
          {bereit ? 'Zugang ändern' : 'Zugang einrichten'}
        </button>
      </div>

      {!bereit && !zugangOffen && (
        <p className="hinweis">
          Dafür wird einmalig ein API-Schlüssel gebraucht. Ohne Zugang bleibt der Auftrag zum
          Kopieren unten.
        </p>
      )}

      {zugangOffen && (
        <div className="ki-zugang">
          <p className="warnung-text">
            Der Schlüssel wird nur auf diesem Gerät gespeichert (localStorage) und ausschließlich an
            die eingetragene Adresse gesendet. Auf gemeinsam genutzten oder öffentlich gehosteten
            Installationen gehört stattdessen ein eigener Dienst davor - dann die Adresse eintragen
            und das Schlüsselfeld leer lassen.
          </p>
          <label>
            API-Schlüssel
            <input
              type="password"
              autoComplete="off"
              placeholder="sk-ant-…"
              value={zugang.schluessel}
              onChange={(e) => aendereZugang({ schluessel: e.target.value })}
            />
          </label>
          {zugang.adresse.trim().length > 0 && zugang.schluessel.trim().length > 0 && (
            <p className="hinweis hinweis-knapp">
              Adresse UND Schlüssel eingetragen: Es wird nur an die Adresse gesendet, der Schlüssel
              bleibt ungenutzt. Zum direkten Zugang ohne eigenen Dienst bitte die Adresse leeren.
            </p>
          )}
          <div className="editor-zeile">
            <label>
              Modell
              <select
                value={zugang.modell}
                onChange={(e) => aendereZugang({ modell: e.target.value })}
              >
                {KI_MODELLE.map((modell) => (
                  <option key={modell.id} value={modell.id}>
                    {modell.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Adresse (optional)
              <input
                placeholder="https://eigener-dienst.example/v1"
                value={zugang.adresse}
                onChange={(e) => aendereZugang({ adresse: e.target.value })}
              />
            </label>
          </div>
          <div className="editor-aktionen">
            <button
              type="button"
              className="gefahr"
              onClick={() => {
                loescheKiZugang();
                setZugang({ schluessel: '', modell: KI_MODELLE[0]!.id, adresse: '' });
                onMeldung('Zugang von diesem Gerät gelöscht.');
              }}
            >
              Zugang löschen
            </button>
          </div>
        </div>
      )}

      {protokoll.length > 0 && (
        <ol className="ki-protokoll">
          {protokoll.map((zeile, index) => (
            <li key={index}>{zeile}</li>
          ))}
        </ol>
      )}

      {fehler && <p className="fehler-text">{fehler}</p>}

      {befunde.length > 0 && (
        <ul className="pruefliste">
          {befunde.map((befund, index) => (
            <li key={index} className={`befund-${befund.schwere}`}>
              <span className="befund-ort">{befund.ort}</span>
              <span>{befund.text}</span>
            </li>
          ))}
        </ul>
      )}

      <details
        className="ki-kopieren"
        open={kopierOffen}
        onToggle={(e) => setKopierOffen(e.currentTarget.open)}
      >
        <summary>Ohne Zugang: Auftrag zum Kopieren</summary>
        <p className="hinweis">
          Für Geräte ohne hinterlegten Schlüssel: Auftrag kopieren, in eine beliebige KI einfügen
          und das Ergebnis unten wieder importieren.
        </p>
        <textarea className="ki-prompt" rows={10} readOnly value={baueKiPrompt(wunsch)} />
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard
              ?.writeText(baueKiPrompt(wunsch))
              .then(() => onMeldung('Auftrag kopiert - in eine KI einfügen.'))
              .catch(() => onMeldung('Kopieren nicht möglich - Text von Hand markieren.'));
          }}
        >
          Auftrag kopieren
        </button>
      </details>
    </>
  );
}
