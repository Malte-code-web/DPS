import { FAHRZEUGTYP_INFO } from '../domain/fahrzeuge';
import { gruppeVon } from '../domain/fuehrung';
import { geoPunktName } from '../domain/geodaten';
import { useSimulation } from '../state/useSimulation';
import type { Einsatzabschnitt } from '../domain/types';

interface Props {
  onAbschnittWaehlen: (abschnitt: Einsatzabschnitt) => void;
}

/**
 * @anker ui.gruppenfuehrerseite Startbildschirm des Gruppenführers: Übersicht der eigenen Gruppe
 *
 * Erster Baustein der dritten Führungsebenen-Epoche (→ ROADMAP.md, Baustein 6,
 * Ebene 2) - deutlich schmaler als `ui.zugfuehrerseite`: ein Gruppenführer
 * führt real nur die ihm zugewiesenen Fahrzeuge samt Besatzung (→
 * `modell.gruppe`), nicht die gesamte Einsatzstelle. Die Zuweisung selbst
 * bleibt Sache des Zugführers (→ `ui.gruppenzuweisung`) - diese Seite zeigt
 * nur, was der Gruppenführer davon zu sehen bekommt: seine Fahrzeuge, wo sie
 * gerade stehen, wer drauf sitzt. Ein Klick auf ein Fahrzeug springt in die
 * gewohnte Abschnitt-Detailsicht, genau wie eine Kachel bei Regie/Zugführer.
 * Einsatzaufträge selbst (Fläche bauen, Abschnitt führen) laufen weiterhin
 * über die bereits bestehenden Toast-Benachrichtigungen
 * (→ `ui.zeltbefehlbenachrichtigung`, `ui.abschnittfuehrenbefehl`) - die
 * erscheinen unabhängig von der aktuellen Seite, eine Verdopplung hier wäre
 * überflüssig.
 */
export function GruppenfuehrerSeite({ onAbschnittWaehlen }: Props) {
  const { state } = useSimulation();
  const eigeneId = state.sitzung.eigeneId;
  const gruppe = eigeneId ? gruppeVon(state.fahrzeuge, eigeneId) : [];

  return (
    <div className="gruppenfuehrerseite">
      <p className="abschnitt-eyebrow">Meine Gruppe</p>

      {gruppe.length === 0 ? (
        <p className="hinweis">
          Noch keine Fahrzeuge zugewiesen - der Zugführer weist sie über "Gruppen" zu.
        </p>
      ) : (
        <div className="gruppenfuehrer-fahrzeuge">
          {gruppe.map((fahrzeug) => {
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
