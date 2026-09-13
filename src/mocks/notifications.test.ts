import { beforeEach, describe, expect, it } from 'vitest';
import {
  activatePolicy,
  getNotificationPrefs,
  listAudit,
  listNotifications,
  markAllNotificationsRead,
  requestRotation,
  setNotificationRead,
  transferOwnership,
  updateNotificationPrefs,
} from './api';
import { getDataset } from './dataset';
import { NOTIFICATION_CATEGORIES } from './types';
import { useUiStore } from '@/stores/ui';
import { currentActor } from '@/stores/auth';

beforeEach(() => {
  const s = useUiStore.getState();
  s.setLatency(0);
  s.setScenarioState('auto');
  s.setRole('tenant-admin');
});

describe('notification feed fixture', () => {
  // The feed claims newest-first and live pushes are unshifted onto the front,
  // so the seeded tail has to already be descending. The previous generator
  // scaled a fresh random multiplier by the index and wandered both ways.
  it('is strictly descending in time', async () => {
    const items = await listNotifications();
    expect(items.length).toBeGreaterThan(1);
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1].at >= items[i].at).toBe(true);
    }
  });

  // Counting rows cannot catch an incoherent fixture: 12 notifications with
  // scrambled severities still numbers 12. Assert the pairing instead.
  it('never contradicts itself between severity, category and wording', async () => {
    const items = await listNotifications();
    for (const n of items) {
      expect(NOTIFICATION_CATEGORIES).toContain(n.category);
      // A row whose words say "critical" may not be filed as info, and the
      // reverse: an info-severity row may not describe a critical event.
      if (/critical/i.test(n.title)) expect(n.severity).toBe('critical');
      if (n.severity === 'info') expect(/critical|rolled back/i.test(n.title)).toBe(false);
      // The link has to go where the words point.
      if (n.category === 'rotation') expect(n.href).toBe('/rotate');
      if (n.category === 'policy') expect(n.href).toBe('/govern');
      if (n.category === 'quarantine') expect(n.href).toMatch(/^\/discover\//);
    }
  });

  it('names real records, not internal ids', async () => {
    const items = await listNotifications();
    const names = getDataset().identities.map((i) => i.name);
    const named = items.filter((n) => n.category === 'quarantine' || n.category === 'rotation');
    expect(named.length).toBeGreaterThan(0);
    for (const n of named) {
      expect(names.some((name) => n.title.includes(name))).toBe(true);
    }
  });
});

describe('read state', () => {
  // The bell badge and the feed read one cache entry. Mutating the stored object
  // in place left the refetched array deep-equal to itself, React Query's
  // structural sharing handed back the same reference, and no subscriber
  // recomputed — the badge kept a stale count until an unrelated re-render.
  it('replaces the entry instead of mutating it, so a re-read is observably different', async () => {
    const before = await listNotifications();
    const target = before.find((n) => !n.read);
    if (!target) throw new Error('the seeded feed has no unread notification');

    await setNotificationRead(target.id, true);
    const after = await listNotifications();

    expect(after.find((n) => n.id === target.id)?.read).toBe(true);
    // The object handed out before the write must NOT have changed underneath
    // the caller: that aliasing is what defeated the cache.
    expect(target.read).toBe(false);
    expect(after.filter((n) => !n.read).length).toBe(before.filter((n) => !n.read).length - 1);
  });

  it('marks unread again', async () => {
    const items = await listNotifications();
    const read = items.find((n) => n.read);
    if (!read) throw new Error('the seeded feed has no read notification');
    const updated = await setNotificationRead(read.id, false);
    expect(updated.read).toBe(false);
  });

  it('clears every unread in one write', async () => {
    const before = await listNotifications();
    expect(before.some((n) => !n.read)).toBe(true);
    await markAllNotificationsRead();
    const after = await listNotifications();
    expect(after.every((n) => n.read)).toBe(true);
    expect(after.length).toBe(before.length);
  });
});

