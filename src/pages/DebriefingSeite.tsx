import { SichtungsBadge } from '../components/SichtungsBadge';
import { findeSzenario } from '../domain/szenarien';
import { berechneKennzahlen, erstelleDebriefing } from '../lib/auswertung';
import { zeitFormat } from '../lib/format';
import { useSimulation } from '../state/useSimulation';
import type { Sichtungsbewertung } from '../domain/triage';

const BEWERTUNG_LABEL: Record<Sichtungsbewertung, string> = {
  korrekt: 'korrekt',
  ueberschaetzt: 'überschätzt',
  unterschaetzt: 'unterschätzt',
  offen: 'nicht gesichtet',
};

export function DebriefingSeite() {
  const { state, dispatch } = useSimulation();
  const szenario = state.szenarioId ? findeSzenario(state.szenarioId) : undefined;
  const zeilen = erstelleDebriefing(state.patienten);
  const kennzahlen = berechneKennzahlen(zeilen);

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
      </section>

      <section className="debriefing-tabelle">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Ihre Sichtung</th>
              <th>Referenz (Eintreffen)</th>
              <th>Zustand am Ende</th>
              <th>Bewertung</th>
              <th>Sichtung um</th>
              <th>Maßnahmenzeit</th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((zeile) => (
              <tr key={zeile.patient.id}>
                <td>
                  <strong>{zeile.patient.id}</strong> {zeile.patient.name}
                </td>
                <td>
                  {zeile.vergeben ? (
                    <SichtungsBadge kategorie={zeile.vergeben} kompakt />
                  ) : (
                    <span className="sk-badge sk-offen">offen</span>
                  )}
                </td>
                <td>
                  <SichtungsBadge kategorie={zeile.referenz} kompakt />
                </td>
                <td>
                  <SichtungsBadge kategorie={zeile.aktuell} kompakt />
                </td>
                <td className={`bewertung bewertung-${zeile.bewertung}`}>
                  {BEWERTUNG_LABEL[zeile.bewertung]}
                </td>
                <td>
                  {zeile.sichtungsdauerSek === null ? '-' : zeitFormat(zeile.sichtungsdauerSek)}
                </td>
                <td>{zeitFormat(zeile.massnahmenzeitSek)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

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
        </ul>
      </section>
    </main>
  );
}
