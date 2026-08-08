import { SichtungsBadge } from '../components/SichtungsBadge';
import { MATERIAL_LABEL } from '../domain/material';
import { berechneKennzahlen, berechneMaterialverbrauch, erstelleDebriefing } from '../lib/auswertung';
import { zeitFormat } from '../lib/format';
import { useSimulation } from '../state/useSimulation';
import type { Sichtungsbewertung } from '../domain/triage';

/**
 * Spaltentitel der Auswertung. Auf schmalen Bildschirmen wird die Tabelle zu
 * Karten umgebrochen; die Titel stehen dann per data-spalte vor jedem Wert.
 */
const SPALTE = {
  patient: 'Patient',
  vergeben: 'Vorsichtung',
  referenz: 'Referenz (Eintreffen)',
  aktuell: 'Zustand am Ende',
  bewertung: 'Bewertung',
  abschluss: 'Abschlusssichtung',
  abschnitt: 'Zuletzt in',
  zeitpunkt: 'Sichtung um',
  massnahmenzeit: 'Zeit gebunden',
} as const;

const BEWERTUNG_LABEL: Record<Sichtungsbewertung, string> = {
  korrekt: 'korrekt',
  ueberschaetzt: 'überschätzt',
  unterschaetzt: 'unterschätzt',
  offen: 'nicht gesichtet',
};