describe('preferences', () => {
  it('persists across reads and is audited', async () => {
    const before = await getNotificationPrefs();
    expect(before.categories.alert.email).toBe(true);

    await updateNotificationPrefs({
      categories: { ...before.categories, alert: { inApp: true, email: false } },
    });

    const after = await getNotificationPrefs();
    expect(after.categories.alert.email).toBe(false);
    const audit = await listAudit({ search: 'notification preferences' });
    expect(audit.some((e) => e.action === 'updated notification preferences')).toBe(true);
  });

  it('hands out a deep copy, so a caller cannot edit the store by accident', async () => {
    const a = await getNotificationPrefs();
    a.categories.policy.inApp = false;
    const b = await getNotificationPrefs();
    expect(b.categories.policy.inApp).toBe(true);
  });

  // The whole point of the category field: a switch that suppresses nothing is
  // decoration, which is what the four original toggles were.
  it('an in-app switch that is off suppresses that category', async () => {
    const prefs = await getNotificationPrefs();
    await updateNotificationPrefs({
      categories: { ...prefs.categories, rotation: { inApp: false, email: false } },
    });
    const before = await listNotifications();
    await requestRotation('idn_000000', 'standard');
    const after = await listNotifications();
    expect(after.length).toBe(before.length);

    await updateNotificationPrefs({
      categories: { ...prefs.categories, rotation: { inApp: true, email: false } },
    });
    await requestRotation('idn_000000', 'standard');
    const enabled = await listNotifications();
    expect(enabled.length).toBe(before.length + 1);
    expect(enabled[0].category).toBe('rotation');
  });
});

describe('policy activation raises a notification', () => {
  it('files it under policy and links to the policy list', async () => {
    const candidate = getDataset().policies.find((p) => p.status === 'suspended');
    if (!candidate) return;
    const before = await listNotifications();
    await activatePolicy(candidate.id);
    const after = await listNotifications();
    expect(after.length).toBe(before.length + 1);
    expect(after[0].category).toBe('policy');
    expect(after[0].href).toBe('/govern');
  });
});

describe('ownership transfer', () => {
  it('is refused to everyone below Tenant Owner', async () => {
    useUiStore.getState().setRole('tenant-admin');
    const target = getDataset().users.find(
      (u) => u.status === 'active' && u.role !== 'tenant-owner',
    );
    if (!target) throw new Error('no transferable user in the seeded tenant');
    await expect(transferOwnership(target.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('refuses a suspended user', async () => {
    useUiStore.getState().setRole('tenant-owner');
    const suspended = getDataset().users.find((u) => u.status !== 'active');
    if (!suspended) return;
    await expect(transferOwnership(suspended.id)).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    });
  });

  // Ordered last in the file: it permanently moves the seeded Owner, and the
  // refusal tests above need an Owner who is still someone else.
  it('swaps both roles in one write, so the tenant never has two owners', async () => {
    useUiStore.getState().setRole('tenant-owner');
    const users = getDataset().users;
    const outgoing = users.find((u) => u.role === 'tenant-owner');
    // Not the signed-in actor: transferring to yourself is its own refusal, and
    // the demo session is one of the seeded active users.
    const actorId = currentActor().id;
    const target = users.find(
      (u) =>
        u.status === 'active' &&
        u.role !== 'tenant-owner' &&
        u.id !== outgoing?.id &&
        u.id !== actorId,
    );
    if (!target) throw new Error('no transferable user in the seeded tenant');

    await transferOwnership(target.id);

    const owners = getDataset().users.filter((u) => u.role === 'tenant-owner');
    expect(owners.length).toBe(1);
    expect(owners[0].id).toBe(target.id);
    if (outgoing) expect(outgoing.role).toBe('tenant-admin');
    const audit = await listAudit({ search: 'ownership' });
    expect(audit.some((e) => e.action === 'transferred ownership')).toBe(true);
  });
});
