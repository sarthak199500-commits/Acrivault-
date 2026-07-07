import { beforeAll, describe, expect, it } from 'vitest';
import { defaultTokens, generatedCode, matchesPolicy, plainEnglish } from './policy';
import { getDataset, typeBreakdown } from './dataset';
import { evaluatePolicy } from './api';
import { useUiStore } from '@/stores/ui';
import type { PolicyToken } from './types';

beforeAll(() => useUiStore.getState().setLatency(0));

describe('policy grammar', () => {
  it('restates a rule in plain English', () => {
    const tokens: PolicyToken[] = [
      { kind: 'when', subject: 'type', operator: 'is', value: 'ai-agent' },
      { kind: 'and', subject: 'orphaned', operator: 'is', value: 'true' },
      { kind: 'then', subject: 'action', operator: 'set', value: 'quarantine' },
    ];
    expect(plainEnglish(tokens)).toBe(
      'When an identity is an AI Agent, and is orphaned, then quarantine it.',
    );
  });

  it('generates illustrative code containing each token', () => {
    const code = generatedCode('My rule', defaultTokens());
    expect(code).toContain('policy "My rule"');
    expect(code).toContain('WHEN');
    expect(code).toContain('THEN');
  });

  it('matches identities by their conditions', () => {
    const { identities } = getDataset();
    const agent = identities.find((i) => i.type === 'ai-agent');
    expect(agent).toBeDefined();
    if (agent) {
      expect(matchesPolicy(agent, [{ kind: 'when', subject: 'type', operator: 'is', value: 'ai-agent' }])).toBe(true);
      expect(matchesPolicy(agent, [{ kind: 'when', subject: 'type', operator: 'is', value: 'api-key' }])).toBe(false);
    }
  });
});

describe('policy evaluation reconciles with the inventory', () => {
  it('the affected count for a type rule equals the per-type breakdown', async () => {
    const { identities } = getDataset();
    const agents = typeBreakdown(identities).find((t) => t.type === 'ai-agent')?.count ?? 0;
    const res = await evaluatePolicy([{ kind: 'when', subject: 'type', operator: 'is', value: 'ai-agent' }]);
    expect(res.affected).toBe(agents);
    expect(res.total).toBe(identities.length);
  });
});
