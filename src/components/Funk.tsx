import { useEffect, useRef, useState } from 'react';
import { abschnittInfo } from '../domain/abschnitte';
import { erzeugeId } from '../domain/sitzung';
import { SICHTUNGSKATEGORIEN } from '../domain/types';
import { ZAEHL_REIHENFOLGE, zaehleSichtung } from '../lib/auswertung';
import { zeitFormat } from '../lib/format';
import { useSimulation } from '../state/useSimulation';
import type { FunkmeldungKategorie } from '../domain/types';
import type { Zaehlschluessel } from '../lib/auswertung';

const KATEGORIE_LABEL: Record<FunkmeldungKategorie, string> = {
  lagemeldung: 'Lagemeldung',
  anforderung: 'Anforderung',
  rueckmeldung: 'Rückmeldung',
};

const PLATZHALTER: Record<FunkmeldungKategorie, string> = {
  lagemeldung: 'z. B. Lage unverändert, 2 weitere SK I aufgenommen',
  anforderung: 'z. B. Wir brauchen einen weiteren RTW im roten Zelt',
  rueckmeldung: 'z. B. Verstanden, Fahrzeug ist unterwegs',
};

/** Toast-Anzeigedauer, bevor sie von selbst wieder verschwindet. */
const TOAST_DAUER_MS = 6000;

function sichtungsstandText(stand: Partial<Record<Zaehlschluessel, number>>): string {
  return ZAEHL_REIHENFOLGE.filter((schluessel) => (stand[schluessel] ?? 0) > 0)
    .map((schluessel) => {
      const label = schluessel === 'offen' ? 'offen' : `SK ${SICHTUNGSKATEGORIEN[schluessel].kuerzel}`;
      return `${label}: ${stand[schluessel]}`;
    })
    .join(', ');
}

/**
 * @anker ui.funk Funkkanal: strukturierte Meldungen statt freiem Chat
 *
 * Wie im echten BOS-Funk hört jede Person im Kanal jede Übertragung mit -
 * die Liste zeigt allen dieselben Einträge (→ `modell.funkmeldung`). Nur
 * Spieler dürfen `Lagemeldung`/`Anforderung` senden, nur die Übungsleitung
 * `Rückmeldung` - so bleibt der Meldeweg hierarchisch, ohne dass die App
 * Zustellung pro Person nachhalten muss. Nicht blockierend: ein Knopf öffnet
 * ein Panel, eine kurz aufblitzende Benachrichtigung informiert über neue
 * Meldungen, ähnlich der Delegationsanfrage (→ `ui.delegationsbenachrichtigung`).
 */
