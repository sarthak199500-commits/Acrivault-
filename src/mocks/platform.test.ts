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

  // Search covers target and detail as well as actor and action (point 42c):
  // a user's trail is reachable only by their email, which lives in `target`.
  it('audit search matches actor, action, target, or detail', async () => {
    const all = await listAudit();
    expect(all.length).toBeGreaterThan(0);
    const filtered = await listAudit({ search: 'system' });
    expect(filtered.length).toBeGreaterThan(0);
    expect(
      filtered.every((e) =>
        `${e.actor} ${e.action} ${e.target} ${e.detail ?? ''}`.toLowerCase().includes('system'),
      ),
    ).toBe(true);
  });

  // An append-only trail is evidence (FRS §3.10): time may not appear to move
  // backwards. Live entries are unshifted onto the front, so the seeded tail has
  // to already read newest-first for the whole log to.
  it('the audit log reads newest-first', async () => {
    const rows = await listAudit();
    expect(rows.length).toBeGreaterThan(1);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].at >= rows[i].at).toBe(true);
    }
  });

  // Seeded rows sit next to rows the user just generated, and the live paths
  // write human labels (identity/policy names, emails) — an internal id in the
  // Target column marks a row as fake.
  it('audit targets are human labels, never internal ids', async () => {
    const rows = await listAudit();
    expect(rows.length).toBeGreaterThan(0);
    const withIdTargets = rows.filter((e) => /^(idn|usr|pol|alr|ses|rot)_/.test(e.target));
    expect(withIdTargets).toEqual([]);
  });

  it('audit targets suit the action they record', async () => {
    const rows = await listAudit();
    const roleChanges = rows.filter((e) => e.action === 'changed user role');
    expect(roleChanges.length).toBeGreaterThan(0);
    expect(roleChanges.every((e) => e.target.includes('@'))).toBe(true);

    const ssoEdits = rows.filter((e) => e.action === 'updated SSO config');
    expect(ssoEdits.length).toBeGreaterThan(0);
    expect(ssoEdits.every((e) => e.target.includes('SSO') && !e.target.includes('@'))).toBe(true);
  });
});
