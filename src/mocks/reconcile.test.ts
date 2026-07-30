import { describe, expect, it, beforeAll } from 'vitest';
import {
  getDataset,
  typeBreakdown,
  orphanedCount,
  conflictsCount,
  discoveryScanTargets,
  riskBreakdown,
  sourceInstanceCount,
} from './dataset';
import { getOverview, listIdentities, SYNC_AGE_MINUTES } from './api';
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

  it('source instances exceed the correlated total, and the dedup claim is derivable', async () => {
    const { identities } = getDataset();
    const overview = await getOverview();

    // The dashboard's dedup line is "N source instances → M identities": N must be
    // the raw per-cloud count, M the correlated one, and N > M or there is nothing
    // to deduplicate.
    expect(overview.sourceInstances).toBe(sourceInstanceCount(identities));
    expect(overview.sourceInstances).toBeGreaterThan(overview.total);
    expect(overview.sourceInstances).toBe(
      identities.reduce((n, i) => n + i.sources.length, 0),
    );
  });

  it('dashboard and inventory report critical risk from one field, one definition', async () => {
    const { identities } = getDataset();
    const overview = await getOverview();
    const bands = riskBreakdown(identities);

    // Both screens render `riskBreakdown.critical` behind `?band=critical`. Guard
    // the definition too: critical is score >= 80 and nothing else, so a future
    // "high-risk = critical + high" tile cannot reappear under a similar label.
    expect(overview.riskBreakdown.critical).toBe(bands.critical);
    expect(overview.riskBreakdown.critical).toBe(
      identities.filter((i) => i.riskScore >= 80).length,
    );

    const filtered = await listIdentities({ filter: { bands: ['critical'] }, limit: 1 });
    expect(filtered.total).toBe(overview.riskBreakdown.critical);
  });

  it('exposes one sync timestamp for both the dashboard stamp and the inventory tile', async () => {
    const overview = await getOverview();
    const ageMinutes = (Date.now() - new Date(overview.lastSyncAt).getTime()) / 60000;

    // A single field feeds the dashboard's "as of" stamp and the inventory's
    // "Last scan" tile, so the two cannot disagree.
    expect(Number.isNaN(Date.parse(overview.lastSyncAt))).toBe(false);
    expect(ageMinutes).toBeGreaterThanOrEqual(SYNC_AGE_MINUTES - 1);
    expect(ageMinutes).toBeLessThan(SYNC_AGE_MINUTES + 1);
  });

  it('demo population stays calibrated to a mid-market tenant', async () => {
    const overview = await getOverview();
    const byType = new Map(overview.typeBreakdown.map((t) => [t.type, t.count]));

    // The calibration the demo dataset is meant to represent, asserted so a future
    // weight change cannot silently undo it: ~1,500 identities, AI agents a small
    // fast-growing slice, criticals rare enough that "critical" still means triage.
    expect(overview.total).toBe(1500);
    expect(byType.get('ai-agent')).toBeGreaterThanOrEqual(40);
    expect(byType.get('ai-agent')).toBeLessThanOrEqual(60);
    expect(overview.riskBreakdown.critical).toBeGreaterThanOrEqual(18);
    expect(overview.riskBreakdown.critical).toBeLessThanOrEqual(25);
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
