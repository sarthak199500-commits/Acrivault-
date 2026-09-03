import { beforeAll, describe, expect, it } from 'vitest';
import { ACTION_OBJECT, AUDIT_ACTIONS, AUDIT_OBJECTS } from './types';
import { listAudit } from './api';
import { useUiStore } from '@/stores/ui';

beforeAll(() => useUiStore.getState().setLatency(0));

describe('audit action vocabulary', () => {
  // ACTION_OBJECT is a Record over the AuditAction union, so the compiler already
  // refuses a missing key. This catches the other direction — a stale entry for
  // an action nobody writes any more, which would leave a filter option that can
  // never match anything.
  it('classifies exactly the actions the product writes, and no others', () => {
    expect(Object.keys(ACTION_OBJECT).sort()).toEqual([...AUDIT_ACTIONS].sort());
  });

  it('maps every action onto a known object', () => {
    for (const action of AUDIT_ACTIONS) {
      expect(AUDIT_OBJECTS, action).toContain(ACTION_OBJECT[action]);
    }
  });
});

describe('audit filtering', () => {
  it('classifies every entry against a known object', async () => {
    const rows = await listAudit();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((e) => AUDIT_OBJECTS.includes(e.object))).toBe(true);
  });

  // The whole point of a closed action set: if one action were unclassified, the
  // sum would come in short and the Object filter would under-report silently.
  it('the object filter partitions the log exactly', async () => {
    const all = await listAudit();
    let sum = 0;
    for (const object of AUDIT_OBJECTS) {
      sum += (await listAudit({ objects: [object] })).length;
    }
    expect(sum).toBe(all.length);
  });

  it('an empty objects array is not a filter', async () => {
    const all = await listAudit();
    expect((await listAudit({ objects: [] })).length).toBe(all.length);
  });

  // Point 38: a user's trail was unreachable because search only ever looked at
  // the actor and the action, and a role change names the person in `target`.
  it('search matches the target, not just the actor and action', async () => {
    const all = await listAudit();
    const roleChange = all.find((e) => e.action === 'changed user role');
    if (!roleChange) throw new Error('fixture has no role-change entry');
    const hits = await listAudit({ search: roleChange.target });
    expect(hits.some((e) => e.id === roleChange.id)).toBe(true);
    expect(hits.every((e) => e.target === roleChange.target)).toBe(true);
  });

  it('search matches the detail', async () => {
    const all = await listAudit();
    const withDetail = all.find((e) => e.detail);
    if (!withDetail?.detail) throw new Error('fixture has no detailed entry');
    const hits = await listAudit({ search: withDetail.detail });
    expect(hits.some((e) => e.id === withDetail.id)).toBe(true);
  });

  it('search is case-insensitive', async () => {
    const upper = await listAudit({ search: 'SYSTEM' });
    const lower = await listAudit({ search: 'system' });
    expect(upper.length).toBeGreaterThan(0);
    expect(upper.map((e) => e.id)).toEqual(lower.map((e) => e.id));
  });

  it('the date range is inclusive at both ends', async () => {
    const all = await listAudit();
    const oldest = all[all.length - 1];
    const newest = all[0];
    const only = await listAudit({ from: oldest.at, to: oldest.at });
    expect(only.some((e) => e.id === oldest.id)).toBe(true);
    expect(only.some((e) => e.id === newest.id)).toBe(false);
  });

  it('a from bound alone keeps everything at or after it', async () => {
    const all = await listAudit();
    const mid = all[Math.floor(all.length / 2)];
    const rows = await listAudit({ from: mid.at });
    expect(rows.every((e) => e.at >= mid.at)).toBe(true);
    expect(rows.some((e) => e.id === mid.id)).toBe(true);
  });

  it('combines filters rather than replacing them', async () => {
    const users = await listAudit({ objects: ['user'] });
    if (users.length === 0) throw new Error('fixture has no user entries');
    const narrowed = await listAudit({ objects: ['user'], search: users[0].actor });
    expect(narrowed.every((e) => e.object === 'user')).toBe(true);
    expect(narrowed.every((e) => e.actor === users[0].actor)).toBe(true);
    expect(narrowed.length).toBeLessThanOrEqual(users.length);
  });

  it('keeps the newest-first order under filtering', async () => {
    const rows = await listAudit({ objects: ['identity'] });
    expect(rows.length).toBeGreaterThan(1);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].at >= rows[i].at).toBe(true);
    }
  });
});
