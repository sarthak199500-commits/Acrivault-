import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getDataset } from './dataset';
import { decideApproval, listApprovals, listAudit, quarantineAgent, requestApproval } from './api';
import type { Identity } from './types';
import { can } from '@/lib/permissions';
import { CURRENT_USER_ID } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

beforeAll(() => useUiStore.getState().setLatency(0));

// Every test that decides a request needs a role holding `session.quarantine`;
// every test that raises one needs `session.quarantineRecommend`. Security Admin
// holds both, so it is the default here and the exceptions are explicit.
beforeEach(() => useUiStore.getState().setRole('security-admin'));

/**
 * An identity a quarantine could actually be proposed for: not already
 * contained, and with nothing already pending against it. Both are guards
 * `requestApproval` enforces, so a test that ignored them would be asserting
 * against the guard rather than the behaviour.
 */
function pickCandidate(): Identity {
  const ds = getDataset();
  const pending = new Set(
    ds.approvals.filter((a) => a.status === 'pending').map((a) => a.identityId),
  );
  const found = ds.identities.find((i) => i.status === 'active' && !pending.has(i.id));
  if (!found) throw new Error('fixture: expected an active identity with no pending request');
  return found;
}

describe('Act > Approvals — the seeded queue', () => {
  it('is non-empty on first load, and every row is pending', async () => {
    const pending = await listApprovals('pending');
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((a) => a.status === 'pending')).toBe(true);
  });

  // Coherence, the rule this branch has had to learn twice: a request must be
  // raisable by the user it names. A row attributed to a suspended account, or
  // to a role that cannot propose a containment at all, is a fixture that
  // contradicts the permission model the screen exists to demonstrate.
  it('names a requester who is active and actually holds session.quarantineRecommend', async () => {
    const rows = await listApprovals('pending');
    const users = getDataset().users;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const user = users.find((u) => u.id === row.requestedBy);
      if (!user) throw new Error(`fixture: requester ${row.requestedBy} not found`);
      expect(user.status, user.id).toBe('active');
      if (user.role === null) throw new Error(`fixture: requester ${user.id} has no role`);
      expect(can(user.role, 'session.quarantineRecommend'), user.id).toBe(true);
    }
  });

  // The other half of coherence: the TARGET has to be one a containment could
  // plausibly be proposed for. An already-quarantined identity has nothing left
  // to propose, and the domain rule for containment (see makeIdentity) is a
  // high-risk orphan — a request against a low-risk, owned identity would make
  // the reason text on the row a fabrication.
  it('targets uncontained, high-risk orphans — never something already quarantined', async () => {
    const rows = await listApprovals('pending');
    const byId = getDataset().identityById;
    for (const row of rows) {
      const identity = byId.get(row.identityId);
      if (!identity) throw new Error(`fixture: identity ${row.identityId} not found`);
      expect(identity.status, identity.id).toBe('active');
      expect(identity.orphaned, identity.id).toBe(true);
      expect(identity.riskScore, identity.id).toBeGreaterThanOrEqual(70);
    }
  });

  it('raises each request against a distinct identity', async () => {
    const rows = await listApprovals('pending');
    expect(new Set(rows.map((r) => r.identityId)).size).toBe(rows.length);
  });

  it('resolves the identity, the requester and their role on every row', async () => {
    const rows = await listApprovals('pending');
    for (const row of rows) {
      expect(row.identityName.length).toBeGreaterThan(0);
      expect(row.requesterName.length).toBeGreaterThan(0);
      expect(row.requesterRole.length).toBeGreaterThan(0);
      expect(row.reason?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('keeps `decided` absent exactly while a request is pending', async () => {
    for (const row of await listApprovals()) {
      expect(row.decided === undefined, row.id).toBe(row.status === 'pending');
    }
  });
});

describe('Act > Approvals — raising a request', () => {
  it('lets a role holding session.quarantineRecommend raise one', async () => {
    useUiStore.getState().setRole('analyst');
    const target = pickCandidate();
    const created = await requestApproval({ identityId: target.id, reason: 'No accountable owner.' });

    expect(created.status).toBe('pending');
    expect(created.requestedBy).toBe(CURRENT_USER_ID);
    expect(created.decided).toBeUndefined();
    // Proposing is not enforcing: the identity must be untouched.
    expect(getDataset().identityById.get(target.id)?.status).toBe('active');
    expect((await listApprovals('pending')).some((a) => a.id === created.id)).toBe(true);
  });

  it('refuses a role that holds neither propose nor execute', async () => {
    useUiStore.getState().setRole('viewer');
    const target = pickCandidate();
    await expect(requestApproval({ identityId: target.id })).rejects.toThrow(/permission/i);
  });

  it('writes the proposal to the audit log under the existing recommend action', async () => {
    useUiStore.getState().setRole('analyst');
    const target = pickCandidate();
    await requestApproval({ identityId: target.id, reason: 'Behaviour diverged overnight.' });

    const [entry] = await listAudit();
    expect(entry.action).toBe('recommended agent quarantine');
    expect(entry.target).toBe(target.name);
    expect(entry.detail).toContain('Behaviour diverged overnight.');
  });

  it('records which session evidenced the proposal, when raised from a replay', async () => {
    useUiStore.getState().setRole('analyst');
    const ds = getDataset();
    const pending = new Set(
      ds.approvals.filter((a) => a.status === 'pending').map((a) => a.identityId),
    );
    const session = ds.sessions.find((s) => {
      const identity = ds.identityById.get(s.identityId);
      return identity?.status === 'active' && !pending.has(identity.id);
    });
    if (!session) throw new Error('fixture: expected a session on an eligible identity');

    await requestApproval({ identityId: session.identityId, fromSessionId: session.id });
    expect(session.quarantineRecommendedAt).toBeTruthy();
  });

  it('refuses a second request while one is already pending for that identity', async () => {
    useUiStore.getState().setRole('analyst');
    const target = pickCandidate();
    await requestApproval({ identityId: target.id });
    await expect(requestApproval({ identityId: target.id })).rejects.toThrow(/already/i);
  });

  it('refuses a request for an identity that is already quarantined', async () => {
    const target = pickCandidate();
    await quarantineAgent(target.id); // security-admin holds session.quarantine
    useUiStore.getState().setRole('analyst');
    await expect(requestApproval({ identityId: target.id })).rejects.toThrow(/already quarantined/i);
  });

  it('refuses a request for an identity that does not exist', async () => {
    useUiStore.getState().setRole('analyst');
    await expect(requestApproval({ identityId: 'idn_nope' })).rejects.toThrow(/not found/i);
  });
});

describe('Act > Approvals — deciding a request', () => {
  it('refuses an Analyst, who may propose but not decide', async () => {
    useUiStore.getState().setRole('analyst');
    const created = await requestApproval({ identityId: pickCandidate().id });
    await expect(decideApproval(created.id, 'approved')).rejects.toThrow(/permission/i);
    await expect(decideApproval(created.id, 'declined')).rejects.toThrow(/permission/i);
    // The refusal must not have half-applied.
    expect(getDataset().approvals.find((a) => a.id === created.id)?.status).toBe('pending');
  });

  // The point of the whole feature: the person answerable for the containment is
  // the one who APPROVED it, not the one who asked. Uses a SEEDED request so the
  // two are different users — the dev Role Switcher changes the role, not the
  // signed-in id, so a request raised inside the test would name the approver
  // as its own requester and the assertion would pass for the wrong reason.
  it('lets a Security Admin approve, contains the identity, and records the APPROVER as the producer', async () => {
    const row = (await listApprovals('pending')).find((a) => a.requestedBy !== CURRENT_USER_ID);
    if (!row) throw new Error('fixture: expected a seeded request raised by someone else');

    const decided = await decideApproval(row.id, 'approved');
    expect(decided.status).toBe('approved');
    expect(decided.decided?.by).toBe(CURRENT_USER_ID);
    expect(typeof decided.decided?.at).toBe('string');

    const identity = getDataset().identityById.get(row.identityId);
    expect(identity?.status).toBe('quarantined');
    expect(identity?.quarantine?.by).toEqual({ kind: 'user', userId: CURRENT_USER_ID });
  });

  it('audits the authorization alongside the containment it authorized', async () => {
    const [row] = await listApprovals('pending');
    await decideApproval(row.id, 'approved');

    const entries = await listAudit();
    // Newest-first: the containment, then the decision that authorized it.
    expect(entries[0].action).toBe('quarantined agent');
    expect(entries[1].action).toBe('approved quarantine request');
    expect(entries[1].target).toBe(row.identityName);
    expect(entries[1].object).toBe('identity');
  });

  it('leaves the identity untouched when declined, and audits the refusal', async () => {
    const [row] = await listApprovals('pending');
    const decided = await decideApproval(row.id, 'declined');

    expect(decided.status).toBe('declined');
    expect(decided.decided?.by).toBe(CURRENT_USER_ID);
    const identity = getDataset().identityById.get(row.identityId);
    expect(identity?.status).not.toBe('quarantined');
    expect(identity?.quarantine).toBeUndefined();

    const [entry] = await listAudit();
    expect(entry.action).toBe('declined quarantine request');
    expect(entry.target).toBe(row.identityName);
  });

  it('refuses a second decision on the same request', async () => {
    const [row] = await listApprovals('pending');
    await decideApproval(row.id, 'declined');
    await expect(decideApproval(row.id, 'approved')).rejects.toThrow(/already decided/i);
    await expect(decideApproval(row.id, 'declined')).rejects.toThrow(/already decided/i);
  });

  it('refuses a decision on a request that does not exist', async () => {
    await expect(decideApproval('apr_nope', 'approved')).rejects.toThrow(/not found/i);
  });

  // Approving would otherwise overwrite the existing QuarantineRecord and
  // reassign responsibility for a containment this approver did not produce.
  // Declining stays open, which is the way to clear the stale row.
  it('refuses to approve an identity contained by some other path, but still allows a decline', async () => {
    useUiStore.getState().setRole('analyst');
    const target = pickCandidate();
    const created = await requestApproval({ identityId: target.id });

    useUiStore.getState().setRole('security-admin');
    await quarantineAgent(target.id);
    const producedAt = getDataset().identityById.get(target.id)?.quarantine?.at;

    await expect(decideApproval(created.id, 'approved')).rejects.toThrow(/already quarantined/i);
    expect(getDataset().identityById.get(target.id)?.quarantine?.at).toBe(producedAt);

    const declined = await decideApproval(created.id, 'declined');
    expect(declined.status).toBe('declined');
  });

  it('moves a decided request out of the pending list and into its own status bucket', async () => {
    const before = await listApprovals('pending');
    const [row] = before;
    await decideApproval(row.id, 'declined');

    const after = await listApprovals('pending');
    expect(after.some((a) => a.id === row.id)).toBe(false);
    expect(after.length).toBe(before.length - 1);
    expect((await listApprovals('declined')).some((a) => a.id === row.id)).toBe(true);
    // No filter means every request, whatever its status.
    expect((await listApprovals()).some((a) => a.id === row.id)).toBe(true);
  });

  it('returns rows newest-first', async () => {
    const rows = await listApprovals();
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].requestedAt >= rows[i].requestedAt).toBe(true);
    }
  });
});
