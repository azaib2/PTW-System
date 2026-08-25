import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { clearStaleChunkReloadFlag } from './lib/safeDynamicImport';
import './index.css';

// The app mounted successfully, so any earlier "stale chunk" reload has
// done its job — clear the flag so a genuinely new future occurrence can
// still trigger a recovery reload rather than being silenced forever.
clearStaleChunkReloadFlag();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
