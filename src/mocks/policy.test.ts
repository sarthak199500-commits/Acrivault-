import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { defaultTokens, generatedCode, matchesPolicy, plainEnglish } from './policy';
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
