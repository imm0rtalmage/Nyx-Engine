import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Global error handlers to prevent unhandled rejection crashes from taking down the interface
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.warn('Captured window error:', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
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


