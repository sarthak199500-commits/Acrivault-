import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingScreen } from './OnboardingScreen';
import { useUiStore } from '@/stores/ui';

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => vi.fn(),
}));

beforeEach(() => {
  useUiStore.getState().setRole('tenant-admin');
  // shouldAdvanceTime keeps real time moving under the fake clock: Radix's pointer
  // and scroll-lock internals await timers that userEvent drives, and a fully frozen
  // clock deadlocks the very first click.
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  // Discard pending handoffs rather than running them: firing a timer during
  // teardown updates an unmounting tree outside act() for no test value.
  vi.clearAllTimers();
  vi.useRealTimers();
});

function setup() {
  const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms), delay: null });
  render(<OnboardingScreen />);
  return user;
}

/** Lets the simulated console handoff report back. */
async function letHandoffFinish() {
  await act(() => vi.advanceTimersByTimeAsync(4000));
}

/** Opens a cloud's connect dialog and fills its identifier with a valid value. */
async function startConnecting(user: ReturnType<typeof setup>, name: RegExp, id: string, value: string) {
  await user.click(screen.getByRole('button', { name }));
  await user.type(screen.getByLabelText(new RegExp(id, 'i')), value);
  await user.click(screen.getByRole('button', { name: 'Connect' }));
}

