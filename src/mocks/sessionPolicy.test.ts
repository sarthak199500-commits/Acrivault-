import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getSessionPolicy, listAudit, updateSessionPolicy } from './api';
import { useUiStore } from '@/stores/ui';

beforeAll(() => useUiStore.getState().setLatency(0));
beforeEach(() => useUiStore.getState().setRole('tenant-admin'));

describe('session policy', () => {
  it('ships a policy rather than leaving the question unanswered', async () => {
    const p = await getSessionPolicy();
    expect(p.idleTimeoutMinutes).toBeGreaterThan(0);
    expect(p.absoluteSessionHours).toBeGreaterThan(0);
    expect(typeof p.stepUpOnSensitive).toBe('boolean');
  });

  it('an absolute limit outlives an idle timeout, or one of them is meaningless', async () => {
    const p = await getSessionPolicy();
    expect(p.absoluteSessionHours * 60).toBeGreaterThan(p.idleTimeoutMinutes);
  });

  it('records a change and leaves the untouched fields alone', async () => {
    const before = await getSessionPolicy();
    const after = await updateSessionPolicy({ idleTimeoutMinutes: 60 });
    expect(after.idleTimeoutMinutes).toBe(60);
    expect(after.absoluteSessionHours).toBe(before.absoluteSessionHours);
    expect(after.stepUpOnSensitive).toBe(before.stepUpOnSensitive);
    expect((await getSessionPolicy()).idleTimeoutMinutes).toBe(60);
  });

  it('writes the change to the audit log — a session policy change is evidence', async () => {
    await updateSessionPolicy({ stepUpOnSensitive: false });
    const [latest] = await listAudit();
    expect(latest.action).toBe('updated session policy');
    expect(latest.object).toBe('tenant');
    expect(latest.detail).toContain('step-up off');
  });

  it('refuses a role that cannot manage settings', async () => {
    useUiStore.getState().setRole('analyst');
    await expect(updateSessionPolicy({ idleTimeoutMinutes: 15 })).rejects.toThrow();
  });
});
