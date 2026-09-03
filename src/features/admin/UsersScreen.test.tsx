import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersScreen } from './UsersScreen';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useUiStore } from '@/stores/ui';
import type { SamlConfig, ScimConfig, Tenant, User } from '@/mocks/types';

/**
 * First run is the state a brand-new tenant actually lands in, and it is NOT an
 * empty list: registration always leaves the Tenant Owner behind. These cases pin
 * that down, because an owner-only list previously fell through to the populated
 * table with nothing pointing at the Entra settings — a dead end.
 */

const OWNER: User = {
  id: 'usr_0',
  tenantId: 'tnt_1',
  name: 'Noor Haddad',
  email: 'noor.haddad@acme.com',
  role: 'tenant-owner',
  status: 'active',
  source: 'local',
  authMethod: 'password',
  addedAt: '2026-08-01T00:00:00.000Z',
};

const FROM_ENTRA: User = {
  ...OWNER,
  id: 'usr_8',
  name: 'Robin Park',
  email: 'robin.park@acme.com',
  role: null,
  source: 'entra',
  authMethod: 'sso',
};

const NOTHING_SAVED: SamlConfig = {
  entityId: null,
  ssoUrl: null,
  certificate: null,
  cert: null,
  savedAt: null,
  lastSignInAt: null,
};
const FEDERATED: SamlConfig = {
  ...NOTHING_SAVED,
  savedAt: '2026-08-20T00:00:00.000Z',
  lastSignInAt: new Date().toISOString(),
};
const NO_TOKEN: ScimConfig = { tokenIssuedAt: null, lastSyncAt: null, usersReceived: 0 };
const PROVISIONED: ScimConfig = {
  tokenIssuedAt: '2026-08-21T00:00:00.000Z',
  lastSyncAt: new Date().toISOString(),
  usersReceived: 0,
};

let users: User[] = [OWNER];
let tenant: Tenant;

function setTenant(saml: SamlConfig, scim: ScimConfig) {
  tenant = {
    id: 'tnt_1',
    name: 'Acme Corp',
    allowedDomains: ['acme.com'],
    status: 'active',
    sso: { provider: 'entra' },
    saml,
    scim,
    passwordFallback: true,
    createdAt: '2026-08-01T00:00:00.000Z',
  };
}

vi.mock('@/mocks/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/mocks/api')>()),
  listUsers: () => Promise.resolve(users),
  getTenant: () => Promise.resolve(tenant),
}));

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // TooltipProvider: the "Local" marker on a non-Entra account is a tooltip, and
  // Radix throws outside a provider (the app supplies one in app/providers).
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter>
          <UsersScreen />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  users = [OWNER];
  setTenant(NOTHING_SAVED, NO_TOKEN);
  const s = useUiStore.getState();
  s.setRole('tenant-admin');
  s.resetScenario();
});

describe('first run — nobody has arrived from Entra', () => {
  it('sends an owner-only tenant to connect Entra, and offers no sync', async () => {
    renderScreen();
    expect(await screen.findByText(/it’s just you so far/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /connect microsoft entra id/i })).toBeInTheDocument();
    // Nothing to sync with yet — offering the button would be a dead end.
    expect(screen.queryByRole('button', { name: /sync now/i })).not.toBeInTheDocument();
  });

  it('points at provisioning once sign-in works but no token has been issued', async () => {
    setTenant(FEDERATED, NO_TOKEN);
    renderScreen();
    expect(await screen.findByText(/it’s just you so far/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /finish entra setup/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sync now/i })).not.toBeInTheDocument();
  });

  it('offers a sync once Entra is connected but has sent nobody', async () => {
    setTenant(FEDERATED, PROVISIONED);
    renderScreen();
    expect(await screen.findByText(/it’s just you so far/i)).toBeInTheDocument();
    expect(await screen.findByText(/hasn’t sent anyone/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /sync now/i }).length).toBeGreaterThan(0);
  });

  // The owner row is real data; a first-run message must not hide it.
  it('still shows the accounts that do exist', async () => {
    renderScreen();
    expect(await screen.findByText('Noor Haddad')).toBeInTheDocument();
    expect(screen.getByText(/^Local$/)).toBeInTheDocument();
  });
});

