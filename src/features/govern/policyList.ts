// Search / filter / sort for the policy list (SCR-01). Pure functions so the
// selection rules are unit-testable independently of the screen.

import { POLICY_STATUSES, type Policy, type PolicyStatus } from '@/mocks/types';

export type PolicySort = 'modified' | 'activated' | 'name' | 'affected';

export const POLICY_SORT_OPTIONS: { value: PolicySort; label: string }[] = [
  { value: 'modified', label: 'Last modified' },
  { value: 'activated', label: 'Last activated' },
  { value: 'name', label: 'Name' },
  { value: 'affected', label: 'Affected count' },
];

export interface PolicyListFilter {
  search: string;
  statuses: PolicyStatus[];
  sort: PolicySort;
}

/** Facet counts over the whole population, so a pill's count is stable regardless of other filters. */
export function statusCounts(policies: Policy[]): Record<PolicyStatus, number> {
  const counts = Object.fromEntries(POLICY_STATUSES.map((s) => [s, 0])) as Record<PolicyStatus, number>;
  for (const p of policies) counts[p.status] += 1;
  return counts;
}

function matchesSearch(policy: Policy, term: string): boolean {
  // The data model has no separate description; the plain-English rule is the
  // user-visible stand-in for one, so it is searched alongside the name.
  return (
    policy.name.toLowerCase().includes(term) ||
    policy.plainEnglish.toLowerCase().includes(term)
  );
}

function compare(a: Policy, b: Policy, sort: PolicySort): number {
  switch (sort) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'affected':
      return b.affectedCount - a.affectedCount;
    case 'activated': {
      // Never-activated policies have nothing to sort on — they go last.
      if (!a.activatedAt && !b.activatedAt) return 0;
      if (!a.activatedAt) return 1;
      if (!b.activatedAt) return -1;
      return b.activatedAt.localeCompare(a.activatedAt);
    }
    case 'modified':
    default:
      return b.updatedAt.localeCompare(a.updatedAt);
  }
}

/**
 * Apply search, status filter, and sort. With no status selected this is the
 * default view, which excludes Archived — archived policies are retained for
 * audit but surface only when explicitly asked for (FR-011).
 */
export function selectPolicies(policies: Policy[], filter: PolicyListFilter): Policy[] {
  const term = filter.search.trim().toLowerCase();
  const rows = policies.filter((p) => {
    if (filter.statuses.length > 0) {
      if (!filter.statuses.includes(p.status)) return false;
    } else if (p.status === 'archived') {
      return false;
    }
    return term ? matchesSearch(p, term) : true;
  });
  return [...rows].sort((a, b) => compare(a, b, filter.sort));
}
