import { DebriefingSeite } from './pages/DebriefingSeite';
import { EinsatzSeite } from './pages/EinsatzSeite';
import { FahrzeugkonfigurationSeite } from './pages/FahrzeugkonfigurationSeite';
import { MassnahmenrechteSeite } from './pages/MassnahmenrechteSeite';
import { SetupSeite } from './pages/SetupSeite';
import { StartSeite } from './pages/StartSeite';
import { UebungsleitungSeite } from './pages/UebungsleitungSeite';
import { WartebereichSeite } from './pages/WartebereichSeite';
import { useSimulation } from './state/useSimulation';

/**
 * @anker ui.app Weiche zwischen den Hauptzustaenden der Anwendung
 *
 * `rolle`/`anmeldung`/`beitritt` durchläuft der Zustand zwar noch (→
 * `gemeinsamOeffnen`/`rolleWaehlen` bleiben im Reducer, u. a. für Tests) -
 * gerendert wird dafür nichts Eigenes mehr: Der Einstieg passiert direkt auf
 * der Startseite (→ `ui.start`), diese drei Phasen fallen deshalb bewusst auf
 * `default` zurück.
 */
export function App() {
  const { state } = useSimulation();

  switch (state.phase) {
    case 'massnahmenrechte':
      return <MassnahmenrechteSeite />;
    case 'fahrzeugkonfiguration':
      return <FahrzeugkonfigurationSeite />;
    case 'wartebereich':
      return <WartebereichSeite />;
    case 'setup':
      return <SetupSeite />;
    case 'einsatz':
      return <EinsatzSeite />;
    case 'debriefing':
      return <DebriefingSeite />;
    case 'uebungsleitung':
      return <UebungsleitungSeite />;
    case 'start':
    default:
      return <StartSeite />;
  }
}
