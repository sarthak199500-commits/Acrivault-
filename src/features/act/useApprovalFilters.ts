import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MIN_SEARCH_CHARS } from '@/lib/filters';
import type { ApprovalStatus } from '@/mocks/types';

/**
 * The three views the queue offers.
 *
 * There is deliberately no `approved` segment. An approved request produced a
 * quarantine, and Act > Quarantine is a better record of it — full provenance,
 * a release path, and the identity's own state. A fourth segment here would be
 * a thinner view of something the product already shows properly. Approved rows
 * stay reachable under `all`.
 */
export const APPROVAL_VIEWS = ['pending', 'declined', 'all'] as const;
export type ApprovalView = (typeof APPROVAL_VIEWS)[number];

export const APPROVAL_VIEW_LABELS: Record<ApprovalView, string> = {
  pending: 'Pending',
  declined: 'Declined',
  all: 'All',
};

export interface ApprovalFilter {
  view: ApprovalView;
  requesters: string[];
  search: string;
}

/**
 * The URL contract, as a pure function so it can be tested without a router.
 *
 * An unrecognised `status` falls back to `pending` rather than showing nothing:
 * the view is the reader's whole frame of reference, and a stale link should
 * land them somewhere real.
 *
 * Requester ids are NOT checked against an allowlist, unlike Quarantine's type
 * and producer menus. Their valid set is whoever happens to have raised
 * something, which is data rather than a compile-time union — so an id nobody
 * raised simply matches no rows, and `approvalsEmptyCopy` names the requester
 * filter as the cause. That is the same end the drop-unknowns rule was serving:
 * never an empty list with nothing on screen to explain it.
 */
export function parseApprovalParams(params: URLSearchParams): ApprovalFilter {
  const raw = params.get('status');
  const view: ApprovalView = (APPROVAL_VIEWS as readonly string[]).includes(raw ?? '')
    ? (raw as ApprovalView)
    : 'pending';
  return {
    view,
    requesters: (params.get('requester') ?? '').split(',').filter(Boolean),
    search: params.get('q') ?? '',
  };
}

/**
 * Approvals' filters, kept in the URL (?status / ?requester / ?q) like the
 * inventory's, the session list's and Quarantine's — so a narrowing survives
 * refresh, the back button undoes it, and an auditor can share what they are
 * looking at. That last reason is the strongest one here: the point of a
 * decision record is being able to point somebody at it.
 *
 * `update` writes through `setParams`'s functional form, but that does NOT make
 * writes compose across several calls in one tick: react-router-dom's
 * `setSearchParams` (6.30.4) hands every call in the tick the `searchParams`
 * memoised from THIS render's `location.search` — not a setState-style
 * accumulator — so several toggles fired before a re-render all read the same
 * stale list and only the last one's write survives. `clearRequesters` exists
 * because of exactly that.
 */
export function useApprovalFilters() {
  const [params, setParams] = useSearchParams();

  const filter = useMemo(() => parseApprovalParams(params), [params]);

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

  const setView = useCallback(
    (view: ApprovalView) =>
      // Pending is the default, so it is written as the ABSENCE of the param:
      // the canonical URL for the default view has no query string at all.
      update((n) => (view === 'pending' ? n.delete('status') : n.set('status', view))),
    [update],
  );

  const setSearch = useCallback(
    (value: string) => update((n) => (value ? n.set('q', value) : n.delete('q'))),
    [update],
  );

  const toggleRequester = useCallback(
    (id: string) =>
      update((n) => {
        const current = (n.get('requester') ?? '').split(',').filter(Boolean);
        const nextList = current.includes(id) ? current.filter((v) => v !== id) : [...current, id];
        if (nextList.length) n.set('requester', nextList.join(','));
        else n.delete('requester');
      }),
    [update],
  );

  /**
   * Drop the whole requester axis in one write. NOT a loop of toggles — see the
   * `setSearchParams` note on the hook above: several calls in one tick all
   * compute from the same stale list and only the last survives, so clearing a
   * three-value menu that way removes exactly one value.
   */
  const clearRequesters = useCallback(() => update((n) => n.delete('requester')), [update]);

  const clearAll = useCallback(
    () => update((n) => ['status', 'requester', 'q'].forEach((k) => n.delete(k))),
    [update],
  );

  // The VIEW is not counted as an active filter. It is a mode the reader is
  // always in one of, not a narrowing applied on top — counting it would mean
  // "Clear (1)" sat permanently beside a list nobody had filtered. A
  // sub-minimum search does not count either, for the same reason it does not
  // narrow.
  const activeCount =
    (filter.search.trim().length >= MIN_SEARCH_CHARS ? 1 : 0) + filter.requesters.length;

  return { filter, setView, setSearch, toggleRequester, clearRequesters, clearAll, activeCount };
}

/** The fields the filter reads. Structural, so the tests need no mock API row. */
export interface FilterableApprovalRow {
  status: ApprovalStatus;
  requestedBy: string;
  identityName: string;
  requesterName: string;
}

/**
 * Apply the filter to the loaded rows. Client-side over the whole permitted set,
 * like every peer screen. Axes AND together; values inside an axis OR.
 */
export function applyApprovalFilter<T extends FilterableApprovalRow>(
  rows: T[],
  filter: ApprovalFilter,
): T[] {
  const raw = filter.search.trim().toLowerCase();
  const needle = raw.length >= MIN_SEARCH_CHARS ? raw : '';
  return rows.filter((row) => {
    if (filter.view !== 'all' && row.status !== filter.view) return false;
    if (filter.requesters.length && !filter.requesters.includes(row.requestedBy)) return false;
    // The requester's name is in the haystack on purpose: it is what lets a
    // person's name narrow the list without reaching for the menu.
    if (needle && !`${row.identityName} ${row.requesterName}`.toLowerCase().includes(needle))
      return false;
    return true;
  });
}
