import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decideApproval, listApprovals, listQuarantined, requestApproval } from '@/mocks/api';
import type { ApprovalStatus } from '@/mocks/types';

export function useQuarantined() {
  return useQuery({ queryKey: ['quarantined'], queryFn: listQuarantined });
}

// Release has no hook of its own here: it's the same mutation Discover already
// exposes (useReleaseQuarantine in @/features/discover/queries), and a second
// hook for one mutation only invites the two invalidation sets to drift apart
// again, which is exactly what happened before this was consolidated.

/* ------------------------------------------------------------------ approvals */

/**
 * The propose-and-approve queue. One query key per status so the rail's pending
 * count and the screen's pending list share a single fetch rather than each
 * pulling the whole set and filtering it.
 */
export function useApprovals(status?: ApprovalStatus) {
  return useQuery({
    queryKey: ['approvals', status ?? 'all'],
    queryFn: () => listApprovals(status),
  });
}

/**
 * How many requests are waiting. Reads the same query as the screen, so opening
 * Act > Approvals costs nothing extra and the count can never disagree with the
 * list it summarises.
 */
export function usePendingApprovalCount(): number {
  return useApprovals('pending').data?.length ?? 0;
}

/**
 * Propose a containment. Invalidates `sessions`/`session` because a proposal
 * raised from a replay stamps `quarantineRecommendedAt` on that session, which
 * the replay screen renders as a banner.
 *
 * The identity caches are deliberately NOT invalidated: proposing changes
 * nothing about the identity, and refetching the inventory here would imply it
 * had.
 */
export function useRequestApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: requestApproval,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['session'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

/**
 * Approve or decline. An approval runs the same containment a direct quarantine
 * does, so it has to invalidate everything enforcement does — the inventory, the
 * identity, every session of that agent, and Act > Quarantine.
 *
 * Cannot reuse `useEnforcement` from Discover, which writes its result straight
 * into `['identity', id]`: this mutation resolves to the decided
 * ApprovalRequest, and seeding the identity cache with it would replace an
 * Identity with an approval record. Invalidating instead costs one refetch and
 * cannot lie.
 */
export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'declined' }) =>
      decideApproval(id, decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['quarantined'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['identity'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['session'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}
