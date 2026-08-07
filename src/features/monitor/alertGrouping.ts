import type { Alert } from '@/mocks/types';

// Generic over the alert shape so callers keep whatever the API joined onto it
// (identity name, and anything added later) instead of widening back to Alert.
export interface AlertBucket<T> {
  label: string;
  alerts: T[];
}

const DAY = 86_400_000;
const ORDER = ['Today', 'Earlier this week', 'Older'] as const;

/**
 * Group alerts into recency buckets (local-day boundaries) for sticky subheaders.
 * Empty buckets are dropped; order within a bucket is preserved.
 */
export function bucketByTime<T extends Pick<Alert, 'createdAt'>>(
  alerts: T[],
  now: number = Date.now(),
): AlertBucket<T>[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();
  const labelFor = (t: number): (typeof ORDER)[number] =>
    t >= todayMs ? 'Today' : t >= todayMs - 7 * DAY ? 'Earlier this week' : 'Older';

  const groups = new Map<string, T[]>();
  for (const a of alerts) {
    const label = labelFor(new Date(a.createdAt).getTime());
    const list = groups.get(label) ?? [];
    list.push(a);
    groups.set(label, list);
  }
  return ORDER.flatMap((l) => {
    const alerts = groups.get(l);
    return alerts && alerts.length ? [{ label: l, alerts }] : [];
  });
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
