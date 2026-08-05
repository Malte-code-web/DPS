import type { Spieler } from '../domain/sitzung';

interface Props {
  massnahmeLabel: string;
  kandidaten: Spieler[];
  onAnfragen: (angefragteId: string) => void;
  onAbbrechen: () => void;
}

/**
 * @anker ui.delegationsanfrage Popover: wen um Freigabe fragen?
 *
 * Erscheint, wenn die eigene Qualifikation für eine delegierbare Maßnahme
 * nicht reicht - statt eines eigenen "Freigeben"-Knopfs für Berechtigte fragt
 * jetzt die Person, die die Maßnahme braucht, gezielt bei jemandem im selben
 * Einsatzabschnitt nach (→ `domain.qualifikation`, `state.delegationsanfrage`).
 */
export function DelegationAnfrageAuswahl({
  massnahmeLabel,
  kandidaten,
  onAnfragen,
  onAbbrechen,
}: Props) {
  return (
    <div className="delegation-anfrage" role="dialog" aria-label={`Delegation anfragen für ${massnahmeLabel}`}>
      {kandidaten.length === 0 ? (
        <p className="hinweis hinweis-knapp">
          Niemand mit ausreichender Qualifikation im selben Einsatzabschnitt anwesend.
        </p>
      ) : (
        <>
          <p className="hinweis hinweis-knapp">Wen um Freigabe für „{massnahmeLabel}" fragen?</p>
          <ul className="delegation-kandidaten">
            {kandidaten.map((kandidat) => (
              <li key={kandidat.id}>
                <button type="button" onClick={() => onAnfragen(kandidat.id)}>
                  {kandidat.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <button type="button" className="delegation-abbrechen" onClick={onAbbrechen}>
        Abbrechen
      </button>
    </div>
  );
}
