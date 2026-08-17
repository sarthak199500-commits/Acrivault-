export interface TimeBucket<T> {
  label: string;
  items: T[];
}

const DAY = 86_400_000;
const ORDER = ['Today', 'Earlier this week', 'Older'] as const;

/**
 * Group records into recency buckets (local-day boundaries) for sticky subheaders.
 * Empty buckets are dropped; order within a bucket is preserved.
 *
 * Shared by the alert feed and the agent-session list so the two triage surfaces cut
 * time the same way — they read as one product, and the labels cannot drift apart.
 */
export function bucketByTime<T>(
  items: T[],
  at: (item: T) => string,
  now: number = Date.now(),
): TimeBucket<T>[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();
  const labelFor = (t: number): (typeof ORDER)[number] =>
    t >= todayMs ? 'Today' : t >= todayMs - 7 * DAY ? 'Earlier this week' : 'Older';

  const groups = new Map<string, T[]>();
  for (const item of items) {
    const label = labelFor(new Date(at(item)).getTime());
    const list = groups.get(label) ?? [];
    list.push(item);
    groups.set(label, list);
  }
  return ORDER.flatMap((label) => {
    const bucketed = groups.get(label);
    return bucketed && bucketed.length ? [{ label, items: bucketed }] : [];
  });
}
