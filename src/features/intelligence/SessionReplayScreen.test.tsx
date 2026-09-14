import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionReplayScreen } from './SessionReplayScreen';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useUiStore } from '@/stores/ui';
import type { AgentSessionWithIdentity } from '@/mocks/api';

vi.mock('@/mocks/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/mocks/api')>();
  return { ...actual, getSession: vi.fn(), getIdentity: vi.fn() };
});

const { getIdentity, getSession } = await import('@/mocks/api');

/**
 * Five steps, one enforced hold and one anomaly. Built here rather than drawn from
 * the fixtures because the generator reshuffles which session id carries which
 * shape whenever its rates change.
 */
export const SESSION: AgentSessionWithIdentity = {
  id: 'ses_test1',
  identityId: 'idn_test1',
  identityName: 'agent-test-00001',
  identityStatus: 'active',
  identityOwner: 'payments',
  flagged: true,
  startedAt: '2026-09-10T12:00:00.000Z',
  endedAt: '2026-09-10T12:04:00.000Z',
  anomalyCount: 1,
  blockedCount: 1,
  reviewState: 'open',
  provenance: {
    model: 'claude-sonnet-4-5',
    region: 'eu-west-1',
    spawnedBy: { kind: 'schedule', label: 'cron: hourly-reconcile' },
    credentials: ['aws:agent:111111'],
  },
  steps: [
    {
      id: 'stp_1',
      stepNo: 1,
      kind: 'prompt',
      at: '2026-09-10T12:00:00.000Z',
      summary: 'Scheduled trigger fired',
      detail: 'Captured payload (synthetic).',
      status: 'normal',
    },
    {
      id: 'stp_2',
      stepNo: 2,
      kind: 'tool-call',
      at: '2026-09-10T12:01:00.000Z',
      summary: 'delete_object(...)',
      detail: 'Invoked with scope admin; latency 120ms.',
      status: 'blocked',
      scope: 'admin',
      blockedByRule: 'POL-14 — deny destructive calls on production storage',
      holdEnforced: true,
    },
    {
      id: 'stp_3',
      stepNo: 3,
      kind: 'tool-call',
      at: '2026-09-10T12:02:00.000Z',
      summary: 'list_objects(bucket)',
      detail: 'Invoked with scope read; latency 40ms.',
      status: 'anomaly',
      scope: 'read',
      anomalyReason: 'Volume 40x the established baseline',
    },
    {
      id: 'stp_4',
      stepNo: 4,
      kind: 'model-response',
      at: '2026-09-10T12:03:00.000Z',
      summary: 'Summarized findings',
      detail: 'Captured payload (synthetic).',
      status: 'normal',
    },
    {
      id: 'stp_5',
      stepNo: 5,
      kind: 'model-response',
      at: '2026-09-10T12:04:00.000Z',
      summary: 'Returned final answer',
      detail: 'Captured payload (synthetic).',
      status: 'normal',
    },
  ],
};

/** The same session with its hold settled, for the cases that need a decided one. */
export const DECIDED: AgentSessionWithIdentity = {
  ...SESSION,
  steps: SESSION.steps.map((s) =>
    s.status === 'blocked'
      ? { ...s, blockDecision: { outcome: 'confirmed' as const, at: '2026-09-10T13:00:00.000Z' } }
      : s,
  ),
};

export function renderReplay(
  session: AgentSessionWithIdentity = SESSION,
  path = '/intelligence/ses_test1',
) {
  vi.mocked(getSession).mockResolvedValue(session);
  vi.mocked(getIdentity).mockResolvedValue(null);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/intelligence/:sessionId" element={<SessionReplayScreen />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe('SessionReplayScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ role: 'tenant-admin' });
  });

  it('opens on the first step, not on a flagged one', async () => {
    renderReplay();
    // The summary renders twice — once in the timeline, once in the detail pane.
    expect(await screen.findAllByText('Scheduled trigger fired')).not.toHaveLength(0);
    expect(await screen.findByText('Step 1 of 5')).toBeInTheDocument();
  });

  it('counts held steps separately from anomalies', async () => {
    renderReplay();
    expect(await screen.findByText('Held steps')).toBeInTheDocument();
    expect(await screen.findByText('2 flagged steps')).toBeInTheDocument();
  });
});

describe('SessionReplayScreen — closing a session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ role: 'tenant-admin' });
  });

  it('disables Mark reviewed while a hold is undecided', async () => {
    renderReplay();
    expect(await screen.findByRole('button', { name: /Mark reviewed/i })).toBeDisabled();
  });

  it('enables Mark reviewed once every hold is decided', async () => {
    renderReplay(DECIDED);
    expect(await screen.findByRole('button', { name: /Mark reviewed/i })).toBeEnabled();
  });
});

describe('SessionReplayScreen — step permalink', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ role: 'tenant-admin' });
  });

  it('opens on the step named in the URL', async () => {
    renderReplay(SESSION, '/intelligence/ses_test1?step=stp_3');
    expect(await screen.findByText('Step 3 of 5')).toBeInTheDocument();
    expect(await screen.findAllByText(/Volume 40x the established baseline/)).not.toHaveLength(0);
  });

  it('falls back to the first step when the URL names a step this session does not have', async () => {
    renderReplay(SESSION, '/intelligence/ses_test1?step=stp_nope');
    expect(await screen.findByText('Step 1 of 5')).toBeInTheDocument();
  });
});

describe('SessionReplayScreen — accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ role: 'tenant-admin' });
  });

  it('exposes the scrollable timeline to the keyboard', async () => {
    renderReplay();
    await screen.findAllByText('Scheduled trigger fired');
    expect(screen.getByRole('group', { name: 'Session steps, scrollable' })).toHaveAttribute(
      'tabindex',
      '0',
    );
  });

  it('keeps the full anomaly reason readable where the timeline truncates it', async () => {
    renderReplay();
    await screen.findAllByText('Scheduled trigger fired');
    expect(await screen.findAllByTitle('Volume 40x the established baseline')).not.toHaveLength(0);
  });
});

describe('SessionReplayScreen — review is one-way', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ role: 'tenant-admin' });
  });

  it('warns that marking reviewed cannot be undone', async () => {
    const user = userEvent.setup();
    renderReplay(DECIDED);
    await user.click(await screen.findByRole('button', { name: /Mark reviewed/i }));
    // No reopen exists anywhere, so the dialog has to say so rather than leave
    // the reader to discover it by mis-clicking.
    expect(await screen.findByText(/cannot be undone/i)).toBeInTheDocument();
  });
});
