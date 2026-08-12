import { useQuery } from '@tanstack/react-query';
import { getBlastRadius, listBlastOrigins, listCopilotSuggestions, listRehearsals } from '@/mocks/api';

/**
 * Picker candidates. An empty query returns the highest-reach suggestions; a query
 * searches the whole estate. Keyed by query so each result set is cached separately and
 * retyping a previous search is instant.
 */
export function useBlastOrigins(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ['blast-origins', q],
    queryFn: () => listBlastOrigins({ query: q, limit: 40 }),
    placeholderData: (previous) => previous,
  });
}

export function useBlastRadius(originId: string | undefined) {
  return useQuery({
    queryKey: ['blast-radius', originId],
    queryFn: () => getBlastRadius(originId as string),
    enabled: !!originId,
  });
}

export function useRehearsals() {
  return useQuery({ queryKey: ['rehearsals'], queryFn: listRehearsals });
}

export function useCopilotSuggestions() {
  return useQuery({ queryKey: ['copilot'], queryFn: listCopilotSuggestions });
}