describe('connect form', () => {
  it('blocks submit on a malformed identifier and says what is wrong', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /^connect aws$/i }));
    await user.type(screen.getByLabelText(/account number/i), '12345678901');
    await user.click(screen.getByRole('button', { name: 'Connect' }));

    expect(screen.getByRole('alert')).toHaveTextContent(/12 digits — that one has 11/);
    // Still on the form: a rejected submit must not advance the flow.
    expect(screen.queryByText(/finish in your aws console/i)).not.toBeInTheDocument();
  });

  it('submits on Enter, not only by clicking the footer button', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /^connect aws$/i }));
    await user.type(screen.getByLabelText(/account number/i), '123456789012{Enter}');

    // The visible Connect button lives outside the form, in the dialog footer.
    expect(screen.getByText(/finish in your aws console/i)).toBeInTheDocument();
  });

  it('clears the error as soon as the field is edited', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: /^connect aws$/i }));
    const field = screen.getByLabelText(/account number/i);
    await user.type(field, '12345678901');
    await user.click(screen.getByRole('button', { name: 'Connect' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.type(field, '2');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('console handoff', () => {
  it('names where you are going rather than repeating the provider', async () => {
    const user = setup();
    await startConnecting(user, /^connect aws$/i, 'account number', '123456789012');
    expect(screen.getByText(/finish in your aws console/i)).toBeInTheDocument();
  });

  it('keeps the connection running after the dialog is closed', async () => {
    const user = setup();
    await startConnecting(user, /^connect aws$/i, 'account number', '123456789012');

    // The dialog promises "closing this is safe" — so closing must not cancel it.
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByText(/finish in your aws console/i)).not.toBeInTheDocument();

    await letHandoffFinish();
    expect(screen.getByRole('button', { name: /view aws connection details/i })).toBeInTheDocument();
  });

  it('cancelling the connection does abandon it', async () => {
    const user = setup();
    await startConnecting(user, /^connect aws$/i, 'account number', '123456789012');
    await user.click(screen.getByRole('button', { name: /cancel connection/i }));

    await letHandoffFinish();
    expect(screen.getByRole('button', { name: /^connect aws$/i })).toBeInTheDocument();
  });

  it('answers "check now" honestly while the console is still working', async () => {
    const user = setup();
    await startConnecting(user, /^connect aws$/i, 'account number', '123456789012');
    await user.click(screen.getByRole('button', { name: /check now/i }));

    // Scoped to the dialog: announce() also writes the same words to the live region.
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText(/not finished yet/i)).toBeInTheDocument();
    expect(dialog.getByText(/finish in your aws console/i)).toBeInTheDocument();
  });

  it('shows setup-time values, not values that only exist after connecting', async () => {
    const user = setup();
    await startConnecting(user, /^connect aws$/i, 'account number', '123456789012');

    const dialog = within(screen.getByRole('dialog'));
    // The IAM role the template creates and its trust-policy external ID.
    expect(dialog.getByText(/^arn:aws:iam::123456789012:role\//)).toBeInTheDocument();
    expect(dialog.getByText(/^External ID$/)).toBeInTheDocument();
    // An assumed-role ARN is the *result* of a successful AssumeRole, so it cannot
    // honestly appear before the stack that creates the role exists.
    expect(dialog.queryByText(/arn:aws:sts::/)).not.toBeInTheDocument();
  });

  it('states the real line count before asking anyone to run a script', async () => {
    const user = setup();
    await startConnecting(user, /^connect google cloud$/i, 'project id', 'extreme-pixel-504520-v5');
    // The number is derived from the script itself, so it cannot drift from reality.
    expect(screen.getByRole('button', { name: /read all \d+ lines before you run it/i })).toBeInTheDocument();
  });
});

describe('connected details', () => {
  async function connect(user: ReturnType<typeof setup>, name: RegExp, id: string, value: string) {
    await startConnecting(user, name, id, value);
    await letHandoffFinish();
  }

  it('separates the destructive action from the dismiss cluster', async () => {
    const user = setup();
    await connect(user, /^connect aws$/i, 'account number', '123456789012');

    const dialog = screen.getByRole('dialog');
    const buttons = within(dialog).getAllByRole('button').map((b) => b.textContent?.trim());
    // Disconnect sits at the far end of the footer, never adjacent to Close.
    expect(buttons).toContain('Disconnect');
    expect(buttons).toContain('Close');
    expect(buttons).not.toContain('Done');
  });

  it('surfaces the Azure Graph consent gap, and only for Azure', async () => {
    const user = setup();
    await connect(user, /^connect azure$/i, 'subscription id', 'fb38e96b-7c7e-4a63-8b81-9c5bdb7c7be4');

    expect(screen.getByText(/directory identities are not being discovered/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /grant permission/i })).toBeInTheDocument();
  });

  it('does not offer a Graph grant on AWS', async () => {
    const user = setup();
    await connect(user, /^connect aws$/i, 'account number', '123456789012');
    expect(screen.queryByRole('button', { name: /grant permission/i })).not.toBeInTheDocument();
  });

  it('asks the question in the title so the button need not say "Yes,"', async () => {
    const user = setup();
    await connect(user, /^connect aws$/i, 'account number', '123456789012');
    await user.click(screen.getByRole('button', { name: 'Disconnect' }));

    expect(screen.getByText('Disconnect AWS?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /yes, disconnect/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument();
  });

  it('warns that refresh stops, not that something is destroyed', async () => {
    const user = setup();
    await connect(user, /^connect aws$/i, 'account number', '123456789012');
    await user.click(screen.getByRole('button', { name: 'Disconnect' }));

    expect(screen.getByText(/discovery stops on this account/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing is changed inside aws/i)).toBeInTheDocument();
  });

  it('returns the card to disconnected once confirmed', async () => {
    const user = setup();
    await connect(user, /^connect aws$/i, 'account number', '123456789012');
    await user.click(screen.getByRole('button', { name: 'Disconnect' }));
    await user.click(screen.getByRole('button', { name: 'Disconnect' }));

    expect(screen.getByRole('button', { name: /^connect aws$/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('makes the details section look and behave like something you can open', async () => {
    const user = setup();
    await connect(user, /^connect aws$/i, 'account number', '123456789012');

    // A <summary> with the native marker suppressed reads as a disabled field. This
    // is a real button that reports its own state, and the config stays hidden until
    // it is opened — health leads, detail follows.
    const trigger = screen.getByRole('button', { name: /connection details/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/arn:aws:sts::/)).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/arn:aws:sts::/)).toBeInTheDocument();
  });

  it('does not claim a count before the first scan has run', async () => {
    const user = setup();
    await connect(user, /^connect aws$/i, 'account number', '123456789012');
    expect(screen.getByText(/after the first scan/i)).toBeInTheDocument();
  });
});
