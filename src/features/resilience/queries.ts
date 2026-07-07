import { useQuery } from '@tanstack/react-query';
import { getBlastRadius, listBlastOrigins, listCopilotSuggestions, listRehearsals } from '@/mocks/api';

export function useBlastOrigins() {
  return useQuery({ queryKey: ['blast-origins'], queryFn: () => listBlastOrigins(40) });
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
