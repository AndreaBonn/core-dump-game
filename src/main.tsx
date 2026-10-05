import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Initialise i18n before the first render reads any translation.
import '@/i18n';
import App from './App';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { isSaveFileAvailable, loadSaveFile } from '@/services/saveFileService';
import { useProgressStore } from '@/store/useProgressStore';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

// The game renders from browser storage right away; the save file, when the
// launcher serves one, is merged in a moment later and the menus update.
void loadSaveFile().then((raw) => {
  if (isSaveFileAvailable()) {
    useProgressStore.getState().hydrateFromFile(raw);
  }
});

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
