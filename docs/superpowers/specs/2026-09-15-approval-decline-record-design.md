# Act > Approvals — decline record and status filter

**Date:** 2026-09-15
**Status:** Approved
**Scope:** `src/mocks/types.ts`, `src/mocks/api.ts`, `src/features/act/queries.ts`,
`src/features/act/ApprovalsScreen.tsx`, new `src/features/act/useApprovalFilters.ts`,
`src/features/act/ApprovalsToolbar.tsx`, `src/features/act/approvalsEmptyCopy.ts`,
new shared `src/lib/filters.ts`, `src/mocks/approvals.test.ts`.

## Why

An approval decision is unrecoverable from the UI the moment it is made.

1. **Decided rows leave the screen.** `ApprovalsScreen.tsx:130` only ever queries
   `'pending'`. `listApprovals()` already returns every request when `status` is
   omitted, and `listApprovals('declined')` is already asserted in
   `approvals.test.ts` — the data exists and nothing renders it.
2. **The approver's reason is never captured.** `ApprovalRequest` carries `reason?`
   (the *requester's* words); `decided` carries only `{ by, at }`, and
   `decideApproval(id, decision)` takes no third argument. The audit entry reads
   `Request apr_xxx, raised by <email>. The identity was left as it was.` — no
   rationale, because none is recorded anywhere.
3. **Nobody is told.** `decideApproval` sends zero notifications. On approve,
   `containIdentity` notifies the identity's *owner*; on decline, no one. The
   decision also clears `AgentSession.quarantineRecommendedAt`, so the "awaiting a
   decision" banner on the requester's replay screen simply vanishes — visually
   identical to having been approved.

**Objective:** record the reason for a decline and who declined it, for Security
Admin and above. Point 3 is acknowledged but deliberately out of scope (below).

## Non-goals

- Notifying the requester on a decision. The dead end at point 3 survives this work.
- The replay banner resolving to an outcome rather than clearing.
- Blocking or warning on a re-raise after a decline.
- Widening approvals beyond quarantine — Architect-owned; see the `ApprovalRequest`
  doc comment in `types.ts`.
- A date-range filter. `AuditScreen` already owns time-windowing (`days`); a second
  screen doing it differently is the drift risk.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Where history lives | Same screen, status filter | The decided row is the pending row minus buttons plus a decision block — one component. A second route means two renderers of one record. |
| Ruled out: audit log | — | `audit.view` is global and all-or-nothing, so it cannot express "Analyst sees only their own". Audit also stores rendered sentences, so "who keeps re-raising this" would mean parsing prose. |
| Status control | `SegmentedControl`, size `sm` | A mutually exclusive view switch, not a multi-select narrowing. The component already exists. |
| Segments | Pending · Declined · All | No `Approved` segment: an approved request produced a quarantine, and Act > Quarantine is a richer record of it with full provenance. Approved stays reachable under All. |
| Default segment | Pending | The screen's current behaviour. Nobody who does not go looking sees a change. |
| Remark on approve | None | `request.reason` already flows into `containIdentity(identity, request.reason, request.fromSessionId)`, and the enforcement is itself the record. |
| Remark on decline | **Required** | User-specified objective is to record the reason; an optional field left blank does not meet it. |
| Stale-row escape hatch | Still requires a remark | Accepted friction. See Flagged below. |
| Analyst visibility | All pending (unchanged) + only their own decided | User-specified. Enforced in `listApprovals`, not in the component. |
| Declined badge tone | `neutral` | Nothing was enforced. Mirrors the existing button variants — Approve is `danger`, Decline is `secondary` — keeping red for state that actually changed. |
| Approved badge tone | `critical` | The identity *was* contained. Same rule read the other way: the tone tracks whether state changed, so the two outcomes must not share it. |
| Decision rendering | Inset panel, not a second blockquote | The requester's reason is a quotation; the remark is an answer to it. Equal left-rules would read as two peer quotes. |
| Declined row surface | Recessed, identity name muted | In the All view the pending row must keep its "this needs me" weight. This is where the main objection to history-on-the-queue gets paid for. |
| Filter persistence | URL params | Matches `useQuarantineFilters`, for its stated reason: an auditor can share what they are looking at. |
| Filtering model | Client-side over the full permitted set | A server-side status split makes facet counts lie. See Query layer. |

## Data model — `types.ts`

```ts
decided?: { by: string; at: string; note?: string };
```

Nested with `by`/`at` so the three can never disagree, preserving the existing
invariant (`decided` absent exactly while `status === 'pending'`) already asserted in
`approvals.test.ts`. Optional on the type because approvals carry no note; required
at the API boundary for declines, below.

## Mock API — `api.ts`

### `decideApproval` takes a discriminated outcome

```ts
export type ApprovalOutcome =
  | { decision: 'approved' }
  | { decision: 'declined'; note: string };

export function decideApproval(id: string, outcome: ApprovalOutcome): Promise<ApprovalRequest>;
```

A union rather than an optional third argument: it makes "approve carries no note"
and "decline must carry one" compiler-enforced rather than a convention. The runtime
check remains for the empty-string case — a blank or whitespace-only note rejects
with a `MockApiError` coded `REASON_REQUIRED` **before** any mutation, so a rejected
decline leaves `status`, `decided`, and the audit log untouched.

The audit detail appends the note, mirroring how `requestApproval` already appends
the requester's reason.

### `listApprovals` scopes decided rows by actor

The rule, enforced in the API so the screen cannot leak by forgetting:

- **Pending** requests are visible to everyone who can see the screen. Unchanged —
  the `RoleRestricted` copy already promises a proposer can "see what is waiting".
- **Decided** requests are visible in full to holders of `session.quarantine`
  (Security Admin and above). To everyone else, only those they raised themselves.

No `scope` parameter is exposed to callers; the filter is derived from
`currentActor()`, so there is no argument a component could pass to widen it.

The `status?` parameter **stays** on `listApprovals`. It is harmless, already
covered by tests, and the fix described in Query layer belongs to the hook, not to
the API. Only `useApprovals` stops passing it.

## Filter state — `useApprovalFilters.ts`

Mirrors `useQuarantineFilters` exactly, including its `setSearchParams` caveat: the
functional form does **not** compose across several calls in one tick, so any
whole-axis clear is a single `delete`, never a loop of toggles.

| Param | Axis | Shape |
|---|---|---|
| `?status` | Status | Single value: `pending`, `declined`, or `all`. Unknown or absent falls back to `pending`. |
| `?requester` | Requester | Comma-separated user ids, multi-select. Unknown values dropped on both read and write. |
| `?q` | Search | Identity name or requester name. Inert below `MIN_SEARCH_CHARS`. |

`?requester` rather than reusing Quarantine's `?by`, which on that screen means *who
quarantined it*. Same word, different subject; the collision is only in a reader's
head, but that is where it matters.

`applyApprovalFilter(rows, filter)` follows `applyQuarantineFilter`: axes AND
together, values inside an axis OR, and a sub-minimum search counts as inactive so a
"Clear" affordance never appears beside an unchanged list.

### Shared constant

`MIN_SEARCH_CHARS = 2` is currently duplicated in `useQuarantineFilters.ts:17` and
`useSessionFilters.ts:9`. Lift it to `src/lib/filters.ts` and update both call sites
rather than writing a third copy.

## Query layer — `queries.ts`

`useApprovals()` loses its `status` argument and fetches the whole permitted set into
one cache entry. Status is then applied client-side with the other axes.

This is the important part. If status stayed server-side and cached per status while
the other facets filtered client-side, the toolbar's facet counts — which
`QuarantineToolbar` computes "over the whole contained set, never the post-filter
one" so they hold still while you narrow — would silently mean "within the currently
loaded status". A chip reading `Kai Mensah · 4` would actually mean "4 within
Declined". Authoritative-looking and wrong.

`usePendingApprovalCount` derives from the same entry
(`data.filter(a => a.status === 'pending').length`). Its doc comment claims the count
"can never disagree with the list it summarises"; reading one cache entry instead of
two makes that structurally true rather than contingent on two invalidations staying
in step.

Payload note: the set now grows monotonically as requests are decided. At the seeded
size (3) and any plausible demo size this is irrelevant. A real backend would page
this; the mock does not, and this spec does not pretend otherwise.

## Toolbar — `ApprovalsToolbar.tsx`

Follows `QuarantineToolbar`: `flex flex-wrap items-center gap-2`.

- `SegmentedControl` (size `sm`) — Pending · Declined · All.
- `DebouncedSearch` — placeholder "Identity or requester…", `min-w-64 flex-1`.
- `FilterMenu` — Requester. Options are the distinct requesters present in the
  permitted set, with counts computed over that whole set, pre-filter.

For an Analyst the Requester menu resolves to at most themselves, so it renders only
when it offers more than one option — a menu of one is chrome that can never narrow.

## Screen — `ApprovalsScreen.tsx`

- The toolbar sits between `ScreenHeader` and the `Card`.
- A **pending** row is unchanged.
- A **decided** row drops the action buttons, gains a `Declined` (`neutral`) or
  `Approved` (`critical`) `Badge`, and renders a decision panel below the requester's
  reason: who decided, their role, how long ago, then the note. Recessed row surface,
  muted identity name.
- The decline branch of the existing `ConfirmDialog` gains a `Textarea`.
  `ConfirmDialog` already accepts `children`, so no component change is needed.
  Confirm stays disabled while the field is empty **after trimming**, which makes
  `REASON_REQUIRED` unreachable through the UI by design; the API check remains as
  the enforcing boundary, and if it does fire it surfaces as an inline error beside
  the field rather than a toast.

### Empty states — `approvalsEmptyCopy.ts`

The current empty copy is specifically about the pending queue ("Quarantine is the
one action Wave 1 splits…"), which is wrong under a Declined filter. Mirror
`auditEmptyCopy`: a pure function taking the filter and returning a headline and
guidance that name the narrowing which produced the empty result, with its own test
file alongside — the precedent is `auditEmptyCopy.test.ts`.

The existing pending-queue copy is retained verbatim for the unfiltered pending case.

## Tests — `approvals.test.ts`

- `decideApproval` stores the note on decline; the audit detail contains it.
- A decline with an empty or whitespace-only note rejects with `REASON_REQUIRED` and
  writes nothing — status still `pending`, `decided` still absent, no new audit entry.
- The approve path is unchanged and carries no note.
- Scope: a `session.quarantine` holder sees another user's decided rows; an Analyst
  sees every pending row plus their own decided rows, and not another user's.
- `applyApprovalFilter`: axes AND, values within an axis OR, sub-minimum search inert.
- `parseApprovalParams`: unknown `status` falls back to `pending`; unknown requester
  ids are dropped.
- `usePendingApprovalCount` equals the pending rows in the list it summarises.
- `approvalsEmptyCopy` names the filter that produced the empty result.

Dialog tests that type into the new `Textarea` must set `shouldAdvanceTime` on fake
timers — Radix dialogs deadlock `userEvent` otherwise.

## Flagged — not resolved by this design

- **The requester still learns nothing.** No notification is sent on any decision, and
  the replay banner still clears rather than resolving to an outcome. An Analyst
  discovers a decline only by visiting this screen and selecting Declined. This is a
  deliberate scope decision, not an oversight.
- **Required remark vs. the stale-row escape hatch.** Declining is the documented way
  to clear a row when the identity was contained by some other path (`api.ts:1393`).
  A mandatory rationale adds prose to a housekeeping action. Accepted as drawn;
  revisit if it proves annoying in use.
- **Re-raise stays unblocked.** The duplicate guard at `api.ts:1324` still tests only
  `status === 'pending'`, so a declined quarantine can be re-proposed immediately.
  History makes the repetition *visible* to the approver; nothing prevents it.
- **The FRS does not specify this.** It is silent on approval mechanics — the
  `ApprovalRequest` doc comment notes it does not even mandate two-person control
  generally. A required decline rationale is therefore a **new requirement** in the
  same Architect-owned class as widening approvals, not an implementation of
  something already specified. It should be ratified rather than shipped as though
  the spec asked for it.
- **Compliance framing.** Recorded rationale on the refusal of a privileged action is
  the kind of evidence SOC 2 change-authorization controls want. This build is a
  design-stage prototype against an in-memory mock and evidences nothing
  operationally; the claim belongs to the eventual product, not to this code.
