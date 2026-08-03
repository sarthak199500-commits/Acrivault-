import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MfaSetupScreen } from './MfaSetupScreen';
import { useFlowStore } from '@/stores/flow';
import { useAuthStore } from '@/stores/auth';

// Deliberately NOT mocking useNavigate: these assertions are about where the router
// lands, which a navigate spy cannot distinguish from a <Navigate> redirect.

// Spread the real module so unrelated exports keep working; only the calls this
// screen makes are stubbed.
vi.mock('@/mocks/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/mocks/api')>()),
  mfaEnroll: () =>
    Promise.resolve({
      secret: 'OSZKS6X7DPQWRPEI',
      otpauthLabel: 'Acrivault:sarthak@acrivault.com',
      qrSvg: '<svg></svg>',
    }),
}));

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/mfa/setup']}>
        <Routes>
          <Route path="/mfa/setup" element={<MfaSetupScreen />} />
          <Route path="/register/password" element={<h1>Create password screen</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useFlowStore.getState().reset();
  useAuthStore.getState().signOut();
});

describe('MfaSetupScreen — password-before-MFA ordering', () => {
  it('sends a registering owner back for a password before enrolling a second factor', async () => {
    useFlowStore.getState().setRegisterEmail('sarthak@acrivault.com');
    useFlowStore.getState().setFirstRun(true);
    // passwordSet stays false — the owner jumped here without the password step.
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: /create password screen/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /set up authentication/i })).not.toBeInTheDocument();
  });

  it('admits a registering owner once the password exists', async () => {
    useFlowStore.getState().setRegisterEmail('sarthak@acrivault.com');
    useFlowStore.getState().setFirstRun(true);
    useFlowStore.getState().setPasswordSet(true);
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: /set up authentication/i }),
    ).toBeInTheDocument();
  });

  it('admits an invited user, who set their password on the invite screen', async () => {
    // firstRun false: joining an existing tenant, so passwordSet is never set here.
    renderScreen();

    expect(
      await screen.findByRole('heading', { name: /set up authentication/i }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /create password screen/i })).not.toBeInTheDocument(),
    );
  });

  it('shows the registration stepper only inside a first run', async () => {
    useFlowStore.getState().setRegisterEmail('sarthak@acrivault.com');
    useFlowStore.getState().setFirstRun(true);
    useFlowStore.getState().setPasswordSet(true);
    renderScreen();

    // Closes out the Secure step alongside Create Password, so both read 5 of 5.
    expect(await screen.findByText(/step/i)).toHaveTextContent(/step\s*5\s*of\s*5/i);
  });

  it('hides the stepper for an invited user, who is not in the registration flow', async () => {
    renderScreen();
    await screen.findByRole('heading', { name: /set up authentication/i });
    expect(screen.queryByText(/step\s*\d\s*of\s*\d/i)).not.toBeInTheDocument();
  });
});
