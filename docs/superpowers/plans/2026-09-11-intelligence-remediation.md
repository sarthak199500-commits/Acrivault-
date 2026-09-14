# Intelligence Module Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the seven Intelligence-module defects and gaps that are fixable inside this design build — the broken alert→session evidence link, the fixture miscalibration that flags 75% of sessions, the review record's integrity holes, and three UX/accessibility defects — each covered by a test.

**Architecture:** Every change lands in one of three layers already established by the codebase: the fixture layer (`src/mocks/generators.ts`, `dataset.ts`) for data shape, the mock API (`src/mocks/api.ts`) for guards and mutations, and the Intelligence feature folder for UI. Two changes follow the existing "post-pass" idiom in `dataset.ts` — build entities first, then wire relationships between them — rather than threading new arguments through generators. No new routes, no new dependencies.

**Tech Stack:** React 19 + TypeScript, react-router-dom, TanStack Query, Radix primitives, Tailwind with CSS-variable design tokens, Vitest + Testing Library.

---

## Scope

**In scope — issues 1, 2, 3, 4, 9, 21, 25, 28** from the module's issue register. All are fully implementable in this repo with no backend decision.

**Deliberately out of scope:**

| Item | Why not here |
|---|---|
| Issues 6, 7, 8 (one-way review, unrevisable block decision, hold gated on `session.quarantine`) | These need a product ruling, not an implementation. Do not guess at them mid-task. |
| Issue 5 (missing requirement IDs, FR collisions) | Documentation and process; no code. |
| Issues 10, 11, 12 (live updates, pagination, payload capture) | Blocked on the backend contract. |
| UX items 13–16, 17–20, 22–24, 26–27, 32–33 | Substantial design work needing exploration first (baseline visualisation, bulk actions, keyboard-shortcut scheme, mobile pattern). These deserve their own brainstorm and their own plan — do not fold them in here. |
| The RBAC inversion (AR-01 vs `lib/permissions`) | Needs a TPM/Architect decision and touches the whole product. |

## Design decisions already settled

These are locked. Do not relitigate them during implementation.

- **A session still carries no score.** Nothing in this plan adds one. If a task seems to want one, stop.
- **Quarantine stays on the identity**, never on the session.
- **An overridden hold keeps its original status and its hold banner.** The override is an additional decision layered on the record, not a rewrite of what the engine observed.
- **Alerts link to the session that was running when they fired**, resolved once at fixture-build time — not looked up at read time.
- **Filter state lives in the URL.** Task 6 and Task 7 extend the existing pattern; they do not invent a new one.

## File structure

| File | Responsibility |
|---|---|
| `src/features/intelligence/SessionReplayScreen.test.tsx` | **New.** Interaction tests for the replay screen |
| `src/mocks/generators.ts` | Anomaly rate; new `attachAlertSessions` post-pass |
| `src/mocks/dataset.ts` | Call the new post-pass |
| `src/mocks/types.ts` | `Alert.sessionId`, `AgentSession.reviewedBy`, `AgentSession.quarantineRecommendedBy` |
| `src/mocks/api.ts` | `actorEmail()` helper; undecided-hold guard; reviewer stamping |
| `src/mocks/sessions.test.ts` | Coherence tests for the calibration and the guard |
| `src/features/monitor/queries.ts` | `useAlertSession` keyed on the alert's own session |
| `src/features/monitor/AlertDetailPanel.tsx` | Use `alert.sessionId`; honest empty state |
| `src/features/intelligence/SessionReplayScreen.tsx` | Step permalink, reviewer display, hold guard UI, a11y |
| `src/features/intelligence/useSessionFilters.ts` | `heldOnly` facet |
| `src/features/intelligence/useSessionFilters.test.ts` | Tests for the facet |
| `src/features/intelligence/SessionListScreen.tsx` | Held filter pill |
| `src/components/ui/Timeline.tsx` | Truncated-reason tooltip |

---

### Task 1: Establish the replay screen's test harness

Neither Intelligence screen has an interaction test. The next six tasks change them. Build the harness first.

**Files:**
- Create: `src/features/intelligence/SessionReplayScreen.test.tsx`
- Reference only: `src/features/admin/UsersScreen.test.tsx`

- [ ] **Step 1: Read the established harness**

Run: `sed -n '1,20p' src/features/admin/UsersScreen.test.tsx`

Expected: imports showing `QueryClientProvider`, `MemoryRouter`, `TooltipProvider`, and `vi` mocking of `@/mocks/api`. Match this shape — do not invent a different one.

- [ ] **Step 2: Write the failing test**

