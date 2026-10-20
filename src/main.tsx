import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Global performance.measure wrapper to prevent React 19 DevTools profiler from crashing on DataCloneError
if (typeof window !== 'undefined' && window.performance && typeof window.performance.measure === 'function') {
  const originalMeasure = window.performance.measure.bind(window.performance);
  window.performance.measure = function (name: string, startOrOptions?: any, end?: any) {
    try {
      return originalMeasure(name, startOrOptions, end);
    } catch {
      // In case structured cloning of options.detail fails (e.g. React 19 dev tool timing on large props diffs)
      try {
        if (typeof startOrOptions === 'object' && startOrOptions !== null) {
          const { detail, ...safeOptions } = startOrOptions;
          return originalMeasure(name, safeOptions);
        }
      } catch {
        // Silently swallow if measure still fails to avoid crashing React reconciler
      }
      return undefined;
    }
  };
}

// Global error handlers to prevent unhandled rejection crashes from taking down the interface
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = (event.message || event.error?.message || "").toLowerCase();
    if (
      msg.includes("websocket") ||
      msg.includes("vite") ||
      msg.includes("failed to fetch") ||
      msg.includes("network error") ||
      msg.includes("datacloneerror") ||
      msg.includes("data cannot be cloned") ||
      msg.includes("failed to execute 'measure' on 'performance'")
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
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);


