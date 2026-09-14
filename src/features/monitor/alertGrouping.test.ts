import { describe, expect, it } from 'vitest';
import type { Alert } from '@/mocks/types';
import { bucketByTime, rollUpByPolicy, splitAcknowledged } from './alertGrouping';

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

describe('rollUpByPolicy', () => {
  const raised = (id: string, policyId: string, createdAt = '2026-06-26T10:00:00Z'): Alert => ({
    ...mk(id, createdAt),
    raisedBy: { policyId, policyName: `rule ${policyId}` },
  });

  it('leaves a behavioral alert as a group of its own', () => {
    const groups = rollUpByPolicy([mk('a', '2026-06-26T10:00:00Z')]);
    expect(groups).toEqual([{ lead: mk('a', '2026-06-26T10:00:00Z'), rest: [] }]);
  });

  it('collapses alerts from one rule behind their first row', () => {
    const rows = [raised('a', 'p1'), raised('b', 'p1'), raised('c', 'p1')];
    const groups = rollUpByPolicy(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].lead.id).toBe('a');
    expect(groups[0].rest.map((a) => a.id)).toEqual(['b', 'c']);
  });

  it('keeps separate rules separate', () => {
    const groups = rollUpByPolicy([raised('a', 'p1'), raised('b', 'p2'), raised('c', 'p1')]);
    expect(groups.map((g) => g.lead.id)).toEqual(['a', 'b']);
    expect(groups[0].rest.map((a) => a.id)).toEqual(['c']);
    expect(groups[1].rest).toEqual([]);
  });

  it('holds a rule group at its first row, so the feed stays in time order', () => {
    // b is behavioral and sits between two rows of the same rule. Collapsing must not
    // lift c above b -- the group takes the position its newest member already had.
    const rows = [raised('a', 'p1'), mk('b', '2026-06-26T09:00:00Z'), raised('c', 'p1')];
    expect(rollUpByPolicy(rows).map((g) => g.lead.id)).toEqual(['a', 'b']);
  });

  it('does not roll up a rule that raised exactly one alert', () => {
    expect(rollUpByPolicy([raised('a', 'p1')])[0].rest).toEqual([]);
  });
});
