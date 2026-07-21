import { beforeAll, describe, expect, it } from 'vitest';
import { getDataset } from './dataset';
import { listIdentities } from './api';
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
