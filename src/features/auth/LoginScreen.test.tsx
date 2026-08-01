import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginScreen } from './LoginScreen';
import { useUiStore } from '@/stores/ui';

const navigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

const login = vi.fn();
const ssoReturn = vi.fn();

// Spread the real module so unrelated exports (MockApiError, which errorInfo
// instance-checks against) keep working; only the calls this screen makes are stubbed.
vi.mock('@/mocks/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/mocks/api')>()),
  getTenant: () => Promise.resolve({ sso: { provider: 'entra', configured: true } }),
  login: (email: string, password: string) => login(email, password),
  ssoStart: () => Promise.resolve(),
  ssoReturn: () => ssoReturn(),
}));

/** Render with the providers the screen reads from, forcing one sign-in fork. */
function renderLogin(signIn: 'sso' | 'password') {
  useUiStore.getState().setSignIn(signIn);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <LoginScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const passwordSwitch = () => screen.getByRole('button', { name: /sign in with password instead/i });

beforeEach(() => {
  navigate.mockReset();
  login.mockReset().mockResolvedValue({ user: {} });
  ssoReturn.mockReset().mockResolvedValue(undefined);
  useUiStore.getState().resetScenario();
});

describe('LoginScreen — SSO tenant', () => {
  it('leads with SSO and offers password as a second option', async () => {
    renderLogin('sso');
    expect(await screen.findByRole('button', { name: /microsoft entra id/i })).toBeInTheDocument();
    expect(passwordSwitch()).toBeInTheDocument();
    // The form itself stays collapsed until the option is chosen.
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
  });

  it('reveals the password form when the option is chosen, and can switch back', async () => {
    const user = userEvent.setup();
    renderLogin('sso');
    await user.click(await screen.findByRole('button', { name: /sign in with password instead/i }));

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /forgot password/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    );

    await user.click(screen.getByRole('button', { name: /use single sign-on instead/i }));
    expect(screen.getByRole('button', { name: /microsoft entra id/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
  });

  it('routes a password sign-in through the MFA challenge', async () => {
    const user = userEvent.setup();
    renderLogin('sso');
    await user.click(await screen.findByRole('button', { name: /sign in with password instead/i }));

    await user.type(screen.getByLabelText(/email/i), 'alex.kim@acme.com');
    await user.type(screen.getByLabelText(/^password$/i), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: /sign in with password/i }));

    expect(login).toHaveBeenCalledWith('alex.kim@acme.com', 'correct-horse-battery');
    expect(navigate).toHaveBeenCalledWith('/mfa/challenge');
  });

  it('drops a stale SSO error when switching to the password form', async () => {
    const user = userEvent.setup();
    renderLogin('sso');
    // Surface an error on the SSO fork, then switch away from it.
    ssoReturn.mockRejectedValueOnce(new Error('IdP unreachable'));
    await user.click(await screen.findByRole('button', { name: /microsoft entra id/i }));
    expect(await screen.findByText(/idp unreachable/i)).toBeInTheDocument();

    await user.click(passwordSwitch());
    expect(screen.queryByText(/idp unreachable/i)).not.toBeInTheDocument();
  });
});

describe('LoginScreen — tenant without an IdP', () => {
  it('shows the password form alone, with nothing to switch to', async () => {
    renderLogin('password');
    expect(await screen.findByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /single sign-on instead/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /password instead/i })).not.toBeInTheDocument();
  });
});
