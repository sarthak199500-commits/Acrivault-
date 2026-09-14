import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MonitorScreen } from './MonitorScreen';
import type { AlertWithIdentity } from '@/mocks/api';
import type { MonitoringBaseline, NhiType, RiskBand } from '@/mocks/types';

/**
 * The identity-type filter. Monitor already marks every row with its identity's type
 * glyph, so the dimension is visible; these pin down that it is also actionable, and
 * that adding it did not loosen the two promises the feed already made — "All" really
 * clears, and the baseline strip's link lands on exactly the count it advertised.
 */

let alertNo = 0;
function alert(
  identityType: NhiType,
  severity: RiskBand,
  baseline: 'learning' | 'established' = 'established',
): AlertWithIdentity {
  const n = alertNo++;
  return {
    id: `alr_${n}`,
    identityId: `nhi_${n}`,
    identityName: `identity-${n}`,
    identityType,
    severity,
    title: `Anomaly ${n}`,
    description: 'detail',
    recommendedNextStep: 'next',
    baseline,
    status: 'open',
    createdAt: new Date().toISOString(),
  };
}

// 3 agents, 2 keys, 1 service account. The lone learning alert sits on an agent, so a
// service-account filter and the baseline link genuinely disagree — that is case 6.
const AGENT_HIGH = alert('ai-agent', 'high');
const AGENT_CRITICAL = alert('ai-agent', 'critical');
const AGENT_LEARNING = alert('ai-agent', 'high', 'learning');
const KEY_HIGH = alert('api-key', 'high');
// Exactly ONE policy-raised alert, on purpose: two from the same rule would collapse
// behind a roll-up and drop a row out of the DOM, quietly changing every count the
// identity-type tests above assert.
const KEY_MEDIUM: AlertWithIdentity = {
  ...alert('api-key', 'medium'),
  raisedBy: { policyId: 'pol_0004', policyName: 'Alert on top-risk identities' },
};
const SVC_HIGH = alert('service-account', 'high');

const ALERTS = [AGENT_HIGH, AGENT_CRITICAL, AGENT_LEARNING, KEY_HIGH, KEY_MEDIUM, SVC_HIGH];

const BASELINE: MonitoringBaseline = {
  state: 'learning',
  learning: 1,
  monitored: 6,
  windowDays: 14,
};

vi.mock('@/mocks/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/mocks/api')>()),
  listAlerts: () => Promise.resolve(ALERTS),
  getMonitoringBaseline: () => Promise.resolve(BASELINE),
}));

let search = '';
function TrackSearch() {
  search = useLocation().search;
  return null;
}

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/monitor']}>
        <MonitorScreen />
        <TrackSearch />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Names of the identities currently rendered in the feed. */
function feed() {
  return ALERTS.map((a) => a.identityName).filter((n) => screen.queryByText(n) !== null);
}

async function pickType(user: ReturnType<typeof userEvent.setup>, ...labels: string[]) {
  await user.click(await screen.findByRole('button', { name: /identity type/i }));
  for (const label of labels) {
    await user.click(screen.getByRole('checkbox', { name: label }));
  }
  await user.keyboard('{Escape}');
}

