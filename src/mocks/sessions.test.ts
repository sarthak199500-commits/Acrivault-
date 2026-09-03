import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  decideBlockedStep,
  getIdentity,
  listAudit,
  listNotifications,
  listSessions,
  markSessionReviewed,
  quarantineAgent,
  releaseQuarantine,
  requestApproval,
} from './api';
import { isFlaggedStep } from './types';
import { useUiStore } from '@/stores/ui';

beforeAll(() => useUiStore.getState().setLatency(0));

/** An agent that is not already contained, so enforcement transitions are observable. */
async function pickActiveSession() {
  const sessions = await listSessions();
  const session = sessions.find((s) => s.identityStatus !== 'quarantined');
  if (!session) throw new Error('fixture: expected at least one session on an active agent');
  return session;
}

describe('agent sessions', () => {
  it('captures sessions for AI agents with steps and provenance', async () => {
    const sessions = await listSessions();
    expect(sessions.length).toBeGreaterThan(0);
    const s = sessions[0];
    expect(s.steps.length).toBeGreaterThan(0);
    expect(s.provenance.model).toBeTruthy();
    expect(s.anomalyCount).toBe(s.steps.filter((st) => st.status === 'anomaly').length);
    expect(s.blockedCount).toBe(s.steps.filter((st) => st.status === 'blocked').length);
  });

  it('orders every session’s steps chronologically and numbers them from one', async () => {
    // The generator multiplied a freshly drawn interval by the step index, so step 4
    // could land before step 3 — a replay whose timestamps contradicted its own order.
    for (const session of await listSessions()) {
      const times = session.steps.map((s) => new Date(s.at).getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(session.steps.map((s) => s.stepNo)).toEqual(session.steps.map((_, i) => i + 1));
      expect(new Date(session.endedAt).getTime()).toBeGreaterThanOrEqual(times[times.length - 1]);
    }
  });

  it('gives tool calls a scope and leaves other steps without one', async () => {
    const steps = (await listSessions()).flatMap((s) => s.steps);
    expect(steps.filter((s) => s.kind === 'tool-call').every((s) => s.scope)).toBe(true);
    expect(steps.filter((s) => s.kind !== 'tool-call').every((s) => s.scope === undefined)).toBe(true);
  });

  it('carries provenance lineage and every credential used', async () => {
    for (const s of await listSessions()) {
      expect(['human', 'schedule', 'agent']).toContain(s.provenance.spawnedBy.kind);
      expect(s.provenance.spawnedBy.label).toBeTruthy();
      expect(s.provenance.credentials.length).toBeGreaterThan(0);
    }
  });
});

describe('step verdicts', () => {
  it('flags a session when any step is anomalous or held, and not otherwise', async () => {
    for (const s of await listSessions()) {
      expect(s.flagged).toBe(s.steps.some(isFlaggedStep));
      expect(s.flagged).toBe(s.anomalyCount + s.blockedCount > 0);
    }
  });

  it('gives every anomaly a reason inline — FR-005 wants the why, not just the mark', async () => {
    const anomalies = (await listSessions()).flatMap((s) => s.steps).filter((s) => s.status === 'anomaly');
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies.every((s) => Boolean(s.anomalyReason))).toBe(true);
  });

  it('only holds state-changing calls, and names the rule that held them', async () => {
    const held = (await listSessions()).flatMap((s) => s.steps).filter((s) => s.status === 'blocked');
    expect(held.length).toBeGreaterThan(0);
    for (const step of held) {
      expect(step.kind).toBe('tool-call');
      expect(step.scope === 'write' || step.scope === 'admin').toBe(true);
      expect(step.blockedByRule).toBeTruthy();
      // FR-006 exception flow: a matched rule with no upstream hold primitive is
      // recorded as observed, so the UI never claims a containment that did not happen.
      expect(typeof step.holdEnforced).toBe('boolean');
    }
  });

  it('never marks a step both anomalous and held', async () => {
    for (const s of await listSessions()) {
      expect(s.anomalyCount + s.blockedCount).toBeLessThanOrEqual(s.steps.length);
    }
  });
});

