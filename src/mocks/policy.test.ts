import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  defaultTokens,
  diagnosticCovers,
  generatedCode,
  isUnsatisfiable,
  lintRule,
  matchesPolicy,
  plainEnglish,
  withoutCondition,
  zeroReason,
} from './policy';
import { getDataset, typeBreakdown } from './dataset';
import {
  activatePolicy,
  archivePolicy,
  evaluatePolicy,
  listAudit,
  listPolicies,
  savePolicy,
  suspendPolicy,
  testPolicy,
} from './api';
import { useUiStore } from '@/stores/ui';
import type { PolicyToken } from './types';

beforeAll(() => useUiStore.getState().setLatency(0));
// Some tests switch roles to exercise the capability gates; always restore the default.
afterEach(() => useUiStore.getState().setRole('tenant-admin'));

/** Compose a fresh draft to act on, with a distinct name per test. */
function draft(name: string, tokens: PolicyToken[] = defaultTokens()) {
  return {
    name,
    tokens,
    plainEnglish: plainEnglish(tokens),
    generatedCode: generatedCode(name, tokens),
    status: 'draft' as const,
  };
}

/** Build a rule: first condition is WHEN, the rest AND, plus a THEN action. */
function rule(...conditions: [string, string, string][]): PolicyToken[] {
  return [
    ...conditions.map(([subject, operator, value], i) => ({
      kind: i === 0 ? ('when' as const) : ('and' as const),
      subject,
      operator,
      value,
    })),
    { kind: 'then' as const, subject: 'action', operator: 'set', value: 'review' },
  ];
}

/** Does any identity in the seeded dataset satisfy this rule? */
function matchCount(tokens: PolicyToken[]): number {
  return getDataset().identities.filter((i) => matchesPolicy(i, tokens)).length;
}

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

describe('rule linting: contradictions', () => {
  // Each case is paired with its real match count, so "unsatisfiable" is not just
  // asserted — the dataset confirms nothing matches.
  const contradictions: [string, PolicyToken[]][] = [
    ['two types at once', rule(['type', 'is', 'ai-agent'], ['type', 'is', 'api-key'])],
    ['a type and its negation', rule(['type', 'is', 'ai-agent'], ['type', 'is-not', 'ai-agent'])],
    ['below 60 and above 80', rule(['riskScore', 'lt', '60'], ['riskScore', 'gt', '80'])],
    ['at least 60 and at most 40', rule(['riskScore', 'gte', '60'], ['riskScore', 'lte', '40'])],
    ['orphaned both ways', rule(['orphaned', 'is', 'true'], ['orphaned', 'is', 'false'])],
    ['two governance states', rule(['governanceStatus', 'is', 'governed'], ['governanceStatus', 'is', 'drift'])],
    ['no conflicts and some conflicts', rule(['conflicts', 'eq', '0'], ['conflicts', 'gt', '0'])],
    ['unassigned yet owned', rule(['owner', 'empty', ''], ['owner', 'is', 'sre'])],
    ['two owners', rule(['owner', 'is', 'sre'], ['owner', 'is', 'security'])],
  ];

  it.each(contradictions)('flags %s as unsatisfiable, and nothing matches', (_label, tokens) => {
    expect(isUnsatisfiable(lintRule(tokens))).toBe(true);
    expect(matchCount(tokens)).toBe(0);
  });

  it('flags a risk score outside the 0–100 domain', () => {
    const tokens = rule(['riskScore', 'gte', '101']);
    const diags = lintRule(tokens);
    expect(isUnsatisfiable(diags)).toBe(true);
    expect(diags[0].message).toContain('0–100');
    expect(matchCount(tokens)).toBe(0);
  });

  it('names the reason rather than just reporting invalidity', () => {
    const diags = lintRule(rule(['type', 'is', 'ai-agent'], ['type', 'is', 'api-key']));
    expect(diags[0].message).toContain('exactly one type');
  });

  it('reports a contradiction ONCE, implicating the other rows rather than repeating', () => {
    // Emitting per row duplicated the same sentence and offered two identical
    // "remove" links with no way to tell which one to click.
    const diags = lintRule(rule(['riskScore', 'lt', '60'], ['riskScore', 'gt', '80']));
    const unsat = diags.filter((d) => d.severity === 'unsatisfiable');
    expect(unsat).toHaveLength(1);
    expect(unsat[0].index).toBe(1);
    expect(unsat[0].relatedIndices).toEqual([0]);
    // Both rows still render as broken, even though only one carries the text.
    expect(diagnosticCovers(unsat[0], 0)).toBe(true);
    expect(diagnosticCovers(unsat[0], 1)).toBe(true);
    expect(diagnosticCovers(unsat[0], 2)).toBe(false);
  });

  it('offers exactly one fix for a contradiction, on the condition that caused it', () => {
    const tokens = rule(['type', 'is', 'ai-agent'], ['type', 'is', 'api-key']);
    const fixes = lintRule(tokens).filter((d) => d.fix);
    expect(fixes).toHaveLength(1);
    expect(fixes[0].index).toBe(1);
    // Applying it leaves a sound, lint-clean rule.
    const repaired = fixes[0].fix?.tokens ?? [];
    expect(lintRule(repaired)).toEqual([]);
    expect(matchCount(repaired)).toBeGreaterThan(0);
  });

  it('does not restate values already visible on the rows', () => {
    const diags = lintRule(rule(['type', 'is', 'ai-agent'], ['type', 'is', 'api-key']));
    // The rows show "AI Agent" and "API Key"; the message should not echo them.
    expect(diags[0].message).not.toContain('AI Agent');
    expect(diags[0].message).not.toContain('API Key');
    expect(diags[0].message).toContain('exactly one type');
  });

  it('names exhaustive exclusion as its own mistake, not a generic contradiction', () => {
    const diags = lintRule(rule(
      ['governanceStatus', 'is-not', 'governed'],
      ['governanceStatus', 'is-not', 'ungoverned'],
      ['governanceStatus', 'is-not', 'drift'],
    ));
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain('rule out every');
    expect(diags[0].relatedIndices).toEqual([0, 1]);
  });
});