describe('Monitor identity-type filter', () => {
  it('narrows the feed to the selected identity type', async () => {
    const user = userEvent.setup();
    renderScreen();
    expect(await screen.findByText(SVC_HIGH.identityName)).toBeInTheDocument();

    await pickType(user, 'AI Agent');

    expect(feed()).toEqual([
      AGENT_HIGH.identityName,
      AGENT_CRITICAL.identityName,
      AGENT_LEARNING.identityName,
    ]);
  });

  it('keeps both kinds when two types are selected', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText(SVC_HIGH.identityName);

    await pickType(user, 'AI Agent', 'API Key');

    expect(feed()).toHaveLength(5);
    expect(screen.queryByText(SVC_HIGH.identityName)).not.toBeInTheDocument();
  });

  // Monitor's filters are URL-backed so a triaging analyst can share what they are
  // looking at. `type` is reserved: FRS 3.7 asks for anomaly type as feed data, and
  // when that lands it — not identity type — should own the obvious key.
  it('records the selection in the URL without claiming the `type` key', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText(SVC_HIGH.identityName);

    await pickType(user, 'AI Agent');

    const params = new URLSearchParams(search);
    expect(params.get('itype')).toBe('ai-agent');
    expect(params.has('type')).toBe(false);
  });

  it('clears the identity type when All is pressed', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText(SVC_HIGH.identityName);
    await pickType(user, 'AI Agent');
    expect(screen.queryByText(SVC_HIGH.identityName)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^All/ }));

    expect(feed()).toHaveLength(6);
  });

  // A menu option promising rows that the active severity has already excluded is a
  // dead end — the click lands on an empty feed.
  it('counts each type within the active severity, not the whole feed', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText(SVC_HIGH.identityName);

    await user.click(screen.getByRole('button', { name: /^Critical/ }));
    await user.click(await screen.findByRole('button', { name: /identity type/i }));

    const row = (label: string) =>
      screen.getByRole('checkbox', { name: label }).closest('label') as HTMLElement;
    expect(row('AI Agent')).toHaveTextContent('1');
    expect(row('API Key')).toHaveTextContent('0');
  });

  // Every filter writes the same URL. Cleared one at a time from a single render's
  // snapshot of it, the last write wins and the earlier ones silently come back.
  it('clears severity, learning and type together when All is pressed', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText(SVC_HIGH.identityName);
    await user.click(screen.getByRole('button', { name: /show 1 alert/i }));
    await user.click(screen.getByRole('button', { name: /^High/ }));
    await pickType(user, 'AI Agent');

    await user.click(screen.getByRole('button', { name: /^All/ }));

    expect(new URLSearchParams(search).toString()).toBe('');
    expect(feed()).toHaveLength(6);
  });

  // The strip's link states a count. Intersecting it with a type filter could land on
  // fewer rows than promised — or none — so it clears the same way severity does.
  it('drops an identity-type filter when the baseline link is followed', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText(SVC_HIGH.identityName);
    await pickType(user, 'Service Account');

    await user.click(screen.getByRole('button', { name: /show 1 alert/i }));

    expect(feed()).toEqual([AGENT_LEARNING.identityName]);
  });
});

/**
 * The alert-source filter, added alongside the identity type. A fourth dimension on the
 * same URL and the same pill row is where the feed's two standing promises break
 * quietly: "All" has to clear a key it was never written for, and the baseline strip's
 * link has to drop a dimension that did not exist when it was written.
 */
describe('Monitor alert-source filter', () => {
  it('narrows the feed to alerts a rule raised', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText(SVC_HIGH.identityName);

    await user.click(screen.getByRole('button', { name: /^From a policy/ }));

    expect(feed()).toEqual([KEY_MEDIUM.identityName]);
    // All must stop claiming to be the active view the moment a source narrows it.
    expect(screen.getByRole('button', { name: /^All/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('narrows to everything the baseline raised, defined as the absence of a rule', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText(SVC_HIGH.identityName);

    await user.click(screen.getByRole('button', { name: /^Behavioral/ }));

    expect(feed()).not.toContain(KEY_MEDIUM.identityName);
    expect(feed()).toHaveLength(5);
  });

  it('counts both sources over the whole feed, so the pair always sums to All', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText(SVC_HIGH.identityName);

    await user.click(screen.getByRole('button', { name: /^Critical/ }));

    expect(screen.getByRole('button', { name: /^From a policy/ })).toHaveTextContent('1');
    expect(screen.getByRole('button', { name: /^Behavioral/ })).toHaveTextContent('5');
  });

  // The promise "All really clears" now spans four keys, not three.
  it('clears the source filter when All is pressed', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText(SVC_HIGH.identityName);
    await user.click(screen.getByRole('button', { name: /^From a policy/ }));
    await pickType(user, 'API Key');
    expect(feed()).toEqual([KEY_MEDIUM.identityName]);

    await user.click(screen.getByRole('button', { name: /^All/ }));

    expect(new URLSearchParams(search).toString()).toBe('');
    expect(feed()).toHaveLength(6);
  });

  // Same reason severity and type are dropped: the strip advertises a count, and
  // intersecting it with a source could land on fewer rows than promised, or none.
  it('drops a source filter when the baseline link is followed', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText(SVC_HIGH.identityName);
    await user.click(screen.getByRole('button', { name: /^From a policy/ }));

    await user.click(screen.getByRole('button', { name: /show 1 alert/i }));

    expect(feed()).toEqual([AGENT_LEARNING.identityName]);
  });

  // The type menu counts against what the other dimensions have already narrowed to.
  // Source joins that scope, or the menu offers options that land on nothing.
  it('counts each type within the active source', async () => {
    const user = userEvent.setup();
    renderScreen();
    await screen.findByText(SVC_HIGH.identityName);

    await user.click(screen.getByRole('button', { name: /^From a policy/ }));
    await user.click(await screen.findByRole('button', { name: /identity type/i }));

    const row = (label: string) =>
      screen.getByRole('checkbox', { name: label }).closest('label') as HTMLElement;
    expect(row('API Key')).toHaveTextContent('1');
    expect(row('AI Agent')).toHaveTextContent('0');
  });
});
