import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listQuarantined, releaseQuarantine } from '@/mocks/api';

export function useQuarantined() {
  return useQuery({ queryKey: ['quarantined'], queryFn: listQuarantined });
}

/**
 * Releasing changes what the Quarantine list itself shows, the identity's status
 * everywhere it appears in Discover, and writes an audit line — all three caches
 * have to invalidate together or one screen would go stale relative to the others.
 */
export function useReleaseFromQuarantine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (identityId: string) => releaseQuarantine(identityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quarantined'] });
      // Bare prefix — the real key is ['inventory', filter, sort], so this
      // invalidates every filter/sort variant currently cached.
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}
