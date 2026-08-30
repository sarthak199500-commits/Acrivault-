import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decideBlockedStep, getIdentity, getSession, listSessions, markSessionReviewed } from '@/mocks/api';

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

/**
 * Resolve a step a hard-deny rule held (FR-006). Confirming the block and overriding it
 * are the same mutation because they are the same decision, and both have to land in the
 * audit trail — the override with its justification (APR-02).
 */
export function useDecideBlockedStep(sessionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { stepId: string; outcome: 'confirmed' | 'overridden'; justification?: string }) =>
      decideBlockedStep(sessionId as string, input.stepId, input.outcome, input.justification),
    onSuccess: (updated) => {
      qc.setQueryData(['session', updated.id], updated);
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}
