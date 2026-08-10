// Preview-only context providers, compiled INTO _ds_bundle.js via the entry
// barrel so they share the one React / react-router / react-query copy that the
// components are bundled against.
//
// WHY THIS CANNOT LIVE IN A PREVIEW FILE
// The converter leaves node_modules imports in place, so a preview that imports
// `react-router-dom` gets its OWN bundled copy in _preview/<Name>.js, whose
// context objects are different identities from the copy already inlined in
// _ds_bundle.js. A provider mounted there and a consumer inlined in the bundle
// never meet — the component still throws "null context". Exporting the provider
// from the barrel puts it in the same module graph as the components, so the
// contexts match. cfg.provider = { "component": "DsPreviewProviders" } then wraps
// every card with it (providerWrapper resolves the name off window.Acrivault).
//
// It is inert for components that read neither context, so it is safe globally.
import { type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as RadixTooltip from '@radix-ui/react-tooltip';

// One client for the whole preview surface. retry:false so a query with no real
// backend settles to error immediately instead of spinning a loading state that
// never resolves in a still capture; gcTime Infinity keeps any seeded data put.
const previewQueryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: Infinity, staleTime: Infinity, refetchOnWindowFocus: false },
  },
});

export function DsPreviewProviders({ children }: { children?: ReactNode }) {
  return (
    <QueryClientProvider client={previewQueryClient}>
      <MemoryRouter initialEntries={['/']}>
        {/* delayDuration 0 so a hovered tooltip in the app opens instantly; the
            provider is required by any component that renders a Tooltip. */}
        <RadixTooltip.Provider delayDuration={0}>{children}</RadixTooltip.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
