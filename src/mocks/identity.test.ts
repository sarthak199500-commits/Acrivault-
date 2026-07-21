import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getDataset } from './dataset';
import { assignOwner, getIdentity, listAudit } from './api';
import { useUiStore } from '@/stores/ui';

beforeAll(() => useUiStore.getState().setLatency(0));
// Some tests switch roles to exercise the capability gate; always restore the default.
afterEach(() => useUiStore.getState().setRole('tenant-admin'));

describe('assignOwner', () => {
  it('sets the owner and persists it to the identity record', async () => {
    const target = getDataset().identities.find((i) => !i.orphaned);
    if (!target) throw new Error('seed has no non-orphaned identity');

    const updated = await assignOwner(target.id, 'platform-team@acme.com');
    expect(updated.owner).toBe('platform-team@acme.com');

    const fetched = await getIdentity(target.id);
    expect(fetched?.owner).toBe('platform-team@acme.com');
  });

  it('clears the orphaned state when an owner is assigned', async () => {
    const orphan = getDataset().identities.find((i) => i.orphaned);
    if (!orphan) throw new Error('seed has no orphaned identity');

    const updated = await assignOwner(orphan.id, 'sre@acme.com');
    expect(updated.orphaned).toBe(false);
    expect(updated.orphanReason).toBeUndefined();

    const fetched = await getIdentity(orphan.id);
    expect(fetched?.orphaned).toBe(false);
  });

  it('records an audit entry for the assignment', async () => {
    const target = getDataset().identities[0];
    await assignOwner(target.id, 'owner@acme.com');

    const audit = await listAudit();
    expect(audit.some((e) => e.action === 'assigned owner' && e.target === target.name)).toBe(true);
  });

  it('rejects an empty owner', async () => {
    const target = getDataset().identities[0];
    await expect(assignOwner(target.id, '   ')).rejects.toMatchObject({ code: 'INVALID_OWNER' });
  });

  it('is forbidden for a role without the capability', async () => {
    useUiStore.getState().setRole('viewer');
    const target = getDataset().identities[0];
    await expect(assignOwner(target.id, 'x@acme.com')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('throws NOT_FOUND for an unknown identity', async () => {
    await expect(assignOwner('idn_missing', 'x@acme.com')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
