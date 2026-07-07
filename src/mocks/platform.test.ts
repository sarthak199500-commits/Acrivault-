import { beforeAll, describe, expect, it } from 'vitest';
import {
  listAudit,
  listNotifications,
  listRotations,
  markNotificationRead,
  requestRotation,
  updateUserRole,
} from './api';
import { useUiStore } from '@/stores/ui';

beforeAll(() => useUiStore.getState().setLatency(0));

describe('rotate', () => {
  it('requesting a rotation adds an active job in the prepare phase', async () => {
    const before = await listRotations();
    const job = await requestRotation('idn_000000', 'standard');
    expect(job.phase).toBe('prepare');
    const after = await listRotations();
    expect(after.active.length).toBe(before.active.length + 1);
    expect(after.active.some((j) => j.id === job.id)).toBe(true);
  });

  it('history is returned newest-first', async () => {
    const { history } = await listRotations();
    for (let i = 1; i < history.length; i++) {
      expect(history[i - 1].completedAt >= history[i].completedAt).toBe(true);
    }
  });
});

describe('platform', () => {
  it('updates a user role', async () => {
    const updated = await updateUserRole('usr_3', 'security-admin');
    expect(updated.role).toBe('security-admin');
  });

  it('marks a notification read', async () => {
    const items = await listNotifications();
    const unread = items.find((n) => !n.read) ?? items[0];
    const updated = await markNotificationRead(unread.id);
    expect(updated.read).toBe(true);
  });

  it('audit search filters by actor or action', async () => {
    const all = await listAudit();
    expect(all.length).toBeGreaterThan(0);
    const filtered = await listAudit('system');
    expect(filtered.every((e) => e.actor.includes('system') || e.action.includes('system'))).toBe(true);
  });
});
