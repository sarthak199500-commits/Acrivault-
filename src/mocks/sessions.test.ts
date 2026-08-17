import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  getIdentity,
  listAudit,
  listSessions,
  markSessionReviewed,
  quarantineAgent,
  recommendQuarantine,
  releaseQuarantine,
} from './api';
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
    expect(s.anomalyCount).toBe(s.steps.filter((st) => st.anomaly).length);
  });

  it('orders every session’s steps chronologically', async () => {
    // The generator multiplied a freshly drawn interval by the step index, so step 4
    // could land before step 3 — a replay whose timestamps contradicted its own order.
    for (const session of await listSessions()) {
      const times = session.steps.map((s) => new Date(s.at).getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
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

describe('session risk', () => {
  it('is derived from the session, not copied from the agent', async () => {
    const sessions = await listSessions();
    // The old model gave every session of one agent an identical score. At least one
    // agent with multiple sessions must now show a spread.
    const byAgent = new Map<string, Set<number>>();
    for (const s of sessions) {
      const scores = byAgent.get(s.identityId) ?? new Set<number>();
      scores.add(s.riskScore);
      byAgent.set(s.identityId, scores);
    }
    const repeated = [...byAgent.values()].filter((scores) => scores.size > 0);
    expect(repeated.some((scores) => scores.size > 1)).toBe(true);
  });

  it('never ranks a clean session above an anomalous one at equal privilege', async () => {
    const sessions = await listSessions();
    const scopeRank = { read: 0, write: 1, admin: 2 } as const;
    const topScope = (s: (typeof sessions)[number]) =>
      s.steps.reduce((top, st) => (st.scope && scopeRank[st.scope] > top ? scopeRank[st.scope] : top), -1);

    for (const clean of sessions.filter((s) => s.anomalyCount === 0)) {
      for (const dirty of sessions.filter((s) => s.anomalyCount > 0)) {
        if (topScope(clean) !== topScope(dirty)) continue;
        expect(dirty.riskScore).toBeGreaterThan(clean.riskScore);
      }
    }
  });

  it('publishes a breakdown that sums to the score', async () => {
    for (const s of await listSessions()) {
      const total = s.riskFactors.reduce((sum, f) => sum + f.points, 0);
      expect(Math.round(total)).toBe(s.riskScore);
      expect(s.riskFactors.map((f) => f.label)).toEqual([
        'Anomalous steps',
        'Privilege used',
        'Call burst',
        'Identity risk',
      ]);
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
    await quarantineAgent(target.identityId);

    const identity = await getIdentity(target.identityId);
    expect(identity?.status).toBe('quarantined');

    const audit = await listAudit();
    expect(audit[0].action).toBe('quarantined agent');

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

  it('records an analyst recommendation without containing the agent', async () => {
    const target = await pickActiveSession();
    await recommendQuarantine(target.identityId, target.id);

    expect((await getIdentity(target.identityId))?.status).not.toBe('quarantined');
    expect((await listAudit())[0].action).toBe('recommended agent quarantine');

    const updated = (await listSessions()).find((s) => s.id === target.id);
    expect(updated?.quarantineRecommendedAt).toBeTruthy();
  });
});
