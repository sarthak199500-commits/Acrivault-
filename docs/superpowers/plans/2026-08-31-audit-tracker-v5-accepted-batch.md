# Audit Tracker v5 — Accepted Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the twelve Accepted-and-unbuilt points the client selected from Acrivault Audit Tracker v5 — 3, 4, 5, 7, 14, 26, 34, 38, 41, 42, 44, 51 — in the Wave 1 console.

**Architecture:** Three groups. (a) A canonical screen taxonomy declared once in `src/app/nav.ts` and derived everywhere, which every new screen in this batch then registers through. (b) Three new destinations — Platform › Sources, Act › Quarantine, Act › Approvals — each with a mock-API slice, seeded fixtures, and a route. (c) Targeted upgrades to existing surfaces: a real client-side CSV writer, audit-log object/date filters, session-policy settings, an info affordance on KPI tiles, a cross-cloud inventory flag, and table stickiness. Mock data stays the single seeded source of truth; nothing here introduces a backend.

**Tech Stack:** React 18, TypeScript, Vite, React Router 6, TanStack Query + Virtual, Radix UI, Tailwind v4 with CSS-variable tokens, Zustand, Vitest + Testing Library.

---

## Scope

Twelve points, in dependency order of the tasks below.

| Point | Title | Task |
|---|---|---|
| 3 | Breadcrumb taxonomy conflict | 1 |
| 4 | No source / connector health surface | 2, 3 |
| 5 | Quarantined status has no Act provenance | 4 |
| 7 | Human-in-the-loop has no UI expression | 5 |
| 26 | Cross-cloud correlation is buried | 6 |
| 14 | Privilege drift has no definition | 7 |
| 34 | Read-only banner should name reason and remedy | 8 |
| 41 | Nothing in the UI produces audit evidence | 9 |
| 42 | Add Platform > Audit Log | 10 |
| 38 | No audit trail for user administration | 11 |
| 44 | Session and access controls need UI | 12 |
| 51 | Table refinements | 13 |

**Explicitly not in this plan:** points 25, 30, 36, 37, 45, 46, 54 (previewed, not selected); 43 and 50 (Blocked); 16's Coverage KPI tile (Build = Done — task 2 makes the data available for it, but the tile is not added here).

## Assumptions carried into the build

Each is stated in the code at the point it applies, and each needs sign-off before the demo. None is silently resolved.

1. **Audit retention = 12 months, then cold archive** (task 10). Chosen to be defensible for the October SOC 2 Type I date. It is a policy decision with cost and legal consequences. If it is not signed off, ship the sentence without the figure — the copy is one constant.
2. **Privilege-drift methodology wording** (task 7) is written to the shape of FRS §6 and marked as displaying an upstream-derived value. The UI must never compute drift.
3. **Approvals cover the gated actions only** (task 5) — recommend-quarantine and rotation requests. The audit's "every state-changing action requires approval" is not what the FRS says; widening it is an Architect decision, and the queue's empty state says so.
4. **Per-role MFA policy renders read-only** (task 12) because it presupposes a permission matrix that is still open. Idle timeout, absolute session limit and step-up re-auth are editable.
5. **Correction to the previous preview:** the Auditor role *does* exist — `viewer` is labelled `Read-only / Auditor` in `src/lib/permissions.ts`, short label `Auditor`. Task 8 therefore uses the client's exact wording. The earlier flag saying otherwise was wrong.
6. **Seeded source health stays green by default** (task 2). A degraded Azure connector would make every count on every screen look wrong in a demo, so the failure is reachable from the Scenario Switcher instead.

## File structure

**New files**

| File | Responsibility |
|---|---|
| `src/app/nav.test.ts` | Enforces the taxonomy rule across every route. |
| `src/lib/csv.ts` | RFC 4180 field escaping, provenance manifest, object-URL download. |
| `src/lib/csv.test.ts` | Unit tests for the above. |
| `src/features/platform/SourcesScreen.tsx` | Platform › Sources — per-source health, last sync, error detail. |
| `src/features/platform/CoverageChip.tsx` | Persistent top-bar source-coverage indicator. |
| `src/features/act/QuarantineScreen.tsx` | Act › Quarantine — quarantined identities with provenance. |
| `src/features/act/ApprovalsScreen.tsx` | Act › Approvals — pending human-in-the-loop queue. |
| `src/features/act/queries.ts` | Query/mutation hooks for both Act screens. |
| `src/features/platform/SessionAccessCard.tsx` | Settings › Sessions & access. |
| `src/mocks/act.test.ts` | Mock-API tests for quarantine + approvals. |
| `src/mocks/audit.test.ts` | Mock-API tests for the audit filter set. |
| `src/mocks/sources.test.ts` | Mock-API tests for source health. |

**Modified files**

| File | Change |
|---|---|
| `src/app/nav.ts` | Taxonomy model, resolver, three new nav entries. |
| `src/app/AppShell.tsx` | Title from taxonomy; coverage chip in the top bar. |
| `src/app/AuthLayout.tsx` | Reads `AUTH_TITLES` instead of `EXTRA_TITLES`. |
| `src/app/router.tsx` | Three new routes. |
| `src/components/ui/CommandPalette.tsx` | Labels from the taxonomy. |
| `src/components/ui/ScreenHeader.tsx` | Optional `badge` slot for state chips. |
| `src/components/ui/KpiTile.tsx` | `info` popover affordance. |
| `src/components/ui/RoleRestricted.tsx` | Reason + remedy wording. |
| `src/mocks/types.ts` | Source health, quarantine provenance, approvals, audit object/action unions, session policy. |
| `src/mocks/generators.ts` | Fixtures for all of the above. |
| `src/mocks/dataset.ts` | Wire the new fixtures into the dataset. |
| `src/mocks/api.ts` | Source health, quarantine, approvals, audit filtering, session policy, audit object classification. |
| `src/mocks/scenarios.ts` | `sources: 'healthy' \| 'degraded'`. |
| `src/app/ScenarioSwitcher.tsx` | Control for the above. |
| `src/features/platform/queries.ts` | Source health, audit filter, session policy hooks. |
| `src/features/platform/AuditScreen.tsx` | Object + date filters, retention line, real export. |
| `src/features/platform/SettingsScreen.tsx` | Sessions & access card, Sources link. |
| `src/features/discover/InventoryScreen.tsx` | Cross-cloud flag pill, drift info, real export. |
| `src/features/discover/InventoryFilters.tsx` | Cross-cloud pill. |
| `src/features/discover/useInventoryFilters.ts` | `crossCloudOnly` URL state. |
| `src/features/discover/IdentityTable.tsx` | Sticky identity column, hover lift, cross-cloud badge. |
| `src/features/discover/IdentityDetailPanel.tsx` | Recommend-quarantine writes an approval request. |
| `src/features/admin/UsersScreen.tsx` | Banner wording, View audit trail row action. |
| 18 screen files | Header props from the taxonomy. |

---

### Task 1: Canonical screen taxonomy (point 3)

Every eyebrow is hand-typed in its screen file today, so three names can describe one screen. This task makes the eyebrow and the h1 derived from a single declaration, and adds a test that fails if a future screen breaks the rule.

**The rule.** An index screen's eyebrow is `Layer · Pillar`, with the pillar dropped when the screen *is* the pillar. Its h1 is the canonical screen name. The rail label is either that name or a declared short form of it. A detail screen's eyebrow is `Layer · <parent screen name>` and its h1 names the record.

**Files:**
- Modify: `src/app/nav.ts`
- Create: `src/app/nav.test.ts`
- Modify: `src/app/AppShell.tsx:20-30`
- Modify: `src/app/AuthLayout.tsx:9-17`
- Modify: `src/components/ui/CommandPalette.tsx:7,21-23`
- Modify: `src/components/ui/ScreenHeader.tsx`
- Modify: 18 screen files (listed in step 8)

- [ ] **Step 1: Write the failing test**

Create `src/app/nav.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ALL_NAV_ITEMS, NAV, detailEyebrow, screenHeaderProps, screenIdentity } from './nav';

describe('canonical screen taxonomy', () => {
  it('gives every rail destination a title and an eyebrow', () => {
    for (const item of ALL_NAV_ITEMS) {
      const id = screenIdentity(item.to);
      expect(id.title, item.to).toBeTruthy();
      expect(id.eyebrow, item.to).toBeTruthy();
    }
  });

  it('never repeats a screen title inside its own eyebrow', () => {
    for (const item of ALL_NAV_ITEMS) {
      const { title, eyebrow } = screenIdentity(item.to);
      expect(eyebrow.split(' · '), item.to).not.toContain(title);
    }
  });

  it('starts every eyebrow with the layer the rail groups it under', () => {
    for (const group of NAV) {
      for (const item of group.items) {
        expect(screenIdentity(item.to).eyebrow.startsWith(group.layer), item.to).toBe(true);
      }
    }
  });

  it('requires a declared canonical title whenever the rail label is a short form', () => {
    for (const item of ALL_NAV_ITEMS) {
      if (item.label === screenIdentity(item.to).title) continue;
      expect(item.title, `${item.to} shortens its label, so it must declare title`).toBeTruthy();
    }
  });

  it('drops the pillar when the screen is its own pillar', () => {
    expect(screenIdentity('/monitor').eyebrow).toBe('Know');
    expect(screenIdentity('/rotate').eyebrow).toBe('Act');
  });

  it('keeps the pillar when it names a module the screen sits inside', () => {
    expect(screenIdentity('/discover').eyebrow).toBe('See · Discover');
    expect(screenIdentity('/intelligence').eyebrow).toBe('Know · Intelligence');
  });

  it('resolves a child route to its parent screen', () => {
    expect(screenIdentity('/discover/idn_000001').title).toBe('Identity Inventory');
  });

  it('gives a detail screen the layer plus its parent screen name', () => {
    expect(detailEyebrow('/intelligence')).toBe('Know · Agent Sessions');
    expect(detailEyebrow('/rotate')).toBe('Act · Rotate');
  });

  it('spreads straight onto ScreenHeader', () => {
    expect(screenHeaderProps('/')).toEqual({ eyebrow: 'See', title: 'Dashboard' });
    expect(screenHeaderProps('/settings/users')).toEqual({ eyebrow: 'Platform', title: 'Manage Users' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/nav.test.ts`
Expected: FAIL — `screenIdentity is not a function` (no such export yet).

- [ ] **Step 3: Extend the nav model**

In `src/app/nav.ts`, replace the `NavItem` interface with:

```ts
export interface NavItem {
  to: string;
  /**
   * Rail label. May be a shortened form of the canonical name where the rail
   * cannot hold it; when it is, `title` carries the canonical name.
   */
  label: string;
  /** Canonical screen name — the h1 and the document title. Defaults to `label`. */
  title?: string;
  /**
   * The module-spec name this screen sits inside (an FRS pillar). Omitted when
   * the screen *is* the pillar, which is what drops it from the eyebrow.
   */
  pillar?: string;
  icon: LucideIcon;
  concept?: boolean;
  end?: boolean;
}
```

- [ ] **Step 4: Declare the canonical names on every rail item**

Replace the `NAV` array in `src/app/nav.ts` with:

```ts
export const NAV: NavGroup[] = [
  {
    layer: 'See',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/discover', label: 'Identity Inventory', pillar: 'Discover', icon: Boxes },
    ],
  },
  {
    layer: 'Know',
    items: [
      // Rail label follows the h1: the screen is Policies, the pillar is Govern.
      { to: '/govern', label: 'Policies', pillar: 'Govern', icon: ListChecks },
      { to: '/monitor', label: 'Monitor', pillar: 'Monitor', icon: Activity },
      { to: '/intelligence', label: 'Agent Sessions', pillar: 'Intelligence', icon: Sparkles },
      { to: '/resilience/blast-radius', label: 'Blast Radius', pillar: 'Resilience', icon: GitBranch },
      // Shortened rail labels; `title` carries the canonical name.
      { to: '/resilience/rehearsals', label: 'Rehearsals', title: 'Recovery Rehearsals', pillar: 'Resilience', icon: ShieldHalf, concept: true },
      { to: '/resilience/copilot', label: 'Copilot', title: 'Defender Copilot', pillar: 'Resilience', icon: Workflow, concept: true },
    ],
  },
  {
    layer: 'Act',
    items: [{ to: '/rotate', label: 'Rotate', pillar: 'Rotate', icon: RefreshCw }],
  },
  {
    layer: 'Platform',
    items: [
      { to: '/settings/users', label: 'Users', title: 'Manage Users', icon: Users },
      { to: '/settings', label: 'Settings', icon: Settings, end: true },
      { to: '/audit', label: 'Audit Log', icon: ScrollText },
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/design-system', label: 'Design System', icon: BookOpen },
    ],
  },
];
```

- [ ] **Step 5: Add the resolver**

In `src/app/nav.ts`, delete the `EXTRA_TITLES` export and append below `ALL_NAV_ITEMS`:

```ts
export interface ScreenIdentity {
  layer: string;
  pillar?: string;
  /** Canonical screen name — the h1 and the document title. */
  title: string;
  /** `Layer · Pillar`, with the pillar dropped when the screen is its own pillar. */
  eyebrow: string;
}

/**
 * In-shell screens that are not rail destinations. Same shape as a NavItem's
 * identity, so one rule covers them too and no screen file types its own eyebrow.
 */
const EXTRA_SCREENS: Record<string, { layer: string; pillar?: string; title: string }> = {
  // Deliberately outside the four layers: onboarding is a one-time setup flow,
  // not a place in the product.
  '/onboarding': { layer: 'Get started', title: 'Onboarding & Connect' },
  '/settings/sso': { layer: 'Platform', pillar: 'Settings', title: 'Sign-in & SSO' },
  '/govern/builder': { layer: 'Know', pillar: 'Govern', title: 'Policy Builder' },
};

function identityOf(v: { layer: string; pillar?: string; title: string }): ScreenIdentity {
  return { ...v, eyebrow: v.pillar && v.pillar !== v.title ? `${v.layer} · ${v.pillar}` : v.layer };
}

const SCREEN_INDEX: Record<string, ScreenIdentity> = {
  ...Object.fromEntries(Object.entries(EXTRA_SCREENS).map(([to, v]) => [to, identityOf(v)])),
  ...Object.fromEntries(
    ALL_NAV_ITEMS.map((i) => [
      i.to,
      identityOf({ layer: i.layer, pillar: i.pillar, title: i.title ?? i.label }),
    ]),
  ),
};

const FALLBACK: ScreenIdentity = { layer: 'Acrivault', title: 'Acrivault', eyebrow: 'Acrivault' };

/** The canonical identity of the screen at `pathname`, resolving children to their parent. */
export function screenIdentity(pathname: string): ScreenIdentity {
  const exact = SCREEN_INDEX[pathname];
  if (exact) return exact;
  const prefix = Object.keys(SCREEN_INDEX)
    .filter((to) => to !== '/' && pathname.startsWith(to))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? SCREEN_INDEX[prefix] : FALLBACK;
}

/** Eyebrow + title to spread onto ScreenHeader for an index screen. */
export function screenHeaderProps(route: string): { eyebrow: string; title: string } {
  const { eyebrow, title } = screenIdentity(route);
  return { eyebrow, title };
}

/**
 * Eyebrow for a detail screen: the layer plus the parent screen's name. A detail
 * h1 names the record, so the pillar is dropped to keep the trail two deep.
 */
export function detailEyebrow(parentRoute: string): string {
  const parent = screenIdentity(parentRoute);
  return `${parent.layer} · ${parent.title}`;
}

/**
 * Document titles for the public registration and authentication routes, which
 * live outside the app shell and so have no place in the layer taxonomy.
 */
export const AUTH_TITLES: Record<string, string> = {
  '/register': 'Request Access',
  '/register/verify': 'Verify Email',
  '/register/domain': 'Verify Domain',
  '/register/terms': 'Legal Terms',
  '/register/complete': 'Welcome to Acrivault',
  '/register/password': 'Create your password',
  '/login': 'Sign in',
  '/accept-invite': 'Accept Invitation',
  '/mfa/setup': 'Set up authentication',
  '/mfa/challenge': 'Verify it’s you',
  '/forgot-password': 'Reset your password',
  // Explicit: the prefix fallback would otherwise title this "Reset your password".
  '/forgot-password/verify': 'Enter your recovery code',
  '/reset-password': 'Set a new password',
};
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/app/nav.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 7: Point the three consumers at the taxonomy**

In `src/app/AppShell.tsx`, change line 5 to `import { NAV, screenIdentity } from './nav';` and replace `titleForPath` (lines 20-30) with:

```tsx
function titleForPath(pathname: string): string {
  return screenIdentity(pathname).title;
}
```

In `src/app/AuthLayout.tsx`, change line 9 to `import { AUTH_TITLES } from './nav';` and replace every `EXTRA_TITLES` reference on lines 12-17 with `AUTH_TITLES`.

In `src/components/ui/CommandPalette.tsx`, change line 7 to `import { ALL_NAV_ITEMS, screenIdentity } from '@/app/nav';` and line 23 from `label: EXTRA_TITLES[i.to] ?? i.label,` to `label: screenIdentity(i.to).title,`.

- [ ] **Step 8: Derive every screen header**

Add a badge slot to `src/components/ui/ScreenHeader.tsx`: add `badge?: ReactNode;` to the props type, add `badge` to the destructured parameters, and wrap the h1:

```tsx
        <div className="flex flex-wrap items-center gap-2">
          <h1
            id="main-heading"
            tabIndex={-1}
            className="text-[length:var(--fs-display)] font-semibold leading-[var(--lh-display)] tracking-tight text-text outline-none"
          >
            {title}
          </h1>
          {badge}
        </div>
```

Then replace the hand-typed `eyebrow`/`title` pair in each screen with a spread, importing `screenHeaderProps` (or `detailEyebrow`) from `@/app/nav`:

| File | Replace with |
|---|---|
| `src/features/dashboard/DashboardScreen.tsx:394` | `{...screenHeaderProps('/')}` |
| `src/features/discover/InventoryScreen.tsx:213` | `{...screenHeaderProps('/discover')}` |
| `src/features/govern/PolicyListScreen.tsx:286` | `{...screenHeaderProps('/govern')}` |
| `src/features/govern/PolicyBuilderScreen.tsx:286` | `{...screenHeaderProps('/govern/builder')}` |
| `src/features/govern/PolicyBuilderScreen.tsx:307` | `{...screenHeaderProps('/govern/builder')}` plus the badge below |
| `src/features/monitor/MonitorScreen.tsx:144` | `{...screenHeaderProps('/monitor')}` |
| `src/features/intelligence/SessionListScreen.tsx:113` | `{...screenHeaderProps('/intelligence')}` |
| `src/features/intelligence/SessionReplayScreen.tsx:262` | `eyebrow={detailEyebrow('/intelligence')}`, keep the dynamic `title` |
| `src/features/resilience/BlastRadiusScreen.tsx:127` | `{...screenHeaderProps('/resilience/blast-radius')}` |
| `src/features/resilience/RehearsalsScreen.tsx:33` | `{...screenHeaderProps('/resilience/rehearsals')}` |
| `src/features/resilience/CopilotScreen.tsx:60` | `{...screenHeaderProps('/resilience/copilot')}` |
| `src/features/rotate/RotateScreen.tsx:122` | `{...screenHeaderProps('/rotate')}` |
| `src/features/rotate/RotationJobDetail.tsx:107` | `eyebrow={detailEyebrow('/rotate')}`, keep the dynamic `title` |
| `src/features/admin/UsersScreen.tsx:328` | `{...screenHeaderProps('/settings/users')}` |
| `src/features/platform/AuditScreen.tsx:43` | `{...screenHeaderProps('/audit')}` |
| `src/features/platform/DesignSystemScreen.tsx:30` | `{...screenHeaderProps('/design-system')}` |
| `src/features/platform/NotificationsScreen.tsx:63` | `{...screenHeaderProps('/notifications')}` |
| `src/features/platform/SettingsScreen.tsx:87` | `{...screenHeaderProps('/settings')}` |
| `src/features/platform/SsoScreen.tsx:38` | `{...screenHeaderProps('/settings/sso')}` |
| `src/features/onboarding/OnboardingScreen.tsx:306,335` | `{...screenHeaderProps('/onboarding')}` |

The Policy Builder's lifecycle state moves out of the eyebrow — where it was masquerading as a location — into the badge, matching how the rail marks Concept screens. At `src/features/govern/PolicyBuilderScreen.tsx:307` add:

```tsx
        badge={
          <Badge tone={isArchived ? 'neutral' : 'info'}>
            {isArchived ? 'Archived' : isEditing ? 'Editing' : 'New'}
          </Badge>
        }
```

Add `import { Badge } from '@/components/ui/Badge';` to that file if it is not already imported.

- [ ] **Step 9: Verify types and the full suite**

Run: `npm run typecheck && npx vitest run`
Expected: typecheck clean; every suite passes. A failure here is a screen file still importing `EXTRA_TITLES`.

- [ ] **Step 10: Commit**

```bash
git add src/app src/components/ui/CommandPalette.tsx src/components/ui/ScreenHeader.tsx src/features
git commit -m "feat(nav): derive every screen eyebrow and title from one taxonomy

Audit point 3. One rule, declared in nav.ts and enforced by nav.test.ts: an
index eyebrow is Layer then Pillar, with the pillar dropped when the screen
is the pillar; the h1 is the canonical name; a rail label is either that name
or a declared short form. Detail screens read Layer then parent screen.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Source health data model (point 4, part 1)

The dashboard warns when the whole sync is stale, but one connector failing while the others succeed is undetectable. This gives each connection its own last-sync and error, and derives a tenant-wide summary.

**Files:**
- Modify: `src/mocks/types.ts`
- Modify: `src/mocks/generators.ts:611-627`
- Modify: `src/mocks/dataset.ts:93`
- Modify: `src/mocks/scenarios.ts`
- Modify: `src/mocks/api.ts:1071-1073`
- Modify: `src/stores/ui.ts`
- Modify: `src/app/ScenarioSwitcher.tsx`
- Create: `src/mocks/sources.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/mocks/sources.test.ts`:

```ts
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getConnections, getSourceHealth } from './api';
import { useUiStore } from '@/stores/ui';

beforeAll(() => useUiStore.getState().setLatency(0));
beforeEach(() => useUiStore.getState().setSources('healthy'));

describe('source health', () => {
  it('gives every connection its own last-sync timestamp', async () => {
    const conns = await getConnections();
    expect(conns.length).toBe(3);
    expect(conns.every((c) => typeof c.lastSyncAt === 'string')).toBe(true);
  });

  it('reports all sources healthy by default', async () => {
    const health = await getSourceHealth();
    expect(health.total).toBe(3);
    expect(health.healthy).toBe(3);
    expect(health.degraded).toEqual([]);
  });

  it('reports the degraded source and its error under the degraded scenario', async () => {
    useUiStore.getState().setSources('degraded');
    const health = await getSourceHealth();
    expect(health.healthy).toBe(2);
    expect(health.degraded).toEqual(['azure']);
    const azure = (await getConnections()).find((c) => c.cloud === 'azure');
    expect(azure?.status).toBe('error');
    expect(azure?.error?.code).toBe('AuthorizationFailed');
  });

  it('reports the OLDEST successful sync, so a partial dataset cannot look fresh', async () => {
    useUiStore.getState().setSources('degraded');
    const health = await getSourceHealth();
    const conns = await getConnections();
    const syncs = conns.map((c) => c.lastSyncAt).filter((t): t is string => Boolean(t)).sort();
    expect(health.oldestSyncAt).toBe(syncs[0]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/mocks/sources.test.ts`
Expected: FAIL — `getSourceHealth` is not exported from `./api`.

- [ ] **Step 3: Extend the types**

In `src/mocks/types.ts`, replace the `CloudConnection` interface with:

```ts
export interface CloudConnection {
  cloud: Cloud;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  counts?: Record<NhiType, number>;
  /** ISO timestamp of this source's last SUCCESSFUL sync. Absent if never synced. */
  lastSyncAt?: string;
  /** Present only while `status` is 'error'. */
  error?: { code: string; message: string; since: string };
}

/**
 * Tenant-wide connector coverage for the persistent chrome indicator. A count of
 * healthy sources plus the age of the OLDEST successful sync — never the newest,
 * which is what would let a partial dataset present itself as fresh.
 */
export interface SourceHealth {
  healthy: number;
  total: number;
  oldestSyncAt?: string;
  degraded: Cloud[];
}
```

- [ ] **Step 4: Add the scenario switch**

In `src/mocks/scenarios.ts`, add above `ScenarioConfig`:

```ts
/**
 * Connector health preview. The seeded default keeps all three clouds green — a
 * degraded source makes every count on every screen short, which is correct
 * behaviour and wrong for a demo that has not opted into it.
 */
export type SourceScenario = 'healthy' | 'degraded';
```

Add `sources: SourceScenario;` to `ScenarioConfig` with the comment `/** Force a connector into a failed state, or keep every source green. */`, and `sources: 'healthy',` to `DEFAULT_SCENARIO`.

In `src/stores/ui.ts`, import `type SourceScenario` from `@/mocks/scenarios`, add `setSources: (value: SourceScenario) => void;` to `UiState`, and implement it beside `setSignIn`:

```ts
      setSources: (sources) => set((s) => ({ scenario: { ...s.scenario, sources } })),
```

- [ ] **Step 5: Generate per-source health**

In `src/mocks/generators.ts`, replace `generateConnections` (lines 611-627) with:

```ts
export function generateConnections(identities: Identity[], now: Date): CloudConnection[] {
  const byCloud: Record<Cloud, Record<NhiType, number>> = {
    aws: emptyCounts(),
    gcp: emptyCounts(),
    azure: emptyCounts(),
  };
  for (const identity of identities) {
    for (const source of identity.sources) {
      byCloud[source.cloud][identity.type] += 1;
    }
  }
  // Staggered sync ages, so the coverage chip has a real oldest-sync to report.
  const ageMinutes: Record<Cloud, number> = { aws: 6, gcp: 11, azure: 4 };
  return CLOUDS.map((cloud) => ({
    cloud,
    status: 'connected' as const,
    counts: byCloud[cloud],
    lastSyncAt: new Date(now.getTime() - ageMinutes[cloud] * 60000).toISOString(),
  }));
}
```

In `src/mocks/dataset.ts`, change `connections: generateConnections(identities),` to `connections: generateConnections(identities, NOW),`.

- [ ] **Step 6: Derive health in the API**

In `src/mocks/api.ts`, add `SourceHealth` to the type import block from `./types`, and replace `getConnections` (lines 1071-1073) with:

```ts
/**
 * The degraded fixture, applied on read rather than baked into the dataset so the
 * seeded store stays one healthy source of truth and the Scenario Switcher can
 * flip it back without a rebuild.
 * // ASSUMPTION: real connector error reporting is upstream.
 */
const DEGRADED_CLOUD: Cloud = 'azure';
const DEGRADED_AGE_MINUTES = 192;

function degradedSince(): string {
  return new Date(Date.now() - DEGRADED_AGE_MINUTES * 60000).toISOString();
}

function sourcesDegraded(): boolean {
  return useUiStore.getState().scenario.sources === 'degraded';
}

export function getConnections(): Promise<CloudConnection[]> {
  return respond(() =>
    getDataset().connections.map((c) => {
      if (!sourcesDegraded() || c.cloud !== DEGRADED_CLOUD) return { ...c };
      const since = degradedSince();
      return {
        ...c,
        status: 'error' as const,
        // Last SUCCESS, not last attempt: the chip reports how stale the data is.
        lastSyncAt: since,
        error: {
          code: 'AuthorizationFailed',
          message:
            'The app registration lost Directory.Read.All. Counts on Dashboard and Inventory exclude this source until it clears.',
          since,
        },
      };
    }),
  );
}

export function getSourceHealth(): Promise<SourceHealth> {
  return respond(() => {
    const degraded = sourcesDegraded() ? [DEGRADED_CLOUD] : [];
    const syncs = getDataset()
      .connections.map((c) =>
        degraded.includes(c.cloud) ? degradedSince() : c.lastSyncAt,
      )
      .filter((t): t is string => Boolean(t))
      .sort();
    return {
      healthy: getDataset().connections.length - degraded.length,
      total: getDataset().connections.length,
      oldestSyncAt: syncs[0],
      degraded,
    };
  });
}
```

`useUiStore` is already imported in `src/mocks/api.ts` (it backs `authScenario()`).

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/mocks/sources.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 8: Add the Scenario Switcher control**

The local control component is `Segment<T extends string>`, taking `label`, `value`, `options: readonly T[]`, `onChange` and an optional `format`. Import `SOURCE_SCENARIOS` and `type SourceScenario` from `@/mocks/scenarios` and add below the "Sign-in method" segment:

