import { beforeAll, describe, expect, it } from 'vitest';
import { getDataset } from './dataset';
import { getIdentity, listIdentities } from './api';
import { matchesPolicy } from './policy';
import { useUiStore } from '@/stores/ui';

beforeAll(() => useUiStore.getState().setLatency(0));

describe('inventory filtering and sorting', () => {
  it('filters by type', async () => {
    const res = await listIdentities({ filter: { types: ['ai-agent'] }, limit: 100_000 });
    expect(res.rows.every((r) => r.type === 'ai-agent')).toBe(true);
    expect(res.total).toBeGreaterThan(0);
  });

  it('filters by risk band', async () => {
    const res = await listIdentities({ filter: { bands: ['critical'] }, limit: 100_000 });
    expect(res.rows.every((r) => r.riskBand === 'critical')).toBe(true);
  });

  it('orphaned and conflicts quick filters narrow the set', async () => {
    const orphaned = await listIdentities({ filter: { orphanedOnly: true }, limit: 100_000 });
    expect(orphaned.rows.every((r) => r.orphaned)).toBe(true);
    const conflicts = await listIdentities({ filter: { conflictsOnly: true }, limit: 100_000 });
    expect(conflicts.rows.every((r) => r.conflicts.length > 0)).toBe(true);
  });

  it('cross-cloud filter narrows to identities spanning more than one cloud', async () => {
    const res = await listIdentities({ filter: { crossCloudOnly: true }, limit: 100_000 });
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.rows.every((r) => r.correlated)).toBe(true);
    // Not just `correlated`: the flag claims a span, so every row must actually
    // report two or more DISTINCT providers. The row badge prints this number.
    expect(res.rows.every((r) => new Set(r.sources.map((s) => s.cloud)).size > 1)).toBe(true);
  });

  it('cross-cloud facet count reconciles with the cross-cloud filter', async () => {
    const all = await listIdentities({ limit: 1 });
    const crossCloud = await listIdentities({ filter: { crossCloudOnly: true }, limit: 1 });
    expect(crossCloud.total).toBe(all.counts.crossCloud);
  });

  it('cross-cloud facet count reflects other active filters', async () => {
    const onlyAgents = await listIdentities({ filter: { types: ['ai-agent'] }, limit: 1 });
    const crossCloudAgents = await listIdentities({
      filter: { types: ['ai-agent'], crossCloudOnly: true },
      limit: 1,
    });
    expect(onlyAgents.counts.crossCloud).toBe(crossCloudAgents.total);
  });

  it('filters by status', async () => {
    const res = await listIdentities({ filter: { statuses: ['quarantined'] }, limit: 100_000 });
    expect(res.rows.every((r) => r.status === 'quarantined')).toBe(true);
  });

  it('status facet count reconciles with the status filter', async () => {
    const all = await listIdentities({ limit: 1 });
    const quarantined = await listIdentities({ filter: { statuses: ['quarantined'] }, limit: 1 });
    expect(quarantined.total).toBe(all.counts.byStatus.quarantined);
  });

  it('search matches name, owner, or source id', async () => {
    const { identities } = getDataset();
    const sample = identities[0];
    const res = await listIdentities({ filter: { search: sample.name }, limit: 100_000 });
    expect(res.rows.some((r) => r.id === sample.id)).toBe(true);
  });

  it('sorts by risk ascending and descending', async () => {
    const desc = await listIdentities({ sort: { id: 'risk', desc: true }, limit: 50 });
    for (let i = 1; i < desc.rows.length; i++) {
      expect(desc.rows[i - 1].riskScore).toBeGreaterThanOrEqual(desc.rows[i].riskScore);
    }
    const asc = await listIdentities({ sort: { id: 'risk', desc: false }, limit: 50 });
    for (let i = 1; i < asc.rows.length; i++) {
      expect(asc.rows[i - 1].riskScore).toBeLessThanOrEqual(asc.rows[i].riskScore);
    }
  });

  it('paginates with offset and limit', async () => {
    const page1 = await listIdentities({ sort: { id: 'name', desc: false }, offset: 0, limit: 25 });
    const page2 = await listIdentities({ sort: { id: 'name', desc: false }, offset: 25, limit: 25 });
    expect(page1.rows).toHaveLength(25);
    expect(page1.rows[0].id).not.toBe(page2.rows[0].id);
  });

  it('facet counts for one type reflect other active filters', async () => {
    const onlyCritical = await listIdentities({ filter: { bands: ['critical'] }, limit: 1 });
    // The ai-agent facet under a critical-band filter equals the count of critical ai-agents.
    const criticalAgents = await listIdentities({ filter: { bands: ['critical'], types: ['ai-agent'] }, limit: 1 });
    expect(onlyCritical.counts.byType['ai-agent']).toBe(criticalAgents.total);
  });
});