describe('rule linting: repeated sources are a valid intersection', () => {
  // `cloud` is the one multi-valued subject: identity.sources is an array, so
  // repeating it asks for correlation across providers. Blanket "same subject
  // twice" detection would destroy the most valuable query in the builder.
  it('does not flag two different sources, and identities do match', () => {
    const tokens = rule(['cloud', 'includes', 'aws'], ['cloud', 'includes', 'gcp']);
    expect(lintRule(tokens)).toEqual([]);
    expect(matchCount(tokens)).toBeGreaterThan(0);
  });

  it('does not flag all three sources', () => {
    const tokens = rule(['cloud', 'includes', 'aws'], ['cloud', 'includes', 'gcp'], ['cloud', 'includes', 'azure']);
    expect(isUnsatisfiable(lintRule(tokens))).toBe(false);
    expect(matchCount(tokens)).toBeGreaterThan(0);
  });

  it('still flags an exact duplicate source as redundant', () => {
    const diags = lintRule(rule(['cloud', 'includes', 'aws'], ['cloud', 'includes', 'aws']));
    expect(diags).toHaveLength(1);
    expect(diags[0].severity).toBe('redundant');
  });
});

describe('rule linting: redundancy', () => {
  it('flags a bound that narrows nothing, and the count is unchanged by removing it', () => {
    const tokens = rule(['riskScore', 'gte', '60'], ['riskScore', 'gte', '50']);
    const diags = lintRule(tokens);
    const redundant = diags.filter((d) => d.severity === 'redundant');
    expect(redundant).toHaveLength(1);
    expect(redundant[0].index).toBe(1);
    // Proof the diagnosis is right: dropping it leaves an equivalent rule.
    expect(matchCount(withoutCondition(tokens, 1))).toBe(matchCount(tokens));
  });

  it('leaves a genuine band alone', () => {
    const tokens = rule(['riskScore', 'gte', '60'], ['riskScore', 'lte', '80']);
    expect(lintRule(tokens)).toEqual([]);
    expect(matchCount(tokens)).toBeGreaterThan(0);
  });

  it('flags an implied negation', () => {
    const diags = lintRule(rule(['type', 'is', 'ai-agent'], ['type', 'is-not', 'api-key']));
    expect(diags.map((d) => d.severity)).toEqual(['redundant']);
    expect(diags[0].index).toBe(1);
  });

  it('offers a fix that removes exactly the offending condition', () => {
    const tokens = rule(['riskScore', 'gte', '60'], ['riskScore', 'gte', '50']);
    const fix = lintRule(tokens).find((d) => d.severity === 'redundant')?.fix;
    if (!fix) throw new Error('expected a fix on the redundant condition');
    expect(fix.tokens.filter((t) => t.kind !== 'then')).toHaveLength(1);
    expect(lintRule(fix.tokens)).toEqual([]);
  });

  it('re-normalizes kinds when the first condition is removed', () => {
    const tokens = rule(['type', 'is', 'ai-agent'], ['riskScore', 'gte', '60']);
    const next = withoutCondition(tokens, 0);
    expect(next[0].kind).toBe('when');
    expect(next[0].subject).toBe('riskScore');
  });
});

