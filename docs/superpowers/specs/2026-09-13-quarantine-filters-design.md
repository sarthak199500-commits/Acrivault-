# Act > Quarantine filters — design

**Date:** 2026-09-13 · **Status:** approved, in build

## Why

`/act/quarantine` is a flat table with no toolbar — the last triage surface in the
product without filters. Sessions, Monitor, Inventory, Policies and Manage Users all
carry a URL-backed filter hook; this screen never got one.

Measured against the seeded dataset (13 Sep 2026): **21 contained identities out of
1500**. Producer spread is 19 person / 1 policy / 1 person-from-a-replay. Types spread
9 API Key, 7 Service Account, 2 Workload Identity, 2 OAuth Token, 1 AI Agent. Four
distinct people, one distinct policy, everything inside 30 days.

At 21 rows the filters earn their place as consistency with the peer screens and as
headroom, not as relief from a scrolling problem. The toolbar is sized accordingly:
three controls, no rail, no saved views.

## The producer facet is one menu, and it partitions

`Policy` / `Person` / `From a session replay` are **three mutually exclusive buckets**
summing to 21. Selecting `Person` returns 19 — the replay-backed containment is not
among them.

This was a decision, taken against the alternative (founder, 13 Sep 2026). The
alternative was two orthogonal axes — a `Produced by` menu of Policy 1 / Person 20,
plus a separate `From a replay` toggle — which is closer to the data model: a replay
is *evidence a person acted on*, not an actor, which is exactly why `QuarantineSource`
has no `session` kind (corrected Sep 2026, guarded by `act.test.ts`).

**Accepted cost:** the facet partitions two things the model deliberately separated.
Someone filtering `Person` to audit human containments will miss one that a human
produced. Mitigated by the row itself, which is unchanged: it still names the person
as producer with the replay on a sub-line beneath, so the separation survives
everywhere except the facet.

The three display outcomes match the vocabulary `act.test.ts` already asserts —
`['person', 'person-from-replay', 'policy']` — so the facet is a filter over the
*display outcome*, and the data model is untouched.

## Mock API — emit the producer, don't sniff the label

`QuarantinedIdentity` carries only display strings (`byLabel`, `viaLabel`). Filtering
on them would mean `byLabel.startsWith('Policy · ')`, which breaks the moment the
label copy changes and is the fragility the surrounding comments in `api.ts` argue
against.

`listQuarantined` gains one structured field:

```ts
/** Which of the three display outcomes this row is, for filtering. */
producer: 'policy' | 'person' | 'replay';
```

Derived from the record, not the label:

| `quarantine.by` | `producer` |
|---|---|
| `{ kind: 'policy' }` | `policy` |
| `{ kind: 'user', viaSessionId: set }` | `replay` |
| `{ kind: 'user' }` | `person` |

Deriving from `by.viaSessionId` rather than from whether `viaLabel` resolved means a
containment whose session was since deleted still filters as `replay` — consistent
with the existing rule that a removed session is named, not hidden.

## Filter state — `src/features/act/useQuarantineFilters.ts`

Mirrors `useSessionFilters`: `useSearchParams`, writes with `{ replace: true }`, and
ships a pure `applyQuarantineFilter(rows, filter)` beside the hook so the logic is
unit-testable without rendering.

| Param | Shape | Default |
|---|---|---|
| `?q` | free text | `''` |
| `?type` | comma list of `NhiType` | `[]` |
| `?by` | comma list of `policy` \| `person` \| `replay` | `[]` |

```ts
export type ProducerFacet = 'policy' | 'person' | 'replay';

export interface QuarantineFilter {
  search: string;
  types: NhiType[];
  producers: ProducerFacet[];
}
```

`ProducerFacet` is the same union `QuarantinedIdentity.producer` carries — declared
once in the mocks and re-exported, so a row and a filter value can never drift.

Axes combine with AND; values within an axis with OR — the convention every peer
screen uses. Unknown `?type` / `?by` values are dropped on parse rather than
narrowing to nothing.

`MIN_SEARCH_CHARS = 2`, matching Sessions: below it the search is ignored rather than
matching everything, so a single keystroke doesn't flicker the table. The needle
matches **identity name, `byLabel`, and `viaLabel`** — so `Alex Kim`, `dormant OAuth`
and a session id all narrow. That is what makes a separate actor menu unnecessary at
four distinct people.

`activeCount` counts a search only once it clears the minimum.

## Toolbar — `src/features/act/QuarantineToolbar.tsx`

Its own file, like `UsersToolbar`; the screen is already ~190 lines.

```
[ Identity or who quarantined it ]  [ Type ▾ ]  [ Produced by ▾ 2 ]      Clear (2)
```

`DebouncedSearch` + two `FilterMenu`s + the standard clear affordance. Facet counts
are computed over the **whole loaded set**, not the post-filter set — stable, and they
answer "how many of each exist", the same choice `UsersToolbar` documents. Type options
are restricted to types actually present in the population.

## Screen changes — `QuarantineScreen.tsx`

- Toolbar renders **inside** `QueryBoundary`'s children, so it cannot appear over an
  empty set — the "Nothing is quarantined" state stays filter-free.
- `ScreenHeader` gains an `actions` slot showing `N of M` while `activeCount > 0`.
- Filtered-to-zero replaces the table (inside the same `Card`) with an `EmptyState`:
  `FilterX` icon, "No quarantined identities match your filters", and a
  **Clear filters** button.
- `RoleRestricted`, `ConfirmDialog` and the release mutation are untouched.

## Tests

**`src/features/act/useQuarantineFilters.test.ts`** — over `applyQuarantineFilter`:
each axis alone; AND across axes; OR within an axis; a one-character search is
ignored; search matches a producer label and a session id, not just the identity name;
an unknown `?by` value doesn't empty the table.

**`src/mocks/act.test.ts`** — two assertions, derived from the record rather than
counted:

- every row's `producer` agrees with its `quarantine.by` under the table above;
- a containment whose `viaSessionId` points at a deleted session still reads
  `producer: 'replay'`.

Counting rows would pass on incoherent data; both assertions name the cause.

## Out of scope

No sort control — the table stays newest-first. No saved views. No server-side
filtering; this filters client-side over the loaded set like every peer screen. No
seed change: the producer spread stays 19/1/1 and the facet will read thin in demos.
That is a seed-tuning question, deliberately left separate from this change.
