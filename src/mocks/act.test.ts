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

  // The producer set is CLOSED. A kind only the generator can write is exactly
  // the defect this replaced: `session` lived in this union for a release, so a
  // seeded row showed the evidence while a real session review showed a bare
  // admin name. The previous version of this test asserted that set was
  // correct, which is why nine tests and two review passes did not catch it.
  it('uses no provenance kind the product cannot produce', () => {
    const kinds = new Set(
      getDataset()
        .identities.flatMap((i) => (i.quarantine ? [i.quarantine.by.kind] : [])),
    );
    expect([...kinds].sort()).toEqual(['policy', 'user']);
  });

  // Closing the kind set must not cost the variety this screen exists to show:
  // all three DISPLAY outcomes still have to occur in the seeded data.
  it('demonstrates all three producer outcomes in the seeded data', () => {
    const outcomes = new Set(
      getDataset().identities.flatMap((i) => {
        const by = i.quarantine?.by;
        if (!by) return [];
        if (by.kind === 'policy') return ['policy'];
        return [by.viaSessionId ? 'person-from-replay' : 'person'];
      }),
    );
    expect([...outcomes].sort()).toEqual(['person', 'person-from-replay', 'policy']);
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

  // Same principle for the session a person cited: a replay can only explain the
  // agent whose session it is, never a stranger's. What changed is WHERE the
  // session sits. A containment names the person accountable for it and, when
  // they acted from a replay, the session that evidenced them -- never a session
  // alone, because nothing in this product contains an identity without a human.
  it('names an accountable person and a session belonging to the identity it explains', () => {
    const ds = getDataset();
    const viaReplay = ds.identities.filter((i) => {
      const by = i.quarantine?.by;
      return by?.kind === 'user' && Boolean(by.viaSessionId);
    });
    expect(viaReplay.length).toBeGreaterThan(0);
    for (const identity of viaReplay) {
      const record = identity.quarantine;
      if (!record || record.by.kind !== 'user' || !record.by.viaSessionId) {
        throw new Error(`fixture: expected ${identity.id} to carry replay-evidenced provenance`);
      }
      const by = record.by; // hoisted: narrowing doesn't survive the .find() closures below
      // The person has to exist. A session can evidence a containment but must
      // never be the only thing named for it -- somebody is answerable.
      expect(ds.users.some((u) => u.id === by.userId), identity.id).toBe(true);
      const session = ds.sessions.find((s) => s.id === by.viaSessionId);
      if (!session) {
        throw new Error(`fixture: session ${by.viaSessionId} referenced by ${identity.id} not found`);
      }
      expect(session.identityId, identity.id).toBe(identity.id);
    }
  });

  it('returns rows newest-first', async () => {
    const rows = await listQuarantined();
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1].at >= rows[i].at).toBe(true);
    }
  });

  it('links a policy producer, never the person, and links the session separately', async () => {
    const rows = await listQuarantined();
    const byId = new Map(
      getDataset()
        .identities.flatMap((i) => (i.quarantine ? [[i.id, i.quarantine.by] as const] : [])),
    );
    for (const row of rows) {
      const by = byId.get(row.id);
      if (by?.kind === 'policy') {
        expect(row.byHref, row.id).toMatch(/^\/govern\/builder\//);
        expect(row.viaHref, row.id).toBeUndefined();
      } else {
        // A person has no standalone screen, so the producer itself never links.
        expect(row.byHref, row.id).toBeUndefined();
        // Their evidence does, when they cited any.
        if (by?.kind === 'user' && by.viaSessionId) {
          expect(row.viaHref, row.id).toBe(`/intelligence/${by.viaSessionId}`);
        } else {
          expect(row.viaHref, row.id).toBeUndefined();
        }
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

describe('Act > Quarantine - a containment raised from a replay', () => {
  /** An active agent that actually has a session, so a replay could have evidenced it. */
  function pickReplayCandidate() {
    const ds = getDataset();
    for (const session of ds.sessions) {
      const identity = ds.identityById.get(session.identityId);
      if (identity?.status === 'active') return { identity, session };
    }
    throw new Error('fixture: expected an active agent with at least one session');
  }

  it('records the session alongside the person, so the evidence survives the action', async () => {
    useUiStore.getState().setRole('tenant-admin');
    const { identity, session } = pickReplayCandidate();
    const updated = await quarantineAgent(identity.id, undefined, session.id);
    expect(updated.quarantine?.by).toEqual({
      kind: 'user',
      userId: CURRENT_USER_ID,
      viaSessionId: session.id,
    });
    await releaseQuarantine(identity.id);
  });

  it('exposes the person as producer and the session as its evidence', async () => {
    useUiStore.getState().setRole('tenant-admin');
    const { identity, session } = pickReplayCandidate();
    await quarantineAgent(identity.id, undefined, session.id);
    const row = (await listQuarantined()).find((r) => r.id === identity.id);
    if (!row) throw new Error('fixture: expected the just-contained identity to be listed');
    expect(row.byHref).toBeUndefined();
    expect(row.viaLabel).toBe(`Session review · ${session.id}`);
    expect(row.viaHref).toBe(`/intelligence/${session.id}`);
    await releaseQuarantine(identity.id);
  });

  // Same treatment the producer already gets for a soft-deleted user: name the
  // gap rather than render a link that goes nowhere.
  it('names a removed session as removed instead of linking nowhere', async () => {
    useUiStore.getState().setRole('tenant-admin');
    const { identity } = pickReplayCandidate();
    await quarantineAgent(identity.id, undefined, 'ses_does_not_exist');
    const row = (await listQuarantined()).find((r) => r.id === identity.id);
    if (!row) throw new Error('fixture: expected the just-contained identity to be listed');
    expect(row.viaLabel).toBe('Removed session');
    expect(row.viaHref).toBeUndefined();
    await releaseQuarantine(identity.id);
  });

  // The two halves resolve independently, which is asserted rather than assumed:
  // a containment whose acting user was since removed still has to show what it
  // was decided on. Losing the person is a gap; losing the evidence with them
  // would be the original defect returning by a different route.
  it('still shows the evidence when the person who acted has been removed', async () => {
    useUiStore.getState().setRole('tenant-admin');
    const { identity, session } = pickReplayCandidate();
    await quarantineAgent(identity.id, undefined, session.id);

    const actor = getDataset().users.find((u) => u.id === CURRENT_USER_ID);
    if (!actor) throw new Error('fixture: expected the acting user to exist');
    const originalStatus = actor.status;
    actor.status = 'deleted';
    try {
      const row = (await listQuarantined()).find((r) => r.id === identity.id);
      if (!row) throw new Error('fixture: expected the contained identity to be listed');
      expect(row.byLabel).toBe('Removed user');
      expect(row.viaLabel).toBe(`Session review · ${session.id}`);
      expect(row.viaHref).toBe(`/intelligence/${session.id}`);
    } finally {
      actor.status = originalStatus; // later tests rely on the seeded users
      await releaseQuarantine(identity.id);
    }
  });

  it('leaves the record unchanged when no replay evidenced the containment', async () => {
    useUiStore.getState().setRole('tenant-admin');
    const target = getDataset().identities.find((i) => i.status === 'active');
    if (!target) throw new Error('fixture: expected at least one active identity');
    const updated = await quarantineAgent(target.id);
    // No stray `viaSessionId: undefined` key: toEqual would accept one, so the
    // absence is asserted on the key set itself.
    expect(Object.keys(updated.quarantine?.by ?? {}).sort()).toEqual(['kind', 'userId']);
    await releaseQuarantine(target.id);
  });
});