describe('session actions', () => {
  beforeEach(() => useUiStore.getState().setLatency(0));

  it('marks a session reviewed and writes an audit entry', async () => {
    const sessions = await listSessions();
    const target = sessions.find((s) => s.reviewState === 'open') ?? sessions[0];
    const updated = await markSessionReviewed(target.id);

    expect(updated.reviewState).toBe('reviewed');
    expect(updated.reviewedAt).toBeTruthy();
    const audit = await listAudit();
    expect(audit[0].action).toBe('reviewed agent session');
    expect(audit[0].target).toBe(target.identityName);
  });

  it('quarantines the agent, not the session, and reflects it on the identity', async () => {
    // FRS 3.5 acceptance: the action is recorded AND reflected on the identity. This
    // used to set a session-level status, leaving the agent active.
    const target = await pickActiveSession();
    await quarantineAgent(target.identityId, 'Escalated from replay');

    const identity = await getIdentity(target.identityId);
    expect(identity?.status).toBe('quarantined');

    const audit = await listAudit();
    expect(audit[0].action).toBe('quarantined agent');
    expect(audit[0].detail).toContain('Escalated from replay');

    // UC-04 step 4: the owner is notified.
    const notifications = await listNotifications();
    expect(notifications[0].title).toContain(target.identityName);

    // Every session that agent ran now reports the containment, not just this one.
    const after = (await listSessions()).filter((s) => s.identityId === target.identityId);
    expect(after.every((s) => s.identityStatus === 'quarantined')).toBe(true);
  });

  it('releases an agent from quarantine and refuses when it is not contained', async () => {
    const target = await pickActiveSession();
    await quarantineAgent(target.identityId);
    await releaseQuarantine(target.identityId);

    expect((await getIdentity(target.identityId))?.status).toBe('active');
    expect((await listAudit())[0].action).toBe('released agent from quarantine');
    await expect(releaseQuarantine(target.identityId)).rejects.toThrow(/not quarantined/i);
  });

  // Raising is now `requestApproval` — the recommendation creates a real pending
  // request in Act > Approvals rather than only an audit line (see api.ts).
  it('records an analyst recommendation without containing the agent', async () => {
    const target = await pickActiveSession();
    await requestApproval({ identityId: target.identityId, fromSessionId: target.id });

    expect((await getIdentity(target.identityId))?.status).not.toBe('quarantined');
    expect((await listAudit())[0].action).toBe('recommended agent quarantine');

    const updated = (await listSessions()).find((s) => s.id === target.id);
    expect(updated?.quarantineRecommendedAt).toBeTruthy();
  });
});

describe('held steps', () => {
  beforeEach(() => useUiStore.getState().setLatency(0));

  async function pickHeldStep() {
    const session = (await listSessions()).find((s) => s.steps.some((st) => st.status === 'blocked'));
    const step = session?.steps.find((st) => st.status === 'blocked');
    if (!session || !step) throw new Error('fixture: expected a session with a held step');
    return { session, step };
  }

  it('confirming a block records the decision and audits it', async () => {
    const { session, step } = await pickHeldStep();
    const updated = await decideBlockedStep(session.id, step.id, 'confirmed');

    const decided = updated.steps.find((s) => s.id === step.id);
    expect(decided?.blockDecision?.outcome).toBe('confirmed');
    expect((await listAudit())[0].action).toBe('confirmed held step');
  });

  it('refuses an override with no justification — APR-02', async () => {
    const { session, step } = await pickHeldStep();
    await expect(decideBlockedStep(session.id, step.id, 'overridden')).rejects.toThrow(/justification/i);
    await expect(decideBlockedStep(session.id, step.id, 'overridden', '   ')).rejects.toThrow(/justification/i);
  });

  it('records an override with its justification in the audit trail', async () => {
    const { session, step } = await pickHeldStep();
    const updated = await decideBlockedStep(session.id, step.id, 'overridden', 'Confirmed benign by the owner');

    const decided = updated.steps.find((s) => s.id === step.id);
    expect(decided?.blockDecision).toMatchObject({
      outcome: 'overridden',
      justification: 'Confirmed benign by the owner',
    });
    const audit = await listAudit();
    expect(audit[0].action).toBe('overrode held step');
    expect(audit[0].detail).toContain('Confirmed benign by the owner');
  });

  it('refuses to decide a step that is not held', async () => {
    const session = (await listSessions()).find((s) => s.steps.some((st) => st.status === 'normal'));
    const normal = session?.steps.find((st) => st.status === 'normal');
    if (!session || !normal) throw new Error('fixture: expected a session with an unflagged step');
    await expect(decideBlockedStep(session.id, normal.id, 'confirmed')).rejects.toThrow(/not held/i);
  });
});
