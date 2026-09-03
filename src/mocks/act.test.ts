import { beforeAll, describe, expect, it } from 'vitest';
import { getDataset } from './dataset';
import { listAudit, listQuarantined, quarantineAgent, releaseQuarantine } from './api';
import { matchesPolicy } from './policy';
import { attachQuarantineProvenance } from './generators';
import type { Identity, Policy } from './types';
import { CURRENT_USER_ID } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

beforeAll(() => {
  useUiStore.getState().setLatency(0);
  // session.quarantineRelease is Tenant Admin / Tenant Owner only — start as a
  // role that holds it so the happy-path tests aren't gated by accident.
  useUiStore.getState().setRole('tenant-admin');
});

describe('Act > Quarantine provenance', () => {
  it('lists every quarantined identity, each with a non-empty producer label', async () => {
    const rows = await listQuarantined();
    const expected = getDataset().identities.filter(
      (i) => i.status === 'quarantined' && i.quarantine,
    );
    expect(rows.length).toBe(expected.length);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.byLabel.length > 0)).toBe(true);
    expect(rows.every((r) => typeof r.at === 'string')).toBe(true);
  });

  it('demonstrates all three producer kinds in the seeded data', () => {
    const kinds = new Set(
      getDataset()
        .identities.flatMap((i) => (i.quarantine ? [i.quarantine.by.kind] : [])),
    );
    expect(kinds).toEqual(new Set(['policy', 'user', 'session']));
  });

  // The domain rule (see makeIdentity's containment roll): only a high-risk
  // orphan is ever quarantined. This has to hold for EVERY quarantined identity,
  // including the one attachQuarantineProvenance promotes to demonstrate the
  // session-review path — a promoted identity that skips this check would be
  // the one contained identity in the whole dataset that isn't a high-risk
  // orphan, visible the moment its detail panel is opened.
  it('quarantines only high-risk orphans, never a promoted identity that skips the rule', () => {
    const quarantined = getDataset().identities.filter((i) => i.status === 'quarantined');
    expect(quarantined.length).toBeGreaterThan(0);
    for (const identity of quarantined) {
      expect(identity.orphaned, identity.id).toBe(true);
      expect(identity.riskScore, identity.id).toBeGreaterThanOrEqual(70);
    }
  });

  // Coherence, not just presence: a named producer that could not actually have
  // produced the effect is worse than none, because it reads as authoritative.
  // A prior version fell back to "any quarantine policy" when none matched --
  // this asserts the fallback stays gone by checking every policy-kind row
  // against the same matchesPolicy() the policy engine itself uses.
  it('names only a policy whose own conditions actually match the identity', () => {
    const ds = getDataset();
    const withPolicy = ds.identities.filter((i) => i.quarantine?.by.kind === 'policy');
    expect(withPolicy.length).toBeGreaterThan(0);
    for (const identity of withPolicy) {
      const record = identity.quarantine;
      if (!record || record.by.kind !== 'policy') {
        throw new Error(`fixture: expected ${identity.id} to carry policy provenance`);
      }
      const by = record.by; // hoisted: narrowing doesn't survive the .find() closure below
      const policy = ds.policies.find((p) => p.id === by.policyId);
      if (!policy) throw new Error(`fixture: policy ${by.policyId} referenced by ${identity.id} not found`);
      expect(matchesPolicy(identity, policy.tokens), identity.id).toBe(true);
      // A draft or archived policy never enforced anything (see
      // generatePolicyActions's own `enforcing` filter) -- only active and
      // suspended policies are eligible producers.
      expect(policy.status === 'active' || policy.status === 'suspended', identity.id).toBe(true);
    }
  });

  // The seeded data alone can't expose this: both naturally-eligible quarantine
  // policies happen to be active/suspended already, so this constructs the gap
  // directly -- a draft policy whose conditions DO match must still never be
  // named, or a third quarantine policy added in draft state would regress
  // silently (exactly what generatePolicyActions already guards against).
  it('never attributes a quarantine to a policy that has not enforced, even when its conditions match', () => {
    const ds = getDataset();
    const activePolicy = ds.policies.find((p) => p.id === 'pol_0000');
    if (!activePolicy) throw new Error('fixture: expected pol_0000 to exist');
    const draftPolicy: Policy = { ...activePolicy, id: 'pol_test_draft_review', status: 'draft' };

    const target: Identity = {
      id: 'idn_test_draft_policy_review',
      name: 'test-draft-policy-target',
      type: 'ai-agent',
      sources: [],
      correlated: false,
      orphaned: true,
      orphanReason: 'No owner assigned',
      conflicts: [],
      riskScore: 90,
      riskBand: 'critical',
      governanceStatus: 'ungoverned',
      status: 'quarantined',
      relationships: [],
      riskSeries: [],
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };

    // draftPolicy's conditions (type=ai-agent, orphaned=true, copied from
    // pol_0000) DO match target -- the only thing standing between it and a
    // false attribution is the status check.
    attachQuarantineProvenance([target], [draftPolicy], ds.users, [], 1, new Date());
    expect(target.quarantine?.by.kind).not.toBe('policy');
  });

  // Same principle for session: a session review can only explain the agent
  // whose session it is, never a stranger's.
  it('names only a session that belongs to the same identity it explains', () => {
    const ds = getDataset();
    const withSession = ds.identities.filter((i) => i.quarantine?.by.kind === 'session');
    expect(withSession.length).toBeGreaterThan(0);
    for (const identity of withSession) {
      const record = identity.quarantine;
      if (!record || record.by.kind !== 'session') {
        throw new Error(`fixture: expected ${identity.id} to carry session provenance`);
      }
      const by = record.by;
      const session = ds.sessions.find((s) => s.id === by.sessionId);
      if (!session) throw new Error(`fixture: session ${by.sessionId} referenced by ${identity.id} not found`);
      expect(session.identityId, identity.id).toBe(identity.id);
    }
  });

  it('returns rows newest-first', async () => {
    const rows = await listQuarantined();
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].at >= rows[i].at).toBe(true);
    }
  });

  it('links back to the producer for policy and session kinds, but not for a user', async () => {
    const rows = await listQuarantined();
    const kindById = new Map(
      getDataset()
        .identities.flatMap((i) => (i.quarantine ? [[i.id, i.quarantine.by.kind] as const] : [])),
    );
    for (const row of rows) {
      const kind = kindById.get(row.id);
      if (kind === 'user') {
        expect(row.byHref).toBeUndefined();
      } else if (kind === 'policy') {
        expect(row.byHref).toMatch(/^\/govern\/builder\//);
      } else {
        expect(row.byHref).toMatch(/^\/intelligence\//);
      }
    }
  });

  it('renders a soft-deleted user as a removed producer, not a stale name', async () => {
    const ds = getDataset();
    const identity = ds.identities.find((i) => i.quarantine?.by.kind === 'user');
    if (!identity) throw new Error('fixture: expected at least one user-kind quarantine record');
    const record = identity.quarantine;
    if (!record || record.by.kind !== 'user') {
      throw new Error(`fixture: expected ${identity.id} to carry user provenance`);
    }
    const by = record.by; // hoisted: narrowing doesn't survive the .find() closure below
    const user = ds.users.find((u) => u.id === by.userId);
    if (!user) throw new Error(`fixture: expected user ${by.userId} to exist`);

    const originalStatus = user.status;
    user.status = 'deleted';
    const row = (await listQuarantined()).find((r) => r.id === identity.id);
    if (!row) throw new Error('fixture: expected the identity to still be listed');
    expect(row.byLabel).toBe('Removed user');
    expect(row.byHref).toBeUndefined();
    user.status = originalStatus; // restore -- later tests rely on the seeded users
  });

  it('excludes a quarantined identity with no provenance rather than showing a blank producer', async () => {
    const before = await listQuarantined();
    const bogus = getDataset().identities.find((i) => i.status === 'active');
    if (!bogus) throw new Error('fixture: expected at least one active identity');
    bogus.status = 'quarantined'; // deliberately left without a `quarantine` record
    const after = await listQuarantined();
    expect(after.length).toBe(before.length);
    expect(after.some((r) => r.id === bogus.id)).toBe(false);
    bogus.status = 'active'; // restore — later tests count on the seeded population
  });

  it('quarantineAgent records the acting user as the producer', async () => {
    const target = getDataset().identities.find((i) => i.status === 'active');
    if (!target) throw new Error('fixture: expected at least one active identity');
    const updated = await quarantineAgent(target.id);
    expect(updated.status).toBe('quarantined');
    expect(updated.quarantine?.by).toEqual({ kind: 'user', userId: CURRENT_USER_ID });
    expect(typeof updated.quarantine?.at).toBe('string');

    const row = (await listQuarantined()).find((r) => r.id === target.id);
    if (!row) throw new Error('fixture: expected the just-quarantined identity to be listed');
    expect(row.byLabel.length).toBeGreaterThan(0);
    expect(row.byHref).toBeUndefined(); // a user producer has no screen to link to
  });

  it('releasing returns the identity to active and clears its provenance, dropping it from the list', async () => {
    const [row] = await listQuarantined();
    const released = await releaseQuarantine(row.id);
    expect(released.status).toBe('active');
    expect(released.quarantine).toBeUndefined();
    expect((await listQuarantined()).some((r) => r.id === row.id)).toBe(false);
  });

  it('rejects release for a role that lacks session.quarantineRelease', async () => {
    const [row] = await listQuarantined();
    useUiStore.getState().setRole('analyst');
    await expect(releaseQuarantine(row.id)).rejects.toThrow();
    // The rejected call must not have mutated anything.
    expect((await listQuarantined()).some((r) => r.id === row.id)).toBe(true);
    useUiStore.getState().setRole('tenant-admin');
  });

  it('writes the release to the audit log under the existing action string', async () => {
    const [row] = await listQuarantined();
    await releaseQuarantine(row.id);
    const entries = await listAudit();
    expect(entries[0].action).toBe('released agent from quarantine');
    expect(entries[0].target).toBe(row.name);
  });
});
