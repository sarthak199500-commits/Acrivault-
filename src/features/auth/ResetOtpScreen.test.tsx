import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResetOtpScreen } from './ResetOtpScreen';
import { ResetPasswordScreen } from './ResetPasswordScreen';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useFlowStore } from '@/stores/flow';

const navigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigate,
}));

const verifyPasswordOtp = vi.fn();
const resendPasswordOtp = vi.fn();

// Spread the real module so unrelated exports (MockApiError, which errorInfo
// instance-checks against) keep working; only the calls this screen makes are stubbed.
vi.mock('@/mocks/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/mocks/api')>()),
  verifyPasswordOtp: (code: string) => verifyPasswordOtp(code),
  resendPasswordOtp: () => resendPasswordOtp(),
}));

function renderOtp() {
  return render(
    <MemoryRouter>
      <ResetOtpScreen />
    </MemoryRouter>,
  );
}

const digits = () => screen.getAllByRole('textbox');

/**
 * Fill the code. Pasting rather than typing: each box is maxLength=1, so
 * user.type() into the first one would drop every character after the first.
 * CodeInput's paste handler distributes the digits and fires onComplete — the same
 * path a user takes copying a code out of their mail client.
 */
async function enterCode(user: ReturnType<typeof userEvent.setup>, code: string) {
  await user.click(digits()[0]);
  await user.paste(code);
}

beforeEach(() => {
  navigate.mockReset();
  verifyPasswordOtp.mockReset().mockResolvedValue({ ok: true });
  resendPasswordOtp.mockReset().mockResolvedValue({ ok: true });
  useFlowStore.getState().reset();
  useFlowStore.getState().setResetEmail('sarthak@acrivault.com');
});

describe('ResetOtpScreen', () => {
  it('stays neutral about whether the account exists', () => {
    renderOtp();
    expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
  });

  it('advances to the new-password screen once the code is confirmed', async () => {
    const user = userEvent.setup();
    renderOtp();
    // Typing the sixth digit submits — the code screen has no separate confirm step.
    await enterCode(user, '123456');

    await waitFor(() => expect(verifyPasswordOtp).toHaveBeenCalledWith('123456'));
    expect(useFlowStore.getState().resetOtpVerified).toBe(true);
    expect(navigate).toHaveBeenCalledWith('/reset-password');
  });

  it('clears the boxes on a wrong code without granting access', async () => {
    const user = userEvent.setup();
    const { MockApiError } = await import('@/mocks/api');
    verifyPasswordOtp.mockRejectedValueOnce(
      new MockApiError('Invalid recovery code. Please try again.', 'INVALID_CODE'),
    );
    renderOtp();
    await enterCode(user, '000000');

    expect(await screen.findByText(/invalid recovery code/i)).toBeInTheDocument();
    // Cleared for a retype, and the reset screen stays out of reach.
    expect(digits().every((d) => (d as HTMLInputElement).value === '')).toBe(true);
    expect(useFlowStore.getState().resetOtpVerified).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('auto-resends when the code has expired', async () => {
    const user = userEvent.setup();
    const { MockApiError } = await import('@/mocks/api');
    verifyPasswordOtp.mockRejectedValueOnce(
      new MockApiError('This code has expired. A new code has been sent.', 'CODE_EXPIRED'),
    );
    renderOtp();
    await enterCode(user, '123456');

    expect(await screen.findByText(/this code has expired/i)).toBeInTheDocument();
    await waitFor(() => expect(resendPasswordOtp).toHaveBeenCalled());
  });
});

describe('ResetOtpScreen — guards', () => {
  it('restarts recovery on a direct hit with no email captured', async () => {
    useFlowStore.getState().reset();
    renderOtp();
    // Navigate renders nothing here, so the absence of the heading is the assertion.
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: /enter your recovery code/i }),
      ).not.toBeInTheDocument(),
    );
  });
});

describe('ResetPasswordScreen — entry points', () => {
  /** The tokenless route; useParams yields no token under a bare MemoryRouter. */
  function renderTokenless() {
    return render(
      // TooltipProvider: PasswordFields puts the policy checklist in a tooltip, and
      // Radix throws without a provider. The app mounts one in Providers.
      <TooltipProvider>
        <MemoryRouter>
          <ResetPasswordScreen />
        </MemoryRouter>
      </TooltipProvider>,
    );
  }

  it('is reachable without a token once the recovery code is confirmed', async () => {
    useFlowStore.getState().setResetOtpVerified(true);
    renderTokenless();
    expect(await screen.findByLabelText(/new password/i)).toBeInTheDocument();
  });

  it('is unreachable without either a token or a confirmed code', async () => {
    useFlowStore.getState().reset();
    renderTokenless();
    await waitFor(() => expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument());
  });

});
