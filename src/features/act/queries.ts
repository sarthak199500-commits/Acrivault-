import { useQuery } from '@tanstack/react-query';
import { listQuarantined } from '@/mocks/api';

export function useQuarantined() {
  return useQuery({ queryKey: ['quarantined'], queryFn: listQuarantined });
}

// Release has no hook of its own here: it's the same mutation Discover already
// exposes (useReleaseQuarantine in @/features/discover/queries), and a second
// hook for one mutation only invites the two invalidation sets to drift apart
// again, which is exactly what happened before this was consolidated.
