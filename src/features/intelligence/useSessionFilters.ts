import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SessionReviewState } from '@/mocks/types';

const REVIEW_STATES: SessionReviewState[] = ['open', 'reviewed'];

export interface SessionFilter {
  review: SessionReviewState | null;
  anomaliesOnly: boolean;
  /** Exact identity id, set by the "View sessions" link on an agent in Discover. */
  agentId: string | null;
  search: string;
}

/**
 * Session-list filters, kept in the URL (?review / ?anomalies / ?agent / ?q) like the
 * inventory's and the alert feed's — so Discover can deep-link to one agent's sessions,
 * the back button undoes a narrowing, and a triaging analyst can share the view.
 *
 * The list had none of this: it was a flat recency-ordered feed, the only triage
 * surface in the product without filters, growing at ~1.5 sessions per agent.
 */
export function useSessionFilters() {
  const [params, setParams] = useSearchParams();

  const filter = useMemo<SessionFilter>(() => {
    const raw = params.get('review');
    return {
      review: raw && (REVIEW_STATES as string[]).includes(raw) ? (raw as SessionReviewState) : null,
      anomaliesOnly: params.get('anomalies') === '1',
      agentId: params.get('agent'),
      search: params.get('q') ?? '',
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

  const toggleAnomalies = useCallback(
    () => update((n) => (n.get('anomalies') === '1' ? n.delete('anomalies') : n.set('anomalies', '1'))),
    [update],
  );

  const clearAgent = useCallback(() => update((n) => n.delete('agent')), [update]);

  const setSearch = useCallback(
    (value: string) => update((n) => (value ? n.set('q', value) : n.delete('q'))),
    [update],
  );

  const clearAll = useCallback(
    () => update((n) => ['review', 'anomalies', 'agent', 'q'].forEach((k) => n.delete(k))),
    [update],
  );

  const activeCount =
    (filter.review ? 1 : 0) +
    (filter.anomaliesOnly ? 1 : 0) +
    (filter.agentId ? 1 : 0) +
    (filter.search ? 1 : 0);

  return { filter, setReview, toggleAnomalies, clearAgent, setSearch, clearAll, activeCount };
}

/** Apply the filter to a loaded page of sessions. Client-side, like the alert feed. */
export function applySessionFilter<
  T extends {
    identityId: string;
    identityName: string;
    reviewState: SessionReviewState;
    anomalyCount: number;
  },
>(sessions: T[], filter: SessionFilter): T[] {
  const needle = filter.search.trim().toLowerCase();
  return sessions.filter((s) => {
    if (filter.review && s.reviewState !== filter.review) return false;
    if (filter.anomaliesOnly && s.anomalyCount === 0) return false;
    if (filter.agentId && s.identityId !== filter.agentId) return false;
    if (needle && !s.identityName.toLowerCase().includes(needle)) return false;
    return true;
  });
}