Create `src/features/intelligence/SessionReplayScreen.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionReplayScreen } from './SessionReplayScreen';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useUiStore } from '@/stores/ui';
import type { AgentSessionWithIdentity } from '@/mocks/api';

vi.mock('@/mocks/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/mocks/api')>();
  return { ...actual, getSession: vi.fn(), getIdentity: vi.fn() };
});

const { getIdentity, getSession } = await import('@/mocks/api');

/** A five-step session with one enforced hold and one anomaly. */
export const SESSION: AgentSessionWithIdentity = {
  id: 'ses_test1',
  identityId: 'idn_test1',
  identityName: 'agent-test-00001',
  identityStatus: 'active',
  identityOwner: 'payments',
  flagged: true,
  startedAt: '2026-09-10T12:00:00.000Z',
  endedAt: '2026-09-10T12:04:00.000Z',
  anomalyCount: 1,
  blockedCount: 1,
  reviewState: 'open',
  provenance: {
    model: 'claude-sonnet-4-5',
    region: 'eu-west-1',
    spawnedBy: { kind: 'schedule', label: 'cron: hourly-reconcile' },
    credentials: ['aws:agent:111111'],
  },
  steps: [
    {
      id: 'stp_1', stepNo: 1, kind: 'prompt', at: '2026-09-10T12:00:00.000Z',
      summary: 'Scheduled trigger fired', detail: 'Captured payload (synthetic).', status: 'normal',
    },
    {
      id: 'stp_2', stepNo: 2, kind: 'tool-call', at: '2026-09-10T12:01:00.000Z',
      summary: 'delete_object(...)', detail: 'Invoked with scope admin; latency 120ms.',
      status: 'blocked', scope: 'admin',
      blockedByRule: 'POL-14 — deny destructive calls on production storage',
      holdEnforced: true,
    },
    {
      id: 'stp_3', stepNo: 3, kind: 'tool-call', at: '2026-09-10T12:02:00.000Z',
      summary: 'list_objects(bucket)', detail: 'Invoked with scope read; latency 40ms.',
      status: 'anomaly', scope: 'read', anomalyReason: 'Volume 40x the established baseline',
    },
    {
      id: 'stp_4', stepNo: 4, kind: 'model-response', at: '2026-09-10T12:03:00.000Z',
      summary: 'Summarized findings', detail: 'Captured payload (synthetic).', status: 'normal',
    },
    {
      id: 'stp_5', stepNo: 5, kind: 'model-response', at: '2026-09-10T12:04:00.000Z',
      summary: 'Returned final answer', detail: 'Captured payload (synthetic).', status: 'normal',
    },
  ],
};

export function renderReplay(session: AgentSessionWithIdentity = SESSION, path = '/intelligence/ses_test1') {
  vi.mocked(getSession).mockResolvedValue(session);
  vi.mocked(getIdentity).mockResolvedValue(null);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/intelligence/:sessionId" element={<SessionReplayScreen />} />
          </Routes>
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

describe('SessionReplayScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useUiStore.setState({ role: 'tenant-admin' });
  });

  it('opens on the first step, not on a flagged one', async () => {
    renderReplay();
    expect(await screen.findByText('Scheduled trigger fired')).toBeInTheDocument();
    expect(await screen.findByText('Step 1 of 5')).toBeInTheDocument();
  });

  it('counts the held step separately from the anomaly', async () => {
    renderReplay();
    expect(await screen.findByText('Held steps')).toBeInTheDocument();
    expect(await screen.findByText('2 flagged steps')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to see it pass or reveal harness problems**

Run: `npx vitest run src/features/intelligence/SessionReplayScreen.test.tsx`

Expected: PASS, 2 tests. If a provider is missing the render throws — add only the provider named in the error, and do not change the component to suit the test.

- [ ] **Step 4: Commit**

```bash
git add src/features/intelligence/SessionReplayScreen.test.tsx
git commit -m "test(intelligence): add an interaction harness for the replay screen"
```

---

### Task 2: Recalibrate the anomaly rate so Flagged narrows the feed

75% of sessions flag today (52 of 69). A session flags if *any* of its 5–14 steps does, so a 12% per-step rate compounds to ~70%.

**Files:**
- Modify: `src/mocks/generators.ts:446`
- Test: `src/mocks/sessions.test.ts`

- [ ] **Step 1: Write the failing test**

Append to the top-level `describe` in `src/mocks/sessions.test.ts`:

```ts
  it('flags a minority of sessions, so the Flagged facet actually narrows the feed', async () => {
    const sessions = await listSessions();
    const flagged = sessions.filter((s) => s.flagged);
    const share = flagged.length / sessions.length;
    expect(share).toBeGreaterThan(0.15);
    expect(share).toBeLessThan(0.4);
  });

  // Coherence, not just counting: a flagged session must contain a step that
  // could have caused the flag. A count-based assertion alone passes on
  // incoherent data.
  it('only flags sessions that contain an anomalous or held step', async () => {
    const sessions = await listSessions();
    for (const session of sessions.filter((s) => s.flagged)) {
      const causes = session.steps.filter((s) => s.status === 'anomaly' || s.status === 'blocked');
      expect(causes.length, session.id).toBeGreaterThan(0);
    }
  });
