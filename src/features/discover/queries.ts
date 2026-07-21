import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { assignOwner, getIdentity, listIdentities, requestRotation, type IdentityFilter, type IdentitySort } from '@/mocks/api';

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
