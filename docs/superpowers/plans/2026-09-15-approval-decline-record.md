# Approvals Decline Record Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record why a quarantine request was declined and by whom, and make decided requests reachable on Act > Approvals instead of vanishing from it.

**Architecture:** The decline reason is stored on the existing `ApprovalRequest.decided` object, captured through a required `Textarea` in the dialog that already exists, and enforced by a discriminated union at the API boundary so "approve carries no note, decline must carry one" is a compile error rather than a convention. Decided rows are scoped inside `listApprovals` by actor capability — never in the component — and the screen gains a three-segment status control plus requester and search facets, all filtered client-side over a single query cache entry.

**Tech Stack:** React 18, TypeScript, TanStack Query v5, react-router-dom 6.30.4, Tailwind with CSS custom properties, Vitest + Testing Library, Radix primitives.

**Spec:** [`docs/superpowers/specs/2026-09-15-approval-decline-record-design.md`](../specs/2026-09-15-approval-decline-record-design.md)

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/filters.ts` | `MIN_SEARCH_CHARS`, shared by all three filter hooks | Create |
| `src/features/act/useQuarantineFilters.ts` | Drop its local copy of the constant | Modify |
| `src/features/intelligence/useSessionFilters.ts` | Drop its local copy of the constant | Modify |
| `src/mocks/types.ts` | `decided.note` | Modify |
| `src/mocks/api.ts` | `ApprovalOutcome`, note validation, actor scoping, decider resolution | Modify |
| `src/features/act/useApprovalFilters.ts` | URL filter state + pure apply function | Create |
| `src/features/act/approvalsEmptyCopy.ts` | Empty-state copy keyed to the active narrowing | Create |
| `src/features/act/queries.ts` | Single cache entry, derived pending count, new mutation shape | Modify |
| `src/features/act/ApprovalsToolbar.tsx` | Segmented control + requester menu + search | Create |
| `src/features/act/ApprovalsScreen.tsx` | Decided rows, decision panel, dialog reason field | Modify |
| `src/components/ui/ConfirmDialog.tsx` | A `confirmDisabled` prop it does not have yet | Modify |
| `src/mocks/approvals.test.ts` | API behaviour and scoping | Modify |
| `src/features/act/useApprovalFilters.test.ts` | Parse + apply | Create |
| `src/features/act/approvalsEmptyCopy.test.ts` | Copy naming the narrowing | Create |
| `src/features/act/ApprovalsScreen.test.tsx` | Pending badge, decision display, reason gate | Create |

---

## Task 1: Lift `MIN_SEARCH_CHARS` to a shared module

The constant is already duplicated in `useQuarantineFilters.ts:17` and `useSessionFilters.ts:9`. Approvals would be the third copy. Three screens quietly disagreeing about when a search starts narrowing is a difference nobody would think to look for.

**Files:**
- Create: `src/lib/filters.ts`
- Modify: `src/features/act/useQuarantineFilters.ts:17`
- Modify: `src/features/intelligence/useSessionFilters.ts:9`

- [ ] **Step 1: Create the shared module**

```ts
/**
 * Filter primitives shared across the list screens.
 *
 * `MIN_SEARCH_CHARS` had two copies (Quarantine and the session list) before
 * Approvals needed a third. The value itself is arbitrary; what matters is that
 * every screen starts narrowing at the same keystroke, because a screen that
 * disagreed would look like a search bug rather than a different constant.
 */