```

- [ ] **Step 2: Run it to verify the first test fails**

Run: `npx vitest run src/mocks/sessions.test.ts`

Expected: FAIL — "expected 0.753... to be less than 0.4". The second test passes already; that is correct, it is a regression guard.

- [ ] **Step 3: Lower the per-step anomaly rate**

In `src/mocks/generators.ts`, find:

```ts
      const anomaly = !blocked && rng.bool(0.12);
```

Replace with:

```ts
      // 0.035, not 0.12: a session flags if ANY of its 5-14 steps does, so the
      // per-step rate compounds. At 0.12 roughly 70% of sessions flagged and the
      // Flagged facet narrowed 69 rows to 52, which is not triage.
      const anomaly = !blocked && rng.bool(0.035);
```

- [ ] **Step 4: Run the full mock suite**

Run: `npx vitest run src/mocks/`

Expected: PASS. If another test asserts a hard-coded anomaly count, update that number — the fixture changed on purpose.

- [ ] **Step 5: Commit**

```bash
git add src/mocks/generators.ts src/mocks/sessions.test.ts
git commit -m "fix(mocks): flag a minority of sessions so the Flagged facet triages"
```

---

### Task 3: Link an alert to the session that raised it

`useAlertSession` calls `getLatestSessionForIdentity`, so an alert opens the agent's *most recent* session rather than its own. Any containment raised from there stamps the wrong trace as evidence.

**Files:**
- Modify: `src/mocks/types.ts` (the `Alert` interface)
- Modify: `src/mocks/generators.ts` (new export)
- Modify: `src/mocks/dataset.ts:99-104`
- Modify: `src/features/monitor/queries.ts:33-39`
- Modify: `src/features/monitor/AlertDetailPanel.tsx:27-29, 79-101`
- Test: `src/mocks/sessions.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/mocks/sessions.test.ts`:

```ts
  it('links every agent alert to a session that had already started when it fired', async () => {
    const [alerts, sessions] = await Promise.all([listAlerts(), listSessions()]);
    const byId = new Map(sessions.map((s) => [s.id, s]));
    const agentAlerts = alerts.filter((a) => a.identityType === 'ai-agent');
    expect(agentAlerts.length).toBeGreaterThan(0);

    for (const alert of agentAlerts) {
      const hasSession = sessions.some((s) => s.identityId === alert.identityId && s.startedAt <= alert.createdAt);
      if (!hasSession) continue; // nothing to link to is a legitimate outcome
      expect(alert.sessionId, alert.id).toBeTruthy();
      const linked = byId.get(alert.sessionId as string);
      expect(linked?.identityId, alert.id).toBe(alert.identityId);
      expect(linked!.startedAt <= alert.createdAt, alert.id).toBe(true);
    }
  });
```

Add `listAlerts` to the existing import from `./api` at the top of the file.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/mocks/sessions.test.ts`

Expected: FAIL — `expected undefined to be truthy`, because `sessionId` does not exist yet.

- [ ] **Step 3: Add the field to the type**

In `src/mocks/types.ts`, inside `export interface Alert`, add after `identityId`:

```ts
  /**
   * The session that was running when this alert fired. Resolved once at build
   * time, never looked up at read time: "the agent's latest session" is a
   * different session the moment the agent runs again, and the panel presents
   * whatever it opens as the evidence for the alert.
   */
  sessionId?: string;
```

- [ ] **Step 4: Add the post-pass**

In `src/mocks/generators.ts`, add near `generateSessions`:

```ts
/**
 * Attach each alert to the most recent session that had already started when the
 * alert fired. A post-pass rather than an argument to generateAlerts, matching
 * how attachQuarantineProvenance wires identities to the things that produced them.
 */
export function attachAlertSessions(alerts: Alert[], sessions: AgentSession[]): void {
  const byIdentity = new Map<string, AgentSession[]>();
  for (const session of sessions) {
    const list = byIdentity.get(session.identityId);
    if (list) list.push(session);
    else byIdentity.set(session.identityId, [session]);
  }
  for (const list of byIdentity.values()) {
    list.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }
  for (const alert of alerts) {
    const candidates = byIdentity.get(alert.identityId);
    if (!candidates) continue;
    const match = candidates.find((s) => s.startedAt <= alert.createdAt);
    if (match) alert.sessionId = match.id;
  }
}
```

Ensure `Alert` and `AgentSession` are in the file's existing `import type { ... } from './types'` list.

- [ ] **Step 5: Call it from the dataset builder**

