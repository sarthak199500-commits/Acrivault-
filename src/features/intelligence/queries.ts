import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getIdentity, getSession, listSessions, markSessionReviewed } from '@/mocks/api';

export function useSessions() {
  return useQuery({ queryKey: ['sessions'], queryFn: listSessions });
}

export function useSession(id: string | undefined) {
  return useQuery({ queryKey: ['session', id], queryFn: () => getSession(id as string), enabled: !!id });
}

export function useSessionIdentity(id: string | undefined) {
  return useQuery({ queryKey: ['identity', id], queryFn: () => getIdentity(id as string), enabled: !!id });
}

/**
 * Review state is per-session, so this one stays here — unlike quarantine and release,
 * which change the agent and live with the identity mutations in discover/queries.
 */
export function useMarkReviewed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markSessionReviewed(id),
    onSuccess: (updated) => {
      qc.setQueryData(['session', updated.id], updated);
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}
