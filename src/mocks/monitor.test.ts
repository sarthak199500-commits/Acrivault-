import { beforeAll, describe, expect, it } from 'vitest';
import {
  acknowledgeAlert,
  getBlastRadius,
  getMonitoringBaseline,
  listAlerts,
  listAudit,
  listBlastOrigins,
  resolveAlert,
} from './api';
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

  it('joins the identity display name, never a raw id', async () => {
    const alerts = await listAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.every((a) => a.identityName.length > 0)).toBe(true);
    expect(alerts.some((a) => a.identityName === a.identityId)).toBe(false);
  });

  // FRS 3.7: "Resolution is logged" / AC "it leaves the active feed and is recorded".
  it('records acknowledge and resolve in the audit trail', async () => {
    const alerts = await listAlerts();
    const [toAck, toResolve] = alerts;

    await acknowledgeAlert(toAck.id);
    const afterAck = await listAudit();
    expect(afterAck[0].action).toBe('acknowledged alert');
    expect(afterAck[0].target).toBe(toAck.title);
    expect(afterAck[0].actor.length).toBeGreaterThan(0);

    await resolveAlert(toResolve.id);
    const afterResolve = await listAudit();
    expect(afterResolve[0].action).toBe('resolved alert');
    // The alert is gone from the feed, so this entry is the only remaining record.
    expect((await listAlerts()).some((a) => a.id === toResolve.id)).toBe(false);
    expect(afterResolve[0].detail).toContain(toResolve.severity);
  });
});

describe('monitoring baseline', () => {
  it('reports coverage across identities, not one alert’s progress', async () => {
    const baseline = await getMonitoringBaseline();
    expect(baseline.monitored).toBeGreaterThan(0);
    expect(baseline.learning).toBeLessThanOrEqual(baseline.monitored);
    expect(baseline.windowDays).toBeGreaterThan(0);
    expect(baseline.state).toBe(baseline.learning > 0 ? 'learning' : 'established');
  });
});

describe('blast radius', () => {
  it('reports true reach in the summary, not just the drawn nodes', async () => {
    const { origins } = await listBlastOrigins({ limit: 5 });
    expect(origins.length).toBeGreaterThan(0);
    const radius = await getBlastRadius(origins[0].id);
    expect(radius).not.toBeNull();
    if (!radius) return;

    const drawn = (kind: string) => radius.nodes.filter((n) => n.kind === kind).length;
    const { direct, transitive, cascade } = radius.summary;

    expect(radius.nodes.some((n) => n.kind === 'origin')).toBe(true);
    // The graph is capped for legibility; the summary never is.
    expect(direct).toBeGreaterThanOrEqual(drawn('direct'));
    expect(transitive).toBeGreaterThanOrEqual(drawn('transitive'));
    expect(cascade).toBeGreaterThanOrEqual(drawn('cascade'));
    expect(radius.graph.total).toBe(direct + transitive + cascade);
    expect(radius.graph.drawn).toBe(radius.nodes.length - 1);
    expect(radius.graph.drawn).toBeLessThanOrEqual(radius.graph.total);
  });

  it('orders origins by reach so the default graph is worth reading', async () => {
    const { origins } = await listBlastOrigins({ limit: 40 });
    const reaches = origins.map((o) => o.reach);
    expect(reaches).toEqual([...reaches].sort((a, b) => b - a));
  });

  // Guards the FRS 3.9 acceptance criterion: a high-reach identity has to exist for
  // "the summary makes the scale clear" to be demonstrable at all.
  it('contains a high-reach identity whose reach exceeds what the graph draws', async () => {
    const { origins: [top] } = await listBlastOrigins({ limit: 1 });
    expect(top.reach).toBeGreaterThan(10);
    const radius = await getBlastRadius(top.id);
    expect(radius).not.toBeNull();
    if (!radius) return;
    expect(radius.summary.direct).toBe(top.reach);
    expect(radius.graph.drawn).toBeLessThan(radius.graph.total);
  });

  it('excludes the origin from its own reachable set', async () => {
    const { origins: [top] } = await listBlastOrigins({ limit: 1 });
    const radius = await getBlastRadius(top.id);
    const reached = radius?.nodes.filter((n) => n.kind !== 'origin') ?? [];
    expect(reached.some((n) => n.identityId === top.id)).toBe(false);
  });
});

// A ranked top-40 can only answer "where is my worst exposure". Reaching a particular
// identity needs search, or the picker silently hides all but a fraction of the estate.
describe('blast radius origin search', () => {
  it('reaches identities far outside the suggestion set', async () => {
    const { origins: suggested, searchable } = await listBlastOrigins({ limit: 40 });
    expect(searchable).toBeGreaterThan(suggested.length);

    // Pick a mappable identity the suggestions do not contain.
    const suggestedIds = new Set(suggested.map((o) => o.id));
    const { origins: all } = await listBlastOrigins({ query: '-', limit: 5000 });
    const outsider = all.find((o) => o.reach > 0 && !suggestedIds.has(o.id));
    expect(outsider).toBeDefined();
    if (!outsider) return;

    const { origins: found } = await listBlastOrigins({ query: outsider.name });
    expect(found.some((o) => o.id === outsider.id)).toBe(true);
    expect(await getBlastRadius(outsider.id)).not.toBeNull();
  });

  it('marks results as search results rather than suggestions', async () => {
    expect((await listBlastOrigins({})).suggestions).toBe(true);
    expect((await listBlastOrigins({ query: 'svc' })).suggestions).toBe(false);
  });

  it('matches on any part of the name, case-insensitively', async () => {
    const { origins } = await listBlastOrigins({ query: 'WEBHOOK' });
    expect(origins.length).toBeGreaterThan(0);
    expect(origins.every((o) => o.name.toLowerCase().includes('webhook'))).toBe(true);
  });

  // Omitting unmappable identities would make "no such identity" and "nothing to map"
  // look identical to the user.
  it('returns unmappable identities with zero reach instead of hiding them', async () => {
    const { origins } = await listBlastOrigins({ query: '-', limit: 5000 });
    const unmappable = origins.filter((o) => o.reach === 0);
    expect(unmappable.length).toBeGreaterThan(0);
    // Mappable ones sort first so the useful results are never buried.
    const firstUnmappable = origins.findIndex((o) => o.reach === 0);
    expect(origins.slice(firstUnmappable).every((o) => o.reach === 0)).toBe(true);
  });

  it('returns nothing for a name that does not exist', async () => {
    const { origins } = await listBlastOrigins({ query: 'no-such-identity-zzz' });
    expect(origins).toEqual([]);
  });
});
