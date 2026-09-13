import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NHI_TYPES, type NhiType, type ProducerFacet } from '@/mocks/types';

export type { ProducerFacet };

/** Menu order: the two rare producers bracket the common one, rarest first. */
export const PRODUCER_FACETS: ProducerFacet[] = ['policy', 'person', 'replay'];

export const PRODUCER_LABELS: Record<ProducerFacet, string> = {
  policy: 'Policy',
  person: 'Person',
  replay: 'From a session replay',
};

/** Borrowed from the session list: don't run a search until it can narrow anything. */
export const MIN_SEARCH_CHARS = 2;

export interface QuarantineFilter {
  search: string;
  types: NhiType[];
  producers: ProducerFacet[];
}

function parseList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  return raw.split(',').filter((v): v is T => (allowed as readonly string[]).includes(v));
}

/**
 * The URL contract, as a pure function so it can be tested without a router.
 *
 * Unknown `type` / `by` values are DROPPED, not kept: a stale or hand-edited link
 * should lose the part it got wrong rather than render an empty table with
 * nothing on screen to explain it.
 */
export function parseQuarantineParams(params: URLSearchParams): QuarantineFilter {
  return {
    search: params.get('q') ?? '',
    types: parseList(params.get('type'), NHI_TYPES),
    producers: parseList(params.get('by'), PRODUCER_FACETS),
  };
}

/**
 * Quarantine's filters, kept in the URL (?q / ?type / ?by) like the inventory's and
 * the session list's — so a narrowing survives refresh, the back button undoes it,
 * and an auditor can share what they are looking at.
 *
 * Writes go through the functional `setParams` form, not a snapshot of `params`:
 * `onClear` toggles every selected value in one tick, and a snapshot would make
 * each of those toggles overwrite the last.
 */
export function useQuarantineFilters() {
  const [params, setParams] = useSearchParams();

  const filter = useMemo(() => parseQuarantineParams(params), [params]);

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
        const current = n.get(key)?.split(',').filter(Boolean) ?? [];
        const nextList = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (nextList.length) n.set(key, nextList.join(','));
        else n.delete(key);
      }),
    [update],
  );

  const clearAll = useCallback(
    () => update((n) => ['q', 'type', 'by'].forEach((k) => n.delete(k))),
    [update],
  );

  // A sub-minimum search narrows nothing, so it does not count as active either —
  // otherwise "Clear (1)" would appear next to a table that never changed.
  const activeCount =
    (filter.search.trim().length >= MIN_SEARCH_CHARS ? 1 : 0) +
    filter.types.length +
    filter.producers.length;

  return {
    filter,
    setSearch,
    toggleType: (t: NhiType) => toggleInList('type', t),
    toggleProducer: (p: ProducerFacet) => toggleInList('by', p),
    clearAll,
    activeCount,
  };
}

/** The fields the filter reads. Structural, so the tests need no mock API row. */
export interface FilterableQuarantineRow {
  name: string;
  type: NhiType;
  producer: ProducerFacet;
  byLabel: string;
  viaLabel?: string;
}

/**
 * Apply the filter to the loaded rows. Client-side over the whole contained set,
 * like every peer screen. Axes AND together; values inside an axis OR.
 */
export function applyQuarantineFilter<T extends FilterableQuarantineRow>(
  rows: T[],
  filter: QuarantineFilter,
): T[] {
  const raw = filter.search.trim().toLowerCase();
  const needle = raw.length >= MIN_SEARCH_CHARS ? raw : '';
  return rows.filter((row) => {
    if (filter.types.length && !filter.types.includes(row.type)) return false;
    if (filter.producers.length && !filter.producers.includes(row.producer)) return false;
    // The producer label is in the haystack on purpose: it is what lets a person's
    // name narrow the table without a fourth control for it.
    if (needle && !`${row.name} ${row.byLabel} ${row.viaLabel ?? ''}`.toLowerCase().includes(needle))
      return false;
    return true;
  });
}
