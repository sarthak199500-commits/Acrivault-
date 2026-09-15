import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decideApproval, listApprovals, listQuarantined, requestApproval } from '@/mocks/api';
import type { ApprovalOutcome } from '@/mocks/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

export function useQuarantined() {
  return useQuery({ queryKey: ['quarantined'], queryFn: listQuarantined });
}

// Release has no hook of its own here: it's the same mutation Discover already
// exposes (useReleaseQuarantine in @/features/discover/queries), and a second
// hook for one mutation only invites the two invalidation sets to drift apart
// again, which is exactly what happened before this was consolidated.

/* ------------------------------------------------------------------ approvals */

/**
 * The propose-and-approve queue — every request the actor may see, in ONE cache
 * entry. Status is applied client-side (`applyApprovalFilter`) rather than by
 * re-fetching per status.
 *
 * That is not just a saved request. The toolbar's requester counts are computed
 * over the whole loaded set, pre-filter, so they hold still while you narrow
 * (the rule QuarantineToolbar follows). Cache the set per status and "the whole
 * set" quietly becomes "the whole set WITHIN the loaded status" — a chip reading
 * `Kai Mensah · 4` would mean "4 within Declined" while looking like a fact
 * about the queue.
 *
 * The ACTOR is in the key, though, because the rows themselves now depend on it:
 * `listApprovals` hides other people's decided requests from anyone who cannot
 * decide. Nothing invalidates React Query when the dev Role Switcher changes the
 * role — it only writes to the ui store — so without this an admin could load
 * the queue, switch to Analyst, and go on reading decided rows out of the cache
 * that the Analyst is not entitled to. Caught driving the real screen.
 *
 * Keying by actor is NOT the per-status split this comment warns about: each
 * viewer still gets one complete entry, so the counts computed over it remain
 * counts over everything that viewer can see.
 */
export function useApprovals() {
  const role = useUiStore((s) => s.role);
  const userId = useAuthStore((s) => s.userId);
  return useQuery({
    queryKey: ['approvals', userId, role],
    queryFn: () => listApprovals(),
  });
}

/**
 * How many requests are waiting. Derived from the same single entry the screen
 * reads, so the count cannot disagree with the list it summarises — previously
 * that was a promise resting on two cache entries being invalidated in step, and
 * it is now a property of there being one.
 */
export function usePendingApprovalCount(): number {
  return useApprovals().data?.filter((a) => a.status === 'pending').length ?? 0;
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
    // The outcome travels as the union rather than as a bare decision plus an
    // optional note: the caller has to have decided which shape it is building
    // before it reaches here, so a decline with nothing written cannot be
    // assembled at all.
    mutationFn: ({ id, outcome }: { id: string; outcome: ApprovalOutcome }) =>
      decideApproval(id, outcome),
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