In `src/mocks/dataset.ts`, add `attachAlertSessions` to the import list from `./generators`. Then in `build()`, replace the inline `alerts: generateAlerts(identities, SEED, NOW),` in the returned object with a hoisted const. Above `return {`, after the `approvals` line, add:

```ts
  // Alerts last: they point at sessions, so sessions must exist first.
  const alerts = generateAlerts(identities, SEED, NOW);
  attachAlertSessions(alerts, sessions);
```

and in the returned object replace that property with:

```ts
    alerts,
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/mocks/sessions.test.ts`

Expected: PASS.

- [ ] **Step 7: Point the hook at the alert's own session**

In `src/features/monitor/queries.ts`, replace the whole `useAlertSession` function and its doc comment with:

```ts
/**
 * The session an alert was raised on. Keyed on the alert's own `sessionId`, so
 * the panel shows the trace that caused the alert rather than whatever the agent
 * happened to run most recently.
 */
export function useAlertSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId as string),
    enabled: !!sessionId,
  });
}
```

Update the import at the top of the file: remove `getLatestSessionForIdentity`, add `getSession`.

- [ ] **Step 8: Update the panel and give it an honest empty state**

In `src/features/monitor/AlertDetailPanel.tsx`, replace:

```tsx
  const sessionQuery = useAlertSession(alert.identityId, identity?.type === 'ai-agent');
```

with:

```tsx
  const sessionQuery = useAlertSession(alert.sessionId);
```

Then in the `identity?.type === 'ai-agent'` section, replace the final `) : (` fallback paragraph with:

```tsx
          ) : (
            <p className="text-[length:var(--fs-small)] text-text-tertiary">
              {alert.sessionId
                ? 'The linked session could not be loaded.'
                : 'No session is linked to this alert.'}
            </p>
          )}
```

- [ ] **Step 9: Remove the now-dead API function**

Run: `grep -rn "getLatestSessionForIdentity" src/`

Expected: only the definition in `src/mocks/api.ts`. If so, delete that function. If anything else still calls it, leave it and note why in the commit body.

- [ ] **Step 10: Verify the whole suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`

Expected: PASS, no type errors.

- [ ] **Step 11: Commit**

```bash
git add src/mocks/types.ts src/mocks/generators.ts src/mocks/dataset.ts src/mocks/sessions.test.ts src/mocks/api.ts src/features/monitor/queries.ts src/features/monitor/AlertDetailPanel.tsx
git commit -m "fix(monitor): open the session an alert was raised on, not the agent's latest"
```

---

### Task 4: Refuse to review a session with an undecided hold

**Files:**
- Modify: `src/mocks/api.ts` (`markSessionReviewed`)
- Modify: `src/features/intelligence/SessionReplayScreen.tsx` (the `Actions` component)
- Test: `src/mocks/sessions.test.ts`, `src/features/intelligence/SessionReplayScreen.test.tsx`

- [ ] **Step 1: Write the failing API test**

Append to `src/mocks/sessions.test.ts`:

```ts
  it('refuses to mark a session reviewed while a held step is undecided', async () => {
    const sessions = await listSessions();
    const withHold = sessions.find((s) => s.steps.some((p) => p.status === 'blocked' && !p.blockDecision));
    expect(withHold, 'fixture must contain a session with an undecided hold').toBeTruthy();
    await expect(markSessionReviewed(withHold!.id)).rejects.toThrow(/held step/i);
  });

  it('allows review once the hold is decided', async () => {
    const sessions = await listSessions();
    const withHold = sessions.find((s) => s.steps.some((p) => p.status === 'blocked' && !p.blockDecision));
    const held = withHold!.steps.find((p) => p.status === 'blocked')!;
    await decideBlockedStep(withHold!.id, held.id, 'confirmed');
    const reviewed = await markSessionReviewed(withHold!.id);
    expect(reviewed.reviewState).toBe('reviewed');
  });
