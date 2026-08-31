import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Role } from '@/lib/permissions';
import type { UserStatus } from '@/mocks/types';

/** `none` matches the people Entra provisioned who have no role yet. */
export type RoleFilter = Role | 'none';

function parseList<T extends string>(raw: string | null): T[] {
  if (!raw) return [];
  return raw.split(',').filter(Boolean) as T[];
}

export interface UsersFilter {
  search: string;
  roles: RoleFilter[];
  statuses: UserStatus[];
}

/**
 * Search + Role/Status filter state for the Manage Users list, kept in the URL
 * (?q / ?role / ?status) so refresh, back/forward, and deep links preserve the
 * view — the same convention the Inventory screen uses. Filtering itself is
 * client-side over the already-loaded user list (see UsersScreen).
 */
export function useUsersFilters() {
  const [params, setParams] = useSearchParams();

  const filter = useMemo<UsersFilter>(
    () => ({
      search: params.get('q') ?? '',
      roles: parseList<RoleFilter>(params.get('role')),
      statuses: parseList<UserStatus>(params.get('status')),
    }),
    [params],
  );

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

  const toggleInList = useCallback(
    (key: string, value: string) =>
      update((n) => {
        const current = parseList(n.get(key));
        const nextList = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (nextList.length) n.set(key, nextList.join(','));
        else n.delete(key);
      }),
    [update],
  );

  const clearAll = useCallback(
    () => update((n) => ['q', 'role', 'status'].forEach((k) => n.delete(k))),
    [update],
  );

  const activeCount = (filter.search ? 1 : 0) + filter.roles.length + filter.statuses.length;

  return {
    filter,
    setSearch,
    toggleRole: (r: RoleFilter) => toggleInList('role', r),
    toggleStatus: (s: UserStatus) => toggleInList('status', s),
    clearAll,
    activeCount,
  };
}