describe('once Entra has provisioned someone', () => {
  it('drops the first-run message and surfaces the role triage instead', async () => {
    users = [OWNER, FROM_ENTRA];
    setTenant(FEDERATED, PROVISIONED);
    renderScreen();
    expect(await screen.findByText(/doesn’t have a role yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/it’s just you so far/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nobody has arrived from entra yet/i)).not.toBeInTheDocument();
  });
});

describe('finding the Entra settings screen', () => {
  it('always offers a way there, not only during first run', async () => {
    users = [OWNER, FROM_ENTRA];
    setTenant(FEDERATED, PROVISIONED);
    renderScreen();
    expect(await screen.findByRole('link', { name: /entra settings/i })).toBeInTheDocument();
  });

  // An expired certificate locks out every Entra account, and this is the screen
  // the admin arrives at asking why nobody can get in.
  it('says so loudly when the certificate has expired', async () => {
    const expired: SamlConfig = {
      ...FEDERATED,
      cert: { subject: 'CN=Test', thumbprint: 'x', expiresAt: '2020-01-01T00:00:00.000Z' },
    };
    users = [OWNER, FROM_ENTRA];
    setTenant(expired, PROVISIONED);
    renderScreen();
    expect(await screen.findByText(/nobody from entra can sign in/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /fix sign-in/i })).toBeInTheDocument();
  });

  it('stays quiet while the certificate is healthy', async () => {
    users = [OWNER, FROM_ENTRA];
    setTenant(FEDERATED, PROVISIONED);
    renderScreen();
    await screen.findByText('Noor Haddad');
    expect(screen.queryByText(/nobody from entra can sign in/i)).not.toBeInTheDocument();
  });
});

/**
 * Two conditions that look interchangeable and are not: whether the reader can
 * change a user, and whether the row menu is worth drawing. Every mutating
 * capability here is Tenant Admin and above, so gating the menu on them hid the
 * audit trail from the Auditor — the one role whose whole job is reading
 * evidence. These cases exist to stop a future refactor collapsing them back
 * into one predicate.
 */
describe('reaching a user’s audit trail', () => {
  async function openMenuFor(name: string) {
    users = [OWNER, FROM_ENTRA];
    setTenant(FEDERATED, PROVISIONED);
    renderScreen();
    await screen.findByText(name);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(`actions for ${name}`, 'i') }));
    return screen.findAllByRole('menuitem');
  }

  it('gives a read-only role a menu holding the trail and nothing it cannot use', async () => {
    useUiStore.getState().setRole('viewer');
    const items = await openMenuFor('Noor Haddad');
    expect(items.map((i) => i.textContent?.trim())).toEqual(['View audit trail']);
  });

  it('does not withhold the trail from a role that cannot act on the target', async () => {
    // canActOnUser is false for a viewer against everyone, and that is precisely
    // when someone needs to read the record rather than change it.
    useUiStore.getState().setRole('viewer');
    const [item] = await openMenuFor('Noor Haddad');
    expect(item).not.toHaveAttribute('data-disabled');
  });

  it('keeps every administrative item for a Tenant Admin', async () => {
    useUiStore.getState().setRole('tenant-admin');
    const items = await openMenuFor('Robin Park');
    const labels = items.map((i) => i.textContent?.trim());
    expect(labels).toContain('View audit trail');
    expect(labels).toContain('Edit');
    expect(labels).toContain('Suspend');
    expect(labels).toContain('Delete');
    // Robin arrived from Entra with no role, so triage comes first.
    expect(labels).toContain('Assign a role');
  });

  // The banner claims "you cannot modify users", which is about capability. The
  // menu now renders for every role, so the two must not share a predicate.
  it('still shows the read-only banner to the role that has the menu', async () => {
    useUiStore.getState().setRole('viewer');
    users = [OWNER, FROM_ENTRA];
    setTenant(FEDERATED, PROVISIONED);
    renderScreen();
    await screen.findByText('Noor Haddad');
    expect(screen.getByRole('note')).toHaveTextContent(
      'Read-only. Your role (Auditor) cannot modify users. Contact a Tenant Admin.',
    );
    expect(screen.getByRole('button', { name: /actions for noor haddad/i })).toBeInTheDocument();
  });

  it('shows no banner to a Tenant Admin', async () => {
    useUiStore.getState().setRole('tenant-admin');
    users = [OWNER, FROM_ENTRA];
    setTenant(FEDERATED, PROVISIONED);
    renderScreen();
    await screen.findByText('Noor Haddad');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