describe('rule linting: incomplete conditions fail closed', () => {
  // This was the most dangerous state: `matchesCondition` returned true for NaN,
  // so a half-typed rule reported the whole population as affected.
  it('an empty risk score matches nothing rather than everything', () => {
    const tokens = rule(['riskScore', 'gte', '']);
    expect(matchCount(tokens)).toBe(0);
    expect(matchCount(tokens)).not.toBe(getDataset().identities.length);
  });

  it('reports the empty value so the zero is explained', () => {
    const diags = lintRule(rule(['riskScore', 'gte', '']));
    expect(diags.map((d) => d.severity)).toEqual(['incomplete']);
    expect(zeroReason(rule(['riskScore', 'gte', '']), diags)).toContain('missing its value');
  });

  it('an empty conflict count matches nothing', () => {
    expect(matchCount(rule(['conflicts', 'gt', '']))).toBe(0);
  });

  it('an empty owner name matches nothing, in either direction', () => {
    // `is not ""` was the subtler half of the same trap: it held for every
    // identity, so a blank name widened the rule to the whole population.
    expect(matchCount(rule(['owner', 'is-not', '']))).toBe(0);
    expect(matchCount(rule(['owner', 'is', '']))).toBe(0);
    for (const operator of ['is', 'is-not']) {
      const diags = lintRule(rule(['owner', operator, '']));
      expect(diags.map((d) => d.severity)).toEqual(['incomplete']);
    }
  });

  it('leaves a genuinely satisfiable owner pair alone', () => {
    // Unassigned AND "not sre" is consistent: an identity with no owner is not sre.
    const tokens = rule(['owner', 'empty', ''], ['owner', 'is-not', 'sre']);
    expect(isUnsatisfiable(lintRule(tokens))).toBe(false);
    expect(matchCount(tokens)).toBeGreaterThan(0);
  });
});

describe('rule linting: exhaustive negation and out-of-range values', () => {
  it('flags excluding every value of an enum', () => {
    const allTypes = rule(
      ['type', 'is-not', 'ai-agent'],
      ['type', 'is-not', 'service-account'],
      ['type', 'is-not', 'api-key'],
      ['type', 'is-not', 'oauth-token'],
      ['type', 'is-not', 'workload-identity'],
    );
    expect(isUnsatisfiable(lintRule(allTypes))).toBe(true);
    expect(matchCount(allTypes)).toBe(0);

    // Excluding all but one is fine, and matches that one.
    const allButOne = rule(
      ['type', 'is-not', 'ai-agent'],
      ['type', 'is-not', 'service-account'],
      ['type', 'is-not', 'api-key'],
      ['type', 'is-not', 'oauth-token'],
    );
    expect(isUnsatisfiable(lintRule(allButOne))).toBe(false);
    expect(matchCount(allButOne)).toBeGreaterThan(0);
  });

  it('flags a negative count or score, which no identity can hold', () => {
    for (const tokens of [rule(['conflicts', 'eq', '-1']), rule(['riskScore', 'lte', '-1'])]) {
      expect(isUnsatisfiable(lintRule(tokens))).toBe(true);
      expect(matchCount(tokens)).toBe(0);
    }
  });

  it('flags two different exact counts', () => {
    const tokens = rule(['conflicts', 'eq', '0'], ['conflicts', 'eq', '1']);
    expect(isUnsatisfiable(lintRule(tokens))).toBe(true);
    expect(matchCount(tokens)).toBe(0);
  });
});

describe('zeroReason separates impossible from merely empty', () => {
  it('explains an impossible rule', () => {
    const tokens = rule(['type', 'is', 'ai-agent'], ['type', 'is', 'api-key']);
    expect(zeroReason(tokens, lintRule(tokens))).toContain('can never match');
  });

  it('stays silent for a sound rule that simply matches nobody today', () => {
    // Logically fine — the data just has no identity with this many conflicts.
    const tokens = rule(['conflicts', 'gt', '9']);
    expect(matchCount(tokens)).toBe(0);
    expect(isUnsatisfiable(lintRule(tokens))).toBe(false);
    expect(zeroReason(tokens, lintRule(tokens))).toBeNull();
  });
});

