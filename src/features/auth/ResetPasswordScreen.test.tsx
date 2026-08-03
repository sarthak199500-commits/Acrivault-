import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetPasswordScreen } from './ResetPasswordScreen';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useFlowStore } from '@/stores/flow';

// Deliberately NOT mocking useNavigate here: this file exercises where the router
// actually lands, which a navigate spy cannot observe — a <Navigate> redirect firing
// instead of the intended push looks identical to a spy.
const resetPassword = vi.fn();

// Spread the real module so unrelated exports (MockApiError, which errorInfo
// instance-checks against) keep working; only the calls this screen makes are stubbed.
vi.mock('@/mocks/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/mocks/api')>()),
  resetPassword: (token: string | undefined, password: string) => resetPassword(token, password),
}));

const STRONG = 'Recovered-Key7!';

/**
 * Render at `entry` with stub destinations, so the assertion is which screen the
 * user ends up on rather than which function was called.
 */
function renderAt(entry: string) {
  return render(
    // TooltipProvider: PasswordFields puts the policy checklist in a tooltip, and
    // Radix throws without a provider. The app mounts one in Providers.
    <TooltipProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordScreen />} />
          <Route path="/reset-password/:token" element={<ResetPasswordScreen />} />
          <Route path="/login" element={<h1>Sign in screen</h1>} />
          <Route path="/forgot-password" element={<h1>Forgot password screen</h1>} />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  );
}

async function submitNewPassword(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/new password/i), STRONG);
  await user.type(screen.getByLabelText(/confirm password/i), STRONG);
  await user.click(screen.getByRole('button', { name: /reset password/i }));
}

beforeEach(() => {
  resetPassword.mockReset().mockResolvedValue({ ok: true });
  useFlowStore.getState().reset();
});

describe('ResetPasswordScreen — OTP entry', () => {
  it('lands on sign-in after a reset, and still burns the flag that admitted it', async () => {
    const user = userEvent.setup();
    useFlowStore.getState().setResetOtpVerified(true);
    renderAt('/reset-password');
    await submitNewPassword(user);

    expect(await screen.findByRole('heading', { name: /sign in screen/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /forgot password screen/i })).not.toBeInTheDocument();
    // Burned, so the back button cannot re-enter the screen.
    expect(useFlowStore.getState().resetOtpVerified).toBe(false);

    // NOTE: this asserts the outcome but does NOT reproduce the ordering bug the
    // ref latch in ResetPasswordScreen exists to prevent (a Zustand-triggered
    // render arriving before a queued React state update, so the entry guard
    // redirected to /forgot-password before navigate() ran). userEvent wraps
    // interactions in act(), which batches that render away. It was reproduced and
    // fixed against the dev server; keep the latch even though this test is green
    // either way.
  });

  it('passes no token on the OTP path', async () => {
    const user = userEvent.setup();
    useFlowStore.getState().setResetOtpVerified(true);
    renderAt('/reset-password');
    await submitNewPassword(user);
    expect(resetPassword).toHaveBeenCalledWith(undefined, STRONG);
  });

  it('redirects to Forgot Password when nothing authorises the change', async () => {
    renderAt('/reset-password');
    expect(
      await screen.findByRole('heading', { name: /forgot password screen/i }),
    ).toBeInTheDocument();
  });
});

describe('ResetPasswordScreen — emailed-link entry', () => {
  it('admits a tokened link with no OTP verification and forwards the token', async () => {
    const user = userEvent.setup();
    renderAt('/reset-password/abc123');
    await submitNewPassword(user);

    expect(resetPassword).toHaveBeenCalledWith('abc123', STRONG);
    expect(await screen.findByRole('heading', { name: /sign in screen/i })).toBeInTheDocument();
  });

  it('keeps the expired-link state on screen instead of redirecting', async () => {
    const user = userEvent.setup();
    const { MockApiError } = await import('@/mocks/api');
    resetPassword.mockRejectedValueOnce(
      new MockApiError('This password reset link has expired. Please request a new one.', 'EXPIRED_TOKEN'),
    );
    renderAt('/reset-password/expired');
    await submitNewPassword(user);

    expect(await screen.findByText(/this password reset link has expired/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /sign in screen/i })).not.toBeInTheDocument();
  });
});

describe('ResetPasswordScreen — policy', () => {
  it('blocks submission until the shared policy passes', async () => {
    const user = userEvent.setup();
    useFlowStore.getState().setResetOtpVerified(true);
    renderAt('/reset-password');

    const submit = () => screen.getByRole('button', { name: /reset password/i });
    expect(submit()).toBeDisabled();

    // 14 chars but no symbol — the old length-only check would have allowed this.
    await user.type(await screen.findByLabelText(/new password/i), 'RecoveredKey77');
    await user.type(screen.getByLabelText(/confirm password/i), 'RecoveredKey77');
    expect(submit()).toBeDisabled();

    await waitFor(() => expect(resetPassword).not.toHaveBeenCalled());
  });
});
