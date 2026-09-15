import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApprovalsScreen } from './ApprovalsScreen';
import { TooltipProvider } from '@/components/ui/Tooltip';
import type { ApprovalWithContext } from '@/mocks/api';
import { useUiStore } from '@/stores/ui';

const PENDING: ApprovalWithContext = {
  id: 'apr_0001',
  identityId: 'idn_000002',
  identityName: 'svc-billing-sync-prod',
  identityType: 'service-account',
  requestedBy: 'usr_2',
  requesterName: 'Kai Mensah',
  requesterRole: 'Analyst',
  requestedAt: '2026-09-15T09:00:00.000Z',
  reason: 'No accountable owner. Risk 84.',
  status: 'pending',
};

const DECLINED: ApprovalWithContext = {
  ...PENDING,
  id: 'apr_0002',
  identityName: 'svc-legacy-etl-runner',
  requestedAt: '2026-09-15T08:00:00.000Z',
  status: 'declined',
  decided: {
    by: 'usr_1',
    at: '2026-09-15T08:30:00.000Z',
    note: 'Owner found in the CMDB; handover in flight.',
  },
  deciderName: 'Priya Raman',
  deciderRole: 'Security Admin',
};

/**
 * Role-aware on purpose. The real `listApprovals` hides other people's decided
 * requests from anyone without `session.quarantine`; that rule is tested against
 * the real dataset in mocks/approvals.test.ts. What this double exists to expose
 * is the SCREEN's half of it — whether the queue refetches when the acting role
 * changes, or goes on rendering rows fetched under the previous one. It reads
 * the real permission matrix rather than hardcoding which roles qualify, so it
 * cannot drift from the rule it stands in for.
 */
vi.mock('@/mocks/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/mocks/api')>()),
  listApprovals: async () => {
    const { useUiStore: store } = await import('@/stores/ui');
    const { can } = await import('@/lib/permissions');
    return can(store.getState().role, 'session.quarantine') ? [PENDING, DECLINED] : [PENDING];
  },
}));

function renderScreen(path = '/act/approvals') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[path]}>
          <ApprovalsScreen />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => useUiStore.getState().setRole('security-admin'));

describe('Act > Approvals', () => {
  /**
   * The badge used to read `query.data.length`, which was the pending count only
   * because the query only ever fetched pending. Now that the set holds every
   * request, that expression would call one declined row "1 pending" the moment
   * a reader switched view.
   */
  it('counts only pending requests in the header, whatever the view shows', async () => {
    renderScreen('/act/approvals?status=declined');
    expect(await screen.findByText('1 pending')).toBeInTheDocument();
    expect(screen.getByText('svc-legacy-etl-runner')).toBeInTheDocument();
    expect(screen.queryByText('svc-billing-sync-prod')).not.toBeInTheDocument();
  });

  it('shows who declined a request and why', async () => {
    renderScreen('/act/approvals?status=declined');
    expect(await screen.findByText(/Declined by Priya Raman/)).toBeInTheDocument();
    expect(screen.getByText(/handover in flight/)).toBeInTheDocument();
  });

  it('offers no decide buttons on a request that is already decided', async () => {
    renderScreen('/act/approvals?status=declined');
    const row = (await screen.findByText('svc-legacy-etl-runner')).closest('li');
    if (!row) throw new Error('expected the declined row');
    expect(within(row).queryByRole('button', { name: /decline/i })).not.toBeInTheDocument();
  });

  /**
   * Regression, found by driving the real screen rather than by any test here.
   * `listApprovals` became actor-dependent, but nothing invalidates React Query
   * when the dev Role Switcher changes role — it only writes to the ui store.
   * An admin could load the queue, switch to Analyst, and go on reading decided
   * rows out of the cache that the Analyst is not entitled to see.
   */
  it('refetches when the viewing role changes rather than serving the old role’s rows', async () => {
    renderScreen('/act/approvals?status=all');
    expect(await screen.findByText('svc-legacy-etl-runner')).toBeInTheDocument();

    act(() => useUiStore.getState().setRole('analyst'));

    // Both assertions inside one waitFor: the declined row disappears the moment
    // the refetch starts and the boundary swaps in its skeleton, so waiting only
    // on its absence passes during the loading state — before the re-scoped rows
    // have actually arrived, which is the thing worth proving.
    await waitFor(() => {
      expect(screen.queryByText('svc-legacy-etl-runner')).not.toBeInTheDocument();
      // Pending is unaffected: it is the shared queue, and a proposer is
      // promised sight of what is waiting.
      expect(screen.getByText('svc-billing-sync-prod')).toBeInTheDocument();
    });
  });

  it('will not let a decline through without a reason', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Decline' }));

    // Scoped to the dialog deliberately: the row's own Decline button is still
    // in the document, so an unscoped query by that name is ambiguous.
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Decline' });
    const field = within(dialog).getByLabelText(/why are you declining/i);
    expect(submit).toBeDisabled();

    // Whitespace is not a reason.
    await user.type(field, '   ');
    expect(submit).toBeDisabled();

    await user.type(field, 'Owner is accountable.');
    expect(submit).toBeEnabled();
  });
});
