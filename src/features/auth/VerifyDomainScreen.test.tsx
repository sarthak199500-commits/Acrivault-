import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VerifyDomainScreen } from './VerifyDomainScreen';
import { useFlowStore } from '@/stores/flow';

const navigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

const verifyDomain = vi.fn();

// Spread the real module so unrelated exports (MockApiError, which errorInfo
// instance-checks against) keep working; only the calls this screen makes are stubbed.
vi.mock('@/mocks/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/mocks/api')>()),
  getDomainChallenge: (domain: string) =>
    Promise.resolve({
      domain,
      recordType: 'TXT' as const,
      name: '@',
      value: 'acrivault-verify=fcce307f26614ec68b209b88b4799304',
    }),
  verifyDomain: (domain: string) => verifyDomain(domain),
}));

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <VerifyDomainScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const verifyButton = () => screen.getByRole('button', { name: /verify domain & continue/i });

beforeEach(() => {
  navigate.mockReset();
  verifyDomain.mockReset().mockResolvedValue({ domain: 'acrivault.com' });
  // Arrive as the email step leaves the user: email captured, code confirmed.
  useFlowStore.getState().reset();
  useFlowStore.getState().setRegisterEmail('sarthak@acrivault.com');
  useFlowStore.getState().setRegisterVerified(true);
});

describe('VerifyDomainScreen', () => {
  it('shows the TXT record the organization must publish', async () => {
    renderScreen();
    // Header cells, so the value is readable as Type / Name / Data.
    expect(await screen.findByRole('columnheader', { name: 'Type' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Data' })).toBeInTheDocument();

    expect(screen.getByRole('cell', { name: 'TXT' })).toBeInTheDocument();
    expect(
      screen.getByText('acrivault-verify=fcce307f26614ec68b209b88b4799304'),
    ).toBeInTheDocument();
  });

  it('names the domain being verified, not the full email', async () => {
    renderScreen();
    expect(await screen.findByRole('heading', { name: /verify your domain/i })).toBeInTheDocument();
    expect(screen.getAllByText('acrivault.com').length).toBeGreaterThan(0);
  });

  it('advances to Terms and records verification on success', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(await waitFor(verifyButton));

    expect(verifyDomain).toHaveBeenCalledWith('acrivault.com');
    expect(await screen.findByRole('heading', { name: /domain verified/i })).toBeInTheDocument();
    expect(useFlowStore.getState().domainVerified).toBe(true);
    // The verified card holds ~1.8s before advancing, so this outlasts waitFor's
    // 1s default rather than racing it.
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/register/terms'), {
      timeout: 3000,
    });
  });

  it('blocks on a missing TXT record, explaining propagation, and allows a retry', async () => {
    const user = userEvent.setup();
    verifyDomain.mockRejectedValueOnce(
      new Error(
        'TXT record not found on the domain yet. DNS changes can take up to an hour to propagate — try again shortly.',
      ),
    );
    renderScreen();
    await user.click(await waitFor(verifyButton));

    expect(await screen.findByText(/txt record not found on the domain yet/i)).toBeInTheDocument();
    // Blocking: no advance, and the flag stays false so Terms redirects back here.
    expect(navigate).not.toHaveBeenCalled();
    expect(useFlowStore.getState().domainVerified).toBe(false);

    // The record stays on screen so a retry needs no re-navigation.
    await user.click(verifyButton());
    await waitFor(() => expect(useFlowStore.getState().domainVerified).toBe(true));
  });
});

describe('VerifyDomainScreen — guards', () => {
  it('sends a direct hit without a captured email back to the start', async () => {
    useFlowStore.getState().reset();
    renderScreen();
    // Navigate renders nothing here, so the absence of the heading is the assertion.
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /verify your domain/i })).not.toBeInTheDocument(),
    );
  });

  it('sends an unverified email back to the code step', async () => {
    useFlowStore.getState().setRegisterVerified(false);
    renderScreen();
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /verify your domain/i })).not.toBeInTheDocument(),
    );
  });
});
