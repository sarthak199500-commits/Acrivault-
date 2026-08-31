import { type SessionStep, type ToolScope, isFlaggedStep } from '@/mocks/types';

/**
 * Triage order for the session list.
 *
 * This is a SORT ORDER, not a score. Nothing here is displayed as a number and nothing
 * is fused into a composite — every term is a fact the detection engine already
 * produced, so there is no invented figure for an analyst to defend or an auditor to
 * reproduce. (A derived 0..100 session score used to live in lib/sessionRisk.ts. It was
 * removed: ranking by these raw facts reproduced the same triage outcome, so the
 * composite carried the audit liability of a made-up number for no benefit.)
 *
 * Precedence, worst first:
 *   1. held steps   — a hard-deny match is the loudest thing on the screen (FR-006)
 *   2. anomaly count
 *   3. highest scope reached — admin beats write beats read
 *   4. most recent
 *
 * Anomaly *density* is deliberately not a term. It favours short sessions — one flag in
 * six outranking one in thirteen — which is the weakest of the available signals and
 * the one that reorders the list most confusingly.
 */
const SCOPE_RANK: Record<ToolScope, number> = { read: 1, write: 2, admin: 3 };

export function topScopeRank(steps: SessionStep[]): number {
  return steps.reduce((top, s) => (s.scope ? Math.max(top, SCOPE_RANK[s.scope]) : top), 0);
}

export interface RankableSession {
  startedAt: string;
  anomalyCount: number;
  blockedCount: number;
  steps: SessionStep[];
}

/** True when a session has anything an analyst must weigh — spec 10.2's Flagged column. */
export function isFlaggedSession(session: Pick<RankableSession, 'steps'>): boolean {
  return session.steps.some(isFlaggedStep);
}

export function compareByUrgency(a: RankableSession, b: RankableSession): number {
  if (a.blockedCount !== b.blockedCount) return b.blockedCount - a.blockedCount;
  if (a.anomalyCount !== b.anomalyCount) return b.anomalyCount - a.anomalyCount;
  const scope = topScopeRank(b.steps) - topScopeRank(a.steps);
  if (scope !== 0) return scope;
  return b.startedAt.localeCompare(a.startedAt);
}

export function compareByRecency(a: RankableSession, b: RankableSession): number {
  return b.startedAt.localeCompare(a.startedAt);
}

export type SessionSort = 'recent' | 'urgent';

export const SESSION_SORTS: { value: SessionSort; label: string }[] = [
  { value: 'recent', label: 'Most recent' },
  { value: 'urgent', label: 'Most urgent' },
];

export function comparerFor(sort: SessionSort) {
  return sort === 'urgent' ? compareByUrgency : compareByRecency;
}
