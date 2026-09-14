import { describe, expect, it } from 'vitest';
import { reviewFlagsFor } from './reviewFlags';
import type { Identity, Policy, PolicyStatus, PolicyToken } from './types';

/** The narrowest identity `matchesPolicy` can decide on. */
function identity(over: Partial<Identity> = {}): Identity {
  return {
    id: 'i-1',
    name: 'agent-support-triage',
    type: 'ai-agent',
    sources: [],
    correlated: false,
    orphaned: false,
    conflicts: [],
    riskScore: 86,
    riskBand: 'critical',
    governanceStatus: 'ungoverned',
    status: 'active',
    relationships: [],
    riskSeries: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    lastSeen: '2026-09-01T00:00:00.000Z',
    ...over,
  };
}

/** One WHEN condition and one THEN action — the shape the builder emits. */
function rule(action: string, subject = 'type', value = 'ai-agent'): PolicyToken[] {
  return [
    { kind: 'when', subject, operator: 'is', value },
    { kind: 'then', subject: 'action', operator: 'set', value: action },
  ];
}

function policy(over: Partial<Policy> & { tokens: PolicyToken[] }): Policy {
  return {
    id: 'p-1',
    name: 'Untagged AI agents',
    plainEnglish: '',
    generatedCode: '',
    affectedCount: 0,
    status: 'active' as PolicyStatus,
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...over,
  };
}

describe('reviewFlagsFor', () => {
  it('flags an identity an active review policy matches', () => {
    const flags = reviewFlagsFor(identity(), [policy({ tokens: rule('review') })]);
    expect(flags).toEqual([{ policyId: 'p-1', policyName: 'Untagged AI agents' }]);
  });

  it('ignores a policy whose action is not review', () => {
    const policies = [
      policy({ id: 'p-q', tokens: rule('quarantine') }),
      policy({ id: 'p-a', tokens: rule('alert') }),
    ];
    expect(reviewFlagsFor(identity(), policies)).toEqual([]);
  });

  it.each<PolicyStatus>(['draft', 'tested', 'suspended', 'archived'])(
    'ignores a %s review policy — only an active rule flags anything',
    (status) => {
      expect(reviewFlagsFor(identity(), [policy({ status, tokens: rule('review') })])).toEqual([]);
    },
  );

  it('returns nothing when the conditions do not match', () => {
    const flags = reviewFlagsFor(identity({ type: 'service-account' }), [
      policy({ tokens: rule('review') }),
    ]);
    expect(flags).toEqual([]);
  });

  it('returns one entry per matching rule', () => {
    const policies = [
      policy({ id: 'p-1', name: 'Untagged AI agents', tokens: rule('review') }),
      policy({
        id: 'p-2',
        name: 'Ungoverned identities',
        tokens: rule('review', 'governanceStatus', 'ungoverned'),
      }),
    ];
    expect(reviewFlagsFor(identity(), policies).map((f) => f.policyId)).toEqual(['p-1', 'p-2']);
  });

  it('reads the rule name as it stands now — a flag is derived, never stamped', () => {
    const renamed = policy({ name: 'Renamed rule', tokens: rule('review') });
    expect(reviewFlagsFor(identity(), [renamed])[0].policyName).toBe('Renamed rule');
  });
});
