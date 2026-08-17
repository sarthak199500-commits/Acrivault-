import { describe, expect, it } from 'vitest';
import { sessionRisk } from './sessionRisk';
import type { SessionStep, ToolScope } from '@/mocks/types';

let seq = 0;
function step(partial: Partial<SessionStep> & { minute: number }): SessionStep {
  const { minute, ...rest } = partial;
  return {
    id: `stp_${seq++}`,
    kind: 'model-response',
    at: new Date(Date.UTC(2026, 7, 16, 12, minute)).toISOString(),
    summary: 'Summarized findings',
    detail: 'Captured payload available in the full trace (synthetic).',
    anomaly: false,
    ...rest,
  };
}

function toolCalls(n: number, scope: ToolScope, opts: { anomalies?: number; perMinute?: number } = {}) {
  const { anomalies = 0, perMinute = 1 } = opts;
  return Array.from({ length: n }, (_, i) =>
    step({ minute: Math.floor(i / perMinute), kind: 'tool-call', scope, anomaly: i < anomalies }),
  );
}

describe('sessionRisk', () => {
  it('scores a clean session low even when the agent itself is risky', () => {
    // The bug this replaces: session risk was a verbatim copy of agent risk, so a
    // zero-anomaly session on a High agent read "High 62".
    const clean = sessionRisk(toolCalls(10, 'read'), 62);
    expect(clean.score).toBeLessThan(20);
  });

  it('ranks any anomalous session above every clean session at the same privilege', () => {
    const clean = sessionRisk(toolCalls(12, 'write'), 90);
    const anomalous = sessionRisk(toolCalls(12, 'write', { anomalies: 1 }), 0);
    expect(anomalous.score).toBeGreaterThan(clean.score);
  });

  it('scales with anomaly density, not just anomaly count', () => {
    const sparse = sessionRisk(toolCalls(40, 'read', { anomalies: 2 }), 10);
    const dense = sessionRisk(toolCalls(6, 'read', { anomalies: 2 }), 10);
    expect(dense.score).toBeGreaterThan(sparse.score);
  });

  it('weights admin scope above write above read', () => {
    const byScope = (scope: ToolScope) => sessionRisk(toolCalls(8, scope, { anomalies: 1 }), 20).score;
    expect(byScope('admin')).toBeGreaterThan(byScope('write'));
    expect(byScope('write')).toBeGreaterThan(byScope('read'));
  });

  it('adds a burst term when privileged calls cluster in time', () => {
    const spread = sessionRisk(toolCalls(12, 'admin', { anomalies: 1, perMinute: 1 }), 20);
    const burst = sessionRisk(toolCalls(12, 'admin', { anomalies: 1, perMinute: 12 }), 20);
    expect(burst.score).toBeGreaterThan(spread.score);
  });

  it('caps the identity prior so it can never dominate the session evidence', () => {
    const lowIdentity = sessionRisk(toolCalls(10, 'read'), 0).score;
    const maxIdentity = sessionRisk(toolCalls(10, 'read'), 100).score;
    expect(maxIdentity - lowIdentity).toBeLessThanOrEqual(15);
  });

  it('stays within 0..100 at both extremes', () => {
    expect(sessionRisk([], 0).score).toBe(0);
    const worst = sessionRisk(toolCalls(20, 'admin', { anomalies: 20, perMinute: 20 }), 100);
    expect(worst.score).toBeLessThanOrEqual(100);
    expect(worst.score).toBeGreaterThan(90);
  });

  it('explains itself: factors carry the points they contributed', () => {
    const risk = sessionRisk(toolCalls(10, 'admin', { anomalies: 3 }), 50);
    const total = risk.factors.reduce((sum, f) => sum + f.points, 0);
    expect(risk.factors.map((f) => f.label)).toEqual([
      'Anomalous steps',
      'Privilege used',
      'Call burst',
      'Identity risk',
    ]);
    expect(Math.round(total)).toBe(risk.score);
  });
});
