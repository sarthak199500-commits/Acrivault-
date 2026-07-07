import { describe, expect, it } from 'vitest';
import type { Alert } from '@/mocks/types';
import { bucketByTime, splitAcknowledged } from './alertGrouping';

const NOW = new Date('2026-06-26T12:00:00Z').getTime();
const DAY = 86_400_000;

const mk = (id: string, createdAt: string, status: Alert['status'] = 'open'): Alert => ({
  id,
  identityId: 'i',
  severity: 'high',
  title: 't',
  description: 'd',
  recommendedNextStep: 'n',
  baseline: 'established',
  status,
  createdAt,
});

describe('bucketByTime', () => {
  it('labels by recency: Today / Earlier this week / Older', () => {
    // Offsets chosen so the labels are stable in any timezone.
    const rows = [
      mk('a', new Date(NOW).toISOString()),
      mk('b', new Date(NOW - 2 * DAY).toISOString()),
      mk('c', new Date(NOW - 20 * DAY).toISOString()),
    ];
    expect(bucketByTime(rows, NOW).map((g) => g.label)).toEqual([
      'Today',
      'Earlier this week',
      'Older',
    ]);
  });

  it('omits empty buckets and keeps order within a bucket', () => {
    const rows = [mk('a', new Date(NOW).toISOString()), mk('b', new Date(NOW).toISOString())];
    const buckets = bucketByTime(rows, NOW);
    expect(buckets.map((g) => g.label)).toEqual(['Today']);
    expect(buckets[0].alerts.map((a) => a.id)).toEqual(['a', 'b']);
  });
});

describe('splitAcknowledged', () => {
  it('treats only open alerts as active; acknowledged + resolved are settled', () => {
    const { active, acknowledged } = splitAcknowledged([
      mk('a', 'x', 'open'),
      mk('b', 'x', 'acknowledged'),
      mk('c', 'x', 'resolved'),
    ]);
    expect(active.map((a) => a.id)).toEqual(['a']);
    expect(acknowledged.map((a) => a.id)).toEqual(['b', 'c']);
  });
});
