import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getIdentity,
  getSession,
  listSessions,
  markSessionReviewed,
  quarantineSession,
} from '@/mocks/api';

export function useSessions() {
  return useQuery({ queryKey: ['sessions'], queryFn: listSessions });
}

export function useSession(id: string | undefined) {
  return useQuery({ queryKey: ['session', id], queryFn: () => getSession(id as string), enabled: !!id });
}

export function useSessionIdentity(id: string | undefined) {
  return useQuery({ queryKey: ['identity', id], queryFn: () => getIdentity(id as string), enabled: !!id });
}

export function useSessionActions(sessionId: string | undefined) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['sessions'] });
    if (sessionId) qc.invalidateQueries({ queryKey: ['session', sessionId] });
  };
  return {
    markReviewed: useMutation({ mutationFn: (id: string) => markSessionReviewed(id), onSuccess: invalidate }),
    quarantine: useMutation({ mutationFn: (id: string) => quarantineSession(id), onSuccess: invalidate }),
  };
}
