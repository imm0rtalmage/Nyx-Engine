import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Global error handlers to prevent unhandled rejection crashes from taking down the interface
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = (event.message || event.error?.message || "").toLowerCase();
    if (
      msg.includes("websocket") ||
      msg.includes("vite") ||
      msg.includes("failed to fetch") ||
      msg.includes("network error")
    ) {
      event.preventDefault?.();
      return;
    }
    console.warn('Captured window error:', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reasonMsg = (event.reason?.message || String(event.reason || "")).toLowerCase();
    if (
      reasonMsg.includes("websocket") ||
      reasonMsg.includes("vite") ||
      reasonMsg.includes("failed to fetch") ||
      reasonMsg.includes("network") ||
      reasonMsg.includes("aborted")
    ) {
      event.preventDefault?.();
      return;
    }
    console.warn('Captured unhandled promise rejection:', event.reason);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


