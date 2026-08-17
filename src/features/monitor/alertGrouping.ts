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
