import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
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
 * table with nothing pointing at single sign-on — a dead end.
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
  it('sends an owner-only tenant to single sign-on, and offers no sync', async () => {
    renderScreen();
    expect(await screen.findByText(/it’s just you so far/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /set up single sign-on/i })).toBeInTheDocument();
    // Nothing to sync with yet — offering the button would be a dead end.
    expect(screen.queryByRole('button', { name: /sync now/i })).not.toBeInTheDocument();
  });

  it('points at provisioning once sign-in works but no token has been issued', async () => {
    setTenant(FEDERATED, NO_TOKEN);
    renderScreen();
    expect(await screen.findByText(/it’s just you so far/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /finish provisioning/i })).toBeInTheDocument();
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
