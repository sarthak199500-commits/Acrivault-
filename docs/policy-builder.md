# Policy Builder

Reference doc for the Govern → Policy Builder feature: screen flow, the rule grammar, and the contradiction/redundancy linter. Reflects the code as of this branch (`claude/dashboard-data-integrity-4c7122`).

Everything here is illustrative — there is no real backend enforcement in Wave 1. The UI composes a rule, dry-runs it against the mock dataset, and displays a generated-code preview; it never quarantines, blocks, or rotates a real credential (`src/mocks/policy.ts:1-4`).

## 1. Where it lives

| File | Responsibility |
|---|---|
| [`src/mocks/policy.ts`](../src/mocks/policy.ts) | Grammar (`SUBJECTS`/`ACTIONS`), plain-English + generated-code rendering, evaluation (`matchesPolicy`), the linter (`lintRule`) |
| [`src/mocks/api.ts`](../src/mocks/api.ts) | `evaluatePolicy`, `testPolicy`, `savePolicy`, `activatePolicy`, `suspendPolicy`, `archivePolicy` — the mock backend and lifecycle rules |
| [`src/features/govern/PolicyListScreen.tsx`](../src/features/govern/PolicyListScreen.tsx) | `/govern` — list, filter, and lifecycle actions (suspend/reactivate/archive) |
| [`src/features/govern/PolicyBuilderScreen.tsx`](../src/features/govern/PolicyBuilderScreen.tsx) | `/govern/builder` (new) and `/govern/builder/:policyId` (edit) — the authoring screen |
| [`src/features/govern/TokenCanvas.tsx`](../src/features/govern/TokenCanvas.tsx) | Renders the WHEN/AND/THEN rows and their diagnostics |
| [`src/mocks/policy.test.ts`](../src/mocks/policy.test.ts) | Coverage for evaluation, linting, and the dry-run sample |

## 2. Screen flow

```
/govern  (Policy list)
  │  "New policy"                      row click
  ▼                                     ▼
/govern/builder  ────────────────────  /govern/builder/:policyId
       │
       │  edit conditions/action  →  Plain English, Affected count, Generated
       │                             code all update live (no save needed)
       │
       ├─ Test  → dry-run against the dataset → Test result card
       │           (persists the policy as "tested"; any further edit clears
       │            the result and re-blocks activation)
       │
       ├─ Save draft → persists without testing
       │
       └─ Save & activate → confirm dialog → enforcing
```

