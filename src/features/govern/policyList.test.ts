import { describe, expect, it } from 'vitest';
import {
  LIVE_POLICY_STATUSES,
  archiveRecords,
  inlineAction,
  overflowActions,
  policiesForTab,
  policyCountLabel,
  selectPolicies,
  statusCounts,
  type PolicyListFilter,
} from './policyList';
import type { AuditEntry, Policy, PolicyStatus } from '@/mocks/types';

function policy(over: Partial<Policy> & { name: string; status: PolicyStatus }): Policy {
  return {
    id: over.name.toLowerCase().replace(/\W+/g, '-'),
    tokens: [],
    plainEnglish: 'When an identity is an AI Agent, then flag it for review.',
    generatedCode: '',
    affectedCount: 0,
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...over,
  };
}

const POPULATION: Policy[] = [
  policy({ name: 'Quarantine orphans', status: 'active', affectedCount: 66, updatedAt: '2026-07-05T00:00:00.000Z', activatedAt: '2026-07-05T00:00:00.000Z' }),
  policy({ name: 'Rotate API keys', status: 'tested', affectedCount: 84, updatedAt: '2026-07-03T00:00:00.000Z' }),
  policy({ name: 'Flag conflicts', status: 'draft', affectedCount: 140, updatedAt: '2026-07-09T00:00:00.000Z', plainEnglish: 'When an identity has more than 0 attribute conflicts, then flag it for review.' }),
  policy({ name: 'Block dormant tokens', status: 'suspended', affectedCount: 62, updatedAt: '2026-07-07T00:00:00.000Z', activatedAt: '2026-07-01T00:00:00.000Z' }),
  policy({ name: 'Legacy sweep', status: 'archived', affectedCount: 12, updatedAt: '2026-06-01T00:00:00.000Z', activatedAt: '2026-06-01T00:00:00.000Z' }),
];

/** Every selection test works on a tab-scoped population, the way the screen does. */
const LIVE = policiesForTab(POPULATION, 'live');

const BASE: PolicyListFilter = { search: '', statuses: [], sort: 'modified' };

const names = (rows: Policy[]) => rows.map((p) => p.name);

describe('LIVE_POLICY_STATUSES', () => {
  it('is the facet vocabulary — the four states a live policy can hold', () => {
    expect(LIVE_POLICY_STATUSES).toEqual(['draft', 'tested', 'active', 'suspended']);
  });

  it('excludes archived, which is a separate population rather than a peer state', () => {
    expect(LIVE_POLICY_STATUSES).not.toContain('archived');
  });
});

describe('policiesForTab', () => {
  it('scopes the live tab to everything that is not archived', () => {
    expect(names(policiesForTab(POPULATION, 'live'))).not.toContain('Legacy sweep');
    expect(policiesForTab(POPULATION, 'live')).toHaveLength(4);
  });

  it('scopes the archive tab to archived policies only (FR-011)', () => {
    expect(names(policiesForTab(POPULATION, 'archive'))).toEqual(['Legacy sweep']);
  });

  it('returns an empty archive when nothing has been retired', () => {
    expect(policiesForTab(LIVE, 'archive')).toEqual([]);
  });
});

describe('inlineAction', () => {
  it('offers the reversible next step for an enforcing or stopped policy', () => {
    expect(inlineAction('active')).toBe('suspend');
    expect(inlineAction('suspended')).toBe('reactivate');
  });

  it('offers nothing inline where nothing is enforcing', () => {
    expect(inlineAction('draft')).toBeNull();
    expect(inlineAction('tested')).toBeNull();
    expect(inlineAction('archived')).toBeNull();
  });
});

describe('overflowActions', () => {
  it('offers Archive from every state that is not enforcing', () => {
    // A draft or a tested rule never enforced, so there is no enforcement to stop
    // first — the two-step exists to protect Active, and only Active.
    expect(overflowActions('draft')).toEqual(['archive']);
    expect(overflowActions('tested')).toEqual(['archive']);
    expect(overflowActions('suspended')).toEqual(['archive']);
  });

  it('withholds Archive from an active policy — suspend first (FR-011)', () => {
    expect(overflowActions('active')).toEqual([]);
  });

  it('offers nothing on an archived policy, which is terminal', () => {
    expect(overflowActions('archived')).toEqual([]);
  });

  it('leaves no state without an exit except Active and Archived', () => {
    // The bug this closes: Draft and Tested previously had no action at all, so
    // clearing a mistaken draft meant enforcing it first.
    const stranded = LIVE_POLICY_STATUSES.filter(
      (s) => inlineAction(s) === null && overflowActions(s).length === 0,
    );
    expect(stranded).toEqual([]);
  });
});

