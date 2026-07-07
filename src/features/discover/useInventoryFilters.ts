import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Cloud, GovernanceStatus, NhiType, RiskBand } from '@/mocks/types';
import type { IdentityFilter, IdentitySort } from '@/mocks/api';

type SortColumn = IdentitySort['id'];
export type InventoryView = 'table' | 'graph';

function parseList<T extends string>(raw: string | null): T[] {
  if (!raw) return [];
  return raw.split(',').filter(Boolean) as T[];
}

/**
 * Inventory filter + sort state, kept in the URL so dashboard drill-downs,
 * shareable links, and saved views all work. The URL is the single source of truth.
 */
export function useInventoryFilters() {
  const [params, setParams] = useSearchParams();

  const filter = useMemo<IdentityFilter>(() => {
    const f: IdentityFilter = {
      search: params.get('q') ?? undefined,
      types: parseList<NhiType>(params.get('type')),
      bands: parseList<RiskBand>(params.get('band')),
      clouds: parseList<Cloud>(params.get('cloud')),
      governance: parseList<GovernanceStatus>(params.get('gov')),
      orphanedOnly: params.get('orphaned') === '1',
      conflictsOnly: params.get('conflicts') === '1',
    };
    return f;
  }, [params]);

  const view = (params.get('view') as InventoryView) || 'table';

  const sort = useMemo<IdentitySort>(
    () => ({
      id: (params.get('sort') as SortColumn) || 'risk',
      desc: params.get('dir') !== 'asc',
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

  const toggleFlag = useCallback(
    (key: string) =>
      update((n) => (n.get(key) === '1' ? n.delete(key) : n.set(key, '1'))),
    [update],
  );

  const setSort = useCallback(
    (column: SortColumn) =>
      update((n) => {
        const currentCol = n.get('sort') || 'risk';
        const currentDir = n.get('dir') !== 'asc';
        if (currentCol === column) {
          // toggle direction
          n.set('dir', currentDir ? 'asc' : 'desc');
        } else {
          n.set('sort', column);
          n.set('dir', column === 'risk' ? 'desc' : 'asc');
        }
      }),
    [update],
  );

  const setView = useCallback(
    (next: InventoryView) => update((n) => (next === 'table' ? n.delete('view') : n.set('view', next))),
    [update],
  );

  const applyFilter = useCallback(
    (next: IdentityFilter) =>
      update((n) => {
        ['q', 'type', 'band', 'cloud', 'gov', 'orphaned', 'conflicts'].forEach((k) => n.delete(k));
        if (next.search) n.set('q', next.search);
        if (next.types?.length) n.set('type', next.types.join(','));
        if (next.bands?.length) n.set('band', next.bands.join(','));
        if (next.clouds?.length) n.set('cloud', next.clouds.join(','));
        if (next.governance?.length) n.set('gov', next.governance.join(','));
        if (next.orphanedOnly) n.set('orphaned', '1');
        if (next.conflictsOnly) n.set('conflicts', '1');
      }),
    [update],
  );

  const clearAll = useCallback(
    () => update((n) => ['q', 'type', 'band', 'cloud', 'gov', 'orphaned', 'conflicts'].forEach((k) => n.delete(k))),
    [update],
  );

  const activeCount =
    (filter.search ? 1 : 0) +
    (filter.types?.length ?? 0) +
    (filter.bands?.length ?? 0) +
    (filter.clouds?.length ?? 0) +
    (filter.governance?.length ?? 0) +
    (filter.orphanedOnly ? 1 : 0) +
    (filter.conflictsOnly ? 1 : 0);

  return {
    filter,
    sort,
    view,
    setView,
    setSearch,
    toggleType: (t: NhiType) => toggleInList('type', t),
    toggleBand: (b: RiskBand) => toggleInList('band', b),
    toggleCloud: (c: Cloud) => toggleInList('cloud', c),
    toggleGovernance: (g: GovernanceStatus) => toggleInList('gov', g),
    toggleOrphaned: () => toggleFlag('orphaned'),
    toggleConflicts: () => toggleFlag('conflicts'),
    setSort,
    applyFilter,
    clearAll,
    activeCount,
    params,
  };
}
