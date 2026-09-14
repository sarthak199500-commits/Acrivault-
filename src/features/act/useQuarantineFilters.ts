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
 * `update` writes through `setParams`'s functional form, but that does NOT make
 * writes compose across several calls in one tick: react-router-dom's
 * `setSearchParams` (6.30.4, `useSearchParams`) hands every call in the tick the
 * `searchParams` memoised from THIS render's `location.search` — not a
 * setState-style accumulator — so several toggles fired before a re-render all
 * read the same stale list and only the last one's write survives. `clearTypes` /
 * `clearProducers` exist because of exactly that; see their own comment.
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
    <T extends string>(key: string, value: T, allowed: readonly T[]) =>
      update((n) => {
        // Re-parsed through the same allowlist as the read path (`parseList`),
        // not a raw `.split(',')`: without it, toggling a fresh value onto a URL
        // that already carries an unknown one (`?by=policy,wat`) would keep
        // re-`set()`ing "wat" back in on every later toggle, even though nothing
        // ever reads it back out. The write side has to drop the same junk the
        // read side does, or a shared link keeps getting dirtier.
        const current = parseList(n.get(key), allowed);
        const nextList = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (nextList.length) n.set(key, nextList.join(','));
        else n.delete(key);
      }),
    [update],
  );

  /**
   * Drop a whole axis in one write.
   *
   * NOT `filter.types.forEach(toggleType)`: `setSearchParams`'s functional form
   * is not a setState-style update queue — it hands every call the `searchParams`
   * memoised from the current render's `location.search` (react-router-dom
   * 6.30.4, `useSearchParams`), so several calls in one tick all compute their
   * edit from the same stale list and only the last `navigate()` survives.
   * Clearing a three-value menu that way removes exactly one value, not three.
   */
  const clearList = useCallback((key: string) => update((n) => n.delete(key)), [update]);

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
    toggleType: (t: NhiType) => toggleInList('type', t, NHI_TYPES),
    toggleProducer: (p: ProducerFacet) => toggleInList('by', p, PRODUCER_FACETS),
    clearTypes: () => clearList('type'),
    clearProducers: () => clearList('by'),
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