describe('statusCounts', () => {
  it('tallies whatever population it is given', () => {
    expect(statusCounts(POPULATION)).toEqual({
      draft: 1,
      tested: 1,
      active: 1,
      suspended: 1,
      archived: 1,
    });
  });

  it('reports archived as zero over the live population, so the facet cannot offer it', () => {
    expect(statusCounts(LIVE).archived).toBe(0);
  });

  it('reports zero for statuses that are absent', () => {
    expect(statusCounts([]).active).toBe(0);
  });
});

describe('selectPolicies · status filter', () => {
  it('keeps only the selected statuses', () => {
    const rows = selectPolicies(LIVE, { ...BASE, statuses: ['active', 'suspended'] });
    expect(names(rows).sort()).toEqual(['Block dormant tokens', 'Quarantine orphans']);
  });

  it('returns the whole population when no status is selected', () => {
    expect(selectPolicies(LIVE, BASE)).toHaveLength(4);
  });

  it('no longer hides archived itself — the tab already scoped the population', () => {
    // Scoping moved to policiesForTab, so handing it an archived row keeps it.
    expect(names(selectPolicies(POPULATION, BASE))).toContain('Legacy sweep');
  });
});

describe('selectPolicies · search', () => {
  it('matches the policy name case-insensitively', () => {
    expect(names(selectPolicies(LIVE, { ...BASE, search: 'ROTATE' }))).toEqual(['Rotate API keys']);
  });

  it('matches the plain-English rule text', () => {
    expect(names(selectPolicies(LIVE, { ...BASE, search: 'attribute conflicts' }))).toEqual(['Flag conflicts']);
  });

  it('ignores surrounding whitespace and returns nothing on no match', () => {
    expect(selectPolicies(LIVE, { ...BASE, search: '  rotate  ' })).toHaveLength(1);
    expect(selectPolicies(LIVE, { ...BASE, search: 'nonexistent' })).toHaveLength(0);
  });

  it('combines with the status filter — both must match', () => {
    expect(selectPolicies(LIVE, { ...BASE, search: 'conflicts', statuses: ['draft'] })).toHaveLength(1);
    expect(selectPolicies(LIVE, { ...BASE, search: 'conflicts', statuses: ['active'] })).toHaveLength(0);
  });
});

describe('selectPolicies · sort', () => {
  it('sorts by last modified, newest first (default)', () => {
    expect(names(selectPolicies(LIVE, BASE))[0]).toBe('Flag conflicts');
  });

  it('sorts by name A→Z', () => {
    expect(names(selectPolicies(LIVE, { ...BASE, sort: 'name' }))).toEqual([
      'Block dormant tokens',
      'Flag conflicts',
      'Quarantine orphans',
      'Rotate API keys',
    ]);
  });

  it('sorts by affected-count, largest first', () => {
    expect(names(selectPolicies(LIVE, { ...BASE, sort: 'affected' }))).toEqual([
      'Flag conflicts',
      'Rotate API keys',
      'Quarantine orphans',
      'Block dormant tokens',
    ]);
  });

  it('sorts by last activated newest first, with never-activated policies last', () => {
    const rows = names(selectPolicies(LIVE, { ...BASE, sort: 'activated' }));
    expect(rows.slice(0, 2)).toEqual(['Quarantine orphans', 'Block dormant tokens']);
    expect(rows.slice(2).sort()).toEqual(['Flag conflicts', 'Rotate API keys']);
  });
});

