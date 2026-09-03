import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignOwner,
  getIdentity,
  listIdentities,
  quarantineAgent,
  releaseQuarantine,
  requestRotation,
  type IdentityFilter,
  type IdentitySort,
} from '@/mocks/api';

// The mock dataset is in-memory, so we fetch the whole filtered/sorted result set
// (references, not copies) and virtualize it client-side. Filtering and sorting
// still run in the API. keepPreviousData keeps the table stable across changes.
export function useInventory(filter: IdentityFilter, sort: IdentitySort) {
  return useQuery({
    queryKey: ['inventory', filter, sort],
    queryFn: () => listIdentities({ filter, sort, offset: 0, limit: 100_000 }),
    placeholderData: keepPreviousData,
  });
}

export function useIdentity(id: string | undefined) {
  return useQuery({
    queryKey: ['identity', id],
    queryFn: () => getIdentity(id as string),
    enabled: !!id,
  });
}

/**
 * Queue standard rotations for one or more identities. Creates real jobs in the
 * shared dataset so the Rotate screen's counts reconcile with what was requested.
 */
export function useRequestRotations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => requestRotation(id, 'standard'))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rotations'] }),
  });
}

/**
 * Assign or change an identity's owner. Writes the returned record into the detail
 * cache immediately and invalidates the inventory so the owner/orphaned columns and
 * the whole-population counts stay reconciled.
 */
export function useAssignOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, owner }: { id: string; owner: string }) => assignOwner(id, owner),
    onSuccess: (updated) => {
      qc.setQueryData(['identity', updated.id], updated);
      qc.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

/**
 * Enforcement lives on the identity, so quarantine and release are identity mutations
 * even when raised from a session replay. Invalidates the session caches too: an
 * agent's containment shows on every session it ever ran, not just the one in view --
 * and `quarantined`, since Act > Quarantine reads the exact same mutations (this is
 * the single hook backing both quarantine/release call sites; see useReleaseQuarantine
 * below, which QuarantineScreen also uses).
 */
function useEnforcement<TArgs>(mutationFn: (args: TArgs) => Promise<{ id: string }>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (updated) => {
      qc.setQueryData(['identity', updated.id], updated);
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['session'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
      qc.invalidateQueries({ queryKey: ['quarantined'] });
    },
  });
}

/** UC-04 takes an optional note at confirmation; it lands in the audit detail. */
export function useQuarantineAgent() {
  return useEnforcement(
    ({
      identityId,
      note,
      viaSessionId,
    }: {
      identityId: string;
      note?: string;
      /**
       * The replay this decision was made from. Passed by the session replay
       * screen and omitted by the inventory, which cites none -- the containment
       * records the evidence only where there actually was some.
       */
      viaSessionId?: string;
    }) => quarantineAgent(identityId, note, viaSessionId),
  );
}

export function useReleaseQuarantine() {
  return useEnforcement((identityId: string) => releaseQuarantine(identityId));
}

// Recommending a quarantine used to live here as `useRecommendQuarantine`, built
// on useEnforcement. It was never an enforcement -- it changes nothing about the
// identity -- and the call it wrapped created nothing to approve. Both call sites
// now raise a real request through useRequestApproval in @/features/act/queries,
// which is where the queue that receives it lives.