describe('rule linting: sound rules stay quiet', () => {
  it('reports nothing for the starter rule or the seeded policies', () => {
    expect(lintRule(defaultTokens())).toEqual([]);
    for (const policy of getDataset().policies) {
      expect(lintRule(policy.tokens), `seeded policy "${policy.name}" should lint clean`).toEqual([]);
    }
  });
});

describe('dry-run sample surfaces the worst matches, not arbitrary ones', () => {
  // Was `matched.slice(0, 6)` — the first six in dataset order. On a screen whose
  // next action can quarantine or block, that could show six minimal-risk matches
  // for a rule that also hits criticals, and read as harmless.
  it('ranks the sample by risk, descending', async () => {
    const res = await evaluatePolicy([{ kind: 'when', subject: 'riskScore', operator: 'gte', value: '0' }]);
    const scores = res.sample.map((s) => s.riskScore);
    expect(scores.length).toBeGreaterThan(1);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('shows the true worst matches, not merely a sorted arbitrary slice', async () => {
    const { identities } = getDataset();
    const res = await evaluatePolicy([{ kind: 'when', subject: 'riskScore', operator: 'gte', value: '0' }]);
    const worst = Math.max(...identities.map((i) => i.riskScore));
    expect(res.sample[0].riskScore).toBe(worst);
  });

  it('reports the critical count, which a six-row sample cannot convey', async () => {
    const { identities } = getDataset();
    const res = await evaluatePolicy([{ kind: 'when', subject: 'riskScore', operator: 'gte', value: '0' }]);
    expect(res.affected).toBe(identities.length);
    expect(res.criticalCount).toBe(identities.filter((i) => i.riskBand === 'critical').length);
  });

  it('carries the type, so a match renders like an identity everywhere else', async () => {
    const res = await evaluatePolicy([{ kind: 'when', subject: 'type', operator: 'is', value: 'ai-agent' }]);
    expect(res.sample.length).toBeGreaterThan(0);
    expect(res.sample.every((s) => s.type === 'ai-agent')).toBe(true);
  });

  it('test and evaluate agree — one shared evaluator, so they cannot drift', async () => {
    const tokens: PolicyToken[] = [{ kind: 'when', subject: 'type', operator: 'is', value: 'api-key' }];
    const evaluated = await evaluatePolicy(tokens);
    const { evaluation } = await testPolicy(draft('Sample parity check', tokens));
    expect(evaluation.affected).toBe(evaluated.affected);
    expect(evaluation.criticalCount).toBe(evaluated.criticalCount);
    expect(evaluation.sample.map((s) => s.id)).toEqual(evaluated.sample.map((s) => s.id));
  });

  it('a rule matching nothing yields an empty sample and no criticals', async () => {
    const res = await evaluatePolicy([{ kind: 'when', subject: 'riskScore', operator: 'gte', value: '101' }]);
    expect(res.affected).toBe(0);
    expect(res.sample).toEqual([]);
    expect(res.criticalCount).toBe(0);
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

describe('policy activation is recorded', () => {
  it('records an audit entry when a tested policy is activated', async () => {
    const { policy } = await testPolicy(draft('Audited activation'));
    const active = await activatePolicy(policy.id);
    expect(active.status).toBe('active');

    const audit = await listAudit();
    expect(audit.some((e) => e.action === 'activated policy' && e.target === 'Audited activation')).toBe(true);
  });

  it('does not record an activation for a draft save', async () => {
    const saved = await savePolicy(draft('Draft never activated'));

    const audit = await listAudit();
    expect(audit.some((e) => e.action === 'activated policy' && e.target === saved.name)).toBe(false);
  });

  it('records an audit entry for a dry-run test', async () => {
    await testPolicy(draft('Audited test'));

    const audit = await listAudit();
    expect(audit.some((e) => e.action === 'tested policy' && e.target === 'Audited test')).toBe(true);
  });
});

// FR-005 — activation is blocked unless the exact token set was dry-run tested.
describe('FR-005 · test-before-activate', () => {
  it('refuses to activate a draft that was never tested', async () => {
    const saved = await savePolicy(draft('Never tested'));
    await expect(activatePolicy(saved.id)).rejects.toMatchObject({ code: 'STALE_TEST' });
  });

  it('refuses to activate when the rule changed since its last test', async () => {
    const { policy } = await testPolicy(draft('Edited after test'));

    // Edit the rule after testing — the prior test no longer proves anything.
    const edited: PolicyToken[] = [
      { kind: 'when', subject: 'type', operator: 'is', value: 'api-key' },
      { kind: 'then', subject: 'action', operator: 'set', value: 'quarantine' },
    ];
    await savePolicy({ ...draft('Edited after test', edited), id: policy.id, status: 'tested' });

    await expect(activatePolicy(policy.id)).rejects.toMatchObject({ code: 'STALE_TEST' });
  });

  it('activates once the edited rule is re-tested', async () => {
    const { policy } = await testPolicy(draft('Re-tested'));
    const edited: PolicyToken[] = [
      { kind: 'when', subject: 'orphaned', operator: 'is', value: 'true' },
      { kind: 'then', subject: 'action', operator: 'set', value: 'review' },
    ];
    await savePolicy({ ...draft('Re-tested', edited), id: policy.id, status: 'tested' });
    await testPolicy({ ...draft('Re-tested', edited), id: policy.id });

    const active = await activatePolicy(policy.id);
    expect(active.status).toBe('active');
    expect(active.activatedAt).toBeTruthy();
  });

  it('stamps lastTestedAt on a successful test', async () => {
    const { policy } = await testPolicy(draft('Stamped'));
    expect(policy.status).toBe('tested');
    expect(policy.lastTestedAt).toBeTruthy();
  });
});

// FR-006 — lifecycle actions are gated server-side, not just hidden in the UI.
describe('FR-006 · lifecycle actions are role-gated in the API', () => {
  it('forbids an analyst from activating a tested policy', async () => {
    const { policy } = await testPolicy(draft('Analyst cannot activate'));
    useUiStore.getState().setRole('analyst');
    await expect(activatePolicy(policy.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('forbids an analyst from suspending an active policy', async () => {
    const { policy } = await testPolicy(draft('Analyst cannot suspend'));
    await activatePolicy(policy.id);
    useUiStore.getState().setRole('analyst');
    await expect(suspendPolicy(policy.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('forbids a viewer from testing a policy', async () => {
    useUiStore.getState().setRole('viewer');
    await expect(testPolicy(draft('Viewer cannot test'))).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

// FR-010 / FR-011 — Suspend stops enforcement without deletion; Archive needs Suspend first.
describe('FR-010 / FR-011 · suspend, reactivate, archive', () => {
  it('suspends an active policy without discarding its definition', async () => {
    const { policy } = await testPolicy(draft('To be suspended'));
    await activatePolicy(policy.id);

    const suspended = await suspendPolicy(policy.id);
    expect(suspended.status).toBe('suspended');
    expect(suspended.tokens).toEqual(policy.tokens);

    const audit = await listAudit();
    expect(audit.some((e) => e.action === 'suspended policy' && e.target === 'To be suspended')).toBe(true);
  });

  it('reactivates a suspended policy without requiring a re-test', async () => {
    const { policy } = await testPolicy(draft('To be reactivated'));
    await activatePolicy(policy.id);
    await suspendPolicy(policy.id);

    const reactivated = await activatePolicy(policy.id);
    expect(reactivated.status).toBe('active');

    const audit = await listAudit();
    expect(audit.some((e) => e.action === 'reactivated policy' && e.target === 'To be reactivated')).toBe(true);
  });

  it('refuses to suspend a policy that is not active', async () => {
    const saved = await savePolicy(draft('Draft cannot suspend'));
    await expect(suspendPolicy(saved.id)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('refuses to archive an active policy directly — suspend is required first', async () => {
    const { policy } = await testPolicy(draft('Active cannot archive'));
    await activatePolicy(policy.id);
    await expect(archivePolicy(policy.id)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('archives a suspended policy and drops it from the default list', async () => {
    const { policy } = await testPolicy(draft('To be archived'));
    await activatePolicy(policy.id);
    await suspendPolicy(policy.id);

    const archived = await archivePolicy(policy.id);
    expect(archived.status).toBe('archived');

    const visible = await listPolicies();
    expect(visible.some((p) => p.id === policy.id)).toBe(false);

    const all = await listPolicies({ includeArchived: true });
    expect(all.some((p) => p.id === policy.id)).toBe(true);

    const audit = await listAudit();
    expect(audit.some((e) => e.action === 'archived policy' && e.target === 'To be archived')).toBe(true);
  });
});
