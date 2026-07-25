import { DebriefingSeite } from './pages/DebriefingSeite';
import { EinsatzSeite } from './pages/EinsatzSeite';
import { SetupSeite } from './pages/SetupSeite';
import { useSimulation } from './state/useSimulation';

export function App() {
  const { state } = useSimulation();

  switch (state.phase) {
    case 'einsatz':
      return <EinsatzSeite />;
    case 'debriefing':
      return <DebriefingSeite />;
    case 'setup':
    default:
      return <SetupSeite />;
  }
}
