import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { SimulationProvider } from './state/SimulationProvider';
import './index.css';

const wurzel = document.getElementById('root');
if (!wurzel) {
  throw new Error('Wurzelelement #root nicht gefunden.');
}

createRoot(wurzel).render(
  <StrictMode>
    <SimulationProvider>
      <App />
    </SimulationProvider>
  </StrictMode>,
);
