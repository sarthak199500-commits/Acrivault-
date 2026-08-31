import { beforeEach, describe, expect, it } from 'vitest';
import {
  activateUser,
  assignRole,
  createPassword,
  deleteUser,
  editUser,
  generateScimToken,
  getDomainChallenge,
  getTenant,
  listAudit,
  listUsers,
  login,
  requestAccess,
  resetPassword,
  saveSamlConfig,
  setPasswordFallback,
  suspendUser,
  syncUsers,
  testSamlSignIn,
  verifyCode,
  verifyDomain,
  verifyPasswordOtp,
} from './api';
import { useUiStore } from '@/stores/ui';
import { getDataset } from './dataset';

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

const ENTITY_ID = 'https://sts.windows.net/818437a1-5008-44d7-bb45-1da663f1308d/';
const SSO_URL = 'https://login.microsoftonline.com/818437a1-5008-44d7-bb45-1da663f1308d/saml2';
const PEM = '-----BEGIN CERTIFICATE-----\nMIIC8DCCAdigAwIBAgIQRJGmR4o4Pp\n-----END CERTIFICATE-----';
const DRAFT = { entityId: ENTITY_ID, ssoUrl: SSO_URL, certificate: PEM };

describe('federating sign-in with Entra', () => {
  it('refuses a draft the form would have rejected', async () => {
    await expect(
      saveSamlConfig({ ...DRAFT, entityId: SSO_URL, ssoUrl: ENTITY_ID }),
    ).rejects.toMatchObject({ code: 'INVALID_SAML' });
    await expect(
      saveSamlConfig({ ...DRAFT, certificate: '<?xml version="1.0"?>' }),
    ).rejects.toMatchObject({ code: 'INVALID_SAML' });
  });

  // The whole point of the redesign: a saved form is a claim, an assertion is proof.
  it('saving clears the sign-in proof, and testing restores it', async () => {
    const saved = await saveSamlConfig(DRAFT);
    expect(saved.saml.savedAt).not.toBeNull();
    expect(saved.saml.lastSignInAt).toBeNull();
    expect(saved.saml.cert?.expiresAt).toBeTruthy();

    const tested = await testSamlSignIn();
    expect(tested.saml.lastSignInAt).not.toBeNull();

    const audit = await listAudit();
    expect(audit.some((a) => a.action === 'saved SAML configuration')).toBe(true);
  });

  it('will not turn off the way back in until sign-in is proven', async () => {
    await saveSamlConfig(DRAFT);
    await expect(setPasswordFallback(false)).rejects.toMatchObject({ code: 'LOCKOUT_RISK' });
    await testSamlSignIn();
    await expect(setPasswordFallback(false)).resolves.toMatchObject({ passwordFallback: false });
    // Restore it — later cases assume the tenant still has a way back in.
    await setPasswordFallback(true);
  });

  it('refuses to change what is trusted while password sign-in is off', async () => {
    await saveSamlConfig(DRAFT);
    await testSamlSignIn();
    await setPasswordFallback(false);
    await expect(saveSamlConfig(DRAFT)).rejects.toMatchObject({ code: 'LOCKOUT_RISK' });
    await setPasswordFallback(true);
  });

  it('is Tenant Admin and above: a security admin is forbidden', async () => {
    useUiStore.getState().setRole('security-admin');
    await expect(saveSamlConfig(DRAFT)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(generateScimToken()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('provisioning users from Entra', () => {
  it('issuing a token leaves the connection unproven until Entra authenticates', async () => {
    await saveSamlConfig(DRAFT);
    await testSamlSignIn();
    const { token, tenant } = await generateScimToken();
    expect(token).toMatch(/^scim_/);
    expect(tenant.scim.tokenIssuedAt).not.toBeNull();
    // A new token revokes the credentials Entra holds, so the sync is stale again.
    expect(tenant.scim.lastSyncAt).toBeNull();
  });

  it('cannot issue a token before sign-in works', async () => {
    await saveSamlConfig(DRAFT); // clears lastSignInAt
    await expect(generateScimToken()).rejects.toMatchObject({ code: 'SAML_REQUIRED' });
  });

  // First run: registration leaves the Tenant Owner behind, so the user list is
  // never empty — but there is nothing to sync with until Entra holds a token.
  it('refuses to sync before provisioning is set up', async () => {
    const ds = getDataset();
    // The dataset is shared across this file, so put it back before leaving.
    const restore = { ...ds.tenant.scim };
    ds.tenant.scim = { tokenIssuedAt: null, lastSyncAt: null, usersReceived: 0 };
    try {
      await expect(syncUsers()).rejects.toMatchObject({ code: 'NOT_PROVISIONED' });
    } finally {
      ds.tenant.scim = restore;
    }
  });

  it('reports what a sync changed, and finds nothing the second time', async () => {
    const first = await syncUsers();
    expect(first.added).toBe(2);
    expect(first.updated + first.suspended).toBeGreaterThan(0);

    const second = await syncUsers();
    expect(second).toMatchObject({ added: 0, updated: 0, suspended: 0 });

    const tenant = await getTenant();
    expect(tenant.scim.lastSyncAt).toBe(second.at);
  });

  it('gives new arrivals no role, so they surface as work to do', async () => {
    await syncUsers();
    const nina = (await listUsers()).find((u) => u.email === 'nina.oduya@acme.com');
    expect(nina).toMatchObject({ role: null, status: 'active', source: 'entra' });
  });

  // Auto-suspend, never auto-delete: the row and its audit history survive.
  it('suspends rather than removes the people Entra deactivated', async () => {
    await syncUsers();
    const taylor = (await listUsers()).find((u) => u.email === 'taylor.quinn@acme.com');
    expect(taylor?.status).toBe('suspended-idp');
  });

  it('assigns a role to several people at once and writes audit', async () => {
    await syncUsers();
    const waiting = (await listUsers()).filter((u) => u.role === null);
    expect(waiting.length).toBeGreaterThan(1);

    const changed = await assignRole(
      waiting.map((u) => u.id),
      'viewer',
    );
    expect(changed.every((u) => u.role === 'viewer')).toBe(true);
    expect((await listUsers()).filter((u) => u.role === null)).toHaveLength(0);
    expect((await listAudit()).some((a) => a.action === 'assigned role')).toBe(true);
  });

  it('will not let an analyst assign roles, or sync', async () => {
    useUiStore.getState().setRole('analyst');
    await expect(assignRole(['usr_8'], 'viewer')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(syncUsers()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('cannot assign a role above the actor\'s own rank', async () => {
    useUiStore.getState().setRole('tenant-admin');
    await expect(assignRole(['usr_8'], 'tenant-owner')).rejects.toMatchObject({
      code: 'RANK_VIOLATION',
    });
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
