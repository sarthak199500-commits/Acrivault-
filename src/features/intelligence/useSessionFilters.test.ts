import { describe, expect, it } from 'vitest';
import { applySessionFilter, type SessionFilter } from './useSessionFilters';
import type { SessionStep, StepStatus, ToolScope } from '@/mocks/types';

let n = 0;
function step(status: StepStatus, scope?: ToolScope): SessionStep {
  n += 1;
  return {
    id: `stp_${n}`,
    stepNo: n,
    kind: scope ? 'tool-call' : 'model-response',
    at: new Date(Date.UTC(2026, 7, 16, 12, n)).toISOString(),
    summary: 'assume_role(target)',
    detail: 'synthetic',
    status,
    ...(scope ? { scope } : {}),
  };
}

interface Row {
  id: string;
  identityId: string;
  identityName: string;
  reviewState: 'open' | 'reviewed';
  flagged: boolean;
  startedAt: string;
  anomalyCount: number;
  blockedCount: number;
  steps: SessionStep[];
}

function row(over: Partial<Row> & Pick<Row, 'id' | 'identityId' | 'identityName' | 'reviewState'>): Row {
  const anomalyCount = over.anomalyCount ?? 0;
  const blockedCount = over.blockedCount ?? 0;
  const steps = over.steps ?? [
    ...Array.from({ length: blockedCount }, () => step('blocked', 'admin')),
    ...Array.from({ length: anomalyCount }, () => step('anomaly', 'write')),
    step('normal', 'read'),
  ];
  return {
    flagged: anomalyCount + blockedCount > 0,
    startedAt: over.startedAt ?? '2026-08-16T12:00:00.000Z',
    anomalyCount,
    blockedCount,
    ...over,
    steps,
  };
}

const ROWS: Row[] = [
  row({ id: 'ses_a', identityId: 'i1', identityName: 'agent-orchestrator-001', reviewState: 'open', anomalyCount: 3, startedAt: '2026-08-16T10:00:00.000Z' }),
  row({ id: 'ses_b', identityId: 'i1', identityName: 'agent-orchestrator-001', reviewState: 'reviewed', startedAt: '2026-08-16T11:00:00.000Z' }),
  row({ id: 'ses_c', identityId: 'i2', identityName: 'agent-triage-bot-002', reviewState: 'open', startedAt: '2026-08-16T12:00:00.000Z' }),
  row({ id: 'ses_d', identityId: 'i3', identityName: 'agent-QA-runner-003', reviewState: 'reviewed', blockedCount: 1, startedAt: '2026-08-16T09:00:00.000Z' }),
];

const NONE: SessionFilter = { review: null, flaggedOnly: false, agentId: null, search: '', sort: 'recent' };
const ids = (rows: Row[]) => rows.map((r) => r.id);

describe('applySessionFilter', () => {
  it('returns everything, newest first, when nothing is set', () => {
    expect(ids(applySessionFilter(ROWS, NONE))).toEqual(['ses_c', 'ses_b', 'ses_a', 'ses_d']);
  });

  it('narrows by review state', () => {
    expect(ids(applySessionFilter(ROWS, { ...NONE, review: 'open' }))).toEqual(['ses_c', 'ses_a']);
    expect(ids(applySessionFilter(ROWS, { ...NONE, review: 'reviewed' }))).toEqual(['ses_b', 'ses_d']);
  });

  it('narrows to flagged sessions — anomalies or held steps', () => {
    expect(ids(applySessionFilter(ROWS, { ...NONE, flaggedOnly: true }))).toEqual(['ses_a', 'ses_d']);
  });

  it('scopes to one agent by id — the Discover deep link', () => {
    expect(ids(applySessionFilter(ROWS, { ...NONE, agentId: 'i1' }))).toEqual(['ses_b', 'ses_a']);
  });

  it('searches identity name and session id, case-insensitively', () => {
    expect(ids(applySessionFilter(ROWS, { ...NONE, search: 'qa-runner' }))).toEqual(['ses_d']);
    expect(ids(applySessionFilter(ROWS, { ...NONE, search: 'ses_c' }))).toEqual(['ses_c']);
  });

  it('ignores a search below the minimum rather than matching on one character', () => {
    // Spec 10.2: two characters before the search executes.
    expect(ids(applySessionFilter(ROWS, { ...NONE, search: 'a' }))).toEqual(['ses_c', 'ses_b', 'ses_a', 'ses_d']);
    expect(ids(applySessionFilter(ROWS, { ...NONE, search: 'ag' })).length).toBe(4);
  });

  it('ranks by urgency when asked — held first, then anomaly count', () => {
    expect(ids(applySessionFilter(ROWS, { ...NONE, sort: 'urgent' }))).toEqual([
      'ses_d',
      'ses_a',
      'ses_c',
      'ses_b',
    ]);
  });

  it('intersects dimensions rather than unioning them', () => {
    expect(ids(applySessionFilter(ROWS, { ...NONE, review: 'open', flaggedOnly: true }))).toEqual(['ses_a']);
    expect(ids(applySessionFilter(ROWS, { ...NONE, agentId: 'i2', flaggedOnly: true }))).toEqual([]);
  });
});
