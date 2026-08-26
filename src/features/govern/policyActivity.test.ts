import { describe, expect, it } from 'vitest';
import {
  OUTCOME_FILTERS,
  failureSummary,
  filterByOutcome,
  groupIntoSweeps,
  outcomeCounts,
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
];

const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

/** Fails the test with a readable message rather than a null-deref if the id is gone. */
function group(id: string) {
  const found = groupIntoSweeps(ACTIONS).find((g) => g.id === id);
  if (!found) throw new Error(`no group ${id} in [${groupIntoSweeps(ACTIONS).map((g) => g.id).join(', ')}]`);
  return found;
}

describe('groupIntoSweeps', () => {
  it('groups actions by sweep, newest group first', () => {
    expect(groupIntoSweeps(ACTIONS).map((g) => g.id)).toEqual(['manual:r1', 'swp_b', 'swp_a']);
  });

  it('gives a release its own group — it belongs to no sweep', () => {
    const release = group('manual:r1');
    expect(release.reason).toBe('manual');
    expect(ids(release.actions)).toEqual(['r1']);
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
});

describe('failureSummary', () => {
  it('reports the shared cause when two or more failures agree', () => {
    expect(failureSummary(ACTIONS)).toEqual({ failed: 2, total: 6, sharedCause: 2 });
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
    expect(filterByOutcome(ACTIONS, 'all')).toHaveLength(6);
  });

  it('narrows to one outcome', () => {
    expect(ids(filterByOutcome(ACTIONS, 'failed'))).toEqual(['a2', 'a3']);
  });
});

describe('outcomeCounts', () => {
  it('counts the whole population, so a pill count is stable under filtering', () => {
    expect(outcomeCounts(ACTIONS)).toEqual({ quarantined: 2, failed: 2, skipped: 1, released: 1 });
  });
});

describe('OUTCOME_FILTERS', () => {
  it('leads with the outcomes worth acting on', () => {
    expect(OUTCOME_FILTERS).toEqual(['all', 'failed', 'skipped', 'quarantined', 'released']);
  });
});
