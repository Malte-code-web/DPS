import { ABSCHNITTE } from '../domain/abschnitte';
import { FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import { istAbschnittEroeffnet } from '../domain/flaechen';
import { gruppenMitglieder, gruppeVon, zugfuehrungAktiv } from '../domain/fuehrung';
import { geoPunktName } from '../domain/geodaten';
import { QUALIFIKATION_VOLLNAME } from '../domain/massnahmen';
import { useSimulation } from '../state/useSimulation';
import type { Einsatzabschnitt } from '../domain/types';

interface Props {
  onAbschnittWaehlen: (abschnitt: Einsatzabschnitt) => void;
}

/**
 * @anker ui.gruppenfuehrerseite Startbildschirm des Gruppenführers: Übersicht der eigenen Gruppe
 *
 * Deutlich schmaler als `ui.zugfuehrerseite`: ein Gruppenführer führt real nur
 * seine eigene Gruppe, nicht die gesamte Einsatzstelle. Die Gruppe *sind* die
 * Personen (→ `modell.gruppe.person`), zusammengestellt vom Zugführer im
 * Wartebereich (→ `ui.wartebereich`) - sie stehen hier deshalb an erster
 * Stelle, mit ihrem aktuellen Standort und der Möglichkeit, einzelne Leute
 * abweichend von der Gruppe einzuteilen (→ `modell.einsatzabschnitt`). Genau
 * das ist die Führungsarbeit vor Ort: wissen, wer wo ist, und jemanden gezielt
 * woandershin schicken.
 *
 * Fahrzeuge folgen als zweiter Block - sie gehören nicht zwangsläufig zu einer
 * Gruppe und sind eher rollendes Material als Mannschaft. Ein Klick auf ein
 * Fahrzeug springt in die gewohnte Abschnitt-Detailsicht.
 *
 * Einsatzaufträge (Fläche bauen, Abschnitt führen) laufen weiterhin über die
 * bestehenden Toasts (→ `ui.zeltbefehlbenachrichtigung`,
 * `ui.abschnittfuehrenbefehl`) - die erscheinen unabhängig von der aktuellen
 * Seite, eine Verdopplung hier wäre überflüssig.
 */
export function GruppenfuehrerSeite({ onAbschnittWaehlen }: Props) {
  const { state, dispatch } = useSimulation();
  const eigeneId = state.sitzung.eigeneId;
  const mitglieder = eigeneId ? gruppenMitglieder(state.sitzung.spieler, eigeneId) : [];
  const fahrzeuge = eigeneId ? gruppeVon(state.fahrzeuge, eigeneId) : [];

  // Dieselbe Eröffnet-Begrenzung wie überall sonst (→ `domain.zugfuehrungaktiv`).
  const gateAktiv = zugfuehrungAktiv(state.sitzung.aktiv, state.sitzung.spieler);
  const ziele = ABSCHNITTE.filter(
    (abschnitt) => !gateAktiv || istAbschnittEroeffnet(abschnitt.id, state.flaechen),
  );

  return (
    <div className="gruppenfuehrerseite">
      <p className="abschnitt-eyebrow">Meine Gruppe</p>

      {mitglieder.length === 0 ? (
        <p className="hinweis">
          Noch niemand zugeteilt - der Zugführer stellt die Gruppe im Wartebereich zusammen.
        </p>
      ) : (
        <ul className="gruppen-personal-liste">
          {mitglieder.map((mitglied) => {
            const offeneAnfrage = state.personalanfragen.find(
              (eintrag) => eintrag.spielerId === mitglied.id,
            );
            const standort = mitglied.einsatzabschnitt ?? mitglied.aktuellerAbschnitt;
            return (
              <li key={mitglied.id} className="gruppen-personal-zeile">
                <span className="gruppen-personal-name">{mitglied.name}</span>
                <span className="gruppen-personal-qualifikation">
                  {QUALIFIKATION_VOLLNAME[mitglied.qualifikation]}
                </span>
                <span className="gruppen-personal-standort">
                  {standort ? geoPunktName(standort) : 'noch nicht eingeteilt'}
                </span>
                <select
                  className="gruppen-personal-wahl"
                  aria-label={`Einteilung von ${mitglied.name}`}
                  value={mitglied.einsatzabschnitt ?? ''}
                  onChange={(event) =>
                    dispatch({
                      typ: 'spielerEinsatzabschnittSetzen',
                      spielerId: mitglied.id,
                      abschnitt:
                        event.target.value === ''
                          ? null
                          : (event.target.value as Einsatzabschnitt),
                    })
                  }
                >
                  <option value="">— mit der Gruppe —</option>
                  {ziele.map((abschnitt) => (
                    <option key={abschnitt.id} value={abschnitt.id}>
                      {abschnitt.name}
                    </option>
                  ))}
                </select>
                {offeneAnfrage && <span className="hinweis">wartet auf Rückmeldung</span>}
              </li>
            );
          })}
        </ul>
      )}

      <p className="abschnitt-eyebrow">Fahrzeuge der Gruppe</p>

      {fahrzeuge.length === 0 ? (
        <p className="hinweis">
          Keine Fahrzeuge zugewiesen - eine Gruppe braucht keine. Der Zugführer weist sie bei Bedarf
          über "Gruppen" zu.
        </p>
      ) : (
        <div className="gruppenfuehrer-fahrzeuge">
          {fahrzeuge.map((fahrzeug) => {
            const besatzungNamen = fahrzeug.besatzung
              .map((id) => state.sitzung.spieler.find((spieler) => spieler.id === id)?.name)
              .filter(Boolean)
              .join(', ');
            return (
              <article key={fahrzeug.id} className="gruppenfuehrer-fahrzeug-karte">
                <button
                  type="button"
                  className="gruppenfuehrer-fahrzeug-oeffnen"
                  onClick={() => onAbschnittWaehlen(fahrzeug.abschnitt)}
                >
                  <div className="gruppenfuehrer-fahrzeug-kopf">
                    <span className="gruppenfuehrer-fahrzeug-typ">
                      {FAHRZEUGTYP_INFO[fahrzeug.typ].label}
                      {fahrzeug.kennung ? ` (${fahrzeug.kennung})` : ''}
                    </span>
                    <span className="gruppenfuehrer-fahrzeug-abschnitt">
                      {geoPunktName(fahrzeug.abschnitt)}
                    </span>
                  </div>
                  <p className="gruppenfuehrer-fahrzeug-besatzung">
                    {besatzungNamen || 'keine Besatzung'}
                  </p>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
