import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SessionReviewState, SessionStep } from '@/mocks/types';
import { comparerFor, SESSION_SORTS, type SessionSort } from './sessionRanking';

const REVIEW_STATES: SessionReviewState[] = ['open', 'reviewed'];

/** Spec 10.2's validation rule: don't run a search until it can narrow anything. */
export const MIN_SEARCH_CHARS = 2;

export interface SessionFilter {
  review: SessionReviewState | null;
  /** Spec 10.2's "Flagged only / All sessions" filter. */
  flaggedOnly: boolean;
  /** Exact identity id, set by the "View sessions" link on an agent in Discover. */
  agentId: string | null;
  search: string;
  sort: SessionSort;
}

/**
 * Session-list filters, kept in the URL (?review / ?flagged / ?agent / ?q / ?sort) like
 * the inventory's and the alert feed's — so Discover can deep-link to one agent's
 * sessions, the back button undoes a narrowing, and a triaging analyst can share the
 * view.
 *
 * The list had none of this: it was a flat recency-ordered feed, the only triage
 * surface in the product without filters, growing at ~1.5 sessions per agent.
 */
export function useSessionFilters() {
  const [params, setParams] = useSearchParams();

  const filter = useMemo<SessionFilter>(() => {
    const raw = params.get('review');
    const sort = params.get('sort');
    return {
      review: raw && (REVIEW_STATES as string[]).includes(raw) ? (raw as SessionReviewState) : null,
      // `?anomalies=1` predates the held-step state and still lands on this facet, which
      // now also covers steps a hard-deny rule held.
      flaggedOnly: params.get('flagged') === '1' || params.get('anomalies') === '1',
      agentId: params.get('agent'),
      search: params.get('q') ?? '',
      sort: SESSION_SORTS.some((s) => s.value === sort) ? (sort as SessionSort) : 'recent',
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

  const setReview = useCallback(
    (value: SessionReviewState | null) =>
      update((n) => (value ? n.set('review', value) : n.delete('review'))),
    [update],
  );

  const toggleFlagged = useCallback(
    () =>
      update((n) => {
        const on = n.get('flagged') === '1' || n.get('anomalies') === '1';
        n.delete('anomalies');
        if (on) n.delete('flagged');
        else n.set('flagged', '1');
      }),
    [update],
  );

  const clearAgent = useCallback(() => update((n) => n.delete('agent')), [update]);

  const setSearch = useCallback(
    (value: string) => update((n) => (value ? n.set('q', value) : n.delete('q'))),
    [update],
  );

  const setSort = useCallback(
    (value: SessionSort) => update((n) => (value === 'recent' ? n.delete('sort') : n.set('sort', value))),
    [update],
  );

  const clearAll = useCallback(
    () => update((n) => ['review', 'flagged', 'anomalies', 'agent', 'q'].forEach((k) => n.delete(k))),
    [update],
  );

  // Sort is a view preference, not a narrowing — it never counts as an active filter.
  const activeCount =
    (filter.review ? 1 : 0) +
    (filter.flaggedOnly ? 1 : 0) +
    (filter.agentId ? 1 : 0) +
    (filter.search.trim().length >= MIN_SEARCH_CHARS ? 1 : 0);

  return { filter, setReview, toggleFlagged, clearAgent, setSearch, setSort, clearAll, activeCount };
}

/**
 * Apply the filter to a loaded page of sessions, then order it. Client-side, like the
 * alert feed. Search matches identity name or session id, per spec 10.2.
 */
export function applySessionFilter<
  T extends {
    id: string;
    identityId: string;
    identityName: string;
    reviewState: SessionReviewState;
    flagged: boolean;
    startedAt: string;
    anomalyCount: number;
    blockedCount: number;
    steps: SessionStep[];
  },
>(sessions: T[], filter: SessionFilter): T[] {
  const raw = filter.search.trim().toLowerCase();
  // Below the minimum the search is ignored rather than matching everything — a single
  // character narrows nothing and only makes the list flicker while you type.
  const needle = raw.length >= MIN_SEARCH_CHARS ? raw : '';
  const rows = sessions.filter((s) => {
    if (filter.review && s.reviewState !== filter.review) return false;
    if (filter.flaggedOnly && !s.flagged) return false;
    if (filter.agentId && s.identityId !== filter.agentId) return false;
    if (needle && !`${s.identityName} ${s.id}`.toLowerCase().includes(needle)) return false;
    return true;
  });
  return rows.sort(comparerFor(filter.sort));
}
