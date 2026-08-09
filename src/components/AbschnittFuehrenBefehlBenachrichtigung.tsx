import { geoPunktName } from '../domain/geodaten';
import { useSimulation } from '../state/useSimulation';
import { useZeitkostenStatus } from '../state/useZeitkostenStatus';

/**
 * @anker ui.abschnittfuehrenbefehl Benachrichtigung: der Zugführer befiehlt der Gruppe, einen Abschnitt zu führen
 *
 * Sibling zu `ui.zeltbefehlbenachrichtigung`, bewusst eine eigene Komponente
 * statt einer gemeinsamen Liste: beide Befehlsarten haben unterschiedliche
 * Schlüssel (`abschnitt` vs. `gruppenfuehrerId`) und können unabhängig
 * voneinander gleichzeitig an dieselbe Person offen sein.
 */
export function AbschnittFuehrenBefehlBenachrichtigung() {
  const { state, dispatch } = useSimulation();
  const zk = useZeitkostenStatus();
  const eigeneId = state.sitzung.eigeneId;
  const befehl = eigeneId
    ? state.abschnittFuehrenBefehle.find((eintrag) => eintrag.gruppenfuehrerId === eigeneId)
    : undefined;

  if (!befehl) return null;

  const zugfuehrer = state.sitzung.spieler.find((eintrag) => eintrag.id === befehl.zugfuehrerId);
  const zkBeschaeftigt = zk.aktion !== null;

  const ausfuehren = () => dispatch({ typ: 'abschnittFuehrenBefehlAusfuehren', id: befehl.id });
  const ablehnen = () => dispatch({ typ: 'abschnittFuehrenBefehlAblehnen', id: befehl.id });

  return (
    <div className="delegation-toast" role="alert" aria-label="Führungsbefehl">
      <p>
        <strong>{zugfuehrer?.name ?? 'Der Zugführer'}</strong> befiehlt: Gruppe führt jetzt{' '}
        <strong>{geoPunktName(befehl.ziel)}</strong>.
      </p>
      {zkBeschaeftigt && <p className="hinweis">Erst die laufende Handlung abschließen.</p>}
      <div className="delegation-toast-knoepfe">
        <button type="button" className="primaer" disabled={zkBeschaeftigt} onClick={ausfuehren}>
          Befehl ausführen
        </button>
        <button type="button" onClick={ablehnen}>
          Ablehnen
        </button>
      </div>
    </div>
  );
}
