import { describe, expect, it, beforeAll } from 'vitest';
import {
  getDataset,
  typeBreakdown,
  orphanedCount,
  conflictsCount,
  discoveryScanTargets,
} from './dataset';
import { getOverview, listIdentities } from './api';
import { useUiStore } from '@/stores/ui';

beforeAll(() => {
  // Remove simulated latency so async assertions resolve fast.
  useUiStore.getState().setLatency(0);
});

describe('count reconciliation', () => {
  it('per-type counts sum to the total identity count', () => {
    const { identities } = getDataset();
    const breakdown = typeBreakdown(identities);
    const sum = breakdown.reduce((n, t) => n + t.count, 0);
    expect(sum).toBe(identities.length);
  });

  it('dashboard total equals the inventory total equals the dataset size', async () => {
    const { identities } = getDataset();
    const overview = await getOverview();
    const inventory = await listIdentities({ limit: 1 });

    expect(overview.total).toBe(identities.length);
    expect(inventory.total).toBe(identities.length);
    expect(inventory.counts.total).toBe(identities.length);
  });

  it('dashboard per-type breakdown matches the inventory facet counts', async () => {
    const overview = await getOverview();
    const inventory = await listIdentities({ limit: 1 });
    for (const { type, count } of overview.typeBreakdown) {
      expect(inventory.counts.byType[type]).toBe(count);
    }
  });

  it('orphaned and conflicts counts reconcile across selectors and the API', async () => {
    const { identities } = getDataset();
    const overview = await getOverview();
    expect(overview.orphaned).toBe(orphanedCount(identities));
    expect(overview.conflicts).toBe(conflictsCount(identities));
  });

  it('filtering by a type yields exactly that type’s facet count', async () => {
    const all = await listIdentities({ limit: 1 });
    const agents = await listIdentities({ filter: { types: ['ai-agent'] }, limit: 1 });
    expect(agents.total).toBe(all.counts.byType['ai-agent']);
  });

  it('onboarding scan targets reconcile with the dashboard total and per-type counts', async () => {
    const { identities } = getDataset();
    const targets = discoveryScanTargets();

    // The discovery total a new tenant sees must equal the dashboard total exactly.
    const sum = Object.values(targets).reduce((n, v) => n + v, 0);
    expect(sum).toBe(identities.length);

    // …and match the dashboard's per-type breakdown, type for type.
    const overview = await getOverview();
    for (const { type, count } of overview.typeBreakdown) {
      expect(targets[type]).toBe(count);
    }
  });
});
