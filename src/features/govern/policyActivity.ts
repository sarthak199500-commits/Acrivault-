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
 * it is what a person did — but it still gets a group, so that no row on the
 * page sits without a header explaining where it came from.
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
  /**
   * The policy every row in the group belongs to, or null when they disagree —
   * which only a manual group can, since a sweep is one run of one policy.
   */
  policyName: string | null;
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

export function filterByPolicy<T extends Pick<PolicyAction, 'policyId'>>(
  actions: T[],
  policyId: string | null,
): T[] {
  return policyId ? actions.filter((a) => a.policyId === policyId) : actions;
}

export interface PolicyFacet {
  id: string;
  name: string;
  count: number;
}

/**
 * The policies that have actually acted, derived from the rows rather than from
 * the policy list. A rule that has done nothing has nothing to filter to, and
 * offering it would be a pill that only ever empties the screen.
 *
 * Names come from the stamped `policyName`, so a renamed policy reads here as it
 * read when it acted — the whole point of stamping it.
 */
export function policyFacets(
  actions: Pick<PolicyAction, 'policyId' | 'policyName'>[],
): PolicyFacet[] {
  const byId = new Map<string, PolicyFacet>();
  for (const a of actions) {
    const held = byId.get(a.policyId);
    if (held) held.count += 1;
    else byId.set(a.policyId, { id: a.policyId, name: a.policyName, count: 1 });
  }
  return [...byId.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
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
 *
 * Actions with no sweep — a person's release — are grouped by RUN rather than
 * individually: adjacent ones in the timeline share a group, and a sweep between
 * them starts a new one. One card per release padded the top of the page and
 * pushed the next policy's sweep below the fold.
 */
export function groupIntoSweeps<T extends PolicyAction>(actions: T[]): SweepGroup<T>[] {
  // Sorted here rather than trusted from the caller, so a run of manual actions
  // is defined by the timeline and not by whatever order the rows arrived in.
  const ordered = [...actions].sort((a, b) => b.at.localeCompare(a.at));

  const groups = new Map<string, T[]>();
  let run = 0;
  let previousWasManual = false;
  for (const a of ordered) {
    const isManual = !a.sweepId;
    if (isManual && !previousWasManual) run += 1;
    previousWasManual = isManual;
    const key = a.sweepId ?? `manual:${run}`;
    const list = groups.get(key) ?? [];
    list.push(a);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([id, rows]) => {
      const names = new Set(rows.map((r) => r.policyName));
      return {
        id,
        reason: (rows[0].sweepReason ?? 'manual') as SweepGroupReason,
        policyName: names.size === 1 ? rows[0].policyName : null,
        at: rows.reduce((newest, r) => (r.at.localeCompare(newest) > 0 ? r.at : newest), rows[0].at),
        counts: outcomeCounts(rows),
        actions: orderWithinGroup(rows),
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}