```

Add `decideBlockedStep` to the `./api` import if absent.

- [ ] **Step 2: Run it to verify the first test fails**

Run: `npx vitest run src/mocks/sessions.test.ts`

Expected: FAIL — the promise resolves instead of rejecting.

- [ ] **Step 3: Add the guard**

In `src/mocks/api.ts`, inside `markSessionReviewed`, immediately after `const session = findSession(id);`:

```ts
    // FR-006: a held step is an open question. Reviewing the session moves it out
    // of the triage flow into a collapsed section, and no surface anywhere lists
    // outstanding holds — so the decision would simply be lost.
    const undecided = session.steps.filter((s) => s.status === 'blocked' && !s.blockDecision);
    if (undecided.length > 0) {
      throw new MockApiError(
        undecided.length === 1
          ? 'Decide the held step before marking this session reviewed.'
          : `Decide the ${undecided.length} held steps before marking this session reviewed.`,
        'HOLD_UNDECIDED',
      );
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/mocks/sessions.test.ts`

Expected: PASS.

- [ ] **Step 5: Write the failing UI test**

Append inside the `describe` in `src/features/intelligence/SessionReplayScreen.test.tsx`:

```tsx
  it('disables Mark reviewed while a hold is undecided, and explains why', async () => {
    renderReplay();
    const button = await screen.findByRole('button', { name: /Mark reviewed/i });
    expect(button).toBeDisabled();
  });

  it('enables Mark reviewed once every hold is decided', async () => {
    const decided = {
      ...SESSION,
      steps: SESSION.steps.map((s) =>
        s.status === 'blocked'
          ? { ...s, blockDecision: { outcome: 'confirmed' as const, at: '2026-09-10T13:00:00.000Z' } }
          : s,
      ),
    };
    renderReplay(decided);
    const button = await screen.findByRole('button', { name: /Mark reviewed/i });
    expect(button).toBeEnabled();
  });
```

- [ ] **Step 6: Run it to verify the first fails**

Run: `npx vitest run src/features/intelligence/SessionReplayScreen.test.tsx`

Expected: FAIL — the button is enabled.

- [ ] **Step 7: Gate the button**

In `src/features/intelligence/SessionReplayScreen.tsx`, inside the `Actions` component, after the `const showRelease = ...` line add:

```tsx
  const undecidedHolds = session.steps.filter((s) => s.status === 'blocked' && !s.blockDecision).length;
```

Then replace the `showReview && (...)` block with:

```tsx
          {showReview && (
            <Tooltip
              content={
                undecidedHolds > 0
                  ? `Decide the ${undecidedHolds === 1 ? 'held step' : `${undecidedHolds} held steps`} first.`
                  : 'Record that a human has reviewed this session.'
              }
            >
              <span>
                <Button
                  variant="secondary"
                  leadingIcon={<CheckCheck className="h-4 w-4" />}
                  disabled={undecidedHolds > 0}
                  onClick={() => setConfirm('review')}
                >
                  Mark reviewed
                </Button>
              </span>
            </Tooltip>
          )}
```

`Tooltip` is already imported in this file. The wrapping `<span>` is required — a disabled button emits no pointer events, so the tooltip would never open.

- [ ] **Step 8: Run both suites**

Run: `npx vitest run src/features/intelligence/ src/mocks/`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/mocks/api.ts src/mocks/sessions.test.ts src/features/intelligence/SessionReplayScreen.tsx src/features/intelligence/SessionReplayScreen.test.tsx
git commit -m "fix(intelligence): refuse to close a session with an undecided hold"
```

---

### Task 5: Record and show who reviewed the session

`reviewedAt` is written and displayed nowhere; there is no `reviewedBy` at all. The audit trail holds the actor, but the session record cannot answer "who cleared this" without a cross-lookup.

**Files:**
- Modify: `src/mocks/types.ts` (`AgentSession`)
- Modify: `src/mocks/api.ts` (`appendAudit`, `markSessionReviewed`, `requestApproval`)
- Modify: `src/features/intelligence/SessionReplayScreen.tsx` (`SessionSummary`)
- Test: `src/mocks/sessions.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/mocks/sessions.test.ts`:

```ts
  it('stamps the reviewer on the session, not only on the audit trail', async () => {
    const sessions = await listSessions();
    const clean = sessions.find(
      (s) => s.reviewState === 'open' && !s.steps.some((p) => p.status === 'blocked' && !p.blockDecision),
    );
    expect(clean, 'fixture must contain an open session with no undecided hold').toBeTruthy();
    const reviewed = await markSessionReviewed(clean!.id);
    expect(reviewed.reviewedAt).toBeTruthy();
    expect(reviewed.reviewedBy).toMatch(/@/);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/mocks/sessions.test.ts`

Expected: FAIL — `reviewedBy` is `undefined`.

- [ ] **Step 3: Add the fields**

In `src/mocks/types.ts`, inside `AgentSession`, replace `reviewedAt?: string;` with:

```ts
  reviewedAt?: string;
  /**
   * Who cleared it, resolved from the acting principal. The audit trail already
   * records the actor, but an auditor asking "who cleared this session" should
   * not have to join two records to find out.
   */
  reviewedBy?: string;
```

and immediately below `quarantineRecommendedAt?: string;` add:

```ts
  /** Who proposed it — the same reasoning as `reviewedBy`. */
  quarantineRecommendedBy?: string;
```

- [ ] **Step 4: Extract the actor-email helper**

In `src/mocks/api.ts`, directly above `function appendAudit`, add:

```ts
/** The acting principal's email, or 'system' when no user matches. */
function actorEmail(): string {
  const { id } = currentActor();
  return getDataset().users.find((u) => u.id === id)?.email ?? 'system';
}
```

Then in `appendAudit`, replace its first three lines:

```ts
  const { id } = currentActor();
  const ds = getDataset();
  const actor = ds.users.find((u) => u.id === id)?.email ?? 'system';
```

with:

```ts
  const ds = getDataset();
  const actor = actorEmail();
```

- [ ] **Step 5: Stamp both mutations**

In `markSessionReviewed`, after `session.reviewedAt = new Date().toISOString();` add:

```ts
    session.reviewedBy = actorEmail();
```

In `requestApproval`, replace `if (source) source.quarantineRecommendedAt = request.requestedAt;` with:

```ts
    if (source) {
      source.quarantineRecommendedAt = request.requestedAt;
      source.quarantineRecommendedBy = actorEmail();
    }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/mocks/sessions.test.ts`

Expected: PASS.

- [ ] **Step 7: Display it**

In `src/features/intelligence/SessionReplayScreen.tsx`, inside `SessionSummary`, replace the `Review` stat block with:

```tsx
          <Stat label="Review">
            <span className="flex flex-col gap-0.5">
              <Badge tone={session.reviewState === 'reviewed' ? 'info' : 'warning'} className="w-fit capitalize">
                {session.reviewState}
              </Badge>
              {session.reviewState === 'reviewed' && session.reviewedBy && (
                <span className="text-[length:var(--fs-micro)] text-text-tertiary">
                  {session.reviewedBy}
                  {session.reviewedAt ? ` · ${relativeTime(session.reviewedAt)}` : ''}
                </span>
              )}
            </span>
          </Stat>
```

`relativeTime` is already imported in this file.

- [ ] **Step 8: Name the proposer in the banner**

In the same component, replace the `quarantineRecommendedAt` banner's opening sentence:

```tsx
            An analyst has recommended quarantining this agent.{' '}
```

with:

```tsx
            {session.quarantineRecommendedBy
              ? `${session.quarantineRecommendedBy} has recommended quarantining this agent.`
              : 'An analyst has recommended quarantining this agent.'}{' '}
```

- [ ] **Step 9: Run everything and typecheck**

Run: `npx vitest run && npx tsc --noEmit`

Expected: PASS, no type errors.

- [ ] **Step 10: Commit**

```bash
git add src/mocks/types.ts src/mocks/api.ts src/mocks/sessions.test.ts src/features/intelligence/SessionReplayScreen.tsx
git commit -m "feat(intelligence): stamp and show who reviewed or proposed on the session"
```

---

### Task 6: Make a step linkable

Selection is component state, so an Analyst who finds the problem at step 7 cannot send a Security Admin anything more precise than the whole session — through the middle of the propose/execute split the module is built around. The list screen already keeps its state in the URL; the replay screen should match.

**Files:**
- Modify: `src/features/intelligence/SessionReplayScreen.tsx` (the `Replay` component)
- Test: `src/features/intelligence/SessionReplayScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Append inside the `describe`:

```tsx
  it('opens on the step named in the URL', async () => {
    renderReplay(SESSION, '/intelligence/ses_test1?step=stp_3');
    expect(await screen.findByText('Step 3 of 5')).toBeInTheDocument();
    expect(await screen.findByText('Volume 40x the established baseline')).toBeInTheDocument();
  });

  it('falls back to the first step when the URL names a step that is not in this session', async () => {
    renderReplay(SESSION, '/intelligence/ses_test1?step=stp_nope');
    expect(await screen.findByText('Step 1 of 5')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/features/intelligence/SessionReplayScreen.test.tsx`

Expected: FAIL — the first test finds "Step 1 of 5".

- [ ] **Step 3: Move selection into the URL**

In `src/features/intelligence/SessionReplayScreen.tsx`, update the React import to include `useCallback`:

```tsx
import { useCallback, useMemo, useState, type ReactNode } from 'react';
```

and add `useSearchParams` to the existing `react-router-dom` import.

Then in the `Replay` component replace:

```tsx
  const [selectedId, setSelectedId] = useState(session.steps[0]?.id ?? '');
```

with:

```tsx
  // In the URL, like the list's filters: a finding is only useful if the person
  // who has to act on it can be sent straight to the step.
  const [params, setParams] = useSearchParams();
  const stepParam = params.get('step');
  const selectedId = session.steps.some((s) => s.id === stepParam)
    ? (stepParam as string)
    : (session.steps[0]?.id ?? '');
  const setSelectedId = useCallback(
    (id: string) => {
      // `replace` so arrowing through a trace does not fill the back stack.
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('step', id);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/intelligence/SessionReplayScreen.test.tsx`

Expected: PASS, all tests.

- [ ] **Step 5: Check `useState` is still needed**

Run: `grep -n "useState" src/features/intelligence/SessionReplayScreen.tsx`

Expected: still present (the dialogs use it). If there are no matches, remove `useState` from the React import.

- [ ] **Step 6: Commit**

```bash
git add src/features/intelligence/SessionReplayScreen.tsx src/features/intelligence/SessionReplayScreen.test.tsx
git commit -m "feat(intelligence): make a step linkable via ?step="
```

---

### Task 7: Add a Held-only facet to the list

Flagged merges anomalies and holds, so the loudest signal in the product cannot be isolated — even though the row cell already distinguishes the two and the ranking puts held first.

**Files:**
- Modify: `src/features/intelligence/useSessionFilters.ts`
- Modify: `src/features/intelligence/SessionListScreen.tsx`
- Test: `src/features/intelligence/useSessionFilters.test.ts`

- [ ] **Step 1: Write the failing test**

Append to the `applySessionFilter` describe in `src/features/intelligence/useSessionFilters.test.ts`:

The file already has a `row()` factory that derives `flagged` and synthesises steps from the counts. Use it rather than hand-building rows.

```ts
  it('narrows to sessions with a held step when heldOnly is set', () => {
    const rows = [
      row({ id: 'a', identityId: 'idn_a', identityName: 'agent-a', reviewState: 'open', anomalyCount: 3 }),
      row({ id: 'b', identityId: 'idn_b', identityName: 'agent-b', reviewState: 'open', blockedCount: 1 }),
      row({ id: 'c', identityId: 'idn_c', identityName: 'agent-c', reviewState: 'open' }),
    ];
    const filter: SessionFilter = {
      review: null,
      flaggedOnly: false,
      heldOnly: true,
      agentId: null,
      search: '',
      sort: 'recent',
    };
    expect(applySessionFilter(rows, filter).map((r) => r.id)).toEqual(['b']);
  });
```

Row `a` is flagged but has no held step, so `heldOnly` must exclude it — that is the distinction the facet exists to make, and a test using only flagged/unflagged rows would pass without it.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/features/intelligence/useSessionFilters.test.ts`

Expected: FAIL — a TypeScript error that `heldOnly` is not a property of `SessionFilter`.

- [ ] **Step 3: Extend the filter**

In `src/features/intelligence/useSessionFilters.ts`, add to the `SessionFilter` interface after `flaggedOnly`:

```ts
  /** Only sessions where a hard-deny rule actually held a step. */
  heldOnly: boolean;
```

In the `filter` memo, after the `flaggedOnly` line:

```ts
      heldOnly: params.get('held') === '1',
```

Add the toggle alongside `toggleFlagged`:

```ts
  const toggleHeld = useCallback(
    () =>
      update((n) => {
        if (n.get('held') === '1') n.delete('held');
        else n.set('held', '1');
      }),
    [update],
  );
```

Add `'held'` to the array inside `clearAll`, add `(filter.heldOnly ? 1 : 0)` to `activeCount`, and add `toggleHeld` to the returned object.

In `applySessionFilter`, after the `flaggedOnly` check:

```ts
    if (filter.heldOnly && s.blockedCount === 0) return false;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/intelligence/useSessionFilters.test.ts`

Expected: PASS.

- [ ] **Step 5: Add the pill**

In `src/features/intelligence/SessionListScreen.tsx`, pull `toggleHeld` out of the `useSessionFilters()` destructure. Add to the `counts` memo:

```ts
      held: all.filter((s) => s.blockedCount > 0).length,
```

Then after the Flagged pill's closing `</Tooltip>`:

```tsx
                <Tooltip content="A hard-deny rule stopped at least one step.">
                  <span>
                    <FilterPill
                      label="Held"
                      count={counts.held}
                      selected={filter.heldOnly}
                      onClick={toggleHeld}
                      icon={<Ban className="h-3.5 w-3.5" aria-hidden="true" />}
                    />
                  </span>
                </Tooltip>
```

`Ban` and `Tooltip` are already imported in this file.

- [ ] **Step 6: Run the suite and typecheck**

Run: `npx vitest run src/features/intelligence/ && npx tsc --noEmit`

Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/features/intelligence/useSessionFilters.ts src/features/intelligence/useSessionFilters.test.ts src/features/intelligence/SessionListScreen.tsx
git commit -m "feat(intelligence): add a Held-only facet to the session list"
```

---

### Task 8: Fix the two accessibility defects

The list screen's scroll container carries an explicit `tabIndex={0}` for WCAG scrollable-region-focusable; the replay's timeline scroller does not. And the timeline clips the anomaly reason — the one string FR-005 exists to surface — with no way to read the rest.

**Files:**
- Modify: `src/features/intelligence/SessionReplayScreen.tsx` (the timeline scroll container)
- Modify: `src/components/ui/Timeline.tsx`
- Test: `src/features/intelligence/SessionReplayScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Append inside the `describe`:

```tsx
  it('exposes the scrollable timeline to the keyboard', async () => {
    renderReplay();
    await screen.findByText('Scheduled trigger fired');
    const region = screen.getByRole('group', { name: 'Session steps, scrollable' });
    expect(region).toHaveAttribute('tabindex', '0');
  });

  it('keeps the full anomaly reason available when the timeline truncates it', async () => {
    renderReplay();
    const reason = await screen.findAllByTitle('Volume 40x the established baseline');
    expect(reason.length).toBeGreaterThan(0);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/features/intelligence/SessionReplayScreen.test.tsx`

Expected: FAIL — no matching role, and no element with that title.

- [ ] **Step 3: Make the scroll region focusable**

In `src/features/intelligence/SessionReplayScreen.tsx`, replace the timeline's scrolling `<div>` opening tag:

```tsx
            <div className="max-h-[16rem] overflow-y-auto px-5 pb-5 pt-3 [scrollbar-gutter:stable] md:max-h-[34rem]">
```

with:

```tsx
            <div
              // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable (WCAG scrollable-region-focusable), matching the session list's virtualised scroller
              tabIndex={0}
              role="group"
              aria-label="Session steps, scrollable"
              className="max-h-[16rem] overflow-y-auto px-5 pb-5 pt-3 [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)] md:max-h-[34rem]"
            >
```

- [ ] **Step 4: Keep the truncated reason readable**

In `src/features/intelligence/SessionReplayScreen.tsx`, in the `items` mapping, replace the anomaly-reason span:

```tsx
          {step.anomalyReason && <span className="text-crit-fg"> · {step.anomalyReason}</span>}
```

with:

```tsx
          {step.anomalyReason && (
            <span className="text-crit-fg" title={step.anomalyReason}>
              {' · '}
              {step.anomalyReason}
            </span>
          )}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/features/intelligence/SessionReplayScreen.test.tsx`

Expected: PASS.

- [ ] **Step 6: Confirm no lint regression**

Run: `npx eslint src/features/intelligence src/components/ui/Timeline.tsx`

Expected: no errors. The one `eslint-disable-next-line` added in Step 3 is deliberate and mirrors the existing exemption in `SessionListScreen.tsx`.

- [ ] **Step 7: Commit**

```bash
git add src/features/intelligence/SessionReplayScreen.tsx src/features/intelligence/SessionReplayScreen.test.tsx
git commit -m "fix(a11y): focusable timeline region and readable truncated anomaly reasons"
```

---

### Task 9: Verify the whole module in the browser

Tests do not catch layout regressions, and Tasks 4–8 all changed the verdict strip or the timeline.

- [ ] **Step 1: Run the full suite one final time**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src`

Expected: all PASS.

- [ ] **Step 2: Start the dev server**

Use the Browser pane's `preview_start` with the `acrivault` configuration. Do not run `npm run dev` from a shell.

- [ ] **Step 3: Walk the four states that changed**

Check each, at 1440px and again at 375px:

1. `/intelligence` — the Held pill appears with a plausible count, and Flagged now shows roughly a quarter of the feed rather than three-quarters.
2. `/intelligence?held=1` — narrows to sessions with a held step.
3. A session with an undecided hold — **Mark reviewed** is disabled and its tooltip explains why.
4. Click a flagged step, then copy the URL into a new tab — it opens on that step.

- [ ] **Step 4: Confirm the alert link**

Open Monitor, pick an alert on an AI agent, and follow **Open session replay**. The session it opens must have started before the alert's own timestamp.

- [ ] **Step 5: Commit any fixes, then update the reference document**

The workflow reference at `docs/` and its published artifact carry the issue register. Mark issues 1, 2, 3, 4, 9, 21, 25 and 28 as resolved, and re-capture the four screenshots showing changed states: the list's filter row, a disabled Mark reviewed, the reviewer stamp in the verdict strip, and the alert detail's session link.

---

## Out of scope, and what to do with it

Three items in the register need a decision before anyone writes code, and each will be cheaper now than after there is real audit data:

1. **Should review be reversible?** (issue 6) — today it is one-way with no warning, which is the worst of both options.
2. **Should a block decision be revisable?** (issue 7) — if the record is append-only by intent, the answer is a superseding decision, not silence.
3. **Is deciding a hold the same authority as quarantining an agent?** (issue 8) — they share `session.quarantine` today, and an override is arguably the more dangerous of the two.

The larger UX items — baseline context on anomalies, bulk review, a keyboard-shortcut scheme, saved views, and a mobile pattern for the replay — should go through `superpowers:brainstorming` before they get a plan. They are design problems, not implementation tickets.
