import { describe, expect, it } from 'vitest';
import {
  OUTCOME_FILTERS,
  failureSummary,
  filterByOutcome,
  filterByPolicy,
  groupIntoSweeps,
  outcomeCounts,
  policyFacets,
} from './policyActivity';
import type { PolicyAction } from '@/mocks/types';

function action(
  over: Partial<PolicyAction> & { id: string; outcome: PolicyAction['outcome'] },
): PolicyAction {
  return {
    policyId: 'pol_0000',
    policyName: 'Quarantine orphaned AI agents',
    identityId: `idn-${over.id}`,
    accountable: 'dana@acrivault.io',
    at: '2026-08-20T10:00:00.000Z',
    ...over,
  };
}

const SWEEP_A = { sweepId: 'swp_a', sweepReason: 'activation' as const, at: '2026-08-20T10:00:00.000Z' };
const SWEEP_B = { sweepId: 'swp_b', sweepReason: 're-evaluation' as const, at: '2026-08-25T03:00:00.000Z' };

const ACTIONS: PolicyAction[] = [
  action({ id: 'a1', outcome: 'quarantined', ...SWEEP_A }),
  action({ id: 'a2', outcome: 'failed', reason: 'connector-permission', ...SWEEP_A }),
  action({ id: 'a3', outcome: 'failed', reason: 'connector-permission', ...SWEEP_A }),
  action({ id: 'a4', outcome: 'skipped', reason: 'already-quarantined', ...SWEEP_A }),
  action({ id: 'b1', outcome: 'quarantined', ...SWEEP_B }),
  action({ id: 'r1', outcome: 'released', reversesId: 'a1', at: '2026-08-26T09:00:00.000Z' }),
  action({ id: 'r2', outcome: 'released', reversesId: 'a1', at: '2026-08-26T08:00:00.000Z' }),
];

const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

/** Fails the test with a readable message rather than a null-deref if the id is gone. */
function group(id: string, rows: PolicyAction[] = ACTIONS) {
  const all = groupIntoSweeps(rows);
  const found = all.find((g) => g.id === id);
  if (!found) throw new Error(`no group ${id} in [${all.map((g) => g.id).join(', ')}]`);
  return found;
}

describe('groupIntoSweeps', () => {
  it('groups actions by sweep, newest group first', () => {
    expect(groupIntoSweeps(ACTIONS).map((g) => g.id)).toEqual(['manual:1', 'swp_b', 'swp_a']);
  });

  it('merges adjacent manual actions into one run rather than a card each', () => {
    const manual = group('manual:1');
    expect(manual.reason).toBe('manual');
    expect(ids(manual.actions)).toEqual(['r1', 'r2']);
  });

  it('starts a new run when a sweep separates two manual actions', () => {
    const split = [
      action({ id: 'm1', outcome: 'released', at: '2026-08-26T09:00:00.000Z' }),
      action({ id: 's1', outcome: 'quarantined', sweepId: 'swp_x', sweepReason: 'activation', at: '2026-08-24T00:00:00.000Z' }),
      action({ id: 'm2', outcome: 'released', at: '2026-08-22T09:00:00.000Z' }),
    ];
    expect(groupIntoSweeps(split).map((g) => g.id)).toEqual(['manual:1', 'swp_x', 'manual:2']);
  });

  it('sorts by the timeline, not by the order rows arrived in', () => {
    const shuffled = [ACTIONS[4], ACTIONS[0], ACTIONS[5]];
    expect(groupIntoSweeps(shuffled).map((g) => g.id)).toEqual(['manual:1', 'swp_b', 'swp_a']);
  });

  it('orders failures first within a group — they are why you opened this', () => {
    expect(ids(group('swp_a').actions)).toEqual(['a2', 'a3', 'a1', 'a4']);
  });

  it('counts outcomes per group', () => {
    expect(group('swp_a').counts).toEqual({ quarantined: 1, failed: 2, skipped: 1, released: 0 });
  });

  it('carries the stamped policy name rather than a live lookup', () => {
    expect(group('swp_a').policyName).toBe('Quarantine orphaned AI agents');
  });

  it('claims no policy name when a manual run spans two of them', () => {
    const mixed = [
      action({ id: 'm1', outcome: 'released', at: '2026-08-26T09:00:00.000Z' }),
      action({ id: 'm2', outcome: 'released', at: '2026-08-26T08:00:00.000Z', policyId: 'pol_0001', policyName: 'Quarantine dormant OAuth tokens' }),
    ];
    expect(group('manual:1', mixed).policyName).toBeNull();
  });
});

describe('policyFacets', () => {
  it('lists only the policies that have acted, busiest first', () => {
    const rows = [
      ...ACTIONS,
      action({ id: 'c1', outcome: 'quarantined', policyId: 'pol_0001', policyName: 'Quarantine dormant OAuth tokens', sweepId: 'swp_c' }),
    ];
    expect(policyFacets(rows)).toEqual([
      { id: 'pol_0000', name: 'Quarantine orphaned AI agents', count: 7 },
      { id: 'pol_0001', name: 'Quarantine dormant OAuth tokens', count: 1 },
    ]);
  });

  it('is empty when nothing has acted', () => {
    expect(policyFacets([])).toEqual([]);
  });
});

describe('filterByPolicy', () => {
  it('narrows to one policy', () => {
    const rows = [
      ...ACTIONS,
      action({ id: 'c1', outcome: 'quarantined', policyId: 'pol_0001', policyName: 'Other', sweepId: 'swp_c' }),
    ];
    expect(ids(filterByPolicy(rows, 'pol_0001'))).toEqual(['c1']);
  });

  it('returns everything for null — no policy chosen is not a filter', () => {
    expect(filterByPolicy(ACTIONS, null)).toHaveLength(7);
  });
});

describe('failureSummary', () => {
  it('reports the shared cause when two or more failures agree', () => {
    expect(failureSummary(ACTIONS)).toEqual({ failed: 2, total: 7, sharedCause: 2 });
  });

  it('reports no shared cause when every failure differs', () => {
    const mixed = [
      action({ id: 'x', outcome: 'failed', reason: 'connector-permission' }),
      action({ id: 'y', outcome: 'failed', reason: 'identity-gone' }),
    ];
    expect(failureSummary(mixed)).toEqual({ failed: 2, total: 2, sharedCause: 0 });
  });

  it('reports zero failures for a clean log', () => {
    expect(failureSummary([action({ id: 'q', outcome: 'quarantined' })])).toEqual({
      failed: 0,
      total: 1,
      sharedCause: 0,
    });
  });
});

describe('filterByOutcome', () => {
  it('returns everything for "all"', () => {
    expect(filterByOutcome(ACTIONS, 'all')).toHaveLength(7);
  });

  it('narrows to one outcome', () => {
    expect(ids(filterByOutcome(ACTIONS, 'failed'))).toEqual(['a2', 'a3']);
  });
});

describe('outcomeCounts', () => {
  it('counts the whole population, so a pill count is stable under filtering', () => {
    expect(outcomeCounts(ACTIONS)).toEqual({ quarantined: 2, failed: 2, skipped: 1, released: 2 });
  });
});

describe('OUTCOME_FILTERS', () => {
  it('leads with the outcomes worth acting on', () => {
    expect(OUTCOME_FILTERS).toEqual(['all', 'failed', 'skipped', 'quarantined', 'released']);
  });
});
