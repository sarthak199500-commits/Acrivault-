import type { Alert } from '@/mocks/types';
import { bucketByTime as bucketBy } from '@/lib/timeBuckets';

// Generic over the alert shape so callers keep whatever the API joined onto it
// (identity name, and anything added later) instead of widening back to Alert.
export interface AlertBucket<T> {
  label: string;
  alerts: T[];
}

/**
 * Group alerts into recency buckets (local-day boundaries) for sticky subheaders.
 * Empty buckets are dropped; order within a bucket is preserved.
 *
 * The bucketing itself is shared with the agent-session list — see lib/timeBuckets.
 */
export function bucketByTime<T extends Pick<Alert, 'createdAt'>>(
  alerts: T[],
  now: number = Date.now(),
): AlertBucket<T>[] {
  return bucketBy(alerts, (a) => a.createdAt, now).map(({ label, items }) => ({ label, alerts: items }));
}

/** Split into active (open) vs settled (acknowledged or resolved) alerts. */
export function splitAcknowledged<T extends Pick<Alert, 'status'>>(
  alerts: T[],
): { active: T[]; acknowledged: T[] } {
  return {
    active: alerts.filter((a) => a.status === 'open'),
    acknowledged: alerts.filter((a) => a.status !== 'open'),
  };
}

/** An alert row, plus the further alerts the same rule raised behind it. */
export interface AlertGroup<T> {
  lead: T;
  /** Newest first, in feed order. Always empty for a behavioral alert. */
  rest: T[];
}

/**
 * Collapse the alerts one rule raised into a single row.
 *
 * A rule that matches on a threshold raises once per identity, so a rule covering a
 * whole class of identities fills the feed with N rows carrying the same title — true,
 * but it reads as volume rather than as one finding. Rolling up puts the rule's first
 * alert in the feed and the rest behind it.
 *
 * The group takes the position its FIRST member already held rather than being hoisted
 * or appended, so collapsing never reorders the feed relative to behavioral alerts
 * around it. Behavioral alerts never group: without a rule there is nothing to group by.
 *
 * NOTE: this rolls up by rule, not by identity. An identity that crosses a threshold
 * repeatedly still produces one row per crossing — the repeat-action roll-up the Govern
 * activity log needs is the same unsolved problem, and is not attempted here.
 */
export function rollUpByPolicy<T extends Pick<Alert, 'raisedBy'>>(alerts: T[]): AlertGroup<T>[] {
  const groups: AlertGroup<T>[] = [];
  const byPolicy = new Map<string, AlertGroup<T>>();
  for (const alert of alerts) {
    const policyId = alert.raisedBy?.policyId;
    if (!policyId) {
      groups.push({ lead: alert, rest: [] });
      continue;
    }
    const existing = byPolicy.get(policyId);
    if (existing) {
      existing.rest.push(alert);
      continue;
    }
    const group: AlertGroup<T> = { lead: alert, rest: [] };
    byPolicy.set(policyId, group);
    groups.push(group);
  }
  return groups;
}