```tsx
            <Segment
              label="Source health"
              value={store.scenario.sources}
              options={SOURCE_SCENARIOS}
              format={(v) => (v === 'healthy' ? 'All healthy' : 'Azure failing')}
              onChange={(v: SourceScenario) => store.setSources(v)}
            />
```

Add the option list beside the type in `src/mocks/scenarios.ts`, matching how `AUTH_SCENARIOS` is declared there:

```ts
export const SOURCE_SCENARIOS: SourceScenario[] = ['healthy', 'degraded'];
```

- [ ] **Step 9: Verify types and the full suite**

Run: `npm run typecheck && npx vitest run`
Expected: typecheck clean; every suite passes.

- [ ] **Step 10: Commit**

```bash
git add src/mocks src/stores/ui.ts src/app/ScenarioSwitcher.tsx
git commit -m "feat(sources): give every connector its own sync state and error

Audit point 4, part 1. Adds per-source lastSyncAt and error detail plus a
tenant-wide SourceHealth summary reporting the OLDEST successful sync, so one
failing connector cannot hide behind two fresh ones. The degraded fixture is a
Scenario Switcher preview, not the seeded default.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Sources screen and coverage chip (point 4, part 2)

**Files:**
- Create: `src/features/platform/SourcesScreen.tsx`
- Create: `src/features/platform/CoverageChip.tsx`
- Modify: `src/features/platform/queries.ts`
- Modify: `src/app/nav.ts`
- Modify: `src/app/router.tsx`
- Modify: `src/app/AppShell.tsx` (TopBar)
- Modify: `src/features/platform/SettingsScreen.tsx`

- [ ] **Step 1: Add the query hook**

In `src/features/platform/queries.ts`, add `getSourceHealth` to the import from `@/mocks/api` and append:

```ts
export function useSourceHealth() {
  return useQuery({ queryKey: ['source-health'], queryFn: getSourceHealth });
}
```

- [ ] **Step 2: Register the route in the taxonomy**

In `src/app/nav.ts`, add `Database` to the `lucide-react` import and add to the Platform group, immediately after the Users entry:

```ts
      { to: '/settings/sources', label: 'Sources', icon: Database },
```

In `src/app/router.tsx`, add beside the other settings routes:

```tsx
      {
        path: 'settings/sources',
        lazy: async () => ({ Component: (await import('@/features/platform/SourcesScreen')).SourcesScreen }),
      },
```

- [ ] **Step 3: Build the coverage chip**

Create `src/features/platform/CoverageChip.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { CloudOff, Cloud as CloudIcon } from 'lucide-react';
import { useSourceHealth } from './queries';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * Persistent connector-coverage indicator in the top bar.
 *
 * Every figure in the console is a count over whatever synced. When one source
 * stops reporting, the numbers stay plausible and quietly wrong, so this states
 * coverage and the age of the OLDEST successful sync on every screen rather than
 * waiting for someone to open Sources.
 */
