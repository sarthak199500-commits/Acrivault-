import { beforeAll, describe, expect, it } from 'vitest';
import { getBlastRadius, listAlerts, listBlastOrigins, resolveAlert } from './api';
import { useUiStore } from '@/stores/ui';

beforeAll(() => useUiStore.getState().setLatency(0));

describe('monitor alerts', () => {
  it('lists only unresolved alerts', async () => {
    const open = await listAlerts();
    expect(open.every((a) => a.status !== 'resolved')).toBe(true);
  });

  it('resolving removes an alert from the open feed', async () => {
    const before = await listAlerts();
    expect(before.length).toBeGreaterThan(0);
    const target = before[0];
    await resolveAlert(target.id);
    const after = await listAlerts();
    expect(after.some((a) => a.id === target.id)).toBe(false);
    expect(after.length).toBe(before.length - 1);
  });

  it('filters by severity', async () => {
    const critical = await listAlerts('critical');
    expect(critical.every((a) => a.severity === 'critical')).toBe(true);
  });
});

describe('blast radius', () => {
  it('summary counts match the node kinds', async () => {
    const origins = await listBlastOrigins(5);
    expect(origins.length).toBeGreaterThan(0);
    const radius = await getBlastRadius(origins[0].id);
    expect(radius).not.toBeNull();
    if (radius) {
      const direct = radius.nodes.filter((n) => n.kind === 'direct').length;
      const transitive = radius.nodes.filter((n) => n.kind === 'transitive').length;
      const cascade = radius.nodes.filter((n) => n.kind === 'cascade').length;
      expect(radius.summary.direct).toBe(direct);
      expect(radius.summary.transitive).toBe(transitive);
      expect(radius.summary.cascade).toBe(cascade);
      expect(radius.nodes.some((n) => n.kind === 'origin')).toBe(true);
    }
  });
});
