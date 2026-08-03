// Search / filter / sort for the policy list (SCR-01). Pure functions so the
// selection rules are unit-testable independently of the screen.

import { POLICY_STATUSES, type AuditEntry, type Policy, type PolicyStatus } from '@/mocks/types';
import { count } from '@/lib/format';

export type PolicySort = 'modified' | 'activated' | 'name' | 'affected';

/**
 * The list presents two populations, not one filtered set: policies you still
 * work with, and the archive. Archived rows are immutable and unrestorable, so
 * they are not a peer of the live statuses and don't belong in the status facet.
 */
export type PolicyTab = 'live' | 'archive';

/** Facet vocabulary — the four states a live policy can hold. */
export const LIVE_POLICY_STATUSES: PolicyStatus[] = POLICY_STATUSES.filter((s) => s !== 'archived');

export function policiesForTab(policies: Policy[], tab: PolicyTab): Policy[] {
  return policies.filter((p) => (tab === 'archive' ? p.status === 'archived' : p.status !== 'archived'));
}

export type LifecycleAction = 'suspend' | 'reactivate' | 'archive';

/**
 * The one verb that earns a place inline on a row: the reversible next step for a
 * policy in that state. Draft and Tested have none — nothing is enforcing, so
 * there is nothing to start or stop from here.
 */
export function inlineAction(status: PolicyStatus): LifecycleAction | null {
  if (status === 'active') return 'suspend';
  if (status === 'suspended') return 'reactivate';
  return null;
}

/**
 * Archive is reachable from every state that isn't enforcing: Draft and Tested
 * never did, and Suspended has stopped. Active must suspend first — that half of
 * FR-011 is the safety-relevant one, since it forces you to watch enforcement
 * stop before committing to a retirement you cannot undo. Archived is terminal.
 *
 * Being irreversible, it sits in the overflow rather than one stray click away.
 */
export function overflowActions(status: PolicyStatus): LifecycleAction[] {
  return status === 'draft' || status === 'tested' || status === 'suspended' ? ['archive'] : [];
}

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
 * Apply search, status filter, and sort to an already tab-scoped population —
 * see policiesForTab. Scoping lives there so this stays a plain narrowing pass.
 */
export function selectPolicies(policies: Policy[], filter: PolicyListFilter): Policy[] {
  const term = filter.search.trim().toLowerCase();
  const rows = policies.filter((p) => {
    if (filter.statuses.length > 0 && !filter.statuses.includes(p.status)) return false;
    return term ? matchesSearch(p, term) : true;
  });
  return [...rows].sort((a, b) => compare(a, b, filter.sort));
}

/**
 * Counter above the list: "4 policies" when nothing is narrowed, "2 of 4
 * policies" when it is. The "of" form is the filtered-state signal, so it must
 * appear only alongside a filter the user can see and clear — which holds by
 * construction now that each tab hands in one fixed population.
 */
export function policyCountLabel(rows: Policy[], population: Policy[]): string {
  if (rows.length === population.length) {
    return `${count(rows.length)} ${rows.length === 1 ? 'policy' : 'policies'}`;
  }
  return `${count(rows.length)} of ${count(population.length)} policies`;
}

/** An archived policy joined to the audit entry that retired it. */
export interface ArchiveRecord {
  policy: Policy;
  /** When it was archived — the audit entry, or updatedAt if that archival predates the log. */
  at: string;
  /** Who archived it, or null when the archival was never attributed. */
  by: string | null;
  /**
   * Whether it ever enforced. The archive holds two different things — policies
   * retired after governing identities, and drafts discarded before they ever
   * did — and reading them as one overstates what the archive represents.
   */
  enforced: boolean;
}

/**
 * Attribute each archived policy from the audit log, newest first. The Policy
 * entity records no archivedAt/archivedBy, and the audit log is the register of
 * who retired what — so this reads it there rather than duplicating the state.
 * The join is by name because that is what appendAudit stores as its target; a
 * rename therefore falls back rather than mis-attributing.
 */
export function archiveRecords(policies: Policy[], audit: AuditEntry[]): ArchiveRecord[] {
  const newest = new Map<string, AuditEntry>();
  for (const entry of audit) {
    if (entry.action !== 'archived policy') continue;
    const held = newest.get(entry.target);
    if (!held || entry.at.localeCompare(held.at) > 0) newest.set(entry.target, entry);
  }
  return policies
    .map((policy) => {
      const entry = newest.get(policy.name);
      return {
        policy,
        at: entry?.at ?? policy.updatedAt,
        by: entry?.actor ?? null,
        enforced: !!policy.activatedAt,
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}
