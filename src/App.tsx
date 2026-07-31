import { AnmeldungSeite } from './pages/AnmeldungSeite';
import { BeitrittSeite } from './pages/BeitrittSeite';
import { DebriefingSeite } from './pages/DebriefingSeite';
import { EinsatzSeite } from './pages/EinsatzSeite';
import { FahrzeugkonfigurationSeite } from './pages/FahrzeugkonfigurationSeite';
import { MassnahmenrechteSeite } from './pages/MassnahmenrechteSeite';
import { RolleSeite } from './pages/RolleSeite';
import { SetupSeite } from './pages/SetupSeite';
import { StartSeite } from './pages/StartSeite';
import { UebungsleitungSeite } from './pages/UebungsleitungSeite';
import { WartebereichSeite } from './pages/WartebereichSeite';
import { useSimulation } from './state/useSimulation';

/** @anker ui.app Weiche zwischen den Hauptzustaenden der Anwendung */
export function App() {
  const { state } = useSimulation();

  switch (state.phase) {
    case 'rolle':
      return <RolleSeite />;
    case 'anmeldung':
      return <AnmeldungSeite />;
    case 'beitritt':
      return <BeitrittSeite />;
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
