import { describe, expect, it } from 'vitest';
import { applySessionFilter, type SessionFilter } from './useSessionFilters';

type Row = Parameters<typeof applySessionFilter<{
  id: string;
  identityId: string;
  identityName: string;
  reviewState: 'open' | 'reviewed';
  anomalyCount: number;
}>>[0][number];

const ROWS: Row[] = [
  { id: 'a', identityId: 'i1', identityName: 'agent-orchestrator-001', reviewState: 'open', anomalyCount: 3 },
  { id: 'b', identityId: 'i1', identityName: 'agent-orchestrator-001', reviewState: 'reviewed', anomalyCount: 0 },
  { id: 'c', identityId: 'i2', identityName: 'agent-triage-bot-002', reviewState: 'open', anomalyCount: 0 },
  { id: 'd', identityId: 'i3', identityName: 'agent-QA-runner-003', reviewState: 'reviewed', anomalyCount: 1 },
];

const NONE: SessionFilter = { review: null, anomaliesOnly: false, agentId: null, search: '' };
const ids = (rows: Row[]) => rows.map((r) => r.id);

describe('applySessionFilter', () => {
  it('passes everything through when nothing is set', () => {
    expect(ids(applySessionFilter(ROWS, NONE))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('narrows by review state', () => {
    expect(ids(applySessionFilter(ROWS, { ...NONE, review: 'open' }))).toEqual(['a', 'c']);
    expect(ids(applySessionFilter(ROWS, { ...NONE, review: 'reviewed' }))).toEqual(['b', 'd']);
  });

  it('narrows to sessions that actually have anomalies', () => {
    expect(ids(applySessionFilter(ROWS, { ...NONE, anomaliesOnly: true }))).toEqual(['a', 'd']);
  });

  it('scopes to one agent by id — the Discover deep link', () => {
    expect(ids(applySessionFilter(ROWS, { ...NONE, agentId: 'i1' }))).toEqual(['a', 'b']);
  });

  it('searches agent names case-insensitively on a substring', () => {
    expect(ids(applySessionFilter(ROWS, { ...NONE, search: 'qa-runner' }))).toEqual(['d']);
    expect(ids(applySessionFilter(ROWS, { ...NONE, search: '  TRIAGE '.trim() }))).toEqual(['c']);
  });

  it('intersects dimensions rather than unioning them', () => {
    expect(ids(applySessionFilter(ROWS, { ...NONE, review: 'open', anomaliesOnly: true }))).toEqual(['a']);
    expect(ids(applySessionFilter(ROWS, { ...NONE, agentId: 'i1', review: 'reviewed' }))).toEqual(['b']);
    expect(ids(applySessionFilter(ROWS, { ...NONE, agentId: 'i2', anomaliesOnly: true }))).toEqual([]);
  });
});
