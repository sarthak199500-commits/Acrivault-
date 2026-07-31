import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PolicyStatus } from '@/mocks/types';
import type { PolicyListFilter, PolicySort } from './policyList';

const SORTS: PolicySort[] = ['modified', 'activated', 'name', 'affected'];

function parseList<T extends string>(raw: string | null): T[] {
  if (!raw) return [];
  return raw.split(',').filter(Boolean) as T[];
}

/**
 * Search / status / sort state for the policy list, kept in the URL
 * (?q / ?status / ?sort) so refresh, back/forward, and deep links preserve the
 * view — the same convention Manage Users and Inventory use. Selection itself is
 * client-side over the loaded list (see policyList.ts).
 */
export function usePolicyFilters() {
  const [params, setParams] = useSearchParams();

  const filter = useMemo<PolicyListFilter>(() => {
    const sort = params.get('sort') as PolicySort | null;
    return {
      search: params.get('q') ?? '',
      statuses: parseList<PolicyStatus>(params.get('status')),
      sort: sort && SORTS.includes(sort) ? sort : 'modified',
    };
  }, [params]);

  const update = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setSearch = useCallback(
    (value: string) => update((n) => (value ? n.set('q', value) : n.delete('q'))),
    [update],
  );

  const setSort = useCallback(
    (value: PolicySort) => update((n) => (value === 'modified' ? n.delete('sort') : n.set('sort', value))),
    [update],
  );

  const toggleStatus = useCallback(
    (value: PolicyStatus) =>
      update((n) => {
        const current = parseList<PolicyStatus>(n.get('status'));
        const nextList = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (nextList.length) n.set('status', nextList.join(','));
        else n.delete('status');
      }),
    [update],
  );

  const clearAll = useCallback(
    () => update((n) => ['q', 'status', 'sort'].forEach((k) => n.delete(k))),
    [update],
  );

  const activeCount = (filter.search ? 1 : 0) + filter.statuses.length;

  return { filter, setSearch, setSort, toggleStatus, clearAll, activeCount };
}
