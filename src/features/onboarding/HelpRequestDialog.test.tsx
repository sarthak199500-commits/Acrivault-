import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingScreen } from './OnboardingScreen';
import { useUiStore } from '@/stores/ui';
import { useAuthStore, CURRENT_USER_ID } from '@/stores/auth';
import { getDataset } from '@/mocks/dataset';

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => vi.fn(),
}));

beforeEach(() => {
  useUiStore.getState().setRole('tenant-admin');
  useAuthStore.getState().signIn(CURRENT_USER_ID);
});

function setup() {
  const user = userEvent.setup();
  render(<OnboardingScreen />);
  return user;
}

async function openHelp(user: ReturnType<typeof setup>) {
  await user.click(screen.getByRole('button', { name: /need help/i }));
  return within(screen.getByRole('dialog'));
}

const signedInEmail = () => {
  const user = getDataset().users.find((u) => u.id === CURRENT_USER_ID);
  if (!user) throw new Error(`Seeded dataset has no ${CURRENT_USER_ID} to prefill from`);
  return user.email;
};

describe('reaching the form', () => {
  it('is offered from the connect step', async () => {
    setup();
    expect(screen.getByRole('button', { name: /need help/i })).toBeInTheDocument();
  });

  it('is still offered to someone who is not allowed to connect', async () => {
    // The one screen that has just refused them is the worst place to hide help.
    useUiStore.getState().setRole('analyst');
    setup();
    expect(screen.getByText(/onboarding is available to administrators/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /need help/i })).toBeInTheDocument();
  });
});

describe('the form', () => {
  it('prefills the signed-in address rather than asking for it again', async () => {
    const user = setup();
    const dialog = await openHelp(user);
    expect(dialog.getByLabelText(/^email$/i)).toHaveValue(signedInEmail());
  });

  it('marks mobile optional and says why it is asked', async () => {
    const user = setup();
    const dialog = await openHelp(user);
    expect(dialog.getByLabelText(/mobile \(optional\)/i)).toBeInTheDocument();
    expect(dialog.getByText(/only if you would rather we call/i)).toBeInTheDocument();
  });

  it('offers no way to attach setup details, so nothing is sent unasked', async () => {
    const user = setup();
    const dialog = await openHelp(user);
    expect(dialog.queryByRole('button', { name: /see the list/i })).not.toBeInTheDocument();
    expect(dialog.queryByLabelText(/setup details/i)).not.toBeInTheDocument();
  });

  it('blocks an empty submit and says what each field needs', async () => {
    const user = setup();
    const dialog = await openHelp(user);
    await user.clear(dialog.getByLabelText(/^email$/i));
    await user.click(dialog.getByRole('button', { name: /send request/i }));

    expect(dialog.getByText(/we need an address to reply to/i)).toBeInTheDocument();
    expect(dialog.getByText(/a few words about the problem/i)).toBeInTheDocument();
    expect(dialog.getByText(/describe what went wrong/i)).toBeInTheDocument();
  });

  it('does not reject an address just because it looks unusual', async () => {
    const user = setup();
    const dialog = await openHelp(user);
    const email = dialog.getByLabelText(/^email$/i);
    await user.clear(email);
    await user.type(email, 'a+b@sub.domain.co.uk');
    await user.type(dialog.getByLabelText(/subject/i), 'Stack rolls back');
    await user.type(dialog.getByLabelText(/description/i), 'CloudFormation reports AccessDenied.');
    await user.click(dialog.getByRole('button', { name: /send request/i }));

    expect(screen.getByText('Request sent')).toBeInTheDocument();
  });
});

describe('after sending', () => {
  async function send(user: ReturnType<typeof setup>) {
    const dialog = await openHelp(user);
    await user.type(dialog.getByLabelText(/subject/i), 'Azure script fails');
    await user.type(dialog.getByLabelText(/description/i), 'It will not run in Cloud Shell.');
    await user.click(dialog.getByRole('button', { name: /send request/i }));
  }

  it('confirms where it went and what went with it', async () => {
    const user = setup();
    await send(user);

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Request sent')).toBeInTheDocument();
    expect(dialog.getByText('Reference')).toBeInTheDocument();
    expect(dialog.getByText(signedInEmail())).toBeInTheDocument();
    // No screenshots in this flow and setup details are gone, so the honest
    // summary is that nothing was attached — not a blank row.
    expect(dialog.getByText('Nothing')).toBeInTheDocument();
  });

  it('says the setup is not blocked while they wait', async () => {
    const user = setup();
    await send(user);
    expect(screen.getByText(/nothing is blocked/i)).toBeInTheDocument();
  });

  it('starts clean when reopened, rather than resurrecting a sent request', async () => {
    const user = setup();
    await send(user);
    await user.click(screen.getByRole('button', { name: 'Close' }));

    const dialog = await openHelp(user);
    expect(dialog.getByLabelText(/subject/i)).toHaveValue('');
    expect(dialog.queryByText('Request sent')).not.toBeInTheDocument();
  });
});