export function Funk() {
  const { state, dispatch } = useSimulation();
  const eigeneId = state.sitzung.eigeneId;
  const istHost = state.sitzung.rolle === 'uebungsleiter';
  const meldungen = state.funkmeldungen;

  const [offen, setOffen] = useState(false);
  const [gesehenAnzahl, setGesehenAnzahl] = useState(meldungen.length);
  const [kategorie, setKategorie] = useState<FunkmeldungKategorie>('lagemeldung');
  const [text, setText] = useState('');
  const [antwortAufId, setAntwortAufId] = useState<string | null>(null);

  // Nur wirklich neue Meldungen anzeigen, nicht die gesamte Vorgeschichte
  // beim Beitritt (→ `state.schnappschuss`, der Verlauf kommt oft am Stück).
  const bekannteAnzahlRef = useRef(meldungen.length);
  const [toast, setToast] = useState<(typeof meldungen)[number] | null>(null);
  useEffect(() => {
    if (meldungen.length > bekannteAnzahlRef.current) {
      const neue = meldungen[meldungen.length - 1];
      if (neue && neue.absenderId !== eigeneId) setToast(neue);
    }
    bekannteAnzahlRef.current = meldungen.length;
  }, [meldungen, eigeneId]);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), TOAST_DAUER_MS);
    return () => clearTimeout(timeout);
  }, [toast]);

  const ungelesen = meldungen.slice(gesehenAnzahl).filter((m) => m.absenderId !== eigeneId).length;

  const oeffnen = () => {
    setOffen(true);
    setGesehenAnzahl(meldungen.length);
    setToast(null);
  };

  const eigenerAbschnitt = istHost
    ? (antwortAufId && meldungen.find((m) => m.id === antwortAufId)?.abschnitt) ||
      state.ausgewaehlterAbschnitt
    : (state.sitzung.spieler.find((s) => s.id === eigeneId)?.aktuellerAbschnitt ??
      state.ausgewaehlterAbschnitt);

  const senden = () => {
    if (!eigeneId || text.trim().length === 0) return;
    const gesendeteKategorie: FunkmeldungKategorie = istHost ? 'rueckmeldung' : kategorie;
    const sichtungsstand =
      gesendeteKategorie === 'lagemeldung'
        ? zaehleSichtung(state.patienten.filter((p) => p.abschnitt === eigenerAbschnitt))
        : undefined;
    dispatch({
      typ: 'funkmeldungSenden',
      id: erzeugeId(),
      kategorie: gesendeteKategorie,
      abschnitt: eigenerAbschnitt,
      absenderId: eigeneId,
      absenderName: state.sitzung.eigenerName ?? 'Unbekannt',
      text: text.trim(),
      sichtungsstand,
      bezugId: istHost ? (antwortAufId ?? undefined) : undefined,
    });
    setText('');
    setAntwortAufId(null);
  };

  if (!state.sitzung.aktiv) return null;

  return (
    <>
      {toast && (
        <div className="funk-toast" role="status">
          <p>
            <strong>{KATEGORIE_LABEL[toast.kategorie]}</strong> von{' '}
            <strong>{toast.absenderName}</strong> ({abschnittInfo(toast.abschnitt).kurz})
          </p>
          <button type="button" className="funk-toast-knopf" onClick={oeffnen}>
            Ansehen
          </button>
        </div>
      )}

      <button
        type="button"
        className="funk-knopf"
        onClick={() => (offen ? setOffen(false) : oeffnen())}
        aria-expanded={offen}
      >
        Funk
        {ungelesen > 0 && !offen && <span className="funk-badge">{ungelesen}</span>}
      </button>

      {offen && (
        <div className="funk-panel" role="dialog" aria-label="Funkkanal">
          <div className="funk-kopf">
            <h2>Funkkanal</h2>
            <button type="button" onClick={() => setOffen(false)} aria-label="Funkpanel schließen">
              Schließen
            </button>
          </div>

          <ul className="funk-liste">
            {meldungen.length === 0 && <li className="hinweis">Noch keine Funkmeldungen.</li>}
            {meldungen.map((eintrag) => {
              const bezug = eintrag.bezugId ? meldungen.find((m) => m.id === eintrag.bezugId) : undefined;
              return (
                <li key={eintrag.id} className={`funk-eintrag funk-eintrag-${eintrag.kategorie}`}>
                  <div className="funk-eintrag-kopf">
                    <span className="funk-eintrag-kategorie">{KATEGORIE_LABEL[eintrag.kategorie]}</span>
                    <time>{zeitFormat(eintrag.zeitSek)}</time>
                  </div>
                  <p className="funk-eintrag-absender">
                    {eintrag.absenderName} · {abschnittInfo(eintrag.abschnitt).kurz}
                  </p>
                  {bezug && (
                    <p className="funk-eintrag-bezug">
                      ↳ Antwort auf: {bezug.text.slice(0, 60)}
                      {bezug.text.length > 60 ? '…' : ''}
                    </p>
                  )}
                  <p>{eintrag.text}</p>
                  {eintrag.sichtungsstand && (
                    <p className="funk-eintrag-sichtung">{sichtungsstandText(eintrag.sichtungsstand)}</p>
                  )}
                  {istHost && eintrag.kategorie !== 'rueckmeldung' && (
                    <button
                      type="button"
                      className="funk-antworten"
                      onClick={() => setAntwortAufId(eintrag.id)}
                    >
                      Antworten
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="funk-formular">
            {!istHost && (
              <label>
                Art der Meldung
                <select
                  value={kategorie}
                  onChange={(event) => setKategorie(event.target.value as FunkmeldungKategorie)}
                >
                  <option value="lagemeldung">Lagemeldung</option>
                  <option value="anforderung">Anforderung</option>
                </select>
              </label>
            )}
            {istHost && antwortAufId && (
              <p className="funk-antwort-hinweis">
                Antwort auf: {meldungen.find((m) => m.id === antwortAufId)?.text.slice(0, 60)}
                {' '}
                <button type="button" onClick={() => setAntwortAufId(null)}>
                  Abbrechen
                </button>
              </p>
            )}
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={PLATZHALTER[istHost ? 'rueckmeldung' : kategorie]}
              rows={2}
            />
            <button type="button" className="primaer" disabled={text.trim().length === 0} onClick={senden}>
              Senden
            </button>
          </div>
        </div>
      )}
    </>
  );
}
