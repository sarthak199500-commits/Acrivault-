import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getConnections, getSourceHealth } from './api';
import { useUiStore } from '@/stores/ui';

beforeAll(() => useUiStore.getState().setLatency(0));
beforeEach(() => useUiStore.getState().setSources('healthy'));

describe('source health', () => {
  it('gives every connection its own last-sync timestamp', async () => {
    const conns = await getConnections();
    expect(conns.length).toBe(3);
    expect(conns.every((c) => typeof c.lastSyncAt === 'string')).toBe(true);
  });

  it('reports all sources healthy by default', async () => {
    const health = await getSourceHealth();
    expect(health.total).toBe(3);
    expect(health.healthy).toBe(3);
    expect(health.degraded).toEqual([]);
  });

  it('reports the degraded source and its error under the degraded scenario', async () => {
    useUiStore.getState().setSources('degraded');
    const health = await getSourceHealth();
    expect(health.healthy).toBe(2);
    expect(health.degraded).toEqual(['azure']);
    const azure = (await getConnections()).find((c) => c.cloud === 'azure');
    expect(azure?.status).toBe('error');
    expect(azure?.error?.code).toBe('AuthorizationFailed');
  });

  it('reports the OLDEST successful sync, so a partial dataset cannot look fresh', async () => {
    useUiStore.getState().setSources('degraded');
    const health = await getSourceHealth();
    const conns = await getConnections();
    const syncs = conns.map((c) => c.lastSyncAt).filter((t): t is string => Boolean(t)).sort();
    expect(health.oldestSyncAt).toBe(syncs[0]);
  });
});