- **New**: `/govern/builder`, blank rule seeded by `defaultTokens()` (`type is AI Agent` → `flag for review`).
- **Edit**: `/govern/builder/:policyId` — loads the persisted rule once (`useEffect` + `seeded` ref, so it doesn't clobber in-progress edits on refetch).
- Every keystroke re-derives `plainEnglish`, `generatedCode`, `diagnostics` (the linter), and the live "Affected identities" count — all `useMemo` off `tokens`, so the preview is never stale.
- Read-only viewers (no `policy.create`) get the same screen with all inputs disabled and a banner explaining why.

## 3. Policy lifecycle

```
draft ──Test──▶ tested ──Save & activate──▶ active ──Suspend──▶ suspended
  ▲                │                                                │  │
  └──Save draft────┘                                          Reactivate │
                                                                    │  Archive
                                                                    ▼  ▼
                                                              active  archived
```

- **draft** — saved but never dry-run.
- **tested** — passed a dry-run (`testPolicy`); not enforcing.
- **active** — enforcing. Reachable only via **Save & activate**, which is gated on two independent checks (§8).
- **suspended** — enforcement stopped, retained, reachable only from **active**.
- **archived** — terminal. Reachable **only from suspended**, never straight from active (FR-011). Hidden from the default list but retained for audit; cannot be edited, tested, or activated again (`api.ts` throws `INVALID_TRANSITION`).

**Caveat:** `savePolicy` ("Save draft") writes `tokens`/`plainEnglish`/`affectedCount` unconditionally, even when the existing record's status is `active` or `suspended` — only the `status` field itself is protected. So editing an active policy's rule via Save draft (without testing) immediately changes what the list's affected-count column shows for that "Active" row, ahead of any re-test or re-activation. `activatePolicy` still refuses to *re-activate* until `testedTokens` matches `tokens` again (FR-005) — the gap is display-only (the count), not enforcement.

## 4. Roles

Policy capabilities (`src/lib/permissions.ts`) are held by **Security Admin** and **Tenant Admin** only; Analyst and Viewer get none.

| Capability | Gates | Held by |
|---|---|---|
| `policy.create` | Editing the canvas, Save draft, `readOnly = !canCreate` | Security Admin, Tenant Admin |
| `policy.test` | Test button | Security Admin, Tenant Admin |
| `policy.activate` | Save & activate button (else a `RoleRestricted` note is shown) | Security Admin, Tenant Admin |
| `policy.lifecycle` | Suspend / Reactivate / Archive on the list screen | Security Admin, Tenant Admin |

## 5. Rule anatomy

A rule is a flat `PolicyToken[]`: one `when`, zero or more `and`, one `then`.

```ts
{ kind: 'when' | 'and' | 'then'; subject: string; operator: string; value: string }
```

Example — `type is ai-agent` AND `riskScore gte 60` THEN `quarantine`:

- **Plain English** (`plainEnglish()`): *"When an identity is an AI Agent, and risk score is at least 60, then quarantine it."*
- **Generated code** (`generatedCode()`):
  ```
  policy "Quarantine risky AI agents" {
    WHEN type is "ai-agent"
    AND  riskScore gte "60"
    THEN action set "quarantine"
  }
  ```

Conditions are always **ANDed** — there is no OR/grouping in this grammar (`matchesPolicy`). That single fact is why same-subject contradictions are possible at all, and it's the basis for every check in §7.

## 6. Conditions (subjects)

| Subject | Label | Type | Cardinality | Domain | Operators |
|---|---|---|---|---|---|
| `type` | Type | enum | single | — | is, is not — AI Agent / Service Account / API Key / OAuth Token / Workload Identity |
| `riskScore` | Risk score | number | single | 0–100 | is at least, is at most, is above, is below |
| `orphaned` | Orphaned | enum | single | — | is — true / false |
| `conflicts` | Attribute conflicts | number | single | 0 or more | more than, exactly |
| `governanceStatus` | Governance | enum | single | — | is, is not — governed / ungoverned / in drift |
| `cloud` | Source | enum | **multi** | — | exists in — AWS / GCP / Azure |
| `owner` | Owner | text | single | — | is, is not, is unassigned |

**Cardinality is the load-bearing concept.** Every subject except `cloud` (Source) holds exactly one value per identity, so two conditions on it must be jointly satisfiable or the rule can never match. `cloud`/Source is the one multi-valued subject — an identity's `sources` is an array — so repeating it *intersects* rather than conflicts (§7.6). This is why the linter groups conditions by subject and skips the contradiction checks entirely for `multi`-cardinality groups.

**Fail-closed evaluation.** `riskScore`, `conflicts`, and `owner` (`is`/`is-not`) all reject a blank or malformed value by returning `false`, not `true` — an unfinished condition narrows the match set to nothing rather than silently matching everyone. The linter separately reports *why* it's zero (`incomplete`, §7.1) so the reason is visible, not just the number.

## 7. Actions (THEN)

| Action | Values |
|---|---|
| Action | quarantine, flag for review, raise an alert, block |
| Rotate | every 24 hours / 7 days / 30 days |

## 8. Activation gate

Two independent checks, both required:

1. **FR-005 — a passing test of the rule *as it stands right now*.** `testResult` is component state, cleared by any edit to `tokens`. There is no way to activate a rule that hasn't just been dry-run.
2. **The linter's `unsatisfiable` verdict**, checked regardless of the test result. This closes a real loophole: a contradictory rule (e.g. `type is AI Agent AND type is API Key`) evaluates to 0 matches, which is a legitimate *passing* test — so without this second, independent check, a rule that can never match anything could still clear FR-005 and activate.

`activatePolicy` re-checks `sameTokens(testedTokens, tokens)` server-side as well (FR-005/FR-006/FR-007), so the gate holds even if the client-side `testResult` state were somehow stale.

## 9. Conflict detection — the linter

`lintRule(tokens)` is pure and dataset-independent: it answers "can this rule *ever* match, in principle" — a question a live affected-count of `0` cannot answer, because `0` looks identical whether the rule is broken or just currently unpopular.

### 9.1 Severities

| Severity | Meaning | Blocks activation? |
|---|---|---|
| `unsatisfiable` | No identity can satisfy this, on any dataset | **Yes** — always, regardless of test result |
| `redundant` | Removing the condition doesn't change what matches | No — informational |
| `incomplete` | The condition has no usable value yet | No, but it evaluates to zero matches until fixed |

Redundancy is decided structurally (does removing it change the satisfying set?), not by enumerating operator pairs — so `risk score ≥ 60 AND ≥ 50` is caught without a dedicated rule for that pair.

### 9.2 Conflict catalogue

| # | Case | Example | Message shown | Fix |
|---|---|---|---|---|
| 1 | Exact duplicate | `Type is AI Agent` twice | *"Identical to condition 1."* | Remove this condition |
| 2 | Missing value | `Owner is __` (blank) | *"Owner has no value yet, so this condition matches nothing."* | Fill in a value (no auto-fix offered) |
| 3 | Numeric range contradiction | `Risk score is below 60` **and** `is above 80` | *"No risk score can satisfy this and condition 1 at once."* | Remove this condition |
| 4 | Numeric out of domain | `Risk score is below 0` | *"Risk score is only ever 0–100, so this can never match."* | Correct the value (no auto-fix) |
| 5 | Numeric redundant | `Risk score is at least 60` **and** `is at least 50` | *"Already implied by the other risk score conditions — this narrows nothing."* | Remove this condition |
| 6 | Enum: two required values | `Type is AI Agent` **and** `is API Key` | *"An identity has exactly one type — this contradicts condition 1."* | Remove this condition |
| 7 | Enum: exhaustive negation | `Governance is not Governed / Ungoverned / In drift` (all three) | *"Together these rule out every governance, so nothing can match."* | Remove one condition |
| 8 | Enum redundant | `Type is AI Agent` **and** `is not API Key` | *"Already implied by the other type conditions — this excludes nothing."* | Remove this condition |
| 9 | Owner: unassigned + owned | `Owner is unassigned` **and** `is jane@…` | *"An identity cannot be unassigned and owned at once — this contradicts condition 1."* | Remove this condition |
| 10 | Owner: two distinct names | `Owner is jane@…` **and** `is john@…` | *"An identity has one owner — this contradicts condition 1."* | Remove this condition |
| 11 | Owner: required + excluded, same value | `Owner is jane@…` **and** `is not jane@…` | *"This owner is both required and excluded — this contradicts condition 1."* | Remove this condition |

Every "remove" fix (`withoutCondition`) drops the flagged condition and re-normalizes the remaining rows so the first is always `WHEN` — it's a mechanical repair, not a suggestion the user has to interpret.

### 9.3 One message per conflict, not one per condition

A contradiction is a single finding about a **set** of conditions — it used to be reported once per condition involved, which meant a 2-condition contradiction printed the same sentence twice with two identical "Remove this condition" links and no way to tell which one to click.

Now `Diagnostic.relatedIndices` names the other rows implicated in the same finding, and `diagnosticCovers(diagnostic, index)` checks whether a diagnostic applies to a given row (as its `.index` **or** within `.relatedIndices`). The message and fix link render once, on the last condition in the group; every implicated row (via `TokenCanvas`'s `implicated` prop) still gets the red left-border "broken" treatment, so nothing *looks* fine — but nothing repeats.

### 9.4 Not a conflict: Source (multi-valued)

`Source exists in AWS` **and** `Source exists in GCP` is **never** flagged. `cloud` is the one `multi`-cardinality subject — an identity's sources are an array — so two Source conditions intersect ("found in AWS *and* GCP"), which is the cross-cloud correlation query this product exists to answer, not a contradiction. The linter skips contradiction/redundancy checks entirely for `multi`-cardinality groups (only the exact-duplicate check still applies).

## 10. Test result panel

`Test` runs `testPolicy()`, which persists the policy (creating it if new), stamps `lastTestedAt` and a `testedTokens` snapshot, and returns the same `evaluationOf()` payload used by the live "Affected identities" tile — one shared evaluator, so the two can never disagree.

- **Sample**: up to 6 matches, ranked by risk **descending** (`EVAL_SAMPLE_SIZE`). Previously an arbitrary `matched.slice(0, 6)` in dataset order, which could show six low-risk rows for a rule that hit hundreds of identities including criticals.
- **Critical count**: shown separately, since a 6-row sample can't reliably convey how many of hundreds of matches are critical risk.
- Each row shows the identity's type icon, name, `RiskPill`, and links to `/discover/:id` — consistent with every other identity listing in the app, rather than an inert list.
- `affected === 0` collapses to a single sentence instead of an empty list.

## 11. Known limitations

- **No real enforcement.** Save & activate updates a status field; nothing quarantines, blocks, or rotates a live credential.
- **Attribute conflicts are capped at 1 in the mock generator** (`src/mocks/generators.ts`) — it pushes at most one conflict record per identity. `Attribute conflicts more than 1` is grammar-valid and not flagged as unsatisfiable, but will show 0 affected against today's dataset regardless of how the rule is worded.
- **Owner is only ever unassigned on orphaned identities** in the generator (`owner = orphaned && roll(0.7) ? undefined : pick(OWNERS)`) — a non-orphaned identity always has an owner. This is a dataset correlation, not a grammar rule, so `Orphaned is false AND Owner is unassigned` is correctly left unflagged (it's possible in principle) but will read as 0-affected-today against the current seed.
- **Typing the word "unassigned" into Owner is/is-not** is a literal text match against the owner field, unrelated to the dedicated **is unassigned** operator (`empty`). They look similar in the UI but exercise different code paths.