export const MIN_SEARCH_CHARS = 2;
```

- [ ] **Step 2: Re-point Quarantine at it**

In `src/features/act/useQuarantineFilters.ts`, delete the local declaration:

```ts
/** Borrowed from the session list: don't run a search until it can narrow anything. */
export const MIN_SEARCH_CHARS = 2;
```

and add to the import block at the top:

```ts
import { MIN_SEARCH_CHARS } from '@/lib/filters';
```

Then re-export it so existing importers of this module keep working:

```ts
export { MIN_SEARCH_CHARS };
```

- [ ] **Step 3: Re-point the session list at it**

In `src/features/intelligence/useSessionFilters.ts`, delete `export const MIN_SEARCH_CHARS = 2;` and apply the same import plus re-export as Step 2.

- [ ] **Step 4: Verify nothing broke**

Run: `npx tsc -b --noEmit`
Expected: no errors.

Run: `npx vitest run src/features/act src/features/intelligence`
Expected: PASS, same counts as before the change.

- [ ] **Step 5: Commit**

```bash
git add src/lib/filters.ts src/features/act/useQuarantineFilters.ts src/features/intelligence/useSessionFilters.ts
git commit -m "refactor(filters): one MIN_SEARCH_CHARS instead of two about to be three"
```

---

## Task 2: Store the decline note on the request

**Files:**
- Modify: `src/mocks/types.ts:496-504`
- Test: `src/mocks/approvals.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/mocks/approvals.test.ts`:

```ts
describe('Act > Approvals — the decline reason', () => {
  it('stores the approver’s reason on the request and writes it to the audit log', async () => {
    const identity = pickCandidate();
    useUiStore.getState().setRole('analyst');
    const created = await requestApproval({ identityId: identity.id });
    useUiStore.getState().setRole('security-admin');

    const decided = await decideApproval(created.id, {
      decision: 'declined',
      note: 'Owner found in the CMDB; handover in flight.',
    });

    expect(decided.status).toBe('declined');
    expect(decided.decided?.note).toBe('Owner found in the CMDB; handover in flight.');

    const entry = (await listAudit()).find((e) => e.details?.includes(created.id));
    if (!entry) throw new Error('expected an audit entry naming the request');
    expect(entry.action).toBe('declined quarantine request');
    expect(entry.details).toContain('Owner found in the CMDB; handover in flight.');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/mocks/approvals.test.ts -t 'stores the approver'`
Expected: FAIL — `decideApproval` does not accept an object as its second argument.

- [ ] **Step 3: Widen the type**

In `src/mocks/types.ts`, replace the `decided` property on `ApprovalRequest`:

```ts
  /**
   * Who decided, when, and — for a refusal — why. Nested so the parts can never
   * disagree, and absent exactly while `status` is 'pending' — the same
   * status/record pairing `Identity.status === 'quarantined'` has with
   * `Identity.quarantine`. Asserted in approvals.test.ts so the invariant is not
   * left to convention.
   *
   * `note` is optional on the type because an APPROVAL carries none: the
   * containment it produces is itself the record, and the requester's `reason`
   * above already travels into it. A DECLINE must carry one, which is enforced
   * at the API boundary by `ApprovalOutcome` rather than here — a required
   * property would make the approve path lie about what it stores.
   */
  decided?: { by: string; at: string; note?: string };
```

- [ ] **Step 4: Run the type check**

Run: `npx tsc -b --noEmit`
Expected: no errors (the test still fails — that is Task 3).

- [ ] **Step 5: Commit**

```bash
git add src/mocks/types.ts src/mocks/approvals.test.ts
git commit -m "feat(approvals): make room for a decline reason on the decision record"
```

---

## Task 3: Require a reason at the API boundary

**Files:**
- Modify: `src/mocks/api.ts:1362-1432`
- Test: `src/mocks/approvals.test.ts`

- [ ] **Step 1: Write the second failing test**

Append inside the `describe` block added in Task 2:

```ts
  it('refuses a blank reason without half-deciding the request', async () => {
    const identity = pickCandidate();
    useUiStore.getState().setRole('analyst');
    const created = await requestApproval({ identityId: identity.id });
    useUiStore.getState().setRole('security-admin');

    const auditBefore = (await listAudit()).length;
    await expect(
      decideApproval(created.id, { decision: 'declined', note: '   ' }),
    ).rejects.toThrow(/reason is required/i);

    // Nothing may have moved: a decline that cannot be recorded must not happen.
    const still = getDataset().approvals.find((a) => a.id === created.id);
    expect(still?.status).toBe('pending');
    expect(still?.decided).toBeUndefined();
    expect((await listAudit()).length).toBe(auditBefore);
  });

  it('records an approval with no note, and still contains the identity', async () => {
    const identity = pickCandidate();
    useUiStore.getState().setRole('analyst');
    const created = await requestApproval({ identityId: identity.id });
    useUiStore.getState().setRole('security-admin');

    const decided = await decideApproval(created.id, { decision: 'approved' });

    expect(decided.status).toBe('approved');
    expect(decided.decided?.note).toBeUndefined();
    expect(getDataset().identityById.get(identity.id)?.status).toBe('quarantined');
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/mocks/approvals.test.ts -t 'decline reason'`
Expected: FAIL — all three tests in the block, on the argument shape.

- [ ] **Step 3: Replace `decideApproval`**

In `src/mocks/api.ts`, add the outcome union directly above the function:

```ts
/**
 * What an approver decided, and the evidence the decision has to carry.
 *
 * A union rather than `(id, decision, note?)`: the asymmetry between the two
 * outcomes is real — an approval's record is the containment it produces, a
 * refusal's record is the sentence the approver writes — and a union makes the
 * compiler hold that asymmetry instead of a reviewer. `note` cannot be passed on
 * an approval and cannot be omitted on a decline.
 */
export type ApprovalOutcome =
  | { decision: 'approved' }
  | { decision: 'declined'; note: string };
```

Then replace the body. The changed lines are marked; everything else is as it was:

```ts
export function decideApproval(id: string, outcome: ApprovalOutcome): Promise<ApprovalRequest> {
  return respond(() => {
    const ds = getDataset();
    const request = ds.approvals.find((a) => a.id === id);
    if (!request) throw new MockApiError('Approval request not found.', 'NOT_FOUND');
    if (request.status !== 'pending') {
      throw new MockApiError(
        `This request was already decided (${request.status}).`,
        'ALREADY_DECIDED',
      );
    }
    assertActorCan('session.quarantine');

    // Validated BEFORE anything is written. The union already stops a MISSING
    // note at compile time; this catches the whitespace-only string a textarea
    // can still produce, and it throws while the request is still untouched — a
    // refusal nobody can read the reason for must not be half-recorded.
    const note = outcome.decision === 'declined' ? outcome.note.trim() : undefined;
    if (outcome.decision === 'declined' && !note) {
      throw new MockApiError('A reason is required to decline a request.', 'REASON_REQUIRED');
    }

    const identity = findAgent(request.identityId);

    // Approving an already-contained identity would overwrite its existing
    // QuarantineRecord and reassign responsibility for a containment this
    // approver did not produce. Declining stays available, and is how the stale
    // row gets cleared.
    if (outcome.decision === 'approved' && identity.status === 'quarantined') {
      throw new MockApiError(
        `${identity.name} is already quarantined. Decline this request to clear it.`,
        'ALREADY_QUARANTINED',
      );
    }

    request.status = outcome.decision;
    request.decided = {
      by: currentActor().id,
      at: new Date().toISOString(),
      ...(note ? { note } : {}),
    };

    // `AgentSession.quarantineRecommendedAt` marks an OPEN recommendation — the
    // replay screen renders it as "awaiting a decision in Act > Approvals".
    // Left set after a decision, that banner would claim a decision is still
    // pending forever, and a DECLINED request would be the worst case: nothing
    // is waiting and nothing ever will. The fact itself survives in the audit
    // log and on this request, which keeps its requestedAt and its outcome.
    const source = request.fromSessionId
      ? ds.sessions.find((s) => s.id === request.fromSessionId)
      : undefined;
    if (source) source.quarantineRecommendedAt = undefined;

    // The authorization is written BEFORE the containment so the log, which is
    // newest-first, reads containment-above-decision — the order they happened.
    appendAudit(
      outcome.decision === 'approved'
        ? 'approved quarantine request'
        : 'declined quarantine request',
      identity.name,
      [
        `Request ${request.id}, raised by ${ds.users.find((u) => u.id === request.requestedBy)?.email ?? 'a removed user'}.`,
        outcome.decision === 'declined' ? 'The identity was left as it was.' : null,
        // Same shape requestApproval uses for the requester's reason, so the two
        // halves of one conversation read alike in the log.
        note ? `Reason: ${note}` : null,
      ]
        .filter(Boolean)
        .join(' '),
    );
    // The approver is answerable for the containment (`currentActor` inside
    // containIdentity), but the evidence they granted it on is the requester's
    // replay. The session already reached the queue on the request -- before
    // this it stopped there, and the containment cited nothing.
    if (outcome.decision === 'approved') {
      containIdentity(identity, request.reason, request.fromSessionId);
    }
    return { ...request };
  });
}
```

- [ ] **Step 4: Update the existing call sites in the test file**

Fourteen calls in `src/mocks/approvals.test.ts` change. The approvals are mechanical — at lines **166, 181, 193, 221, 226, 241, 297, 310**, replace the bare `'approved'` argument with `{ decision: 'approved' }`.

The declines each need a reason that fits what the test is about:

| Line | Was | Becomes |
|---|---|---|
| 167 | `decideApproval(created.id, 'declined')` | `decideApproval(created.id, { decision: 'declined', note: 'Not my call to make.' })` |
| 205 | `decideApproval(row.id, 'declined')` | `decideApproval(row.id, { decision: 'declined', note: 'Owner is accountable; leaving it in place.' })` |
| 220 | `decideApproval(row.id, 'declined')` | `decideApproval(row.id, { decision: 'declined', note: 'Clearing a stale row.' })` |
| 222 | `decideApproval(row.id, 'declined')` | `decideApproval(row.id, { decision: 'declined', note: 'Clearing a stale row.' })` |
| 244 | `decideApproval(created.id, 'declined')` | `decideApproval(created.id, { decision: 'declined', note: 'Already contained by policy; clearing the row.' })` |
| 251 | `decideApproval(row.id, 'declined')` | `decideApproval(row.id, { decision: 'declined', note: 'Already contained; clearing the row.' })` |

Lines 220 and 222 deliberately use the **same** note: 222 asserts the second call is rejected for being already decided, and a different note there would leave it ambiguous which check fired.

Line 167 is the permission test, and it keeps passing for a reason worth knowing — `assertActorCan` runs *before* the note validation, so a caller without `session.quarantine` is refused on permission whatever they wrote.

- [ ] **Step 5: Run the whole approvals suite**

Run: `npx vitest run src/mocks/approvals.test.ts`
Expected: PASS, including the three new tests.

- [ ] **Step 6: Commit**

```bash
git add src/mocks/api.ts src/mocks/approvals.test.ts
git commit -m "feat(approvals): require and record a reason when a request is declined"
```

---

## Task 4: Scope decided rows, and resolve who decided

**Files:**
- Modify: `src/mocks/api.ts:1254-1293`
- Test: `src/mocks/approvals.test.ts`

Note for the test author: `currentActor()` reads its `id` from `useAuthStore` (fixed at `CURRENT_USER_ID`) and its `role` from `useUiStore`. Switching roles does **not** switch users — so "their own" always means `usr_1` in tests, and a row raised by somebody else has to come from the seeded fixture.

- [ ] **Step 1: Write the failing test**

```ts
describe('Act > Approvals — who can see a decided request', () => {
  /**
   * A seeded request raised by SOMEONE ELSE. The role switcher changes the
   * actor's role but never their id, so a request raised inside a test is always
   * `usr_1`'s — only the fixture can supply another person's. Throws rather than
   * skips: a fixture that stopped producing one would silently turn this into a
   * test of nothing.
   */
  function pickSomeoneElsesPending(): string {
    const found = getDataset().approvals.find(
      (a) => a.status === 'pending' && a.requestedBy !== CURRENT_USER_ID,
    );
    if (!found) throw new Error('fixture: expected a pending request raised by another user');
    return found.id;
  }

  it('shows every decided request to a role that can decide', async () => {
    const id = pickSomeoneElsesPending();
    await decideApproval(id, { decision: 'declined', note: 'Owner is accountable; leaving it.' });

    const rows = await listApprovals();
    expect(rows.some((a) => a.id === id)).toBe(true);
  });

  it('hides another user’s decided request from an Analyst, but keeps their own', async () => {
    const theirs = pickSomeoneElsesPending();
    await decideApproval(theirs, { decision: 'declined', note: 'Owner is accountable.' });

    const identity = pickCandidate();
    useUiStore.getState().setRole('analyst');
    const mine = await requestApproval({ identityId: identity.id });
    useUiStore.getState().setRole('security-admin');
    await decideApproval(mine.id, { decision: 'declined', note: 'Risk is inside appetite.' });

    useUiStore.getState().setRole('analyst');
    const rows = await listApprovals();
    expect(rows.some((a) => a.id === mine.id)).toBe(true);
    expect(rows.some((a) => a.id === theirs)).toBe(false);
  });

  it('still shows an Analyst every PENDING request, whoever raised it', async () => {
    const theirs = pickSomeoneElsesPending();
    useUiStore.getState().setRole('analyst');
    const rows = await listApprovals('pending');
    expect(rows.some((a) => a.id === theirs)).toBe(true);
  });

  it('resolves who decided, so the row can say more than a user id', async () => {
    const id = pickSomeoneElsesPending();
    await decideApproval(id, { decision: 'declined', note: 'Handover in flight.' });

    const row = (await listApprovals('declined')).find((a) => a.id === id);
    if (!row) throw new Error('expected the decided row back');
    expect(row.deciderName).toBe(getDataset().users.find((u) => u.id === CURRENT_USER_ID)?.name);
    expect(row.deciderRole).toBe('Security Admin');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/mocks/approvals.test.ts -t 'who can see a decided request'`
Expected: FAIL — `deciderName` is not a property, and the Analyst sees another user's decided row.

- [ ] **Step 3: Extend `ApprovalWithContext`**

```ts
export interface ApprovalWithContext extends ApprovalRequest {
  identityName: string;
  identityType: NhiType;
  requesterName: string;
  /** Display label, or an em dash where Entra sent a person but nobody has given them a role. */
  requesterRole: string;
  /**
   * Who decided, resolved the same way. Present exactly when `decided` is.
   *
   * Resolved on READ rather than stamped, matching `quarantineLabel` above — the
   * closest analogue, and also a historical record. A decision is a fact about
   * what happened, but the NAME attached to it is a fact about a person, and the
   * useful one is their current name, not the one they had that afternoon.
   */
  deciderName?: string;
  deciderRole?: string;
}
```

- [ ] **Step 4: Resolve the decider in `withApprovalContext`**

```ts
function withApprovalContext(request: ApprovalRequest): ApprovalWithContext {
  const ds = getDataset();
  const identity = ds.identityById.get(request.identityId);
  const user = ds.users.find((u) => u.id === request.requestedBy);
  // Bound to a local const so the narrowing survives into the spread below;
  // a narrowed property access does not (same reason quarantineLabel binds
  // `record.by`), and a non-null assertion is banned.
  const decided = request.decided;
  const decider = decided ? ds.users.find((u) => u.id === decided.by) : undefined;
  return {
    ...request,
    identityName: identity?.name ?? request.identityId,
    // A request always names a real identity (requestApproval refuses otherwise),
    // so this fallback is unreachable in practice; picked over a cast because a
    // non-null assertion is banned and a wrong-looking type is worse than a
    // conservative default.
    identityType: identity?.type ?? 'service-account',
    // Soft-deleted users keep their record (deleteUser flips status), so `!user`
    // alone never catches a removed requester — same reasoning as
    // quarantineLabel above.
    requesterName: !user || user.status === 'deleted' ? 'Removed user' : user.name,
    requesterRole: user && user.role ? ROLE_LABELS[user.role] : '—',
    ...(decided
      ? {
          deciderName: !decider || decider.status === 'deleted' ? 'Removed user' : decider.name,
          deciderRole: decider && decider.role ? ROLE_LABELS[decider.role] : '—',
        }
      : {}),
  };
}
```

- [ ] **Step 5: Scope the listing**

```ts
/**
 * The queue, newest-first. `status` omitted returns every request, whatever its
 * state, so a decided one stays auditable rather than vanishing.
 *
 * PENDING rows are the shared queue: a proposer is promised sight of "what is
 * waiting" (the RoleRestricted copy on the screen says so), and that is
 * unchanged. A DECIDED row is a record, and below Security Admin you see only
 * the ones you raised. The scope is applied HERE rather than in the component
 * and takes no parameter, so there is no argument a screen could pass — or
 * forget to pass — that would widen it.
 */
export function listApprovals(status?: ApprovalStatus): Promise<ApprovalWithContext[]> {
  return respond(() => {
    if (isEmptyForced()) return [];
    const actor = currentActor();
    const seesEveryDecision = can(actor.role, 'session.quarantine');
    return getDataset()
      .approvals.filter((a) => !status || a.status === status)
      .filter((a) => a.status === 'pending' || seesEveryDecision || a.requestedBy === actor.id)
      .map(withApprovalContext)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  });
}
```

Add `CURRENT_USER_ID` to the test file's imports from `@/stores/auth` if it is not already there (it is, at line 6).

- [ ] **Step 6: Run the suite**

Run: `npx vitest run src/mocks/approvals.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/mocks/api.ts src/mocks/approvals.test.ts
git commit -m "feat(approvals): scope decided rows by actor and resolve who decided"
```

---

## Task 5: Filter state

**Files:**
- Create: `src/features/act/useApprovalFilters.ts`
- Test: `src/features/act/useApprovalFilters.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  applyApprovalFilter,
  parseApprovalParams,
  type FilterableApprovalRow,
} from './useApprovalFilters';

const row = (over: Partial<FilterableApprovalRow> = {}): FilterableApprovalRow => ({
  status: 'pending',
  requestedBy: 'usr_2',
  identityName: 'svc-billing-sync',
  requesterName: 'Kai Mensah',
  ...over,
});

describe('parseApprovalParams', () => {
  it('defaults to the pending queue when the URL says nothing', () => {
    expect(parseApprovalParams(new URLSearchParams()).view).toBe('pending');
  });

  // A hand-edited or stale link should lose the part it got wrong rather than
  // land the reader on a view that does not exist.
  it('falls back to pending for a view it does not recognise', () => {
    expect(parseApprovalParams(new URLSearchParams('status=wat')).view).toBe('pending');
  });

  it('reads the requester and search axes', () => {
    const f = parseApprovalParams(new URLSearchParams('status=declined&requester=usr_2,usr_3&q=bill'));
    expect(f.view).toBe('declined');
    expect(f.requesters).toEqual(['usr_2', 'usr_3']);
    expect(f.search).toBe('bill');
  });

  it('drops empty requester tokens rather than matching on an empty string', () => {
    expect(parseApprovalParams(new URLSearchParams('requester=,,usr_2')).requesters).toEqual(['usr_2']);
  });
});

describe('applyApprovalFilter', () => {
  const rows = [
    row({ status: 'pending', requestedBy: 'usr_2' }),
    row({ status: 'declined', requestedBy: 'usr_3', identityName: 'svc-legacy-etl' }),
    row({ status: 'approved', requestedBy: 'usr_2', identityName: 'svc-gateway' }),
  ];

  it('shows only pending in the default view', () => {
    const out = applyApprovalFilter(rows, parseApprovalParams(new URLSearchParams()));
    expect(out).toHaveLength(1);
    expect(out[0].status).toBe('pending');
  });

  it('shows every status under all', () => {
    expect(applyApprovalFilter(rows, parseApprovalParams(new URLSearchParams('status=all')))).toHaveLength(3);
  });

  it('ANDs the axes together', () => {
    const out = applyApprovalFilter(rows, parseApprovalParams(new URLSearchParams('status=all&requester=usr_2')));
    expect(out).toHaveLength(2);
  });

  // Same rule the other list screens follow: a search too short to narrow
  // anything must not narrow anything, or "Clear (1)" appears beside an
  // unchanged list.
  it('ignores a search below the minimum length', () => {
    expect(applyApprovalFilter(rows, parseApprovalParams(new URLSearchParams('status=all&q=s')))).toHaveLength(3);
  });

  it('searches the identity and the requester together', () => {
    expect(applyApprovalFilter(rows, parseApprovalParams(new URLSearchParams('status=all&q=legacy')))).toHaveLength(1);
    expect(applyApprovalFilter(rows, parseApprovalParams(new URLSearchParams('status=all&q=kai')))).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/features/act/useApprovalFilters.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the module**

```ts
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MIN_SEARCH_CHARS } from '@/lib/filters';
import type { ApprovalStatus } from '@/mocks/types';

/**
 * The three views the queue offers.
 *
 * There is deliberately no `approved` segment. An approved request produced a
 * quarantine, and Act > Quarantine is a better record of it — full provenance,
 * a release path, and the identity's own state. A fourth segment here would be
 * a thinner view of something the product already shows properly. Approved rows
 * stay reachable under `all`.
 */
export const APPROVAL_VIEWS = ['pending', 'declined', 'all'] as const;
export type ApprovalView = (typeof APPROVAL_VIEWS)[number];

export const APPROVAL_VIEW_LABELS: Record<ApprovalView, string> = {
  pending: 'Pending',
  declined: 'Declined',
  all: 'All',
};

export interface ApprovalFilter {
  view: ApprovalView;
  requesters: string[];
  search: string;
}

/**
 * The URL contract, as a pure function so it can be tested without a router.
 *
 * An unrecognised `status` falls back to `pending` rather than showing nothing:
 * the view is the reader's whole frame of reference, and a stale link should
 * land them somewhere real.
 *
 * Requester ids are NOT checked against an allowlist, unlike Quarantine's type
 * and producer menus. Their valid set is whoever happens to have raised
 * something, which is data rather than a compile-time union — so an id nobody
 * raised simply matches no rows, and `approvalsEmptyCopy` names the requester
 * filter as the cause. That is the same end the drop-unknowns rule was serving:
 * never an empty list with nothing on screen to explain it.
 */
export function parseApprovalParams(params: URLSearchParams): ApprovalFilter {
  const raw = params.get('status');
  const view: ApprovalView = (APPROVAL_VIEWS as readonly string[]).includes(raw ?? '')
    ? (raw as ApprovalView)
    : 'pending';
  return {
    view,
    requesters: (params.get('requester') ?? '').split(',').filter(Boolean),
    search: params.get('q') ?? '',
  };
}

/**
 * Approvals' filters, kept in the URL (?status / ?requester / ?q) like the
 * inventory's, the session list's and Quarantine's — so a narrowing survives
 * refresh, the back button undoes it, and an auditor can share what they are
 * looking at. That last reason is the strongest one here: the point of a
 * decision record is being able to point somebody at it.
 *
 * `update` writes through `setParams`'s functional form, but that does NOT make
 * writes compose across several calls in one tick: react-router-dom's
 * `setSearchParams` (6.30.4) hands every call in the tick the `searchParams`
 * memoised from THIS render's `location.search` — not a setState-style
 * accumulator — so several toggles fired before a re-render all read the same
 * stale list and only the last one's write survives. `clearRequesters` exists
 * because of exactly that.
 */
export function useApprovalFilters() {
  const [params, setParams] = useSearchParams();

  const filter = useMemo(() => parseApprovalParams(params), [params]);

  const update = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setView = useCallback(
    (view: ApprovalView) =>
      // Pending is the default, so it is written as the ABSENCE of the param:
      // the canonical URL for the default view has no query string at all.
      update((n) => (view === 'pending' ? n.delete('status') : n.set('status', view))),
    [update],
  );

  const setSearch = useCallback(
    (value: string) => update((n) => (value ? n.set('q', value) : n.delete('q'))),
    [update],
  );

  const toggleRequester = useCallback(
    (id: string) =>
      update((n) => {
        const current = (n.get('requester') ?? '').split(',').filter(Boolean);
        const nextList = current.includes(id)
          ? current.filter((v) => v !== id)
          : [...current, id];
        if (nextList.length) n.set('requester', nextList.join(','));
        else n.delete('requester');
      }),
    [update],
  );

  /**
   * Drop the whole requester axis in one write. NOT a loop of toggles — see the
   * `setSearchParams` note on the hook above: several calls in one tick all
   * compute from the same stale list and only the last survives, so clearing a
   * three-value menu that way removes exactly one value.
   */
  const clearRequesters = useCallback(() => update((n) => n.delete('requester')), [update]);

  const clearAll = useCallback(
    () => update((n) => ['status', 'requester', 'q'].forEach((k) => n.delete(k))),
    [update],
  );

  // The VIEW is not counted as an active filter. It is a mode the reader is
  // always in one of, not a narrowing applied on top — counting it would mean
  // "Clear (1)" sat permanently beside a list nobody had filtered. A
  // sub-minimum search does not count either, for the same reason it does not
  // narrow.
  const activeCount =
    (filter.search.trim().length >= MIN_SEARCH_CHARS ? 1 : 0) + filter.requesters.length;

  return {
    filter,
    setView,
    setSearch,
    toggleRequester,
    clearRequesters,
    clearAll,
    activeCount,
  };
}

/** The fields the filter reads. Structural, so the tests need no mock API row. */
export interface FilterableApprovalRow {
  status: ApprovalStatus;
  requestedBy: string;
  identityName: string;
  requesterName: string;
}

/**
 * Apply the filter to the loaded rows. Client-side over the whole permitted set,
 * like every peer screen. Axes AND together; values inside an axis OR.
 */
export function applyApprovalFilter<T extends FilterableApprovalRow>(
  rows: T[],
  filter: ApprovalFilter,
): T[] {
  const raw = filter.search.trim().toLowerCase();
  const needle = raw.length >= MIN_SEARCH_CHARS ? raw : '';
  return rows.filter((row) => {
    if (filter.view !== 'all' && row.status !== filter.view) return false;
    if (filter.requesters.length && !filter.requesters.includes(row.requestedBy)) return false;
    // The requester's name is in the haystack on purpose: it is what lets a
    // person's name narrow the list without reaching for the menu.
    if (needle && !`${row.identityName} ${row.requesterName}`.toLowerCase().includes(needle))
      return false;
    return true;
  });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/features/act/useApprovalFilters.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/act/useApprovalFilters.ts src/features/act/useApprovalFilters.test.ts
git commit -m "feat(approvals): URL-persisted status, requester and search filters"
```

---

## Task 6: Empty-state copy that names the narrowing

The existing copy is specifically about the pending queue ("Quarantine is the one action Wave 1 splits…"), which is a false explanation under a Declined filter.

**Files:**
- Create: `src/features/act/approvalsEmptyCopy.ts`
- Test: `src/features/act/approvalsEmptyCopy.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { approvalsEmptyCopy } from './approvalsEmptyCopy';

describe('approvalsEmptyCopy', () => {
  it('keeps the queue explanation for an unfiltered pending view', () => {
    const copy = approvalsEmptyCopy({ view: 'pending', requesters: 0, search: '' });
    expect(copy.headline).toBe('Nothing is waiting for a decision');
    expect(copy.guidance).toContain('Quarantine is the one action Wave 1 splits');
  });

  // The bug this exists to stop: the pending-queue sentence explains why the
  // QUEUE is empty. Under a Declined filter it explains nothing and is simply
  // untrue as a reason.
  it('does not explain an empty declined view with the pending queue’s reason', () => {
    const copy = approvalsEmptyCopy({ view: 'declined', requesters: 0, search: '' });
    expect(copy.headline).toBe('No request has been declined');
    expect(copy.guidance).not.toContain('Quarantine is the one action');
  });

  it('names a search term the reader actually typed', () => {
    const copy = approvalsEmptyCopy({ view: 'all', requesters: 0, search: 'svc-billing' });
    expect(copy.headline).toBe('No requests for “svc-billing”');
    expect(copy.guidance).toBe('Nothing in this view names it. Widen the filters to search every request.');
  });

  it('names the requester filter when that is what produced the empty result', () => {
    const copy = approvalsEmptyCopy({ view: 'all', requesters: 2, search: '' });
    expect(copy.headline).toBe('No requests in this view');
    expect(copy.guidance).toBe('Nothing matches the requester filter. Clear it to see every request.');
  });

  it('does not offer to widen a filter that is not applied', () => {
    const copy = approvalsEmptyCopy({ view: 'all', requesters: 0, search: '' });
    expect(copy.guidance).not.toMatch(/requester filter/i);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/features/act/approvalsEmptyCopy.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the module**

```ts
import type { ApprovalView } from './useApprovalFilters';

/**
 * Empty-state copy that names the narrowing which produced it.
 *
 * Modelled on `auditEmptyCopy`, and for the same reason: the screen's original
 * empty state explained why the PENDING QUEUE is usually empty — quarantine is
 * the one action Wave 1 splits between proposing and carrying out. Shown under a
 * Declined filter that sentence is not merely unhelpful, it is a wrong answer to
 * the question the reader is actually asking.
 */
export function approvalsEmptyCopy(filter: {
  view: ApprovalView;
  requesters: number;
  search: string;
}): { headline: string; guidance: string } {
  const { view, requesters, search } = filter;
  const narrowed = requesters > 0;

  if (search) {
    return {
      headline: `No requests for “${search}”`,
      guidance: narrowed
        ? 'Nothing under the requester filter names it. Widen the filters to search every request.'
        : 'Nothing in this view names it. Widen the filters to search every request.',
    };
  }

  if (narrowed) {
    return {
      headline: 'No requests in this view',
      guidance: 'Nothing matches the requester filter. Clear it to see every request.',
    };
  }

  if (view === 'declined') {
    return {
      headline: 'No request has been declined',
      guidance:
        'A declined request keeps its reason and the name of whoever refused it, so this is where a refusal can be read back afterwards. Nothing has been refused yet.',
    };
  }

  if (view === 'all') {
    return {
      headline: 'No requests at all',
      guidance:
        'Nothing has been proposed, approved or declined. An Analyst raises a request from a session replay or an identity, and it lands here for an admin to decide.',
    };
  }

  // The unfiltered pending queue — the original copy, unchanged. It says
  // outright what this queue does and does not cover, because an empty table
  // that implied universal two-person control would misrepresent the product.
  return {
    headline: 'Nothing is waiting for a decision',
    guidance:
      'Quarantine is the one action Wave 1 splits between proposing and carrying out: an Analyst recommends it and an admin decides. Every other action — rotation, policy activation, release from quarantine, alert resolution — executes directly for a role that holds the capability, and is recorded in the audit log rather than queued here.',
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/features/act/approvalsEmptyCopy.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/act/approvalsEmptyCopy.ts src/features/act/approvalsEmptyCopy.test.ts
git commit -m "feat(approvals): empty copy that names the filter that emptied the list"
```

---

## Task 7: One cache entry for the queue

**Files:**
- Modify: `src/features/act/queries.ts:19-85`

- [ ] **Step 1: Replace the three approval hooks**

```ts
/**
 * The propose-and-approve queue — every request the actor may see, in ONE cache
 * entry. Status is applied client-side (`applyApprovalFilter`) rather than by
 * re-fetching per status.
 *
 * That is not just a saved request. The toolbar's requester counts are computed
 * over the whole loaded set, pre-filter, so they hold still while you narrow
 * (the rule QuarantineToolbar follows). Cache the set per status and "the whole
 * set" quietly becomes "the whole set WITHIN the loaded status" — a chip reading
 * `Kai Mensah · 4` would mean "4 within Declined" while looking like a fact
 * about the queue.
 *
 * What the actor may see is decided inside `listApprovals` from the current
 * actor, so there is no scope argument to key on.
 */
export function useApprovals() {
  return useQuery({ queryKey: ['approvals'], queryFn: () => listApprovals() });
}

/**
 * How many requests are waiting. Derived from the same single entry the screen
 * reads, so the count cannot disagree with the list it summarises — previously
 * that was a promise resting on two cache entries being invalidated in step,
 * and it is now a property of there being one.
 */
export function usePendingApprovalCount(): number {
  return useApprovals().data?.filter((a) => a.status === 'pending').length ?? 0;
}
```

- [ ] **Step 2: Update the mutation to the union**

```ts
export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: ApprovalOutcome }) =>
      decideApproval(id, outcome),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['quarantined'] });
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['identity'] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['session'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}
```

Change the imports at the top of the file: drop `import type { ApprovalStatus } from '@/mocks/types';` and add `ApprovalOutcome` to the type import from `@/mocks/api`.

> **Deviation from the spec, deliberate.** The spec listed a test that
> `usePendingApprovalCount` equals the pending rows in the list. After this
> refactor both sides read the same array through the same `.filter()`, so such a
> test asserts `x === x` and would pass even if the derivation were wrong in some
> interesting way. The real risk this change introduces is on the SCREEN — the
> header badge used to be `query.data.length`, which under a Declined filter would
> count declined rows and label them pending. Task 10 tests that instead.

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: errors ONLY in `ApprovalsScreen.tsx` (it still calls `useApprovals('pending')` and passes `decision:`). Task 9 fixes those.

- [ ] **Step 4: Commit**

```bash
git add src/features/act/queries.ts
git commit -m "refactor(approvals): one query entry so facet counts cannot lie"
```

---

## Task 8: The toolbar

**Files:**
- Create: `src/features/act/ApprovalsToolbar.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { UserRound } from 'lucide-react';
import type { ApprovalWithContext } from '@/mocks/api';
import { DebouncedSearch } from '@/components/ui/DebouncedSearch';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  APPROVAL_VIEWS,
  APPROVAL_VIEW_LABELS,
  type ApprovalView,
  type useApprovalFilters,
} from './useApprovalFilters';

type Filters = ReturnType<typeof useApprovalFilters>;

export function ApprovalsToolbar({
  filters,
  rows,
}: {
  filters: Filters;
  rows: ApprovalWithContext[];
}) {
  const { filter } = filters;

  // Counted over the whole permitted set, never the post-filter one: they answer
  // "how many has this person raised", so they hold still while you narrow.
  const counts = new Map<string, { label: string; count: number }>();
  for (const row of rows) {
    const seen = counts.get(row.requestedBy);
    if (seen) seen.count += 1;
    else counts.set(row.requestedBy, { label: row.requesterName, count: 1 });
  }

  const requesterOptions = [...counts.entries()]
    .map(([value, { label, count }]) => ({ value, label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <SegmentedControl<ApprovalView>
        ariaLabel="Which requests to show"
        size="sm"
        value={filter.view}
        onChange={filters.setView}
        options={APPROVAL_VIEWS.map((v) => ({ value: v, label: APPROVAL_VIEW_LABELS[v] }))}
      />
      <div className="min-w-64 flex-1">
        <DebouncedSearch
          label="Search approval requests"
          placeholder="Identity or requester…"
          value={filter.search}
          onChange={filters.setSearch}
        />
      </div>
      {/* A menu of one can never narrow anything — which is exactly what an
          Analyst sees, since the only decided rows they may read are their own. */}
      {requesterOptions.length > 1 && (
        <FilterMenu
          label="Requester"
          icon={<UserRound className="h-3.5 w-3.5" />}
          options={requesterOptions}
          selected={filter.requesters}
          onToggle={filters.toggleRequester}
          onClear={filters.clearRequesters}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b --noEmit`
Expected: still only the `ApprovalsScreen.tsx` errors from Task 7.

- [ ] **Step 3: Commit**

```bash
git add src/features/act/ApprovalsToolbar.tsx
git commit -m "feat(approvals): toolbar with status, requester and search"
```

---

## Task 9: The screen

**Files:**
- Modify: `src/features/act/ApprovalsScreen.tsx`

- [ ] **Step 1: Add the decision panel and split the row**

Replace the `Decision` type and add a decided-row branch. The `RequestRow` signature gains nothing; instead the action buttons become conditional on the row still being pending, and a `DecisionPanel` renders when it is not:

```tsx
/** Which decision a confirmation dialog is holding, and about what. */
type Decision = { id: string; identityName: string; outcome: 'approved' | 'declined' };

/**
 * What an approver decided, and why, on a row that is no longer actionable.
 *
 * An inset panel rather than a second left-ruled blockquote: the requester's
 * reason above IS a quotation, and this is the answer to it. Giving both the
 * same treatment would read as two peer quotes rather than a question and its
 * reply.
 */
function DecisionPanel({ request }: { request: ApprovalWithContext }) {
  const decided = request.decided;
  if (!decided) return null;
  return (
    <div className="mt-3 rounded-[var(--r-md)] border border-border bg-surface-2 px-3 py-2.5">
      <p className="flex flex-wrap items-center gap-1.5 text-[length:var(--fs-small)] text-text">
        <Gavel className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
        <span className="font-medium">
          {request.status === 'approved' ? 'Approved' : 'Declined'} by {request.deciderName}
        </span>
        <span className="text-text-tertiary">· {request.deciderRole} ·</span>
        <span className="tnum text-text-tertiary" title={dateTime(decided.at)}>
          {relativeTime(decided.at)}
        </span>
      </p>
      {decided.note && (
        <p className="mt-1.5 text-[length:var(--fs-small)] leading-[18px] text-text-secondary">
          {decided.note}
        </p>
      )}
    </div>
  );
}
```

Add `Gavel` to the `lucide-react` import.

- [ ] **Step 2: Make the row render both shapes**

Inside `RequestRow`, change the outer `<li>` and the action block:

```tsx
  const pending = request.status === 'pending';
  return (
    <li
      className={cn(
        'border-b border-border px-5 py-4 last:border-b-0',
        // A decided row recedes so the pending rows above it keep the weight in
        // the All view. This is the price of putting the record on the worklist
        // rather than on a screen of its own, and it is paid here.
        !pending && 'bg-surface-2/40',
      )}
    >
```

The identity link gets `text-text-secondary` instead of `text-text` when not pending. After the type `Badge`, add the outcome badge:

```tsx
            {!pending && (
              <Badge tone={request.status === 'approved' ? 'critical' : 'neutral'}>
                {request.status === 'approved' ? 'Approved' : 'Declined'}
              </Badge>
            )}
```

Approved is `critical` and declined is `neutral` on purpose: the tone tracks whether state actually changed. An approval contained an identity; a decline left it exactly as it was, and the screen's own description says so.

Replace `{canDecide && (` on the action block with `{canDecide && pending && (`, and render `<DecisionPanel request={request} />` immediately after the `fromSessionId` link.

Add `cn` to the imports: `import { cn } from '@/lib/cn';`

- [ ] **Step 3: Wire the filters into the screen body**

```tsx
export function ApprovalsScreen() {
  const query = useApprovals();
  const filters = useApprovalFilters();
  const decide = useDecideApproval();
  const canDecide = useCan('session.quarantine');
  const canPropose = useCan('session.quarantineRecommend');
  const [confirm, setConfirm] = useState<Decision | null>(null);
  const [note, setNote] = useState('');

  const all = query.data ?? [];
  const rows = useMemo(() => applyApprovalFilter(all, filters.filter), [all, filters.filter]);
  const pendingCount = all.filter((a) => a.status === 'pending').length;
```

Imports this step adds to `ApprovalsScreen.tsx`, in full:

```tsx
import { useMemo, useState } from 'react';
import { ClipboardCheck, Gavel, ShieldX, Sparkles, UserRound } from 'lucide-react';
import type { ApprovalOutcome, ApprovalWithContext } from '@/mocks/api';
import { ApprovalsToolbar } from './ApprovalsToolbar';
import { applyApprovalFilter, useApprovalFilters } from './useApprovalFilters';
import { approvalsEmptyCopy } from './approvalsEmptyCopy';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/lib/cn';
```

`count` is no longer used by the header badge but is still needed for it — keep the existing `import { count, dateTime, relativeTime } from '@/lib/format';` unchanged.

The header badge now reads `pendingCount`, not `query.data.length` — under a Declined filter the old expression would have counted declined rows and called them pending.

- [ ] **Step 4: Capture the reason in the dialog**

```tsx
  const runDecision = () => {
    if (!confirm) return;
    const outcome: ApprovalOutcome =
      confirm.outcome === 'approved'
        ? { decision: 'approved' }
        : { decision: 'declined', note };
    decide.mutate(
      { id: confirm.id, outcome },
      {
        onSuccess: () => {
          toast(
            confirm.outcome === 'approved'
              ? `${confirm.identityName} quarantined`
              : `Request declined for ${confirm.identityName}`,
            {
              tone: confirm.outcome === 'approved' ? 'critical' : 'default',
              description:
                confirm.outcome === 'approved'
                  ? 'You are recorded as the approver. Synthetic — no upstream state changes.'
                  : 'The identity was left as it was. Your reason is on the request.',
            },
          );
          setConfirm(null);
          setNote('');
        },
        onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
      },
    );
  };
```

In the `ConfirmDialog`, rewrite the decline description and add the field. The dialog's `onOpenChange` must also clear the note, so a reason typed for one request never appears under another:

```tsx
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => {
          if (!o) {
            setConfirm(null);
            setNote('');
          }
        }}
        title={
          confirm?.outcome === 'approved'
            ? `Quarantine ${confirm.identityName}?`
            : `Decline this request${confirm ? ` for ${confirm.identityName}` : ''}?`
        }
        description={
          confirm?.outcome === 'approved'
            ? 'The identity keeps existing but is blocked from acting until released, and you are recorded as the approver who produced that state. Synthetic — no upstream state changes.'
            : 'The identity is left exactly as it is. Your reason, the refusal, and who made it are recorded on the request and written to the audit log, so the analyst who raised it can see what you decided and why.'
        }
        confirmLabel={confirm?.outcome === 'approved' ? 'Approve and quarantine' : 'Decline'}
        confirmVariant={confirm?.outcome === 'approved' ? 'danger' : 'primary'}
        confirmDisabled={confirm?.outcome === 'declined' && note.trim().length === 0}
        pending={decide.isPending}
        onConfirm={runDecision}
      >
        {confirm?.outcome === 'declined' && (
          <Textarea
            label="Why are you declining?"
            hint="Kept on the request and shown to the Analyst who raised it."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            showCount
          />
        )}
      </ConfirmDialog>
```

- [ ] **Step 5: Add `confirmDisabled` to `ConfirmDialog`**

`ConfirmDialog` has no such prop yet. In `src/components/ui/ConfirmDialog.tsx`, add `confirmDisabled?: boolean;` to the props type and destructuring, then pass it through:

```tsx
          <Button
            variant={confirmVariant}
            loading={pending}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
```

- [ ] **Step 6: Replace the empty state and the toolbar placement**

The toolbar renders above `QueryBoundary` so it does not disappear while the list is loading or empty — a filter you cannot clear because the list it emptied is gone is a trap. Gate it on there being anything to filter at all:

```tsx
      {all.length > 0 && <ApprovalsToolbar filters={filters} rows={all} />}

      <QueryBoundary
        query={query}
        loadingFallback={
          <Card className="px-5 py-4">
            <SkeletonText lines={6} />
          </Card>
        }
        isEmpty={() => rows.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={<ClipboardCheck className="h-5 w-5" />}
              {...(() => {
                const copy = approvalsEmptyCopy({
                  view: filters.filter.view,
                  requesters: filters.filter.requesters.length,
                  search: filters.filter.search.trim(),
                });
                return { headline: copy.headline, guidance: copy.guidance };
              })()}
            />
          </Card>
        }
      >
        {() => (
          <Card className="overflow-hidden">
            <ul aria-label="Approval requests">
              {rows.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  canDecide={canDecide}
                  onDecide={setConfirm}
                />
              ))}
            </ul>
          </Card>
        )}
      </QueryBoundary>
```

`isEmpty` now tests the FILTERED rows, and the render callback ignores its argument in favour of `rows` — the boundary yields the raw query data, which is not what the screen shows.

- [ ] **Step 7: Typecheck and run everything**

Run: `npx tsc -b --noEmit`
Expected: no errors.

Run: `npx vitest run`
Expected: PASS. If `ApprovalsScreen` has a component test that types into the dialog, it must use `userEvent.setup({ advanceTimers })` with `vi.useFakeTimers({ shouldAdvanceTime: true })` — Radix dialogs deadlock `userEvent` under plain fake timers.

- [ ] **Step 8: Commit**

```bash
git add src/features/act/ApprovalsScreen.tsx src/components/ui/ConfirmDialog.tsx
git commit -m "feat(approvals): show decided requests, capture and display the decline reason"
```

---

## Task 10: Screen test

Covers the two things this change actually put at risk: the header badge now derives from a different number than the list it sits above, and the decline path now has a gate in front of it.

**Files:**
- Create: `src/features/act/ApprovalsScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApprovalsScreen } from './ApprovalsScreen';
import { TooltipProvider } from '@/components/ui/Tooltip';
import type { ApprovalWithContext } from '@/mocks/api';
import { useUiStore } from '@/stores/ui';

const PENDING: ApprovalWithContext = {
  id: 'apr_0001',
  identityId: 'idn_000002',
  identityName: 'svc-billing-sync-prod',
  identityType: 'service-account',
  requestedBy: 'usr_2',
  requesterName: 'Kai Mensah',
  requesterRole: 'Analyst',
  requestedAt: '2026-09-15T09:00:00.000Z',
  reason: 'No accountable owner. Risk 84.',
  status: 'pending',
};

const DECLINED: ApprovalWithContext = {
  ...PENDING,
  id: 'apr_0002',
  identityName: 'svc-legacy-etl-runner',
  requestedAt: '2026-09-15T08:00:00.000Z',
  status: 'declined',
  decided: {
    by: 'usr_1',
    at: '2026-09-15T08:30:00.000Z',
    note: 'Owner found in the CMDB; handover in flight.',
  },
  deciderName: 'Priya Raman',
  deciderRole: 'Security Admin',
};

vi.mock('@/mocks/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/mocks/api')>()),
  listApprovals: () => Promise.resolve([PENDING, DECLINED]),
}));

function renderScreen(path = '/act/approvals') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[path]}>
          <ApprovalsScreen />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => useUiStore.getState().setRole('security-admin'));

describe('Act > Approvals', () => {
  /**
   * The badge used to read `query.data.length`, which was the pending count only
   * because the query only ever fetched pending. Now that the set holds every
   * request, that expression would call one declined row "1 pending" the moment
   * a reader switched view.
   */
  it('counts only pending requests in the header, whatever the view shows', async () => {
    renderScreen('/act/approvals?status=declined');
    expect(await screen.findByText('1 pending')).toBeInTheDocument();
    expect(screen.getByText('svc-legacy-etl-runner')).toBeInTheDocument();
    expect(screen.queryByText('svc-billing-sync-prod')).not.toBeInTheDocument();
  });

  it('shows who declined a request and why', async () => {
    renderScreen('/act/approvals?status=declined');
    expect(await screen.findByText(/Declined by Priya Raman/)).toBeInTheDocument();
    expect(screen.getByText(/handover in flight/)).toBeInTheDocument();
  });

  it('offers no decide buttons on a request that is already decided', async () => {
    renderScreen('/act/approvals?status=declined');
    const row = (await screen.findByText('svc-legacy-etl-runner')).closest('li');
    if (!row) throw new Error('expected the declined row');
    expect(within(row).queryByRole('button', { name: /decline/i })).not.toBeInTheDocument();
  });

  it('will not let a decline through without a reason', async () => {
    const user = userEvent.setup();
    renderScreen();
    await user.click(await screen.findByRole('button', { name: 'Decline' }));

    // Scoped to the dialog deliberately: the row's own Decline button is still
    // in the document, so an unscoped query by that name is ambiguous.
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'Decline' });
    const field = within(dialog).getByLabelText(/why are you declining/i);
    expect(submit).toBeDisabled();

    // Whitespace is not a reason.
    await user.type(field, '   ');
    expect(submit).toBeDisabled();

    await user.type(field, 'Owner is accountable.');
    expect(submit).toBeEnabled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/features/act/ApprovalsScreen.test.tsx`
Expected: FAIL — file did not exist before Task 9; if Task 9 is complete it should now pass, so run it before and after to see the gate work.

- [ ] **Step 3: If the dialog test hangs, it is fake timers**

This suite uses no fake timers, which is why it is written this way. If a future change introduces them, `userEvent` deadlocks against Radix's focus trap — the fix is `vi.useFakeTimers({ shouldAdvanceTime: true })` plus `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`, never dropping `userEvent` for `fireEvent`.

- [ ] **Step 4: Commit**

```bash
git add src/features/act/ApprovalsScreen.test.tsx
git commit -m "test(approvals): pin the pending badge and the decline reason gate"
```

---

## Task 11: Verify in the running app

**Files:** none — verification only.

- [ ] **Step 1: Full gate**

Run: `npm run lint`
Expected: clean.

Run: `npx tsc -b --noEmit`
Expected: clean.

Run: `npx vitest run`
Expected: all suites pass.

- [ ] **Step 2: Drive the real screen**

Start the dev server via the Browser pane (`preview_start`, never `npm run dev` in Bash) and navigate to `/act/approvals`.

Check, in order:
1. Default view is Pending; the badge counts pending rows only.
2. Decline a request — Confirm is disabled until the reason has non-whitespace content.
3. After declining, the row leaves Pending; switching to Declined shows it with the decider's name, role, relative time, and the reason.
4. The URL carries `?status=declined`; reload keeps the view; Back returns to Pending.
5. Switch the dev Role Switcher to Analyst: pending rows all still visible, and the only decided rows are ones raised by the signed-in user.
6. Filter to a requester, then to a search term with no match — the empty copy names the filter that produced it, not the pending-queue explanation.

- [ ] **Step 3: Screenshot the declined row and the dialog** as evidence, then report what was verified.

---

## Out of scope

Carried from the spec, deliberately not built here:

- No notification is sent to the requester on any decision.
- The replay banner still clears rather than resolving to an outcome.
- Re-raising a declined request stays unblocked (`api.ts:1324` still tests only `pending`).
- The mock does not paginate, and the approvals set now grows monotonically.