describe('policyCountLabel', () => {
  const label = (filter: PolicyListFilter) => policyCountLabel(selectPolicies(LIVE, filter), LIVE);

  it('omits "of" on the untouched view, where no filter was applied', () => {
    // Each tab is one fixed population, so an unfiltered list can never read "4 of 5".
    expect(label(BASE)).toBe('4 policies');
  });

  it('measures a search against the tab it is searching', () => {
    expect(label({ ...BASE, search: 'rotate' })).toBe('1 of 4 policies');
  });

  it('measures a status filter against the same population', () => {
    expect(label({ ...BASE, statuses: ['active'] })).toBe('1 of 4 policies');
  });

  it('omits "of" when the selected statuses cover the whole tab', () => {
    expect(label({ ...BASE, statuses: [...LIVE_POLICY_STATUSES] })).toBe('4 policies');
  });

  it('uses the singular when exactly one policy is visible in total', () => {
    const one = [POPULATION[0]];
    expect(policyCountLabel(one, one)).toBe('1 policy');
  });

  it('reports an empty result against the population it searched', () => {
    expect(label({ ...BASE, search: 'nonexistent' })).toBe('0 of 4 policies');
  });

  it('groups thousands', () => {
    const many = Array.from({ length: 1200 }, (_, i) => policy({ name: `Policy ${i}`, status: 'active' }));
    expect(policyCountLabel(many, many)).toBe('1,200 policies');
  });
});

describe('archiveRecords', () => {
  const audit = (over: Partial<AuditEntry> & { target: string }): AuditEntry => ({
    id: `aud_${over.target}_${over.at ?? ''}`,
    at: '2026-06-01T09:00:00.000Z',
    actor: 'alex.kim@acme.com',
    action: 'archived policy',
    object: 'policy',
    ...over,
  });

  const ARCHIVED = [
    policy({ name: 'Legacy sweep', status: 'archived', updatedAt: '2026-06-01T00:00:00.000Z' }),
    policy({ name: 'Old token rule', status: 'archived', updatedAt: '2026-07-02T00:00:00.000Z' }),
  ];

  it('attributes each policy from its audit entry', () => {
    const [first] = archiveRecords([ARCHIVED[0]], [audit({ target: 'Legacy sweep' })]);
    expect(first.at).toBe('2026-06-01T09:00:00.000Z');
    expect(first.by).toBe('alex.kim@acme.com');
  });

  it('falls back to updatedAt with no actor when the archival was never audited', () => {
    // The seeded dataset marks a policy archived without writing an audit row, and a
    // rename breaks the name-based join — neither should blank out the row.
    const [only] = archiveRecords([ARCHIVED[0]], []);
    expect(only.at).toBe('2026-06-01T00:00:00.000Z');
    expect(only.by).toBeNull();
  });

  it('ignores audit entries for other actions and other policies', () => {
    const [only] = archiveRecords([ARCHIVED[0]], [
      audit({ target: 'Legacy sweep', action: 'suspended policy', actor: 'someone@acme.com' }),
      audit({ target: 'Unrelated policy', actor: 'other@acme.com' }),
    ]);
    expect(only.by).toBeNull();
  });

  it('prefers the newest entry when a name was archived more than once', () => {
    const [only] = archiveRecords([ARCHIVED[0]], [
      audit({ target: 'Legacy sweep', at: '2026-06-20T00:00:00.000Z', actor: 'newest@acme.com' }),
      audit({ target: 'Legacy sweep', at: '2026-05-01T00:00:00.000Z', actor: 'oldest@acme.com' }),
    ]);
    expect(only.by).toBe('newest@acme.com');
  });

  it('marks a policy that once enforced as distinct from one discarded before it did', () => {
    const retired = policy({ name: 'Was live', status: 'archived', activatedAt: '2026-05-01T00:00:00.000Z' });
    const discarded = policy({ name: 'Never live', status: 'archived' });
    const rows = archiveRecords([retired, discarded], []);
    expect(rows.find((r) => r.policy.name === 'Was live')?.enforced).toBe(true);
    expect(rows.find((r) => r.policy.name === 'Never live')?.enforced).toBe(false);
  });

  it('orders the archive newest-first', () => {
    const rows = archiveRecords(ARCHIVED, [
      audit({ target: 'Legacy sweep', at: '2026-06-01T00:00:00.000Z' }),
      audit({ target: 'Old token rule', at: '2026-07-02T00:00:00.000Z' }),
    ]);
    expect(rows.map((r) => r.policy.name)).toEqual(['Old token rule', 'Legacy sweep']);
  });
});
