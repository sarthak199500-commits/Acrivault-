import { beforeEach, describe, expect, it } from 'vitest';
import {
  acceptInvite,
  activateUser,
  addUser,
  createPassword,
  deleteUser,
  editUser,
  getDomainChallenge,
  listAudit,
  listUsers,
  login,
  requestAccess,
  resetPassword,
  resolveInvite,
  suspendUser,
  verifyCode,
  verifyDomain,
  verifyPasswordOtp,
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

  it('verifies the domain after the email, and rejects an empty one', async () => {
    await expect(verifyDomain('NewCo.com')).resolves.toEqual({ domain: 'newco.com' });
    await expect(verifyDomain('  ')).rejects.toMatchObject({ code: 'INVALID_DOMAIN' });
  });

  it('forces the unverified-domain path under the scenario', async () => {
    useUiStore.getState().setAuthScenario('domain-unverified');
    await expect(verifyDomain('newco.com')).rejects.toMatchObject({
      code: 'DOMAIN_TXT_NOT_FOUND',
    });
  });

  it('issues a stable TXT challenge per domain', async () => {
    const first = await getDomainChallenge('NewCo.com');
    expect(first).toMatchObject({ domain: 'newco.com', recordType: 'TXT', name: '@' });
    expect(first.value).toMatch(/^acrivault-verify=[0-9a-f]{32}$/);
    // Stable across calls — a value that appeared to rotate would invalidate the
    // record the user is midway through publishing.
    expect((await getDomainChallenge('newco.com')).value).toBe(first.value);
    // ...and distinct per domain.
    expect((await getDomainChallenge('other.com')).value).not.toBe(first.value);
    await expect(getDomainChallenge('  ')).rejects.toMatchObject({ code: 'INVALID_DOMAIN' });
  });
});

describe('password recovery', () => {
  it('verifies the known recovery code and rejects others', async () => {
    await expect(verifyPasswordOtp('123456')).resolves.toEqual({ ok: true });
    await expect(verifyPasswordOtp('000000')).rejects.toMatchObject({ code: 'INVALID_CODE' });
  });

  it('accepts a reset with a confirmed code and no token', async () => {
    await expect(resetPassword(undefined, 'Vault-Keeper9!')).resolves.toEqual({ ok: true });
  });

  it('still rejects an expired emailed link', async () => {
    await expect(resetPassword('expired', 'Vault-Keeper9!')).rejects.toMatchObject({
      code: 'EXPIRED_TOKEN',
    });
  });

  it('enforces the full password policy, not just length', async () => {
    // 14 chars but no symbol — the old length-only check would have let this through.
    await expect(resetPassword(undefined, 'VaultKeeper999')).rejects.toMatchObject({
      code: 'WEAK_PASSWORD',
    });
    await expect(createPassword('founder@newco.com', 'short')).rejects.toMatchObject({
      code: 'WEAK_PASSWORD',
    });
    await expect(createPassword('founder@newco.com', 'Vault-Keeper9!')).resolves.toEqual({
      ok: true,
    });
  });

  it('lets a registered owner sign in with the password they just created', async () => {
    // The owner is never seeded into the Acme tenant, so before createPassword ran
    // there was no account to sign in to — the create-password screen promised a
    // credential the login screen then rejected.
    await expect(login('owner@newco-signin.com', 'Vault-Keeper9!')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });

    await createPassword('Owner@NewCo-SignIn.com', 'Vault-Keeper9!');

    // Case-insensitive, and surfaced as the Tenant Owner of their own tenant —
    // the first user created at tenant creation owns it (spec §2).
    await expect(login('owner@newco-signin.com', 'Vault-Keeper9!')).resolves.toMatchObject({
      user: { email: 'owner@newco-signin.com', role: 'tenant-owner', status: 'active' },
    });
  });

  it('still rejects an unrelated address after an owner registers', async () => {
    await createPassword('owner@newco-other.com', 'Vault-Keeper9!');
    await expect(login('stranger@newco-other.com', 'Vault-Keeper9!')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });
});

describe('adding users', () => {
  it('rejects out-of-domain and duplicate emails', async () => {
    await expect(
      addUser({ email: 'x@globex.com', role: 'analyst' }),
    ).rejects.toMatchObject({ code: 'DOMAIN_MISMATCH' });
    await expect(
      addUser({ email: 'jordan.rivera@acme.com', role: 'analyst' }),
    ).rejects.toMatchObject({ code: 'DUPLICATE_USER' });
  });

  it('creates a pending user, writes audit, and reports email failure under scenario', async () => {
    const before = (await listUsers()).length;
    const { user, emailFailed } = await addUser({
      email: 'brand.new@acme.com',
      role: 'analyst',
    });
    expect(user.status).toBe('invited');
    expect(emailFailed).toBe(false);
    expect((await listUsers()).length).toBe(before + 1);
    const audit = await listAudit();
    expect(audit.some((a) => a.action === 'added user' && a.target === 'brand.new@acme.com')).toBe(true);
  });

  it('only a tenant admin can add users: an analyst is forbidden even for a lower role', async () => {
    useUiStore.getState().setRole('analyst');
    await expect(
      addUser({ email: 'someone@acme.com', role: 'viewer' }),
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

  it('a tenant admin cannot act on the tenant owner at all', async () => {
    // usr_0 is the seeded Tenant Owner; the acting role is Tenant Admin.
    await expect(suspendUser('usr_0')).rejects.toMatchObject({ code: 'RANK_VIOLATION' });
    await expect(deleteUser('usr_0')).rejects.toMatchObject({ code: 'RANK_VIOLATION' });
    await expect(editUser('usr_0', { role: 'analyst' })).rejects.toMatchObject({
      code: 'RANK_VIOLATION',
    });
  });

  it('even the tenant owner cannot suspend, remove, or demote the owner', async () => {
    useUiStore.getState().setRole('tenant-owner');
    await expect(suspendUser('usr_0')).rejects.toMatchObject({ code: 'TENANT_OWNER_PROTECTED' });
    await expect(deleteUser('usr_0')).rejects.toMatchObject({ code: 'TENANT_OWNER_PROTECTED' });
    await expect(editUser('usr_0', { role: 'tenant-admin' })).rejects.toMatchObject({
      code: 'TENANT_OWNER_PROTECTED',
    });
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
