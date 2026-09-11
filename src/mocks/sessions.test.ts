import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  decideBlockedStep,
  getIdentity,
  listAlerts,
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

describe('session triage signals', () => {
  it('flags a minority of sessions, so the Flagged facet actually narrows the feed', async () => {
    const sessions = await listSessions();
    const share = sessions.filter((s) => s.flagged).length / sessions.length;
    expect(share).toBeGreaterThan(0.15);
    expect(share).toBeLessThan(0.4);
  });

  // Coherence, not just counting: a flagged session must contain a step that could
  // have caused the flag. A count-based assertion alone passes on incoherent data.
  it('only flags sessions that contain an anomalous or held step', async () => {
    const sessions = await listSessions();
    for (const session of sessions.filter((s) => s.flagged)) {
      const causes = session.steps.filter((s) => s.status === 'anomaly' || s.status === 'blocked');
      expect(causes.length, session.id).toBeGreaterThan(0);
    }
  });

  it('links every agent alert to a session that had already started when it fired', async () => {
    const [alerts, sessions] = await Promise.all([listAlerts(), listSessions()]);
    const byId = new Map(sessions.map((s) => [s.id, s]));
    for (const alert of alerts.filter((a) => a.identityType === 'ai-agent')) {
      const linkable = sessions.some(
        (s) => s.identityId === alert.identityId && s.startedAt <= alert.createdAt,
      );
      if (!linkable) continue;
      expect(alert.sessionId, alert.id).toBeTruthy();
      const linked = byId.get(alert.sessionId as string);
      expect(linked?.identityId, alert.id).toBe(alert.identityId);
      expect(linked && linked.startedAt <= alert.createdAt, alert.id).toBe(true);
    }
  });

  it('never seeds a reviewed session that still owes a decision on a held step', async () => {
    const sessions = await listSessions();
    for (const session of sessions.filter((s) => s.reviewState === 'reviewed')) {
      const undecided = session.steps.filter((s) => s.status === 'blocked' && !s.blockDecision);
      expect(undecided, session.id).toHaveLength(0);
    }
  });
});

describe('closing a session', () => {
  it('refuses to mark a session reviewed while a held step is undecided', async () => {
    const sessions = await listSessions();
    const withHold = sessions.find((s) =>
      s.steps.some((p) => p.status === 'blocked' && !p.blockDecision));
    if (!withHold) throw new Error('fixture: expected a session with an undecided hold');
    await expect(markSessionReviewed(withHold.id)).rejects.toThrow(/held step/i);
  });

  it('allows review once the hold is decided, and stamps who did it', async () => {
    const sessions = await listSessions();
    const withHold = sessions.find((s) =>
      s.steps.some((p) => p.status === 'blocked' && !p.blockDecision));
    if (!withHold) throw new Error('fixture: expected a session with an undecided hold');
    const held = withHold.steps.find((p) => p.status === 'blocked' && !p.blockDecision);
    if (!held) throw new Error('fixture: expected an undecided held step');

    await decideBlockedStep(withHold.id, held.id, 'confirmed');
    const reviewed = await markSessionReviewed(withHold.id);

    expect(reviewed.reviewState).toBe('reviewed');
    expect(reviewed.reviewedAt).toBeTruthy();
    // Resolved from the acting principal, so an auditor need not join two records.
    expect(reviewed.reviewedBy).toMatch(/@/);
  });
});

describe('seeded session coherence', () => {
  it('names a reviewer on every seeded reviewed session, as the product would', async () => {
    const sessions = await listSessions();
    const reviewed = sessions.filter((s) => s.reviewState === 'reviewed');
    expect(reviewed.length).toBeGreaterThan(0);
    for (const session of reviewed) {
      expect(session.reviewedBy, session.id).toMatch(/@/);
      expect(session.reviewedAt, session.id).toBeTruthy();
    }
  });

  it('carries the upstream agent identity so the lineage can be followed', async () => {
    const sessions = await listSessions();
    const delegated = sessions.filter((s) => s.provenance.spawnedBy.kind === 'agent');
    expect(delegated.length).toBeGreaterThan(0);
    const byId = new Map(sessions.map((s) => [s.identityId, s.identityName]));
    for (const session of delegated) {
      const upstream = session.provenance.spawnedBy.identityId;
      expect(upstream, session.id).toBeTruthy();
      // The label must name the identity the id points at, not some other agent.
      if (byId.has(upstream as string)) {
        expect(byId.get(upstream as string), session.id).toBe(session.provenance.spawnedBy.label);
      }
    }
  });

  it('leaves human- and schedule-spawned sessions without an identity id', async () => {
    const sessions = await listSessions();
    for (const session of sessions.filter((s) => s.provenance.spawnedBy.kind !== 'agent')) {
      expect(session.provenance.spawnedBy.identityId, session.id).toBeUndefined();
    }
  });
});
