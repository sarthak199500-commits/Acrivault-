import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './styles/globals.css';
import { Providers } from './app/providers';
import { router } from './app/router';

// Dev-only accessibility auditing: logs axe violations to the console. Guarded so
// it runs once per page load (not on every HMR update) to keep the main thread quiet.
declare global {
  interface Window {
    __acvAxeRan?: boolean;
  }
}
if (import.meta.env.DEV && !window.__acvAxeRan) {
  window.__acvAxeRan = true;
  void import('axe-core').then((axe) => {
    // Expose a per-route runner so a fresh sweep can be triggered after navigation.
    (window as unknown as { __axeRun?: () => Promise<unknown> }).__axeRun = () =>
      axe.default.run(document).then((r) =>
        r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
      );
    window.setTimeout(() => {
      void axe.default.run(document).then((results) => {
        if (results.violations.length) {
          console.warn(`[axe] ${results.violations.length} accessibility violation(s):`, results.violations);
        }
      });
    }, 2000);
  });
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <Providers>
      <Suspense fallback={null}>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </Suspense>
    </Providers>
  </StrictMode>,
);
