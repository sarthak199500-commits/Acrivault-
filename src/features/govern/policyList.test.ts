import { describe, expect, it } from 'vitest';
import { selectPolicies, statusCounts, type PolicyListFilter } from './policyList';
import type { Policy, PolicyStatus } from '@/mocks/types';

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

const BASE: PolicyListFilter = { search: '', statuses: [], sort: 'modified' };

const names = (rows: Policy[]) => rows.map((p) => p.name);

describe('statusCounts', () => {
  it('counts every status over the whole population, including archived', () => {
    expect(statusCounts(POPULATION)).toEqual({
      draft: 1,
      tested: 1,
      active: 1,
      suspended: 1,
      archived: 1,
    });
  });

  it('reports zero for statuses that are absent', () => {
    expect(statusCounts([]).active).toBe(0);
  });
});

describe('selectPolicies · default view', () => {
  it('excludes archived policies when no status filter is active (FR-011)', () => {
    const rows = selectPolicies(POPULATION, BASE);
    expect(names(rows)).not.toContain('Legacy sweep');
    expect(rows).toHaveLength(4);
  });

  it('includes archived only when that status is explicitly selected', () => {
    const rows = selectPolicies(POPULATION, { ...BASE, statuses: ['archived'] });
    expect(names(rows)).toEqual(['Legacy sweep']);
  });
});

describe('selectPolicies · status filter', () => {
  it('keeps only the selected statuses', () => {
    const rows = selectPolicies(POPULATION, { ...BASE, statuses: ['active', 'suspended'] });
    expect(names(rows).sort()).toEqual(['Block dormant tokens', 'Quarantine orphans']);
  });
});

describe('selectPolicies · search', () => {
  it('matches the policy name case-insensitively', () => {
    expect(names(selectPolicies(POPULATION, { ...BASE, search: 'ROTATE' }))).toEqual(['Rotate API keys']);
  });

  it('matches the plain-English rule text', () => {
    expect(names(selectPolicies(POPULATION, { ...BASE, search: 'attribute conflicts' }))).toEqual(['Flag conflicts']);
  });

  it('ignores surrounding whitespace and returns nothing on no match', () => {
    expect(selectPolicies(POPULATION, { ...BASE, search: '  rotate  ' })).toHaveLength(1);
    expect(selectPolicies(POPULATION, { ...BASE, search: 'nonexistent' })).toHaveLength(0);
  });

  it('combines with the status filter — both must match', () => {
    // "conflicts" matches only the Draft policy, so pairing it with Active yields nothing.
    expect(selectPolicies(POPULATION, { ...BASE, search: 'conflicts', statuses: ['draft'] })).toHaveLength(1);
    expect(selectPolicies(POPULATION, { ...BASE, search: 'conflicts', statuses: ['active'] })).toHaveLength(0);
  });
});

describe('selectPolicies · sort', () => {
  it('sorts by last modified, newest first (default)', () => {
    expect(names(selectPolicies(POPULATION, BASE))[0]).toBe('Flag conflicts');
  });

  it('sorts by name A→Z', () => {
    expect(names(selectPolicies(POPULATION, { ...BASE, sort: 'name' }))).toEqual([
      'Block dormant tokens',
      'Flag conflicts',
      'Quarantine orphans',
      'Rotate API keys',
    ]);
  });

  it('sorts by affected-count, largest first', () => {
    expect(names(selectPolicies(POPULATION, { ...BASE, sort: 'affected' }))).toEqual([
      'Flag conflicts',
      'Rotate API keys',
      'Quarantine orphans',
      'Block dormant tokens',
    ]);
  });

  it('sorts by last activated newest first, with never-activated policies last', () => {
    const rows = names(selectPolicies(POPULATION, { ...BASE, sort: 'activated' }));
    expect(rows.slice(0, 2)).toEqual(['Quarantine orphans', 'Block dormant tokens']);
    // Draft and Tested have never been activated — they sort to the end.
    expect(rows.slice(2).sort()).toEqual(['Flag conflicts', 'Rotate API keys']);
  });
});
