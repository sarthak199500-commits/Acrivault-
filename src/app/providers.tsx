import { useEffect, useRef, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useUiStore } from '@/stores/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

/** Refetch everything when the dev scenario flips, so empty/error/populated re-evaluate. */
function ScenarioSync() {
  const scenario = useUiStore((s) => s.scenario);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    queryClient.invalidateQueries();
  }, [scenario.state, scenario.latencyMs]);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ScenarioSync />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export { queryClient };
