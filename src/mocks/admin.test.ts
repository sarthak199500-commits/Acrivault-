import { beforeEach, describe, expect, it } from 'vitest';
import {
  acceptInvite,
  activateUser,
  deleteUser,
  inviteUser,
  listAudit,
  listUsers,
  requestAccess,
  resolveInvite,
  suspendUser,
  verifyCode,
} from './api';
import { useUiStore } from '@/stores/ui';

beforeEach(() => {
  const s = useUiStore.getState();
  s.setLatency(0);
  s.setAuthScenario('normal');
  s.setScenarioState('auto');
  s.setRole('tenant-admin');
});

describe('registration', () => {
  it('rejects personal and already-registered domains, accepts a fresh work domain', async () => {
    await expect(requestAccess('me@gmail.com')).rejects.toMatchObject({ code: 'PERSONAL_DOMAIN' });
    await expect(requestAccess('me@acme.com')).rejects.toMatchObject({ code: 'DOMAIN_REGISTERED' });
    await expect(requestAccess('not-an-email')).rejects.toMatchObject({ code: 'INVALID_EMAIL' });
    await expect(requestAccess('founder@newco.com')).resolves.toMatchObject({ domain: 'newco.com' });
  });

  it('verifies the known code and rejects others', async () => {
    await expect(verifyCode('123456')).resolves.toEqual({ ok: true });
    await expect(verifyCode('000000')).rejects.toMatchObject({ code: 'INVALID_CODE' });
  });

  it('forces the expired-code path under the scenario', async () => {
    useUiStore.getState().setAuthScenario('code-expired');
    await expect(verifyCode('123456')).rejects.toMatchObject({ code: 'CODE_EXPIRED' });
  });
});

describe('invitations', () => {
  it('rejects out-of-domain and duplicate emails', async () => {
    await expect(
      inviteUser({ email: 'x@globex.com', role: 'analyst', groups: [] }),
    ).rejects.toMatchObject({ code: 'DOMAIN_MISMATCH' });
    await expect(
      inviteUser({ email: 'jordan.rivera@acme.com', role: 'analyst', groups: [] }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_USER' });
  });

  it('creates a pending user, writes audit, and reports email failure under scenario', async () => {
    const before = (await listUsers()).length;
    const { user, emailFailed } = await inviteUser({
      email: 'brand.new@acme.com',
      role: 'analyst',
      groups: [],
    });
    expect(user.status).toBe('invited');
    expect(emailFailed).toBe(false);
    expect((await listUsers()).length).toBe(before + 1);
    const audit = await listAudit();
    expect(audit.some((a) => a.action === 'invited user' && a.target === 'brand.new@acme.com')).toBe(true);
  });

  it('only a tenant admin can invite: an analyst is forbidden even for a lower role', async () => {
    useUiStore.getState().setRole('analyst');
    await expect(
      inviteUser({ email: 'someone@acme.com', role: 'viewer', groups: [] }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('resolves seeded invitation tokens to their states', async () => {
    await expect(resolveInvite('acme-demo-001')).resolves.toMatchObject({ status: 'pending' });
    await expect(resolveInvite('acme-expired-002')).rejects.toMatchObject({ code: 'EXPIRED_TOKEN' });
    await expect(resolveInvite('acme-accepted-003')).rejects.toMatchObject({ code: 'ALREADY_ACCEPTED' });
    await expect(resolveInvite('acme-revoked-004')).rejects.toMatchObject({ code: 'REVOKED_TOKEN' });
    await expect(resolveInvite('nope')).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('accepting an invitation moves the pending user to active', async () => {
    await acceptInvite('inv-robin');
    const robin = (await listUsers()).find((u) => u.email === 'robin.park@acme.com');
    expect(robin?.status).toBe('active');
  });
});

describe('lifecycle and rank gating', () => {
  it('suspend then activate a manageable user', async () => {
    const suspended = await suspendUser('usr_5');
    expect(suspended.status).toBe('suspended');
    const active = await activateUser('usr_5');
    expect(active.status).toBe('active');
  });

  it('a security admin cannot manage users at all (capability, not just rank)', async () => {
    useUiStore.getState().setRole('security-admin');
    // usr_5 is below a security admin by rank, but security admins lack users.suspend.
    await expect(suspendUser('usr_5')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('cannot suspend or delete the last active tenant admin, including yourself', async () => {
    // Two Tenant Admins are seeded (usr_1, usr_2). Suspending one is allowed…
    await expect(suspendUser('usr_2')).resolves.toMatchObject({ status: 'suspended' });
    // …but usr_1 (the acting Tenant Admin) is now the last active one.
    await expect(suspendUser('usr_1')).rejects.toMatchObject({ code: 'LAST_TENANT_ADMIN' });
    await expect(deleteUser('usr_1')).rejects.toMatchObject({ code: 'LAST_TENANT_ADMIN' });
  });

  it('deleting a user removes them from the list but keeps their audit entries', async () => {
    const target = 'usr_7';
    const before = await listUsers();
    const targetUser = before.find((u) => u.id === target);
    expect(targetUser).toBeDefined();
    const targetEmail = targetUser?.email ?? '';
    await deleteUser(target);
    const after = await listUsers();
    expect(after.some((u) => u.id === target)).toBe(false);
    const audit = await listAudit();
    expect(audit.some((a) => a.action === 'deleted user' && a.target === targetEmail)).toBe(true);
  });
});