describe('review flags, derived from the active rule set', () => {
  it('seeds at least one active review policy that matches something', async () => {
    // Fixture coherence: every assertion below is vacuous if no Active `review`
    // rule exists, and a count-based test would still pass on an empty match set.
    const { policies, identities } = getDataset();
    const active = policies.filter(
      (p) =>
        p.status === 'active' &&
        p.tokens.some((t) => t.kind === 'then' && t.subject === 'action' && t.value === 'review'),
    );
    expect(active.length).toBeGreaterThan(0);
    expect(identities.some((i) => matchesPolicy(i, active[0].tokens))).toBe(true);
  });

  it('flaggedOnly narrows to identities an active review rule matches', async () => {
    const res = await listIdentities({ filter: { flaggedOnly: true }, limit: 100_000 });
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.rows.every((r) => r.flaggedBy.length > 0)).toBe(true);
  });

  it('names a rule that is active, asks for review, and actually matches the row', async () => {
    const { policies } = getDataset();
    const res = await listIdentities({ filter: { flaggedOnly: true }, limit: 100_000 });
    for (const row of res.rows) {
      for (const flag of row.flaggedBy) {
        const policy = policies.find((p) => p.id === flag.policyId);
        expect(policy?.status).toBe('active');
        expect(policy && matchesPolicy(row, policy.tokens)).toBe(true);
      }
    }
  });

  it('leaves flaggedBy empty on an identity no review rule matches', async () => {
    const all = await listIdentities({ limit: 100_000 });
    expect(all.rows.some((r) => r.flaggedBy.length === 0)).toBe(true);
  });

  it('flagged facet count reconciles with the flagged filter', async () => {
    const all = await listIdentities({ limit: 1 });
    const flagged = await listIdentities({ filter: { flaggedOnly: true }, limit: 1 });
    expect(flagged.total).toBe(all.counts.flagged);
  });

  it('stops flagging an identity when the rule is suspended', async () => {
    const rule = getDataset().policies.find(
      (p) =>
        p.status === 'active' &&
        p.tokens.some((t) => t.kind === 'then' && t.subject === 'action' && t.value === 'review'),
    );
    if (!rule) throw new Error('fixture: expected an active review policy');
    const before = await listIdentities({ filter: { flaggedOnly: true }, limit: 1 });
    rule.status = 'suspended';
    try {
      const after = await listIdentities({ filter: { flaggedOnly: true }, limit: 1 });
      expect(after.total).toBeLessThan(before.total);
    } finally {
      rule.status = 'active';
    }
  });
});

describe('getIdentity', () => {
  it('carries the same derived flags the list shows, so the panel cannot disagree', async () => {
    const list = await listIdentities({ filter: { flaggedOnly: true }, limit: 1 });
    const row = list.rows[0];
    const detail = await getIdentity(row.id);
    expect(detail?.flaggedBy).toEqual(row.flaggedBy);
    expect(detail?.flaggedBy.length).toBeGreaterThan(0);
  });
});
