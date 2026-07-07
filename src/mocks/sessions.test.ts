import { beforeAll, describe, expect, it } from 'vitest';
import { listSessions, markSessionReviewed, quarantineSession } from './api';
import { useUiStore } from '@/stores/ui';

beforeAll(() => useUiStore.getState().setLatency(0));

describe('agent sessions', () => {
  it('captures sessions for AI agents with steps and provenance', async () => {
    const sessions = await listSessions();
    expect(sessions.length).toBeGreaterThan(0);
    const s = sessions[0];
    expect(s.steps.length).toBeGreaterThan(0);
    expect(s.provenance.model).toBeTruthy();
    expect(s.anomalyCount).toBe(s.steps.filter((st) => st.anomaly).length);
  });

  it('marks a session reviewed', async () => {
    const sessions = await listSessions();
    const target = sessions.find((s) => s.status === 'open') ?? sessions[0];
    const updated = await markSessionReviewed(target.id);
    expect(updated.status).toBe('reviewed');
  });

  it('quarantines a session', async () => {
    const sessions = await listSessions();
    const target = sessions[sessions.length - 1];
    const updated = await quarantineSession(target.id);
    expect(updated.status).toBe('quarantined');
  });
});