export function CoverageChip() {
  const query = useSourceHealth();
  const health = query.data;
  if (!health) return null;
  const degraded = health.degraded.length > 0;

  return (
    <Link
      to="/settings/sources"
      className={cn(
        'hidden h-8 items-center gap-1.5 rounded-[var(--r-pill)] border px-2.5 lg:inline-flex',
        'text-[length:var(--fs-small)] transition-colors',
        degraded
          ? 'border-[color-mix(in_srgb,var(--warning)_45%,var(--border))] bg-warn-bg text-warn-fg'
          : 'border-border bg-surface text-text-tertiary hover:text-text',
      )}
    >
      {degraded ? (
        <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <CloudIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="tnum">
        {health.healthy}/{health.total} sources healthy
      </span>
      {health.oldestSyncAt && (
        <span className="text-text-tertiary">· {relativeTime(health.oldestSyncAt)}</span>
      )}
    </Link>
  );
}
```

- [ ] **Step 4: Mount the chip**

In `src/app/AppShell.tsx`, add `import { CoverageChip } from '@/features/platform/CoverageChip';` and render it in `TopBar` immediately before the `Synthetic data` badge:

```tsx
        <CoverageChip />
```

- [ ] **Step 5: Build the Sources screen**

Create `src/features/platform/SourcesScreen.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { AlertTriangle, Cloud as CloudIcon } from 'lucide-react';
import { useConnections, useSourceHealth } from './queries';
import { CLOUD_LABELS, type CloudConnection } from '@/mocks/types';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';
import { Banner } from '@/components/ui/Banner';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { buttonClasses } from '@/components/ui/Button';
import { useCan } from '@/components/ui/Can';
import { CONNECTION_TONE } from '@/lib/tones';
import { count, dateTime, relativeTime } from '@/lib/format';

function totalFor(connection: CloudConnection): number {
  return connection.counts ? Object.values(connection.counts).reduce((a, b) => a + b, 0) : 0;
}

function SourceRow({ connection }: { connection: CloudConnection }) {
  const failed = connection.status === 'error';
  return (
    <li className="rounded-[var(--r-md)] border border-border bg-surface-2">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
        <span className="inline-flex items-center gap-2 text-[length:var(--fs-small)] text-text">
          <StatusDot tone={CONNECTION_TONE[connection.status]} />
          {CLOUD_LABELS[connection.cloud]}
        </span>
        <span className="flex items-center gap-4 text-[length:var(--fs-small)]">
          <span className="tnum text-text-tertiary">
            {count(totalFor(connection))} source instances
          </span>
          <span className={failed ? 'text-crit-fg' : 'text-text-tertiary'}>
            {connection.lastSyncAt ? (
              <>
                {failed ? 'last success ' : 'synced '}
                <span className="tnum" title={dateTime(connection.lastSyncAt)}>
                  {relativeTime(connection.lastSyncAt)}
                </span>
              </>
            ) : (
              'never synced'
            )}
          </span>
        </span>
      </div>
      {connection.error && (
        <div className="border-t border-[color-mix(in_srgb,var(--critical)_35%,var(--border))] bg-crit-bg px-3 py-2">
          <div className="inline-flex items-center gap-1.5 text-[length:var(--fs-small)] font-medium text-crit-fg">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {connection.error.code}
          </div>
          <p className="mt-0.5 text-[length:var(--fs-small)] text-text-secondary">
            {connection.error.message}
          </p>
        </div>
      )}
    </li>
  );
}

export function SourcesScreen() {
  const connections = useConnections();
  const health = useSourceHealth();
  const canConnect = useCan('connector.manage');
  const degraded = (health.data?.degraded.length ?? 0) > 0;

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/settings/sources')}
        description="Where the inventory comes from. A source that stops reporting makes every count on every screen short, so its state is stated here and in the top bar."
        actions={
          canConnect ? (
            <Link to="/onboarding" className={buttonClasses('secondary', 'sm')}>
              Add a cloud
            </Link>
          ) : undefined
        }
      />

      {degraded && (
        <Banner tone="warning" className="mb-4">
          <span className="font-medium">Coverage is incomplete.</span> Counts on the Dashboard and
          Identity Inventory exclude the failing source below until it recovers.
        </Banner>
      )}

      <Card>
        <CardHeader
          title="Connected clouds"
          description="Read-only access to AWS, Google Cloud, and Azure."
        />
        <CardBody>
          <QueryBoundary
            query={connections}
            loadingFallback={<SkeletonTableRows rows={3} cols={3} />}
            isEmpty={(d) => d.length === 0}
            empty={
              <p className="inline-flex items-center gap-2 text-[length:var(--fs-small)] text-text-secondary">
                <CloudIcon className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                No clouds connected yet.
              </p>
            }
          >
            {(conns) => (
              <ul className="space-y-2">
                {conns.map((c) => (
                  <SourceRow key={c.cloud} connection={c} />
                ))}
              </ul>
            )}
          </QueryBoundary>
        </CardBody>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Point Settings at the new screen**

In `src/features/platform/SettingsScreen.tsx`, change the "Connected clouds" `CardHeader` action to link to the new screen instead of duplicating the list:

```tsx
            action={
              <Link to="/settings/sources" className={buttonClasses('secondary', 'sm')}>
                View sources
              </Link>
            }
```

Leave the existing summary list in place — Settings keeps the at-a-glance view, Sources owns the detail.

- [ ] **Step 7: Verify in the browser**

Run the app and confirm both states. With the Scenario Switcher on `Source health → All healthy`, the top-bar chip reads `3/3 sources healthy · 11 minutes ago`. Switch to `Azure failing`: the chip turns amber and reads `2/3`, `/settings/sources` shows the Azure row in the error tone with the `AuthorizationFailed` detail, and the warning banner appears.

Run: `npm run typecheck && npx vitest run && npm run lint`
Expected: all clean.

- [ ] **Step 8: Commit**

```bash
git add src/features/platform src/app
git commit -m "feat(sources): add Platform > Sources and a persistent coverage chip

Audit point 4, part 2. A source that silently stops reporting made every
number on every screen quietly short. The chip states coverage and the oldest
successful sync on every screen; the Sources page carries per-source sync age
and the error detail.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Act › Quarantine with provenance (point 5)

Quarantine is already producible — a Govern policy action and a gated panel action — so the state does have provenance. What is missing is a destination under Act that names it.

**Files:**
- Modify: `src/mocks/types.ts`
- Modify: `src/mocks/generators.ts`
- Modify: `src/mocks/dataset.ts`
- Modify: `src/mocks/api.ts`
- Create: `src/features/act/queries.ts`
- Create: `src/features/act/QuarantineScreen.tsx`
- Create: `src/mocks/act.test.ts`
- Modify: `src/app/nav.ts`, `src/app/router.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/mocks/act.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { getDataset } from './dataset';
import { listAudit, listQuarantined, releaseFromQuarantine } from './api';
import { useUiStore } from '@/stores/ui';

beforeAll(() => {
  useUiStore.getState().setLatency(0);
  useUiStore.getState().setRole('tenant-admin');
});

describe('quarantine', () => {
  it('lists every quarantined identity', async () => {
    const rows = await listQuarantined();
    const expected = getDataset().identities.filter((i) => i.status === 'quarantined');
    expect(rows.length).toBe(expected.length);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('names what produced each quarantine', async () => {
    const rows = await listQuarantined();
    expect(rows.every((r) => r.byLabel.length > 0)).toBe(true);
    expect(rows.every((r) => typeof r.at === 'string')).toBe(true);
  });

  it('releasing returns the identity to active and clears its provenance', async () => {
    const [first] = await listQuarantined();
    const released = await releaseFromQuarantine(first.id);
    expect(released.status).toBe('active');
    expect(released.quarantine).toBeUndefined();
    expect((await listQuarantined()).some((r) => r.id === first.id)).toBe(false);
  });

  it('writes the release to the audit log', async () => {
    const [row] = await listQuarantined();
    await releaseFromQuarantine(row.id);
    const entries = await listAudit();
    expect(entries[0].action).toBe('released from quarantine');
    expect(entries[0].target).toBe(row.name);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/mocks/act.test.ts`
Expected: FAIL — `listQuarantined` is not exported from `./api`.

- [ ] **Step 3: Add the provenance type**

In `src/mocks/types.ts`, add above the `Identity` interface:

```ts
/**
 * What put an identity into quarantine. The state is reachable three ways — a
 * Govern policy action, an admin acting from the identity panel, and a session
 * review — and a terminal state with no named producer is not auditable.
 */
export type QuarantineSource =
  | { kind: 'policy'; policyId: string }
  | { kind: 'user'; userId: string }
  | { kind: 'session'; sessionId: string };

export interface QuarantineRecord {
  at: string;
  by: QuarantineSource;
}
```

Add to `Identity`, below `status`:

```ts
  /** Present only while `status` is 'quarantined'. */
  quarantine?: QuarantineRecord;
```

- [ ] **Step 4: Seed the provenance**

In `src/mocks/generators.ts`, append:

```ts
/**
 * Attach a producer to every quarantined identity. Runs as a post-pass because
 * the things a quarantine can name — policies, users, sessions — are generated
 * after the identities themselves.
 */
export function attachQuarantineProvenance(
  identities: Identity[],
  policies: Policy[],
  users: User[],
  sessions: AgentSession[],
  seed: number,
  now: Date,
): void {
  const rng = new Rng(seed ^ 0x9ua4e);
  const admins = users.filter((u) => u.role === 'tenant-admin' || u.role === 'tenant-owner');
  for (const identity of identities) {
    if (identity.status !== 'quarantined') continue;
    const at = new Date(now.getTime() - rng.int(1, 240) * 3600000).toISOString();
    const roll = rng.int(1, 3);
    if (roll === 1 && policies.length > 0) {
      identity.quarantine = { at, by: { kind: 'policy', policyId: rng.pick(policies).id } };
    } else if (roll === 2 && admins.length > 0) {
      identity.quarantine = { at, by: { kind: 'user', userId: rng.pick(admins).id } };
    } else if (sessions.length > 0) {
      identity.quarantine = { at, by: { kind: 'session', sessionId: rng.pick(sessions).id } };
    } else {
      identity.quarantine = { at, by: { kind: 'user', userId: users[0].id } };
    }
  }
}
```

Add `AgentSession`, `Policy` and `User` to the type imports at the top of `generators.ts` if they are not already there.

In `src/mocks/dataset.ts`, inside `build()`, capture the sessions and run the post-pass before the return:

```ts
  const sessions = generateSessions(identities, SEED, NOW);
  attachQuarantineProvenance(identities, policies, users, sessions, SEED, NOW);
```

then change the returned `sessions:` property to `sessions,`. Add `attachQuarantineProvenance` to the import from `./generators`.

- [ ] **Step 5: Add the API slice**

In `src/mocks/api.ts`, append near the other identity operations:

```ts
export interface QuarantinedIdentity {
  id: string;
  name: string;
  type: NhiType;
  at: string;
  /** Resolved producer, e.g. "Policy · Orphaned AI agents". */
  byLabel: string;
  /** Where the producer lives, for the link back. Absent when it has no screen. */
  byHref?: string;
}

function quarantineLabel(record: QuarantineRecord): { byLabel: string; byHref?: string } {
  const ds = getDataset();
  if (record.by.kind === 'policy') {
    const policy = ds.policies.find((p) => p.id === record.by.policyId);
    return {
      byLabel: `Policy · ${policy?.name ?? 'removed policy'}`,
      byHref: policy ? `/govern/builder/${policy.id}` : undefined,
    };
  }
  if (record.by.kind === 'user') {
    const user = ds.users.find((u) => u.id === record.by.userId);
    return { byLabel: user ? `${user.name} · ${ROLE_LABELS[user.role]}` : 'Removed user' };
  }
  return {
    byLabel: `Session review · ${record.by.sessionId}`,
    byHref: `/intelligence/${record.by.sessionId}`,
  };
}

export function listQuarantined(): Promise<QuarantinedIdentity[]> {
  return respond(() =>
    getDataset()
      .identities.filter((i) => i.status === 'quarantined' && i.quarantine)
      .map((i) => ({
        id: i.id,
        name: i.name,
        type: i.type,
        at: i.quarantine!.at,
        ...quarantineLabel(i.quarantine!),
      }))
      .sort((a, b) => b.at.localeCompare(a.at)),
  );
}

/** Release is Tenant Owner / Tenant Admin only (permissions spec §5). */
export function releaseFromQuarantine(identityId: string): Promise<Identity> {
  return respond(() => {
    assertActorCan('session.quarantineRelease');
    const identity = getDataset().identityById.get(identityId);
    if (!identity) throw new MockApiError('Identity not found.', 'NOT_FOUND');
    identity.status = 'active';
    identity.quarantine = undefined;
    appendAudit('released from quarantine', identity.name);
    return { ...identity };
  });
}
```

Add `QuarantineRecord` to the type import block and confirm `ROLE_LABELS` is imported from `@/lib/permissions` (it already is, for `updateUserRole`).

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/mocks/act.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 7: Add the query hooks**

Create `src/features/act/queries.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listQuarantined, releaseFromQuarantine } from '@/mocks/api';

export function useQuarantined() {
  return useQuery({ queryKey: ['quarantined'], queryFn: listQuarantined });
}

export function useReleaseFromQuarantine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (identityId: string) => releaseFromQuarantine(identityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quarantined'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}
```

The inventory key is `['inventory', filter, sort]`, so the bare `['inventory']` prefix above invalidates every variant of it.

- [ ] **Step 8: Build the screen**

Create `src/features/act/QuarantineScreen.tsx`:

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
import { useQuarantined, useReleaseFromQuarantine } from './queries';
import { NHI_TYPE_LABELS } from '@/mocks/types';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { useCan } from '@/components/ui/Can';
import { dateTime, relativeTime } from '@/lib/format';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';
import { NOW } from '@/mocks/dataset';

export function QuarantineScreen() {
  const query = useQuarantined();
  const release = useReleaseFromQuarantine();
  const canRelease = useCan('session.quarantineRelease');
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);

  const runRelease = () => {
    if (!confirm) return;
    release.mutate(confirm.id, {
      onSuccess: () => {
        toast(`${confirm.name} released from quarantine`, { tone: 'success' });
        setConfirm(null);
      },
      onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
    });
  };

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/act/quarantine')}
        description="Every contained identity, and what put it there. Quarantine is produced by a Govern policy, an admin action, or a session review — each row names its producer and links back to it."
      />

      {!canRelease && (
        <div className="mb-4">
          <RoleRestricted />
        </div>
      )}

      <QueryBoundary
        query={query}
        loadingFallback={<Card><SkeletonTableRows rows={5} cols={4} /></Card>}
        isEmpty={(d) => d.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={<ShieldX className="h-5 w-5" />}
              headline="Nothing is quarantined"
              guidance="Identities contained by a policy, an admin, or a session review appear here."
            />
          </Card>
        }
      >
        {(rows) => (
          <Card>
            <ScrollableTable label="Quarantined identities">
              <table className="w-full text-left text-[length:var(--fs-small)]">
                <thead>
                  <tr className="border-b border-border text-text-tertiary">
                    <th scope="col" className="px-4 py-2.5 font-medium">Identity</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Type</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">Quarantined by</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">When</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-b-0 hover:bg-surface-hover">
                      <td className="px-4 py-2.5 font-mono text-text">
                        <Link to={`/discover/${row.id}`} className="hover:underline">{row.name}</Link>
                      </td>
                      <td className="px-4 py-2.5 text-text-secondary">{NHI_TYPE_LABELS[row.type]}</td>
                      <td className="px-4 py-2.5 text-text-secondary">
                        {row.byHref ? (
                          <Link to={row.byHref} className="text-accent-text hover:underline">{row.byLabel}</Link>
                        ) : (
                          row.byLabel
                        )}
                      </td>
                      <td className="tnum px-4 py-2.5 text-text-tertiary" title={dateTime(row.at)}>
                        {relativeTime(row.at, NOW)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {canRelease && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setConfirm({ id: row.id, name: row.name })}
                          >
                            Release
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollableTable>
          </Card>
        )}
      </QueryBoundary>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Release from quarantine"
        description={
          confirm
            ? `Release ${confirm.name}? It regains its permissions immediately, and the release is written to the audit log.`
            : undefined
        }
        confirmLabel="Release"
        pending={release.isPending}
        onConfirm={runRelease}
      />
    </div>
  );
}
```

- [ ] **Step 9: Register the route**

In `src/app/nav.ts`, add `ShieldX` to the `lucide-react` import and add to the Act group:

```ts
      { to: '/act/quarantine', label: 'Quarantine', pillar: 'Quarantine', icon: ShieldX },
```

In `src/app/router.tsx`, add:

```tsx
      {
        path: 'act/quarantine',
        lazy: async () => ({ Component: (await import('@/features/act/QuarantineScreen')).QuarantineScreen }),
      },
```

- [ ] **Step 10: Verify and commit**

Run: `npm run typecheck && npx vitest run && npm run lint`
Expected: all clean. In the browser, `/act/quarantine` lists the contained identities, each naming a policy, an admin, or a session, and Release works as a Tenant Admin and is absent as an Analyst.

```bash
git add src/mocks src/features/act src/app
git commit -m "feat(act): add Act > Quarantine with named provenance

Audit point 5. Quarantine was already producible three ways but had no
destination, so the state appeared from nowhere. Each row now names its
producer - policy, admin, or session review - links back to it, and Release
is gated on session.quarantineRelease and written to the audit log.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Act › Approvals queue (point 7)

Permissions already split `session.quarantine` from `session.quarantineRecommend`, so an Analyst proposes and an Admin executes. The recommendation currently goes nowhere a human can find.

**Scope, flagged:** the audit says "every state-changing action requires approval by design." The FRS does not say that, and literal two-person approval on every action is a new requirement, not a UI gap. This queue covers the two actions the permission model actually gates, and its empty state says so.

**Files:**
- Modify: `src/mocks/types.ts`, `src/mocks/generators.ts`, `src/mocks/dataset.ts`, `src/mocks/api.ts`
- Modify: `src/mocks/act.test.ts`
- Modify: `src/features/act/queries.ts`
- Create: `src/features/act/ApprovalsScreen.tsx`
- Modify: `src/features/discover/IdentityDetailPanel.tsx:328-340`
- Modify: `src/app/nav.ts`, `src/app/router.tsx`, `src/app/AppShell.tsx`

- [ ] **Step 1: Write the failing test**

Append to `src/mocks/act.test.ts`:

```ts
import { decideApproval, listApprovals, requestApproval } from './api';

describe('approvals', () => {
  it('seeds a pending queue', async () => {
    const pending = await listApprovals('pending');
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((a) => a.status === 'pending')).toBe(true);
  });

  it('resolves the identity and the requester on every row', async () => {
    const [row] = await listApprovals('pending');
    expect(row.identityName.length).toBeGreaterThan(0);
    expect(row.requesterName.length).toBeGreaterThan(0);
    expect(row.requesterRole.length).toBeGreaterThan(0);
  });

  it('an Analyst can recommend a quarantine but not decide one', async () => {
    useUiStore.getState().setRole('analyst');
    const created = await requestApproval({ kind: 'quarantine', identityId: 'idn_000000', reason: 'no owner' });
    expect(created.status).toBe('pending');
    await expect(decideApproval(created.id, 'approved')).rejects.toThrow();
    useUiStore.getState().setRole('tenant-admin');
  });

  it('approving a quarantine contains the identity and records the approver as its producer', async () => {
    useUiStore.getState().setRole('analyst');
    const created = await requestApproval({ kind: 'quarantine', identityId: 'idn_000001' });
    useUiStore.getState().setRole('tenant-admin');
    const decided = await decideApproval(created.id, 'approved');
    expect(decided.status).toBe('approved');
    const identity = getDataset().identityById.get('idn_000001');
    expect(identity?.status).toBe('quarantined');
    expect(identity?.quarantine?.by.kind).toBe('user');
  });

  it('declining leaves the identity untouched', async () => {
    useUiStore.getState().setRole('analyst');
    const created = await requestApproval({ kind: 'quarantine', identityId: 'idn_000002' });
    useUiStore.getState().setRole('tenant-admin');
    await decideApproval(created.id, 'declined');
    expect(getDataset().identityById.get('idn_000002')?.status).not.toBe('quarantined');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/mocks/act.test.ts`
Expected: FAIL — `listApprovals` is not exported from `./api`.

- [ ] **Step 3: Add the types**

In `src/mocks/types.ts`, append:

```ts
/**
 * A proposed state change awaiting a second pair of hands.
 *
 * Wave 1 gates exactly two actions this way: an Analyst may recommend a
 * quarantine (`session.quarantineRecommend`) or request a rotation
 * (`rotate.request`), and a role holding the matching execute capability
 * decides. // ASSUMPTION: widening this to every state change is Architect-owned.
 */
export type ApprovalKind = 'quarantine' | 'rotation';
export type ApprovalStatus = 'pending' | 'approved' | 'declined';

export interface ApprovalRequest {
  id: string;
  kind: ApprovalKind;
  identityId: string;
  /** Why the requester proposed it. */
  reason?: string;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
  decidedBy?: string;
  decidedAt?: string;
}
```

- [ ] **Step 4: Seed the queue**

In `src/mocks/generators.ts`, append:

```ts
export function generateApprovals(
  identities: Identity[],
  users: User[],
  seed: number,
  now: Date,
): ApprovalRequest[] {
  const rng = new Rng(seed ^ 0x0a99a);
  const analysts = users.filter((u) => u.role === 'analyst' && u.status === 'active');
  const requester = analysts[0]?.id ?? users[0].id;
  const reasons = [
    'Spans three clouds with no accountable owner.',
    'Credential has not rotated in over 200 days.',
    'Behaviour diverged from its baseline overnight.',
  ];
  const pending = Array.from({ length: 3 }, (_, i) => ({
    id: `apr_${i.toString(36).padStart(4, '0')}`,
    kind: (i === 2 ? 'rotation' : 'quarantine') as ApprovalKind,
    identityId: rng.pick(identities).id,
    reason: reasons[i],
    requestedBy: analysts[i % Math.max(1, analysts.length)]?.id ?? requester,
    requestedAt: new Date(now.getTime() - (12 + i * 28) * 60000).toISOString(),
    status: 'pending' as ApprovalStatus,
  }));
  return pending;
}
```

Add `ApprovalKind`, `ApprovalRequest` and `ApprovalStatus` to the type imports in `generators.ts`.

In `src/mocks/dataset.ts`, add `approvals: ReturnType<typeof generateApprovals>;` to the `Dataset` interface and `approvals: generateApprovals(identities, users, SEED, NOW),` to the returned object, importing `generateApprovals`.

- [ ] **Step 5: Add the API slice**

In `src/mocks/api.ts`, append:

```ts
export interface ApprovalWithContext extends ApprovalRequest {
  identityName: string;
  requesterName: string;
  requesterRole: string;
}

/** Recommend capability per kind — what it takes to PROPOSE the action. */
const APPROVAL_REQUEST_CAP: Record<ApprovalKind, Capability> = {
  quarantine: 'session.quarantineRecommend',
  rotation: 'rotate.request',
};

/** Execute capability per kind — what it takes to DECIDE the request. */
const APPROVAL_DECIDE_CAP: Record<ApprovalKind, Capability> = {
  quarantine: 'session.quarantine',
  rotation: 'rotate.standard',
};

function withApprovalContext(request: ApprovalRequest): ApprovalWithContext {
  const ds = getDataset();
  const user = ds.users.find((u) => u.id === request.requestedBy);
  return {
    ...request,
    identityName: ds.identityById.get(request.identityId)?.name ?? request.identityId,
    requesterName: user?.name ?? 'Removed user',
    requesterRole: user ? ROLE_LABELS[user.role] : '—',
  };
}

export function listApprovals(status?: ApprovalStatus): Promise<ApprovalWithContext[]> {
  return respond(() => {
    if (isEmptyForced()) return [];
    return getDataset()
      .approvals.filter((a) => (status ? a.status === status : true))
      .map(withApprovalContext)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  });
}

export function requestApproval(input: {
  kind: ApprovalKind;
  identityId: string;
  reason?: string;
}): Promise<ApprovalRequest> {
  return respond(() => {
    assertActorCan(APPROVAL_REQUEST_CAP[input.kind]);
    const ds = getDataset();
    const identity = ds.identityById.get(input.identityId);
    if (!identity) throw new MockApiError('Identity not found.', 'NOT_FOUND');
    const request: ApprovalRequest = {
      id: `apr_${Math.random().toString(36).slice(2, 8)}`,
      kind: input.kind,
      identityId: input.identityId,
      reason: input.reason,
      requestedBy: currentActor().id,
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    ds.approvals.unshift(request);
    appendAudit(
      input.kind === 'quarantine' ? 'recommended quarantine' : 'requested rotation',
      identity.name,
      input.reason,
    );
    return { ...request };
  });
}

export function decideApproval(
  id: string,
  decision: 'approved' | 'declined',
): Promise<ApprovalRequest> {
  return respond(() => {
    const ds = getDataset();
    const request = ds.approvals.find((a) => a.id === id);
    if (!request) throw new MockApiError('Request not found.', 'NOT_FOUND');
    if (request.status !== 'pending') throw new MockApiError('This request was already decided.');
    assertActorCan(APPROVAL_DECIDE_CAP[request.kind]);
    const identity = ds.identityById.get(request.identityId);
    if (!identity) throw new MockApiError('Identity not found.', 'NOT_FOUND');

    const actor = currentActor();
    const at = new Date().toISOString();
    request.status = decision;
    request.decidedBy = actor.id;
    request.decidedAt = at;

    if (decision === 'approved' && request.kind === 'quarantine') {
      identity.status = 'quarantined';
      // The approver, not the recommender, is the producer of the state.
      identity.quarantine = { at, by: { kind: 'user', userId: actor.id } };
    }
    appendAudit(
      decision === 'approved'
        ? request.kind === 'quarantine'
          ? 'approved quarantine'
          : 'approved rotation'
        : request.kind === 'quarantine'
          ? 'declined quarantine'
          : 'declined rotation',
      identity.name,
    );
    return { ...request };
  });
}
```

Add `ApprovalKind`, `ApprovalRequest`, `ApprovalStatus` to the type import block and `type Capability` to the `@/lib/permissions` import.

An approved rotation deliberately does not create a job here — `requestRotation` remains the single path that does, and wiring the two together is out of this point's scope. Note it in the code with a `// ASSUMPTION:` comment.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/mocks/act.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 7: Add the hooks**

Append to `src/features/act/queries.ts`:

```ts
import { decideApproval, listApprovals, requestApproval } from '@/mocks/api';
import type { ApprovalStatus } from '@/mocks/types';

export function useApprovals(status?: ApprovalStatus) {
  return useQuery({ queryKey: ['approvals', status ?? 'all'], queryFn: () => listApprovals(status) });
}

export function useRequestApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: requestApproval,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approved' | 'declined' }) =>
      decideApproval(id, decision),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['quarantined'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}
```

- [ ] **Step 8: Build the screen**

Create `src/features/act/ApprovalsScreen.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { useApprovals, useDecideApproval } from './queries';
import type { ApprovalWithContext } from '@/mocks/api';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { useCan } from '@/components/ui/Can';
import { dateTime, relativeTime } from '@/lib/format';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';
import { NOW } from '@/mocks/dataset';

function Row({ request, canDecide }: { request: ApprovalWithContext; canDecide: boolean }) {
  const decide = useDecideApproval();
  const run = (decision: 'approved' | 'declined') =>
    decide.mutate(
      { id: request.id, decision },
      {
        onSuccess: () =>
          toast(
            decision === 'approved'
              ? `${request.kind === 'quarantine' ? 'Quarantine' : 'Rotation'} approved for ${request.identityName}`
              : `Request declined for ${request.identityName}`,
            { tone: decision === 'approved' ? 'critical' : 'default' },
          ),
        onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
      },
    );

  return (
    <li className="border-b border-border p-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={request.kind === 'quarantine' ? 'critical' : 'info'}>
          {request.kind === 'quarantine' ? 'Quarantine' : 'Rotation'}
        </Badge>
        <Link
          to={`/discover/${request.identityId}`}
          className="font-mono text-[length:var(--fs-small)] text-text hover:underline"
        >
          {request.identityName}
        </Link>
      </div>
      <p className="mt-1.5 text-[length:var(--fs-small)] text-text-tertiary">
        Recommended by {request.requesterName} · {request.requesterRole} ·{' '}
        <span title={dateTime(request.requestedAt)}>{relativeTime(request.requestedAt, NOW)}</span>
        {request.reason && <> — “{request.reason}”</>}
      </p>
      {canDecide && (
        <div className="mt-2.5 flex gap-2">
          <Button size="sm" loading={decide.isPending} onClick={() => run('approved')}>
            Approve &amp; execute
          </Button>
          <Button size="sm" variant="secondary" disabled={decide.isPending} onClick={() => run('declined')}>
            Decline
          </Button>
        </div>
      )}
    </li>
  );
}

export function ApprovalsScreen() {
  const query = useApprovals('pending');
  const canQuarantine = useCan('session.quarantine');
  const canRotate = useCan('rotate.standard');
  const canDecideAny = canQuarantine || canRotate;

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/act/approvals')}
        description="Proposed state changes waiting on a second pair of hands. Wave 1 gates two actions this way: a recommended quarantine and a requested rotation."
      />

      {!canDecideAny && (
        <div className="mb-4">
          <RoleRestricted note="Your role can raise requests but not decide them. A Security Admin or Tenant Admin approves." />
        </div>
      )}

      <QueryBoundary
        query={query}
        loadingFallback={<Card><SkeletonTableRows rows={3} cols={2} /></Card>}
        isEmpty={(d) => d.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={<ClipboardCheck className="h-5 w-5" />}
              headline="Nothing is waiting for approval"
              guidance="Quarantine recommendations and rotation requests appear here. Other actions execute directly for roles that hold the capability."
            />
          </Card>
        }
      >
        {(rows) => (
          <Card>
            <ul>
              {rows.map((request) => (
                <Row
                  key={request.id}
                  request={request}
                  canDecide={request.kind === 'quarantine' ? canQuarantine : canRotate}
                />
              ))}
            </ul>
          </Card>
        )}
      </QueryBoundary>
    </div>
  );
}
```

- [ ] **Step 9: Add the pending count to the rail**

In `src/app/nav.ts`, add `ClipboardCheck` to the import and add to the Act group:

```ts
      { to: '/act/approvals', label: 'Approvals', pillar: 'Approvals', icon: ClipboardCheck },
```

In `src/app/AppShell.tsx`, import `useApprovals` from `@/features/act/queries` and render a count inside `SideNav`. Add at the top of `SideNav`:

```tsx
  const approvals = useApprovals('pending');
  const pending = approvals.data?.length ?? 0;
```

and inside the `NavLink` render callback, after the `concept` badge:

```tsx
                        {!collapsed && item.to === '/act/approvals' && pending > 0 && (
                          <Badge tone="critical" className="ml-auto px-1.5 py-0 text-[length:var(--fs-micro)]">
                            {pending}
                          </Badge>
                        )}
```

In `src/app/router.tsx`, add:

```tsx
      {
        path: 'act/approvals',
        lazy: async () => ({ Component: (await import('@/features/act/ApprovalsScreen')).ApprovalsScreen }),
      },
```

- [ ] **Step 10: Wire the recommend path to the queue**

In `src/features/discover/IdentityDetailPanel.tsx`, replace the recommend branch of the confirm handler (around line 334) so the recommendation creates a request rather than only toasting:

```tsx
          } else {
            requestApproval.mutate(
              { kind: 'quarantine', identityId: identity.id },
              {
                onSuccess: () =>
                  toast(`Quarantine recommended for ${identity.name}`, {
                    description: 'Waiting for an admin in Act › Approvals.',
                  }),
                onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
              },
            );
          }
```

Add `const requestApproval = useRequestApproval();` beside the other hooks, plus the imports for `useRequestApproval`, `toast` and `errorInfo` if they are not already present.

- [ ] **Step 11: Verify and commit**

Run: `npm run typecheck && npx vitest run && npm run lint`
Expected: all clean. In the browser as an Analyst, Recommend quarantine from an identity panel, switch to Tenant Admin, and confirm the rail badge increments and the queue shows the request with Approve and Decline.

```bash
git add src/mocks src/features/act src/features/discover/IdentityDetailPanel.tsx src/app
git commit -m "feat(act): add the approvals queue and a pending count

Audit point 7. An Analyst's recommendation previously produced a toast and
nothing else. It now creates a request that appears in Act > Approvals with a
rail badge, and only a role holding the matching execute capability can decide
it. Scope is the two actions the permission model gates today; widening it to
every state change is an FRS question, and the empty state says so.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Cross-cloud flag (point 26)

A `correlated` boolean already exists on every identity and is unused for filtering. Promoting it costs one facet, one pill and one badge — and it is the differentiator competitors cannot match.

**Files:**
- Modify: `src/mocks/api.ts` (`IdentityFilter`, `IdentityFacetCounts`, `matchesExcept`, `facetCounts`)
- Modify: `src/mocks/inventory.test.ts`
- Modify: `src/features/discover/useInventoryFilters.ts`
- Modify: `src/features/discover/InventoryFilters.tsx`
- Modify: `src/features/discover/IdentityTable.tsx`

- [ ] **Step 1: Write the failing test**

Append to `src/mocks/inventory.test.ts`, inside the existing `describe('inventory filtering and sorting')`:

```ts
  it('cross-cloud filter narrows to correlated identities', async () => {
    const res = await listIdentities({ filter: { crossCloudOnly: true }, limit: 100_000 });
    expect(res.rows.length).toBeGreaterThan(0);
    expect(res.rows.every((r) => r.correlated)).toBe(true);
    expect(res.rows.every((r) => new Set(r.sources.map((s) => s.cloud)).size > 1)).toBe(true);
  });

  it('cross-cloud facet count reconciles with the cross-cloud filter', async () => {
    const all = await listIdentities({ limit: 1 });
    const crossCloud = await listIdentities({ filter: { crossCloudOnly: true }, limit: 1 });
    expect(crossCloud.total).toBe(all.counts.crossCloud);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/mocks/inventory.test.ts -t "cross-cloud"`
Expected: FAIL — `crossCloudOnly` is not a known property, and `counts.crossCloud` is undefined.

- [ ] **Step 3: Extend the filter and facets**

In `src/mocks/api.ts`, add to `IdentityFilter`:

```ts
  /** Correlated across more than one cloud — the deduplication differentiator. */
  crossCloudOnly?: boolean;
```

Add to `IdentityFacetCounts`:

```ts
  crossCloud: number;
```

In `matchesExcept`, add beside the other flag checks:

```ts
  if (skip !== 'crossCloudOnly' && filter.crossCloudOnly && !identity.correlated) return false;
```

In `facetCounts`, add `let crossCloud = 0;` beside `orphaned`/`conflicts`, count it in the same loop:

```ts
    if (matchesExcept(identity, filter, 'crossCloudOnly') && identity.correlated) crossCloud += 1;
```

and add `crossCloud` to the returned object.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/mocks/inventory.test.ts`
Expected: PASS, including the two new cases.

- [ ] **Step 5: Add the URL state**

In `src/features/discover/useInventoryFilters.ts`:

- add `crossCloudOnly: params.get('crosscloud') === '1',` to the `filter` memo;
- add `'crosscloud'` to the key arrays in both `applyFilter` and `clearAll`;
- add `if (next.crossCloudOnly) n.set('crosscloud', '1');` to `applyFilter`;
- add `(filter.crossCloudOnly ? 1 : 0) +` to `activeCount`;
- add `toggleCrossCloud: () => toggleFlag('crosscloud'),` to the returned object.

- [ ] **Step 6: Add the pill**

In `src/features/discover/InventoryFilters.tsx`, import `Cloud as CloudIcon` from `lucide-react` and add a third pill in the Flags row, after Conflicts:

```tsx
        <FilterPill
          label="Cross-cloud"
          count={counts?.crossCloud}
          selected={filter.crossCloudOnly ?? false}
          onClick={filters.toggleCrossCloud}
          icon={<CloudIcon className="h-3.5 w-3.5" />}
        />
```

- [ ] **Step 7: Add the row badge**

In `src/features/discover/IdentityTable.tsx`, in the name gridcell after the conflicts glyph, add a count badge so a multi-cloud identity reads as a finding rather than a truncation:

```tsx
                    {identity.correlated && (
                      <span className="tnum shrink-0 rounded-[var(--r-pill)] bg-accent-tint px-1.5 text-[length:var(--fs-micro)] text-accent-text">
                        {new Set(identity.sources.map((s) => s.cloud)).size} clouds
                      </span>
                    )}
```

- [ ] **Step 8: Verify and commit**

Run: `npm run typecheck && npx vitest run && npm run lint`
Expected: all clean. In the browser, the Flags row shows Cross-cloud with a count, clicking it sets `?crosscloud=1`, and multi-cloud rows carry the badge.

```bash
git add src/mocks src/features/discover
git commit -m "feat(inventory): promote cross-cloud correlation to a flag and a badge

Audit point 26. The correlated boolean already existed on every identity and
was never wired to a filter, so the one thing competitors cannot do read as a
grey +2. It is now a third flag pill with a facet count, shareable as
?crosscloud=1, and a per-row cloud-count badge.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Privilege drift definition (point 14)

The tile prints a percentage with nothing behind it. An info affordance states what is counted, what it is divided by, and that the derivation is upstream.

**Deviation from the reviewed mockup, and why.** The preview showed a small `i` beside the tile label. The drift tile is a whole-tile `Link`, and a button inside a link is an invalid nested interactive, so the affordance becomes the tile's icon chip — one control, correctly announced, reachable by keyboard and touch. The methodology text is unchanged.

**Files:**
- Modify: `src/components/ui/KpiTile.tsx`
- Modify: `src/features/discover/InventoryScreen.tsx:74-83`

- [ ] **Step 1: Add the info affordance to KpiTile**

In `src/components/ui/KpiTile.tsx`, add `Info` to the `lucide-react` import, add `import { Popover, PopoverContent, PopoverTrigger } from './Popover';`, and add to `KpiTileProps`:

```ts
  /**
   * Methodology for a derived figure, shown in a popover from the tile's icon
   * chip. Any tile printing a computed percentage should carry one.
   */
  info?: ReactNode;
```

Add `info` to the destructured parameters. Extract the chip classes above `body`:

```tsx
  const chipClass = cn(
    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--r-sm)]',
    // Theme split lives in the --chip-* tokens: calm muted chips on dark, solid
    // brand/critical fills with a white glyph on light.
    risk
      ? 'bg-chip-risk text-chip-risk-fg'
      : prominent
        ? 'bg-chip-prominent text-chip-prominent-fg'
        : 'bg-chip text-chip-fg',
  );
```

Replace the icon branch inside `body` with:

```tsx
        {icon ? (
          // With `info`, this is a placeholder: the real control is a button
          // rendered OUTSIDE the tile's link, positioned over this slot.
          <span className={cn(chipClass, info && 'invisible')} aria-hidden={info ? true : undefined}>
            {icon}
          </span>
        ) : (
          to && (
            <ArrowRight
              className="h-4 w-4 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
          )
        )}
```

Replace the return block at the end of the component with:

```tsx
  const tile = to ? (
    <Link to={to} className={baseClass} aria-label={`${label}: ${valueAria}${trendAria}. View details.`}>
      {body}
    </Link>
  ) : (
    <div className={baseClass}>{body}</div>
  );

  if (!info) return tile;

  return (
    <div className="relative h-full">
      {tile}
      {/* Sits exactly over the placeholder chip. Kept outside the tile's Link so
          the two controls do not nest. `top-4 right-4` matches the tile's p-4. */}
      <div className="absolute right-4 top-4">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`How ${label} is measured`}
              className={cn(
                chipClass,
                'outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]',
              )}
            >
              <Info className="h-4 w-4" aria-hidden="true" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" ariaLabel={`How ${label} is measured`} className="w-72">
            {info}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
```

- [ ] **Step 2: Pass the methodology**

In `src/features/discover/InventoryScreen.tsx`, replace the Privilege drift `KpiTile` with:

```tsx
      <KpiTile
        label="Privilege drift"
        value={`${driftPct.toFixed(1)}%`}
        to="/discover?gov=drift"
        icon={<Activity className="h-4 w-4" />}
        delta={-0.8}
        deltaLabel="pts"
        deltaInverted
        info={
          <div className="space-y-2 text-[length:var(--fs-small)] text-text-secondary">
            <p className="font-medium text-text">How privilege drift is measured</p>
            <p>
              <span className="tnum text-accent-text">{count(d.governanceDrift)}</span> identities
              whose governance state is <span className="font-mono">drift</span>, over{' '}
              <span className="tnum text-accent-text">{count(d.total)}</span> correlated identities
              in scope.
            </p>
            <p>
              Drift means an identity’s effective permissions no longer match the baseline its
              governing policy set.
            </p>
            <p className="border-t border-border pt-2 text-text-tertiary">
              Derivation is upstream (FRS §6). This surface displays the value; it never computes it.
            </p>
          </div>
        }
      />
```

`count` is already imported in that file.

**Sign-off flag:** the definition sentence is written to the shape of FRS §6, not derived from it. Drift derivation is Architect-owned, so the wording needs confirmation before the demo. Do not replace it with an invented formula.

- [ ] **Step 3: Verify and commit**

Run: `npm run typecheck && npx vitest run && npm run lint`
Expected: all clean. In the browser, the drift tile's chip opens the popover on click and on Enter, the popover is announced, and clicking elsewhere on the tile still drills into `?gov=drift`.

```bash
git add src/components/ui/KpiTile.tsx src/features/discover/InventoryScreen.tsx
git commit -m "feat(kpi): give a derived percentage its methodology

Audit point 14. Privilege drift printed 15.7% with nothing behind it. KpiTile
gains an info popover, rendered outside the tile link so the two controls do
not nest, and the drift tile states its numerator, denominator and definition -
marked as displaying an upstream-derived value, never computing one.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Read-only banner names reason and remedy (point 34)

The shared component already defaults to naming the reader's role. The Users screen overrides it with a vaguer line, so this ships worse than the component it is built on.

**Correction to the earlier review note:** the Auditor role does exist — `viewer` is labelled `Read-only / Auditor` in `src/lib/permissions.ts`, with `ROLE_SHORT.viewer === 'Auditor'`. The client's exact wording is therefore buildable; use `ROLE_SHORT` so the sentence reads "Your role (Auditor)" rather than "Your role (Read-only / Auditor)".

**Files:**
- Modify: `src/components/ui/RoleRestricted.tsx`
- Modify: `src/features/admin/UsersScreen.tsx:334-338`
- Create: `src/components/ui/RoleRestricted.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/RoleRestricted.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { RoleRestricted } from './RoleRestricted';
import { useUiStore } from '@/stores/ui';

beforeEach(() => useUiStore.getState().setRole('viewer'));

describe('RoleRestricted', () => {
  it('names the reader’s role and who can lift the restriction', () => {
    render(<RoleRestricted action="modify users" remedy="Tenant Admin" />);
    expect(screen.getByText(/read-only/i)).toBeInTheDocument();
    expect(screen.getByText(/auditor/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot modify users/i)).toBeInTheDocument();
    expect(screen.getByText(/contact a tenant admin/i)).toBeInTheDocument();
  });

  it('uses the short role label, not the compound one', () => {
    render(<RoleRestricted action="modify users" remedy="Tenant Admin" />);
    expect(screen.queryByText(/read-only \/ auditor/i)).not.toBeInTheDocument();
  });

  it('still accepts a fully custom note', () => {
    render(<RoleRestricted note="Your role can review but not act on the selection." />);
    expect(screen.getByText(/review but not act/i)).toBeInTheDocument();
  });

  it('falls back to a generic sentence when no action is given', () => {
    render(<RoleRestricted />);
    expect(screen.getByText(/read-only access here/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ui/RoleRestricted.test.tsx`
Expected: FAIL — `action` and `remedy` are not props of `RoleRestricted`.

- [ ] **Step 3: Implement**

Replace the body of `src/components/ui/RoleRestricted.tsx` (keeping the `Lock` icon and both layouts) with:

```tsx
import { Lock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ROLE_SHORT } from '@/lib/permissions';
import { useUiStore } from '@/stores/ui';

/**
 * The standard restricted presentation: a quiet note shown where a role may see
 * a section but not act, instead of a dead control.
 *
 * A restriction notice that does not name its cause or its cure leaves the
 * reader stuck, so `action` and `remedy` produce the full sentence — "Read-only.
 * Your role (Auditor) cannot modify users. Contact a Tenant Admin." Both are
 * optional; `note` still overrides everything for one-off wording.
 */
export function RoleRestricted({
  note,
  action,
  remedy,
  inline = false,
  className,
}: {
  /** Complete replacement sentence. Overrides `action` and `remedy`. */
  note?: string;
  /** What the reader cannot do here, as a verb phrase, e.g. "modify users". */
  action?: string;
  /** Who can lift it, e.g. "Tenant Admin". */
  remedy?: string;
  inline?: boolean;
  className?: string;
}) {
  const role = useUiStore((s) => s.role);
  // ROLE_SHORT, not ROLE_LABELS: the viewer's full label is the compound
  // "Read-only / Auditor", which does not read inside a parenthetical.
  const roleName = ROLE_SHORT[role];
  const message =
    note ??
    (action
      ? `Read-only. Your role (${roleName}) cannot ${action}.${remedy ? ` Contact a ${remedy}.` : ''}`
      : `${roleName} has read-only access here.`);

  if (inline) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-[length:var(--fs-small)] text-text-tertiary', className)}>
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        {message}
      </span>
    );
  }
  return (
    <div
      role="note"
      className={cn(
        'flex items-center gap-2 rounded-[var(--r-md)] border border-dashed border-border bg-surface-2 px-3 py-2',
        'text-[length:var(--fs-small)] text-text-tertiary',
        className,
      )}
    >
      <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ui/RoleRestricted.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Drop the vaguer override on the Users screen**

In `src/features/admin/UsersScreen.tsx`, replace

```tsx
          <RoleRestricted note="You have read-only access to the user list." />
```

with

```tsx
          <RoleRestricted action="modify users" remedy="Tenant Admin" />
```

- [ ] **Step 6: Verify and commit**

Run: `npm run typecheck && npx vitest run && npm run lint`
Expected: all clean. In the browser as the Auditor role, `/settings/users` reads "Read-only. Your role (Auditor) cannot modify users. Contact a Tenant Admin."

```bash
git add src/components/ui/RoleRestricted.tsx src/components/ui/RoleRestricted.test.tsx src/features/admin/UsersScreen.tsx
git commit -m "feat(a11y): name the reason and the remedy on the read-only banner

Audit point 34. The Users screen overrode the shared component with a line
that named neither the role that caused the restriction nor anyone who could
lift it. Both now come from the permission model, using ROLE_SHORT so the
viewer reads as Auditor rather than Read-only / Auditor.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Real file exports (point 41)

Every export in the build is a toast. The log exists, the button exists, and no file has ever left the product.

**Files:**
- Create: `src/lib/csv.ts`
- Create: `src/lib/csv.test.ts`
- Modify: `src/features/discover/InventoryScreen.tsx:104-112`

- [ ] **Step 1: Write the failing test**

Create `src/lib/csv.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fileStamp, manifestLines, toCsv } from './csv';

describe('csv', () => {
  it('leaves a plain field alone', () => {
    expect(toCsv(['a'], [['plain']])).toBe('a\r\nplain');
  });

  it('quotes a field containing a comma, a quote, or a newline', () => {
    expect(toCsv(['a'], [['x,y']])).toContain('"x,y"');
    expect(toCsv(['a'], [['say "hi"']])).toContain('"say ""hi"""');
    expect(toCsv(['a'], [['line1\nline2']])).toContain('"line1\nline2"');
  });

  it('renders empty for null and undefined rather than the word', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]])).toBe('a,b\r\n,');
  });

  it('writes a provenance header a reader can act on weeks later', () => {
    const lines = manifestLines({
      tenant: 'Acme Corp (synthetic)',
      actor: 'alex.kim@acme.com',
      generatedAt: '2026-08-22 14:03 UTC',
      filter: 'band=critical',
      rows: 247,
      of: 1500,
    });
    expect(lines[0]).toBe('# tenant: Acme Corp (synthetic)');
    expect(lines[1]).toBe('# generated: 2026-08-22 14:03 UTC by alex.kim@acme.com');
    expect(lines[2]).toBe('# filter: band=critical');
    expect(lines[3]).toBe('# rows: 247 of 1500');
  });

  it('omits the filter line when the export was unfiltered', () => {
    const lines = manifestLines({
      tenant: 'T', actor: 'a', generatedAt: 'g', rows: 5,
    });
    expect(lines.some((l) => l.startsWith('# filter:'))).toBe(false);
    expect(lines[lines.length - 1]).toBe('# rows: 5');
  });

  it('stamps a filename with a UTC instant that is safe on every OS', () => {
    expect(fileStamp(new Date('2026-08-22T14:03:27.123Z'))).toBe('2026-08-22T1403Z');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/csv.test.ts`
Expected: FAIL — cannot resolve `./csv`.

- [ ] **Step 3: Implement**

Create `src/lib/csv.ts`:

```ts
/**
 * Client-side CSV export.
 *
 * Wave 1 has no backend, so evidence files are built in the browser and handed
 * to the user through an object URL. Every export carries a provenance header,
 * because a bare table of rows says nothing about who pulled it, when, or under
 * which filter once it is sitting in an auditor's folder six weeks later.
 */

/** RFC 4180 field: quote when the value holds a comma, a quote, or a newline. */
function field(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface CsvManifest {
  tenant: string;
  actor: string;
  /** Already-formatted UTC instant, e.g. "2026-08-22 14:03 UTC". */
  generatedAt: string;
  /** Human-readable summary of the active filter. Omitted when unfiltered. */
  filter?: string;
  rows: number;
  /** Population the rows were drawn from, when the export is a subset. */
  of?: number;
}

export function manifestLines(m: CsvManifest): string[] {
  const lines = [`# tenant: ${m.tenant}`, `# generated: ${m.generatedAt} by ${m.actor}`];
  if (m.filter) lines.push(`# filter: ${m.filter}`);
  lines.push(m.of === undefined ? `# rows: ${m.rows}` : `# rows: ${m.rows} of ${m.of}`);
  return lines;
}

export function toCsv(headers: string[], rows: unknown[][], manifest?: CsvManifest): string {
  const out = manifest ? manifestLines(manifest) : [];
  out.push(headers.map(field).join(','));
  for (const row of rows) out.push(row.map(field).join(','));
  return out.join('\r\n');
}

/** UTC filename stamp, e.g. 2026-08-22T1403Z. Colons are illegal in Windows names. */
export function fileStamp(at: Date): string {
  return at.toISOString().replace(/:\d\d\.\d+Z$/, 'Z').replace(/:/g, '');
}

/** Hand a built file to the browser. No-ops where the DOM APIs are absent (tests). */
export function downloadFile(
  filename: string,
  contents: string,
  mime = 'text/csv;charset=utf-8',
): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/csv.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Make the inventory export produce a file**

In `src/features/discover/InventoryScreen.tsx`, `BulkBar` needs the selected rows, not just their ids. Change its props to `{ selected, rows, onClear }` where `rows: Identity[]`, pass `rows={d.rows}` at the call site, and replace `exportSelected` with:

```tsx
  const exportSelected = () => {
    const chosen = rows.filter((r) => selected.has(r.id));
    const at = new Date();
    const csv = toCsv(
      ['id', 'name', 'type', 'clouds', 'risk_score', 'risk_band', 'status', 'owner', 'last_seen_utc'],
      chosen.map((r) => [
        r.id,
        r.name,
        NHI_TYPE_LABELS[r.type],
        [...new Set(r.sources.map((s) => s.cloud))].join(' '),
        r.riskScore,
        r.riskBand,
        r.status,
        r.owner ?? '',
        r.lastSeen,
      ]),
      {
        tenant: 'Acme Corp (synthetic)',
        actor: actorEmail,
        generatedAt: `${at.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
        rows: chosen.length,
      },
    );
    downloadFile(`acrivault-identities-${fileStamp(at)}.csv`, csv);
    toast(`Exported ${count(chosen.length)} ${chosen.length === 1 ? 'identity' : 'identities'}`, {
      description: 'CSV file downloaded.',
    });
  };
```

Add `import { downloadFile, fileStamp, toCsv } from '@/lib/csv';` and `import type { Identity } from '@/mocks/types';`. Resolve `actorEmail` inside `BulkBar` from the signed-in user, the same pair the Users screen already uses:

```tsx
  const actorId = useAuthStore((s) => s.userId);
  const users = useUsers();
  const actorEmail = users.data?.find((u) => u.id === actorId)?.email ?? 'unknown actor';
```

with `import { useAuthStore } from '@/stores/auth';` and `import { useUsers } from '@/features/admin/queries';`.

`useInventory`'s query key is `['inventory', filter, sort]`, so nothing here needs to invalidate it — the export reads the rows already in hand.

- [ ] **Step 6: Verify and commit**

Run: `npm run typecheck && npx vitest run && npm run lint`
Expected: all clean. In the browser, select three rows and export: a `.csv` downloads whose first four lines are the manifest.

```bash
git add src/lib/csv.ts src/lib/csv.test.ts src/features/discover/InventoryScreen.tsx
git commit -m "feat(export): make the inventory export produce a real file

Audit point 41. Every export was a toast, so nothing left the product as
evidence. Adds an RFC 4180 writer with a provenance header naming the tenant,
the actor, the UTC instant and the active filter, and wires the inventory
export to it. The audit log follows in the next commit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Audit log object filter, date range, retention, export (point 42)

Already ships with append-only messaging, actor/action/target columns, search and a role-gated export. Missing four things.

**Files:**
- Modify: `src/mocks/types.ts`
- Modify: `src/mocks/generators.ts:536-590`
- Modify: `src/mocks/api.ts` (`listAudit`, `appendAudit`)
- Modify: `src/mocks/platform.test.ts:46-50`
- Create: `src/mocks/audit.test.ts`
- Modify: `src/features/platform/queries.ts`
- Modify: `src/features/platform/AuditScreen.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/mocks/audit.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { AUDIT_OBJECTS } from './types';
import { listAudit } from './api';
import { useUiStore } from '@/stores/ui';

beforeAll(() => useUiStore.getState().setLatency(0));

describe('audit filtering', () => {
  it('classifies every entry against a known object', async () => {
    const rows = await listAudit();
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((e) => AUDIT_OBJECTS.includes(e.object))).toBe(true);
  });

  it('the object filter partitions the log exactly', async () => {
    const all = await listAudit();
    let sum = 0;
    for (const object of AUDIT_OBJECTS) {
      sum += (await listAudit({ objects: [object] })).length;
    }
    expect(sum).toBe(all.length);
  });

  it('search matches the target, not just the actor and action', async () => {
    const all = await listAudit();
    const withTarget = all.find((e) => e.target.length > 3);
    if (!withTarget) throw new Error('fixture has no targeted entry');
    const hits = await listAudit({ search: withTarget.target });
    expect(hits.some((e) => e.id === withTarget.id)).toBe(true);
  });

  it('the date range is inclusive at both ends', async () => {
    const all = await listAudit();
    const oldest = all[all.length - 1];
    const newest = all[0];
    const only = await listAudit({ from: oldest.at, to: oldest.at });
    expect(only.some((e) => e.id === oldest.id)).toBe(true);
    expect(only.some((e) => e.id === newest.id)).toBe(false);
  });

  it('combines filters rather than replacing them', async () => {
    const users = await listAudit({ objects: ['user'] });
    if (users.length === 0) throw new Error('fixture has no user entries');
    const narrowed = await listAudit({ objects: ['user'], search: users[0].actor });
    expect(narrowed.every((e) => e.object === 'user')).toBe(true);
    expect(narrowed.length).toBeLessThanOrEqual(users.length);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/mocks/audit.test.ts`
Expected: FAIL — `AUDIT_OBJECTS` is not exported from `./types`.

- [ ] **Step 3: Type the action vocabulary**

In `src/mocks/types.ts`, replace the `AuditEntry` interface with:

```ts
export const AUDIT_OBJECTS = ['identity', 'policy', 'user', 'session', 'cloud', 'tenant'] as const;
export type AuditObject = (typeof AUDIT_OBJECTS)[number];

/**
 * Every action the product writes to the log, as a closed set.
 *
 * A union rather than a string: ACTION_OBJECT below is a Record over it, so the
 * compiler refuses a new action that nobody has classified. That is what keeps
 * the object filter from silently under-reporting.
 */
export const AUDIT_ACTIONS = [
  'acknowledged alert',
  'resolved alert',
  'assigned owner',
  'requested rotation',
  'executed emergency rotation',
  'recommended quarantine',
  'approved quarantine',
  'declined quarantine',
  'approved rotation',
  'declined rotation',
  'released from quarantine',
  'marked session reviewed',
  'quarantined session',
  'tested policy',
  'activated policy',
  'reactivated policy',
  'suspended policy',
  'archived policy',
  'added user',
  'edited user',
  'deleted user',
  'suspended user',
  'reactivated user',
  'changed user role',
  'resent invitation',
  'connected cloud',
  'updated SSO config',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** What kind of thing each action acts on. Exhaustive by construction. */
export const ACTION_OBJECT: Record<AuditAction, AuditObject> = {
  'acknowledged alert': 'identity',
  'resolved alert': 'identity',
  'assigned owner': 'identity',
  'requested rotation': 'identity',
  'executed emergency rotation': 'identity',
  'recommended quarantine': 'identity',
  'approved quarantine': 'identity',
  'declined quarantine': 'identity',
  'approved rotation': 'identity',
  'declined rotation': 'identity',
  'released from quarantine': 'identity',
  'marked session reviewed': 'session',
  'quarantined session': 'session',
  'tested policy': 'policy',
  'activated policy': 'policy',
  'reactivated policy': 'policy',
  'suspended policy': 'policy',
  'archived policy': 'policy',
  'added user': 'user',
  'edited user': 'user',
  'deleted user': 'user',
  'suspended user': 'user',
  'reactivated user': 'user',
  'changed user role': 'user',
  'resent invitation': 'user',
  'connected cloud': 'cloud',
  'updated SSO config': 'tenant',
};

export const AUDIT_OBJECT_LABELS: Record<AuditObject, string> = {
  identity: 'Identity',
  policy: 'Policy',
  user: 'User',
  session: 'Session',
  cloud: 'Cloud',
  tenant: 'Tenant',
};

/**
 * How long entries are retained before archival.
 * // ASSUMPTION: 12 months is a placeholder chosen to be defensible for SOC 2
 * // Type I. It is a policy decision with cost and legal consequences and needs
 * // sign-off; if it is not signed off, drop the figure from the sentence.
 */
export const AUDIT_RETENTION_LABEL = '12 months';

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: AuditAction;
  /** What kind of thing the action acted on. Derived from `action`. */
  object: AuditObject;
  target: string;
  detail?: string;
} // append-only
```

- [ ] **Step 4: Classify on write and on seed**

In `src/mocks/generators.ts`, add `object: ACTION_OBJECT[action],` to the pushed entry inside `generateAudit`, and type the local `actions` tuple as `ReadonlyArray<[AuditAction, () => string]>`. Import `ACTION_OBJECT` and `type AuditAction`.

In `src/mocks/api.ts`, change `appendAudit`'s signature to `function appendAudit(action: AuditAction, target: string, detail?: string): void` and add `object: ACTION_OBJECT[action],` to the pushed entry. Change `setUserStatus`'s third parameter to `action: AuditAction`. Import `ACTION_OBJECT` and `type AuditAction`.

The compiler now names any call site writing an unclassified action — that is the point. Fix each by adding the string to `AUDIT_ACTIONS` and `ACTION_OBJECT`.

- [ ] **Step 5: Filter the log**

In `src/mocks/api.ts`, replace `listAudit` with:

```ts
export interface AuditFilter {
  /** Matches actor, action, target, or detail. */
  search?: string;
  objects?: AuditObject[];
  /** Inclusive ISO bounds on `at`. */
  from?: string;
  to?: string;
}

export function listAudit(filter: AuditFilter = {}): Promise<AuditEntry[]> {
  return respond(() => {
    if (isEmptyForced()) return [];
    let rows = [...getDataset().audit];
    if (filter.objects?.length) {
      const objects = filter.objects;
      rows = rows.filter((a) => objects.includes(a.object));
    }
    // Inclusive at both ends: a reader picking one day means that whole day.
    if (filter.from) rows = rows.filter((a) => a.at >= filter.from!);
    if (filter.to) rows = rows.filter((a) => a.at <= filter.to!);
    if (filter.search) {
      const q = filter.search.toLowerCase();
      rows = rows.filter((a) =>
        `${a.actor} ${a.action} ${a.target} ${a.detail ?? ''}`.toLowerCase().includes(q),
      );
    }
    return rows;
  });
}
```

Update the existing assertion in `src/mocks/platform.test.ts` (the `audit search filters by actor or action` case) — search now covers target and detail too:

```ts
  it('audit search matches actor, action, target, or detail', async () => {
    const all = await listAudit();
    expect(all.length).toBeGreaterThan(0);
    const filtered = await listAudit({ search: 'system' });
    expect(
      filtered.every((e) =>
        `${e.actor} ${e.action} ${e.target} ${e.detail ?? ''}`.toLowerCase().includes('system'),
      ),
    ).toBe(true);
  });
```

Update `useAudit` in `src/features/platform/queries.ts`:

```ts
export function useAudit(filter: AuditFilter = {}) {
  return useQuery({ queryKey: ['audit', filter], queryFn: () => listAudit(filter) });
}
```

Import `type AuditFilter` from `@/mocks/api`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/mocks/audit.test.ts src/mocks/platform.test.ts`
Expected: PASS.

- [ ] **Step 7: Build the toolbar, the retention line, and the real export**

In `src/features/platform/AuditScreen.tsx`, replace the search-only state with the full filter. Add the imports:

```tsx
import { AUDIT_OBJECTS, AUDIT_OBJECT_LABELS, AUDIT_RETENTION_LABEL, type AuditObject } from '@/mocks/types';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { Select } from '@/components/ui/Select';
import { downloadFile, fileStamp, toCsv } from '@/lib/csv';
```

Add above the component:

```tsx
const RANGES = [
  { value: 'all', label: 'All time', days: 0 },
  { value: '7', label: 'Last 7 days', days: 7 },
  { value: '30', label: 'Last 30 days', days: 30 },
  { value: '90', label: 'Last 90 days', days: 90 },
];
```

Inside the component, add:

```tsx
  const [objects, setObjects] = useState<AuditObject[]>([]);
  const [range, setRange] = useState('all');
  const days = RANGES.find((r) => r.value === range)?.days ?? 0;
  const from = days > 0 ? new Date(Date.now() - days * 86400000).toISOString() : undefined;
  const filterSummary = [
    search ? `search="${search}"` : null,
    objects.length ? `object=${objects.join('|')}` : null,
    days > 0 ? `last ${days} days` : null,
  ]
    .filter(Boolean)
    .join(', ');
```

and change the query to `const query = useAudit({ search: search || undefined, objects, from });`.

Replace `exportLog` with:

```tsx
  const exportLog = () => {
    const entries = query.data ?? [];
    const at = new Date();
    const csv = toCsv(
      ['at_utc', 'actor', 'object', 'action', 'target', 'detail'],
      entries.map((e) => [e.at, e.actor, e.object, e.action, e.target, e.detail ?? '']),
      {
        tenant: 'Acme Corp (synthetic)',
        actor: 'current user (synthetic)',
        generatedAt: `${at.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
        filter: filterSummary || undefined,
        rows: entries.length,
      },
    );
    downloadFile(`acrivault-audit-${fileStamp(at)}.csv`, csv);
    toast(`Exported ${entries.length} audit ${entries.length === 1 ? 'entry' : 'entries'}`, {
      description: 'CSV file downloaded.',
    });
  };
```

Replace the single search field with the toolbar:

```tsx
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="min-w-64 flex-1">
          <Input
            label="Search audit"
            hideLabel
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search actor, action, or target…"
            prefix={<Search className="h-4 w-4" />}
          />
        </div>
        <FilterMenu
          label="Object"
          options={AUDIT_OBJECTS.map((o) => ({ value: o, label: AUDIT_OBJECT_LABELS[o] }))}
          selected={objects}
          onToggle={(v) =>
            setObjects((prev) =>
              prev.includes(v as AuditObject)
                ? prev.filter((o) => o !== v)
                : [...prev, v as AuditObject],
            )
          }
          onClear={() => setObjects([])}
        />
        <Select
          value={range}
          onValueChange={setRange}
          options={RANGES.map((r) => ({ value: r.value, label: r.label }))}
          ariaLabel="Date range"
          size="sm"
        />
      </div>
```

Replace the `Banner` copy so retention is stated:

```tsx
      <Banner tone="info" className="mb-4">
        Append-only. Entries are never modified or deleted — auditors depend on it. Retained{' '}
        <span className="font-medium">{AUDIT_RETENTION_LABEL}</span>, then archived to cold storage.
      </Banner>
```

Change the `CardHeader` title so it states the filtered count against the whole:

```tsx
            <CardHeader title={`${entries.length} entries${filterSummary ? ` · filtered` : ''}`} />
```

- [ ] **Step 8: Verify and commit**

Run: `npm run typecheck && npx vitest run && npm run lint`
Expected: all clean. In the browser, the Object menu narrows the table, the range Select narrows it further, the two combine, and Export downloads a CSV whose manifest names the active filter.

```bash
git add src/mocks src/features/platform
git commit -m "feat(audit): add object and date filters, stated retention, and a real export

Audit point 42. Adds a closed AuditAction union with a compiler-enforced
object classification, widens search to target and detail, adds an inclusive
date range, states the retention period, and makes Export write a file.

The 12-month retention figure is a placeholder pending sign-off.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Reach a user's audit trail (point 38)

Checked against the build: role changes, suspensions, invites, edits and deletions are all written to the log today. The gap is retrieval — search never matched the target, and no row on the Users screen linked to the trail. Task 10 fixed the search; this adds the path.

**Files:**
- Modify: `src/features/platform/AuditScreen.tsx`
- Modify: `src/features/admin/UsersScreen.tsx`

- [ ] **Step 1: Seed the audit filter from the URL**

In `src/features/platform/AuditScreen.tsx`, import `useSearchParams` from `react-router-dom` and initialise both pieces of state from the query string so a link can land pre-filtered:

```tsx
  const [params] = useSearchParams();
  const initialTarget = params.get('target') ?? '';
  const [input, setInput] = useState(initialTarget);
  const [search, setSearch] = useState(initialTarget);
  const [objects, setObjects] = useState<AuditObject[]>(
    params.get('object') ? [params.get('object') as AuditObject] : [],
  );
```

- [ ] **Step 2: Add the row action**

In `src/features/admin/UsersScreen.tsx`, import `History` from `lucide-react` and `useNavigate` from `react-router-dom`, add `const navigate = useNavigate();` beside the other hooks, and add a menu item after Edit inside `DropdownMenuContent`:

```tsx
                          <DropdownMenuItem
                            onSelect={() =>
                              navigate(`/audit?object=user&target=${encodeURIComponent(u.email)}`)
                            }
                          >
                            <span className="inline-flex items-center gap-2">
                              <History className="h-3.5 w-3.5" aria-hidden="true" /> View audit trail
                            </span>
                          </DropdownMenuItem>
```

`onSelect` and not `asChild`: the local `DropdownMenuItem` wrapper in `src/components/ui/DropdownMenu.tsx` accepts only `children`, `onSelect`, `disabled`, `selected`, `className` and `title` — it does not forward `asChild` to Radix, so a nested `<Link>` would render outside the menu's keyboard handling.

This item is deliberately not gated on `canAct` — reading the trail is a view capability, and every role that can see the Users screen can read the log.

- [ ] **Step 3: Verify and commit**

Run: `npm run typecheck && npx vitest run && npm run lint`
Expected: all clean. In the browser, Users → row menu → View audit trail lands on `/audit` pre-filtered to that user, showing their role change, edit and creation entries.

```bash
git add src/features/platform/AuditScreen.tsx src/features/admin/UsersScreen.tsx
git commit -m "feat(audit): reach a user's trail from their row

Audit point 38. The entries already existed; nothing could find them. Search
now covers the target (point 42) and every user row links into the log
pre-filtered to that person.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Sessions and access controls (point 44)

SSO, MFA enrolment and confirm-before-acting already ship. All three of the audit's specifics are absent.

**Files:**
- Modify: `src/mocks/types.ts`, `src/mocks/generators.ts`, `src/mocks/api.ts`
- Modify: `src/features/platform/queries.ts`
- Create: `src/features/platform/SessionAccessCard.tsx`
- Modify: `src/features/platform/SettingsScreen.tsx`

- [ ] **Step 1: Add the type and the fixture**

In `src/mocks/types.ts`, add:

```ts
/**
 * Tenant session and step-up policy.
 * // ASSUMPTION: enforcement is upstream; this surface only states the policy.
 */
export interface SessionPolicy {
  idleTimeoutMinutes: number;
  absoluteSessionHours: number;
  /** Require re-authentication before a sensitive action, distinct from confirming it. */
  stepUpOnSensitive: boolean;
}
```

Add `sessionPolicy: SessionPolicy;` to the `Tenant` interface, and add `'updated session policy'` to `AUDIT_ACTIONS` with `'updated session policy': 'tenant',` in `ACTION_OBJECT`.

In `src/mocks/generators.ts`, add to the object `generateTenant` returns:

```ts
    sessionPolicy: { idleTimeoutMinutes: 30, absoluteSessionHours: 12, stepUpOnSensitive: true },
```

- [ ] **Step 2: Add the API**

In `src/mocks/api.ts`, append:

```ts
export function getSessionPolicy(): Promise<SessionPolicy> {
  return respond(() => ({ ...getDataset().tenant.sessionPolicy }));
}

export function updateSessionPolicy(patch: Partial<SessionPolicy>): Promise<SessionPolicy> {
  return respond(() => {
    assertActorCan('settings.manage');
    const tenant = getDataset().tenant;
    tenant.sessionPolicy = { ...tenant.sessionPolicy, ...patch };
    appendAudit(
      'updated session policy',
      tenant.name,
      `Idle ${tenant.sessionPolicy.idleTimeoutMinutes} min, absolute ${tenant.sessionPolicy.absoluteSessionHours} h, step-up ${tenant.sessionPolicy.stepUpOnSensitive ? 'on' : 'off'}.`,
    );
    return { ...tenant.sessionPolicy };
  });
}
```

Add `SessionPolicy` to the type import block.

In `src/features/platform/queries.ts`, add:

```ts
export function useSessionPolicy() {
  return useQuery({ queryKey: ['session-policy'], queryFn: getSessionPolicy });
}

export function useUpdateSessionPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSessionPolicy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-policy'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}
```

- [ ] **Step 3: Build the card**

Create `src/features/platform/SessionAccessCard.tsx`:

```tsx
import { AlertTriangle } from 'lucide-react';
import { useSessionPolicy, useUpdateSessionPolicy } from './queries';
import { ROLES, ROLE_LABELS } from '@/lib/permissions';
import { Badge } from '@/components/ui/Badge';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { Select } from '@/components/ui/Select';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { useCan } from '@/components/ui/Can';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';

const IDLE_OPTIONS = [15, 30, 60, 120].map((m) => ({ value: String(m), label: `${m} minutes` }));
const ABSOLUTE_OPTIONS = [8, 12, 24].map((h) => ({ value: String(h), label: `${h} hours` }));

/**
 * MFA requirement per role.
 *
 * Rendered read-only on purpose: this asserts a policy the permission matrix
 * does not yet define, and an editable control would let an admin set something
 * the enforcement layer cannot honour.
 * // ASSUMPTION: Architect-owned, pending the permission matrix.
 */
const MFA_BY_ROLE: Record<string, string> = {
  'tenant-owner': 'Required',
  'tenant-admin': 'Required',
  'security-admin': 'Required',
  analyst: 'Required for sensitive actions',
  viewer: 'Optional',
};

const SENSITIVE = 'Quarantine, emergency rotation, role change, user deletion';

export function SessionAccessCard() {
  const policy = useSessionPolicy();
  const update = useUpdateSessionPolicy();
  const canManage = useCan('settings.manage');

  const save = (patch: Parameters<typeof update.mutate>[0]) =>
    update.mutate(patch, {
      onSuccess: () => toast('Session policy updated', { tone: 'success' }),
      onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
    });

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Sessions & access"
        description="How long a session lives, and what it takes to act inside one."
      />
      <CardBody>
        <QueryBoundary
          query={policy}
          loadingFallback={<SkeletonTableRows rows={4} cols={2} />}
          isEmpty={() => false}
        >
          {(p) => (
            <div className="divide-y divide-border">
              <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0">
                <span className="text-[length:var(--fs-small)] text-text">Idle timeout</span>
                <Select
                  value={String(p.idleTimeoutMinutes)}
                  onValueChange={(v) => save({ idleTimeoutMinutes: Number(v) })}
                  options={IDLE_OPTIONS}
                  ariaLabel="Idle timeout"
                  size="sm"
                  disabled={!canManage}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="text-[length:var(--fs-small)] text-text">Absolute session limit</span>
                <Select
                  value={String(p.absoluteSessionHours)}
                  onValueChange={(v) => save({ absoluteSessionHours: Number(v) })}
                  options={ABSOLUTE_OPTIONS}
                  ariaLabel="Absolute session limit"
                  size="sm"
                  disabled={!canManage}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[length:var(--fs-small)] text-text">
                    Re-authenticate before sensitive actions
                  </span>
                  <span className="block text-[length:var(--fs-micro)] text-text-tertiary">{SENSITIVE}</span>
                </span>
                <Switch
                  checked={p.stepUpOnSensitive}
                  onCheckedChange={(v) => save({ stepUpOnSensitive: v })}
                  disabled={!canManage}
                  ariaLabel="Re-authenticate before sensitive actions"
                />
              </div>
              <div className="py-2.5 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[length:var(--fs-small)] text-text">MFA required by role</span>
                  <Badge tone="warning" icon={<AlertTriangle className="h-3 w-3" />}>Read-only</Badge>
                </div>
                <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                  {ROLES.map((role) => (
                    <div key={role} className="contents">
                      <dt className="text-[length:var(--fs-small)] text-text-tertiary">{ROLE_LABELS[role]}</dt>
                      <dd className="text-[length:var(--fs-small)] text-text-secondary">{MFA_BY_ROLE[role]}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-[length:var(--fs-micro)] text-text-tertiary">
                  Not editable yet: this asserts a policy the permission matrix does not define. Making
                  it settable before the matrix closes would let an admin save something enforcement
                  cannot honour.
                </p>
              </div>
            </div>
          )}
        </QueryBoundary>
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 4: Mount it**

In `src/features/platform/SettingsScreen.tsx`, import `SessionAccessCard` and render it inside the grid, after the "Sign-in & SSO" card.

- [ ] **Step 5: Verify and commit**

Run: `npm run typecheck && npx vitest run && npm run lint`
Expected: all clean. In the browser as Tenant Admin the three controls save and write an audit entry; as an Analyst all three are disabled and the MFA table is read-only for everyone.

```bash
git add src/mocks src/features/platform
git commit -m "feat(settings): add session timeout, step-up re-auth, and MFA policy

Audit point 44. Idle timeout, absolute session limit and step-up before
sensitive actions are editable and audited. MFA-by-role renders read-only with
its dependency stated: it presupposes a permission matrix that is still open.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Sticky identity column and hover lift (point 51)

Three of five already ship — sticky header, hairline dividers, fixed row height. These are the two that do not.

**Files:**
- Modify: `src/features/discover/IdentityTable.tsx`

- [ ] **Step 1: Remove the grid gap so the pinned pair has no seam**

Two sticky cells separated by a `gap-2` leave an 8px strip of scrolled content between them. Move the gutter inside the cells: in `IdentityTable.tsx`, change the header row and the body row `className` from `gap-2 px-3` to `px-3` (both places), and add `pr-2` to every gridcell and columnheader except the last.

- [ ] **Step 2: Pin the first two columns**

Give the row an explicit background so `bg-inherit` on the pinned cells has something to inherit. In the body row's `cn(...)`, add `bg-surface` before the `hover:` classes and add `relative` so the hover shadow can layer:

```tsx
                    'grid cursor-pointer items-center border-b border-border px-3 outline-none relative bg-surface',
```

On the select gridcell add `sticky left-0 z-[var(--z-raised)] bg-inherit`, and on the name gridcell add `sticky left-10 z-[var(--z-raised)] bg-inherit` — `left-10` is 40px, the width of the select track in `GRID`.

Apply the same two classes to the matching header cells, with `bg-surface-2` in place of `bg-inherit` (the header carries its own surface).

- [ ] **Step 3: Show the divider only once the table is actually scrolled**

Add to the component:

```tsx
  const [scrolledX, setScrolledX] = useState(false);
```

Put `onScroll={(e) => setScrolledX(e.currentTarget.scrollLeft > 0)}` on the `overflow-x-auto` wrapper, and add to the name cell's classes:

```tsx
                      scrolledX && 'shadow-[6px_0_6px_-6px_rgba(0,0,0,0.75)]',
```

A permanent divider on an unscrolled table is a line that means nothing.

- [ ] **Step 4: Add the hover lift**

Add to the body row's `cn(...)`, replacing the bare `hover:bg-surface-hover`:

```tsx
                    'transition-[background-color,box-shadow] duration-[var(--dur-1)]',
                    'hover:bg-surface-hover hover:shadow-[0_-1px_0_var(--border-strong),0_2px_6px_rgba(0,0,0,0.35)]',
                    'motion-safe:hover:-translate-y-px',
```

The row keeps its fixed height — the lift is a shadow plus a 1px paint offset, so the virtualiser's uniform row-height assumption still holds.

- [ ] **Step 5: Verify in the browser**

This task is the one place in the plan where the classes need eyes on them. Narrow the window until the inventory table scrolls horizontally, then confirm:

- the identity name and its checkbox stay pinned while the other columns scroll under them;
- no strip of scrolled content shows between the checkbox and the name;
- the divider shadow appears only once `scrollLeft > 0`;
- hovering a row lifts it without changing row height or shifting the rows below;
- the checkbox is still centred in its column — if `pr-2` has pushed it off, drop `pr-2` from that one cell and keep `left-10`.

Run: `npm run typecheck && npx vitest run && npm run lint`
Expected: all clean.

- [ ] **Step 6: Commit**

```bash
git add src/features/discover/IdentityTable.tsx
git commit -m "feat(inventory): pin the identity column and lift rows on hover

Audit point 51. Scrolling right lost the one column that says which row you
are reading. The identity and its checkbox now pin, with a divider that
appears only once the table is scrolled, and hover is a shadow lift rather
than a flat background swap. Row height is unchanged, so the virtualiser's
uniform-height assumption still holds.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Full verification pass

- [ ] **Step 1: Run everything**

```bash
npm run typecheck && npm run lint && npx vitest run
```

Expected: typecheck clean, lint clean, every suite green including the four new files (`nav.test.ts`, `sources.test.ts`, `act.test.ts`, `audit.test.ts`, `csv.test.ts`) and the two modified ones (`inventory.test.ts`, `platform.test.ts`).

- [ ] **Step 2: Walk the twelve points in the browser**

Start the dev server and confirm each, in order:

1. **3** — Dashboard reads `See` / `Dashboard`; Rehearsals reads `Know · Resilience` / `Recovery Rehearsals`; the rail says Policies; the browser tab title matches each h1.
2. **4** — top-bar chip reads `3/3 sources healthy`; Scenario Switcher → Azure failing turns it amber and `/settings/sources` names `AuthorizationFailed`.
3. **5** — `/act/quarantine` lists contained identities, each naming a policy, an admin, or a session review.
4. **7** — as Analyst, Recommend quarantine; as Tenant Admin, the rail badge increments and the request is approvable.
5. **14** — the Privilege drift chip opens its methodology popover by click and by Enter.
6. **26** — the Cross-cloud pill filters, and multi-cloud rows carry a cloud-count badge.
7. **34** — as Auditor, `/settings/users` names the role and the remedy.
8. **38** — Users → row menu → View audit trail lands pre-filtered.
9. **41** — the inventory export downloads a CSV with a manifest header.
10. **42** — Object and date filters combine; the retention sentence is in the banner; Export writes a file.
11. **44** — Settings › Sessions & access saves and audits; MFA-by-role is read-only.
12. **51** — the identity column pins and rows lift on hover.

- [ ] **Step 3: Confirm both themes and reduced motion**

Toggle to light theme and re-check the three new screens and the coverage chip. Turn on Reduced motion in the Scenario Switcher and confirm the hover lift's translate stops while the shadow remains.

- [ ] **Step 4: Open the pull request**

```bash
git push -u origin HEAD
gh pr create --title "Audit tracker v5: close the twelve accepted points" --body "$(cat <<'BODY'
Closes audit tracker points 3, 4, 5, 7, 14, 26, 34, 38, 41, 42, 44, 51.

Plan: docs/superpowers/plans/2026-08-31-audit-tracker-v5-accepted-batch.md

Four assumptions need sign-off before the demo — each is marked in code:
- audit retention of 12 months (point 42)
- privilege-drift methodology wording (point 14)
- approvals scope limited to the two gated actions (point 7)
- per-role MFA policy rendered read-only pending the permission matrix (point 44)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

---

## Self-review

**Spec coverage.** All twelve selected points map to a task: 3→1, 4→2+3, 5→4, 7→5, 26→6, 14→7, 34→8, 41→9, 42→10, 38→11, 44→12, 51→13. Nothing in the selection is unassigned.

**Cross-task type consistency.**
- `AuditAction` (task 10) must include the six strings tasks 4 and 5 introduce — `released from quarantine`, `recommended quarantine`, `approved quarantine`, `declined quarantine`, `approved rotation`, `declined rotation` — and they are all listed in task 10's `AUDIT_ACTIONS`. Task 12 adds a seventh, `updated session policy`, and its step 1 says so. Tasks 4 and 5 write these actions before the union exists, so `appendAudit` still takes a `string` at that point; task 10 narrows the signature, and the compiler names every call site that has drifted.
- `QuarantineRecord` (task 4) is written by both `releaseFromQuarantine` (task 4) and `decideApproval` (task 5) using the same `{ kind: 'user', userId }` shape.
- `SourceHealth.oldestSyncAt` (task 2) is the only field `CoverageChip` (task 3) reads beyond `healthy`, `total` and `degraded`.
- `IdentityFacetCounts.crossCloud` (task 6) is consumed only by `InventoryFilters`.
- `useAudit` changes signature in task 10; task 11 is the only other consumer and is written against the new one.

**Known ordering constraint.** Task 1 must land before tasks 3, 4, 5 and 12, because each registers a screen through the taxonomy. Tasks 6, 8, 9 and 13 are independent and can run in any order.
