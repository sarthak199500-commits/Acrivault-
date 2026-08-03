import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreatePasswordScreen } from './CreatePasswordScreen';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useFlowStore } from '@/stores/flow';

const navigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

const createPassword = vi.fn();

// Spread the real module so unrelated exports (MockApiError, which errorInfo
// instance-checks against) keep working; only the calls this screen makes are stubbed.
vi.mock('@/mocks/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/mocks/api')>()),
  createPassword: (email: string, password: string) => createPassword(email, password),
}));

const STRONG = 'Vault-Keeper9!';

function renderScreen() {
  return render(
    // TooltipProvider: PasswordFields puts the policy checklist in a tooltip, and
    // Radix throws without a provider. The app mounts one in Providers.
    <TooltipProvider>
      <MemoryRouter>
        <CreatePasswordScreen />
      </MemoryRouter>
    </TooltipProvider>,
  );
}

const submitButton = () => screen.getByRole('button', { name: /save password & continue/i });

beforeEach(() => {
  navigate.mockReset();
  createPassword.mockReset().mockResolvedValue({ ok: true });
  // Arrive as MFA setup leaves the owner: registered, provisioned, first run.
  useFlowStore.getState().reset();
  useFlowStore.getState().setRegisterEmail('sarthak@acrivault.com');
  useFlowStore.getState().setFirstRun(true);
});

describe('CreatePasswordScreen', () => {
  it('is the fifth and final registration step', () => {
    renderScreen();
    expect(screen.getByText(/step/i)).toHaveTextContent(/step\s*5\s*of\s*5/i);
  });

  it('keeps submit disabled until the policy passes and the confirmation matches', async () => {
    const user = userEvent.setup();
    renderScreen();
    expect(submitButton()).toBeDisabled();

    await user.type(screen.getByLabelText(/create password/i), STRONG);
    // Policy satisfied, but nothing to confirm against yet.
    expect(submitButton()).toBeDisabled();

    await user.type(screen.getByLabelText(/confirm password/i), 'Vault-Keeper9');
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();

    await user.type(screen.getByLabelText(/confirm password/i), '!');
    await waitFor(() => expect(submitButton()).toBeEnabled());
  });

  it('rejects a matching pair that fails the policy', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByLabelText(/create password/i), 'shortpass');
    await user.type(screen.getByLabelText(/confirm password/i), 'shortpass');
    expect(submitButton()).toBeDisabled();
  });

  it('hands off to MFA enrollment and records the password', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.type(screen.getByLabelText(/create password/i), STRONG);
    await user.type(screen.getByLabelText(/confirm password/i), STRONG);
    await user.click(submitButton());

    expect(createPassword).toHaveBeenCalledWith('sarthak@acrivault.com', STRONG);
    // Password first, then the second factor — the same order as AcceptInviteScreen.
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/mfa/setup'));
    expect(useFlowStore.getState().passwordSet).toBe(true);
    // firstRun must survive until MFA completes, or the guard there would bounce back.
    expect(useFlowStore.getState().firstRun).toBe(true);
  });

  it('surfaces a server-side policy rejection against the field', async () => {
    const user = userEvent.setup();
    // From the real module — errorInfo instance-checks against this exact class.
    const { MockApiError } = await import('@/mocks/api');
    createPassword.mockRejectedValueOnce(
      new MockApiError('Password must include symbol.', 'WEAK_PASSWORD'),
    );
    renderScreen();
    await user.type(screen.getByLabelText(/create password/i), STRONG);
    await user.type(screen.getByLabelText(/confirm password/i), STRONG);
    await user.click(submitButton());

    expect(await screen.findByText(/password must include symbol/i)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('CreatePasswordScreen — guards', () => {
  it('turns away anyone who did not just register', async () => {
    useFlowStore.getState().reset();
    renderScreen();
    // Navigate renders nothing here, so the absence of the form is the assertion.
    await waitFor(() =>
      expect(screen.queryByLabelText(/create password/i)).not.toBeInTheDocument(),
    );
  });
});
