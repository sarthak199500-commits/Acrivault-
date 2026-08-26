// Filtering, grouping and summarising for the Govern Activity tab. Pure functions
// so the rules are unit-testable independently of the screen — the same split
// policyList.ts uses for the policy list.

import type { PolicyAction, PolicyActionOutcome } from '@/mocks/types';

export type OutcomeFilter = 'all' | PolicyActionOutcome;

/**
 * Filter vocabulary, ordered by what someone opening this tab is looking for.
 * Failures lead because they are the only rows that need a decision — the
 * successes are identical to one another and carry no signal on their own.
 */
export const OUTCOME_FILTERS: OutcomeFilter[] = ['all', 'failed', 'skipped', 'quarantined', 'released'];

export const OUTCOME_LABELS: Record<PolicyActionOutcome, string> = {
  quarantined: 'Quarantined',
  failed: 'Failed',
  skipped: 'Skipped',
  released: 'Released',
};

const OUTCOMES: PolicyActionOutcome[] = ['quarantined', 'failed', 'skipped', 'released'];

/**
 * A sweep is one run of a policy against the estate. `manual` is not a sweep —
 * it is a single human act (a release) belonging to no run, given a group of its
 * own so the timeline stays one ordered list rather than two interleaved ones.
 */
export type SweepGroupReason = 'activation' | 're-evaluation' | 'manual';

export const SWEEP_LABELS: Record<SweepGroupReason, string> = {
  activation: 'First sweep after activation',
  're-evaluation': 'Re-evaluation',
  manual: 'By a person',
};

export interface SweepGroup<T extends PolicyAction> {
  id: string;
  reason: SweepGroupReason;
  policyName: string;
  /** The newest action in the group — what the group is sorted and labelled by. */
  at: string;
  counts: Record<PolicyActionOutcome, number>;
  actions: T[];
}

export function outcomeCounts(
  actions: Pick<PolicyAction, 'outcome'>[],
): Record<PolicyActionOutcome, number> {
  const counts = Object.fromEntries(OUTCOMES.map((o) => [o, 0])) as Record<PolicyActionOutcome, number>;
  for (const a of actions) counts[a.outcome] += 1;
  return counts;
}

export function filterByOutcome<T extends Pick<PolicyAction, 'outcome'>>(
  actions: T[],
  filter: OutcomeFilter,
): T[] {
  return filter === 'all' ? actions : actions.filter((a) => a.outcome === filter);
}

/**
 * How many failed, and how many of those share one cause.
 *
 * The shared-cause count is the actionable half: forty-four rows and one missing
 * connector permission is a single fix, and a per-row sentence would never say
 * so. One failure is not a shared cause however you count it, hence the guard.
 */
export function failureSummary(
  actions: Pick<PolicyAction, 'outcome' | 'reason'>[],
): { failed: number; total: number; sharedCause: number } {
  const failures = actions.filter((a) => a.outcome === 'failed');
  const byReason = new Map<string, number>();
  for (const f of failures) {
    const key = f.reason ?? 'unknown';
    byReason.set(key, (byReason.get(key) ?? 0) + 1);
  }
  const largest = Math.max(0, ...byReason.values());
  return { failed: failures.length, total: actions.length, sharedCause: largest > 1 ? largest : 0 };
}

/** Failures first, then the rest newest-first — the TestResult card's ordering rule. */
function orderWithinGroup<T extends PolicyAction>(actions: T[]): T[] {
  return [...actions].sort((a, b) => {
    const aFailed = a.outcome === 'failed' ? 0 : 1;
    const bFailed = b.outcome === 'failed' ? 0 : 1;
    if (aFailed !== bFailed) return aFailed - bFailed;
    return b.at.localeCompare(a.at);
  });
}

/**
 * Group actions into the sweeps that produced them, newest group first.
 *
 * Grouping is load-bearing rather than decorative: activating a rule that matches
 * forty identities writes forty rows stamped the same second, and a flat
 * chronological list of those is unreadable.
 */
export function groupIntoSweeps<T extends PolicyAction>(actions: T[]): SweepGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const a of actions) {
    const key = a.sweepId ?? `manual:${a.id}`;
    const list = groups.get(key) ?? [];
    list.push(a);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([id, rows]) => ({
      id,
      reason: (rows[0].sweepReason ?? 'manual') as SweepGroupReason,
      policyName: rows[0].policyName,
      at: rows.reduce((newest, r) => (r.at.localeCompare(newest) > 0 ? r.at : newest), rows[0].at),
      counts: outcomeCounts(rows),
      actions: orderWithinGroup(rows),
    }))
    .sort((a, b) => b.at.localeCompare(a.at));
}
