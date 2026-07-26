import { DebriefingSeite } from './pages/DebriefingSeite';
import { EinsatzSeite } from './pages/EinsatzSeite';
import { SetupSeite } from './pages/SetupSeite';
import { StartSeite } from './pages/StartSeite';
import { UebungsleitungSeite } from './pages/UebungsleitungSeite';
import { useSimulation } from './state/useSimulation';

/** @anker ui.app Weiche zwischen den Hauptzustaenden der Anwendung */
export function App() {
  const { state } = useSimulation();

  switch (state.phase) {
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
