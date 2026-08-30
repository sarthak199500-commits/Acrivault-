import { describe, expect, it } from 'vitest';
import { compareByUrgency, isFlaggedSession, topScopeRank } from './sessionRanking';
import type { SessionStep, StepStatus, ToolScope } from '@/mocks/types';

let n = 0;
function step(status: StepStatus, scope?: ToolScope): SessionStep {
  n += 1;
  return {
    id: `stp_${n}`,
    stepNo: n,
    kind: scope ? 'tool-call' : 'model-response',
    at: new Date(Date.UTC(2026, 7, 16, 12, n)).toISOString(),
    summary: scope ? 'assume_role(target)' : 'Summarized findings',
    detail: 'synthetic',
    status,
    ...(scope ? { scope } : {}),
  };
}

function session(opts: {
  startedAt?: string;
  anomalies?: number;
  blocked?: number;
  scope?: ToolScope;
  clean?: number;
}) {
  const { startedAt = '2026-08-16T12:00:00.000Z', anomalies = 0, blocked = 0, scope, clean = 2 } = opts;
  const steps = [
    ...Array.from({ length: blocked }, () => step('blocked', scope ?? 'admin')),
    ...Array.from({ length: anomalies }, () => step('anomaly', scope)),
    ...Array.from({ length: clean }, () => step('normal', scope)),
  ];
  return { startedAt, anomalyCount: anomalies, blockedCount: blocked, steps };
}

const first = (list: ReturnType<typeof session>[]) => [...list].sort(compareByUrgency)[0];

describe('compareByUrgency', () => {
  it('puts a held step above everything else', () => {
    const held = session({ blocked: 1 });
    const manyAnomalies = session({ anomalies: 5, scope: 'admin' });
    expect(first([manyAnomalies, held])).toBe(held);
  });

  it('ranks by anomaly count once neither session is held', () => {
    const three = session({ anomalies: 3 });
    const one = session({ anomalies: 1 });
    expect(first([one, three])).toBe(three);
  });

  it('breaks an anomaly tie on the highest scope reached', () => {
    const admin = session({ anomalies: 1, scope: 'admin' });
    const read = session({ anomalies: 1, scope: 'read' });
    expect(first([read, admin])).toBe(admin);
  });

  it('falls back to recency when the evidence matches', () => {
    const older = session({ anomalies: 1, scope: 'write', startedAt: '2026-08-10T09:00:00.000Z' });
    const newer = session({ anomalies: 1, scope: 'write', startedAt: '2026-08-16T09:00:00.000Z' });
    expect(first([older, newer])).toBe(newer);
  });

  it('never ranks a clean session above a flagged one', () => {
    // The defect the old copied-identity score produced, asserted directly.
    const clean = session({ anomalies: 0, scope: 'admin', startedAt: '2026-08-20T09:00:00.000Z' });
    const flagged = session({ anomalies: 1, scope: 'read', startedAt: '2026-08-01T09:00:00.000Z' });
    expect(first([clean, flagged])).toBe(flagged);
  });

  it('does not reward short sessions — density is not a term', () => {
    const oneOfSix = session({ anomalies: 1, clean: 5, scope: 'write' });
    const twoOfTwenty = session({ anomalies: 2, clean: 18, scope: 'write' });
    expect(first([oneOfSix, twoOfTwenty])).toBe(twoOfTwenty);
  });
});

describe('flagging', () => {
  it('counts anomalous and held steps, not clean ones', () => {
    expect(isFlaggedSession(session({ anomalies: 1 }))).toBe(true);
    expect(isFlaggedSession(session({ blocked: 1 }))).toBe(true);
    expect(isFlaggedSession(session({}))).toBe(false);
  });

  it('a step still pending a score is not treated as flagged', () => {
    // FR-005: it must not read as confirmed-clean either — that is the timeline's job.
    expect(isFlaggedSession({ steps: [step('scoring')] })).toBe(false);
  });

  it('reports the highest scope any step reached', () => {
    expect(topScopeRank([step('normal', 'read'), step('normal', 'admin')])).toBe(3);
    expect(topScopeRank([step('normal')])).toBe(0);
  });
});