/** @anker ui.debriefing Auswertung nach dem Einsatz */
export function DebriefingSeite() {
  const { state, dispatch } = useSimulation();
  const szenario = state.szenario;
  const zeilen = erstelleDebriefing(state.patienten);
  const kennzahlen = berechneKennzahlen(zeilen);
  const materialverbrauch = berechneMaterialverbrauch(state.fahrzeuge);
  const ausgefalleneFahrzeuge = state.fahrzeuge.filter((fahrzeug) => fahrzeug.ausgefallen).length;
  // Private Statusansicht (→ `state.spielerprotokoll`) - nur die eigenen
  // Zeilen, nicht die aller Mitspieler:innen. Im Einzelspiel (kein
  // `eigeneId`) bleibt sie leer, dort zeigt die Tabelle oben ohnehin schon
  // die gesamte, einzige Person.
  const meinProtokoll = state.sitzung.eigeneId
    ? state.spielerProtokoll.filter((eintrag) => eintrag.spielerId === state.sitzung.eigeneId)
    : [];
  const patientName = (patientId: string) =>
    state.patienten.find((patient) => patient.id === patientId)?.name ?? '';

  return (
    <main className="debriefing">
      <header className="debriefing-kopf">
        <div>
          <h1>Debriefing</h1>
          <p className="lagemeldung">
            {szenario?.titel} - Einsatzdauer {zeitFormat(state.zeitSek)}
          </p>
        </div>
        <button type="button" className="primaer" onClick={() => dispatch({ typ: 'zurueckZumSetup' })}>
          Neue Übung
        </button>
      </header>

      <section className="kennzahlen">
        <div className="kennzahl">
          <span className="kennzahl-wert">
            {kennzahlen.gesichtet}/{kennzahlen.gesamt}
          </span>
          <span className="kennzahl-label">gesichtet</span>
        </div>
        <div className="kennzahl">
          <span className="kennzahl-wert">
            {kennzahlen.korrekt}/{kennzahlen.gesamt}
          </span>
          <span className="kennzahl-label">korrekt kategorisiert</span>
        </div>
        <div className="kennzahl">
          <span className="kennzahl-wert">{kennzahlen.transportiert}</span>
          <span className="kennzahl-label">abtransportiert</span>
        </div>
        <div className="kennzahl kennzahl-warnung">
          <span className="kennzahl-wert">{kennzahlen.verstorben}</span>
          <span className="kennzahl-label">verstorben</span>
        </div>
        <div className="kennzahl">
          <span className="kennzahl-wert">
            {kennzahlen.vorsichtungAbgeschlossenSek === null
              ? '-'
              : zeitFormat(kennzahlen.vorsichtungAbgeschlossenSek)}
          </span>
          <span className="kennzahl-label">Vorsichtung abgeschlossen</span>
        </div>
        <div className="kennzahl">
          <span className="kennzahl-wert">{zeitFormat(kennzahlen.massnahmenzeitSek)}</span>
          <span className="kennzahl-label">gebundene Maßnahmenzeit</span>
        </div>
        <div
          className={`kennzahl${kennzahlen.individualmedizinSek > 0 ? ' kennzahl-warnung' : ''}`}
        >
          <span className="kennzahl-wert">{zeitFormat(kennzahlen.individualmedizinSek)}</span>
          <span className="kennzahl-label">davon Individualmedizin</span>
        </div>
      </section>

      <section className="debriefing-tabelle">
        <table>
          <thead>
            <tr>
              {Object.values(SPALTE).map((titel) => (
                <th key={titel}>{titel}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zeilen.map((zeile) => (
              <tr key={zeile.patient.id}>
                <td className="zelle-patient" data-spalte={SPALTE.patient}>
                  <strong>{zeile.patient.id}</strong> {zeile.patient.name}
                </td>
                <td data-spalte={SPALTE.vergeben}>
                  {zeile.vergeben ? (
                    <SichtungsBadge kategorie={zeile.vergeben} kompakt />
                  ) : (
                    <span className="sk-badge sk-offen">offen</span>
                  )}
                </td>
                <td data-spalte={SPALTE.referenz}>
                  <SichtungsBadge kategorie={zeile.referenz} kompakt />
                </td>
                <td data-spalte={SPALTE.aktuell}>
                  <SichtungsBadge kategorie={zeile.aktuell} kompakt />
                </td>
                <td
                  className={`bewertung bewertung-${zeile.bewertung}`}
                  data-spalte={SPALTE.bewertung}
                >
                  {BEWERTUNG_LABEL[zeile.bewertung]}
                </td>
                <td data-spalte={SPALTE.abschluss}>
                  {zeile.abschluss ? (
                    <SichtungsBadge kategorie={zeile.abschluss} kompakt />
                  ) : (
                    <span className="sk-badge sk-offen">offen</span>
                  )}
                </td>
                <td data-spalte={SPALTE.abschnitt}>{zeile.abschnitt}</td>
                <td data-spalte={SPALTE.zeitpunkt}>
                  {zeile.sichtungsdauerSek === null ? '-' : zeitFormat(zeile.sichtungsdauerSek)}
                </td>
                <td className="zelle-zeit" data-spalte={SPALTE.massnahmenzeit}>
                  {zeitFormat(zeile.massnahmenzeitSek)}
                  {zeile.individualmedizinSek > 0 && (
                    <em className="zeit-individual">
                      davon {zeitFormat(zeile.individualmedizinSek)} Individualmedizin
                    </em>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {state.sitzung.eigeneId && (
        <section className="debriefing-mein-einsatz">
          <h2>Mein Einsatz</h2>
          {meinProtokoll.length === 0 ? (
            <p className="hinweis hinweis-knapp">Keine eigenen Handlungen protokolliert.</p>
          ) : (
            <ol className="protokoll protokoll-karte">
              {meinProtokoll.map((eintrag, index) => (
                <li key={index}>
                  <time>{zeitFormat(eintrag.zeitSek)}</time>
                  <span>
                    <strong>{eintrag.patientId}</strong> {patientName(eintrag.patientId)} -{' '}
                    {eintrag.text}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {state.fahrzeuge.length > 0 && (
        <section className="debriefing-ressourcen">
          <h2>Ressourceneinsatz</h2>
          <div className="kennzahlen">
            <div className="kennzahl">
              <span className="kennzahl-wert">{state.fahrzeuge.length}</span>
              <span className="kennzahl-label">Fahrzeuge im Einsatz</span>
            </div>
            <div className={`kennzahl${ausgefalleneFahrzeuge > 0 ? ' kennzahl-warnung' : ''}`}>
              <span className="kennzahl-wert">{ausgefalleneFahrzeuge}</span>
              <span className="kennzahl-label">davon ausgefallen</span>
            </div>
          </div>
          {materialverbrauch.length > 0 && (
            <div className="debriefing-tabelle">
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Verbraucht</th>
                  </tr>
                </thead>
                <tbody>
                  {materialverbrauch.map((zeile) => (
                    <tr key={zeile.typ}>
                      <td>{MATERIAL_LABEL[zeile.typ]}</td>
                      <td>{zeile.verbraucht}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {state.regieProtokoll.length > 0 && (
        <section className="debriefing-regieprotokoll">
          <h2>Führungsentscheidungen</h2>
          <ol className="protokoll protokoll-karte">
            {state.regieProtokoll.map((eintrag, index) => (
              <li key={index}>
                <time>{zeitFormat(eintrag.zeitSek)}</time>
                <span>{eintrag.text}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="setup-hinweise">
        <h2>Auswertungshinweise</h2>
        <ul>
          <li>
            Die Referenzkategorie gilt für den Zustand bei Eintreffen. Weicht die Spalte
            &quot;Zustand am Ende&quot; davon ab, war eine Nachsichtung erforderlich.
          </li>
          <li>
            Überschätzte Kategorien binden knappe Ressourcen, unterschätzte gefährden Patienten -
            beide Fehler sind im MANV relevant.
          </li>
          <li>
            Als Faustregel gilt eine Vorsichtungsdauer von etwa 30 Sekunden pro Patient.
          </li>
          <li>
            Bewertet wird die Vorsichtung an der Schadensstelle. Spätere Sichtungen beurteilen
            einen bereits veränderten Zustand und sind deshalb gesondert ausgewiesen.
          </li>
          <li>
            Jede Maßnahme hat die Einsatzzeit für <em>alle</em> Betroffenen weiterlaufen lassen.
            Zeit jenseits von Blutstillung und Atemweg fehlte an anderer Stelle - genau das
            meint Individualmedizin im MANV.
          </li>
        </ul>
      </section>
    </main>
  );
}
