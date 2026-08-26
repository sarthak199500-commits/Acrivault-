# Govern Activity Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record and display every action an active policy performs on an identity — success, failure, or skip — as a third tab in the Govern module.

**Architecture:** A new append-only `PolicyAction` entity is seeded per enforcing policy and served by a `listPolicyActions` mock endpoint. Selection and sweep-grouping live in a pure, unit-tested module (`policyActivity.ts`) mirroring the existing `policyList.ts` split. The UI is a third `TabPanel` inside the existing `PolicyListScreen` tab bar — no new route — reusing the row vocabulary already established by the builder's `TestResult` card.

**Tech Stack:** React 19 + TypeScript, react-router-dom, TanStack Query, Radix Tabs, Tailwind with CSS-variable design tokens, Vitest.

---

## Current state of the working tree

Two edits are **already applied**. Verify them in Tasks 1–2 rather than re-applying:

1. `src/mocks/types.ts` — `PolicyAction`, `PolicyActionOutcome`, `PolicyActionReason`, `POLICY_ACTION_REASON_LABELS`, `SweepReason` added above `SessionStepKind`.
2. `src/mocks/policy.ts` — the `block` option removed from `ACTIONS`, and its `case 'block'` removed from `actionPhrase`.

**The tree is currently inconsistent.** `generators.ts` still seeds a policy with `value: 'block'`, which no longer has a matching option in the builder's value `Select` and falls through `actionPhrase`'s `default: return token.value`, rendering "then block." instead of a sentence. Task 1 closes that. If you would rather abandon the whole change, `git checkout -- src/mocks/types.ts src/mocks/policy.ts` restores both.

## Design decisions already settled

These are locked; do not relitigate them during implementation.

- **`block` is removed.** It had no target state (`IdentityStatus` is `'active' | 'inactive' | 'quarantined'`) and nothing distinguished it from `quarantine`.
- **`review` stays and produces no log rows.** A flag is derived from the current match set, not a stored event. Surfacing it in the Inventory is out of scope for this plan.
- **`alert` produces no log rows.** It creates an `Alert`, which Monitor owns.
- **`rotate` produces no log rows.** Out of scope; the decision to make rotate policies recommend-only is not implemented here.
- **Therefore `quarantine` is the only action that writes a `PolicyAction`.** The log has one action type in it, deliberately.
- **`accountable` is the policy's activator, not its author.** `policy.create` and `policy.activate` are separate permissions and only a Security Admin can activate, so the drafter cannot authorize enforcement.
- **`policyName` and `accountable` are stamped on the event, never resolved at read time.** A rename or a reactivation by someone else must not rewrite history.
- **A release is a new row that points back at what it reverses**, never an edit to the original.

## File structure

| File | Responsibility |
|---|---|
| `src/mocks/types.ts` | `PolicyAction` entity and its enums (**already applied**) |
| `src/mocks/policy.ts` | `block` removed from the vocabulary (**already applied**) |
| `src/mocks/generators.ts` | Convert the `block` seed; add `generatePolicyActions` |
| `src/mocks/dataset.ts` | Wire `policyActions` into the `Dataset` |
| `src/mocks/api.ts` | `listPolicyActions` + the identity join |
| `src/features/govern/policyActivity.ts` | **New.** Pure filter/group/summary logic |
| `src/features/govern/policyActivity.test.ts` | **New.** Unit tests for the above |
| `src/features/govern/queries.ts` | `usePolicyActions` hook |
| `src/features/govern/policyList.ts` | Widen `PolicyTab` with `'activity'` |
| `src/features/govern/usePolicyFilters.ts` | Parse and write `?tab=activity` |
| `src/features/govern/PolicyActivityPanel.tsx` | **New.** The tab's contents |
| `src/features/govern/PolicyListScreen.tsx` | Third tab + a row link into it |

No router change: the tab is `?tab=activity` on the existing `/govern` route, matching how `?tab=archive` already works.

---

### Task 1: Finish removing `block`

**Files:**
- Verify: `src/mocks/policy.ts:172-181`
- Modify: `src/mocks/generators.ts:445-452`

- [ ] **Step 1: Verify the already-applied vocabulary change**

Run: `grep -n "block" src/mocks/policy.ts`

Expected: no matches. If `block` still appears in `ACTIONS` or `actionPhrase`, apply the removal now — delete the line `{ value: 'block', label: 'block' },` from the `ACTIONS[0].options` array and the two lines `case 'block':` / `return 'block it';` from `actionPhrase`.

- [ ] **Step 2: Confirm the seed is the only remaining user of `block`**

Run: `grep -rn "'block'" src/`

Expected: exactly one match, `src/mocks/generators.ts:451`.

- [ ] **Step 3: Convert the seeded policy**

In `src/mocks/generators.ts`, replace this block:

```ts
    {
      name: 'Block dormant OAuth tokens',
      status: 'suspended',
      tokens: [
        { kind: 'when', subject: 'type', operator: 'is', value: 'oauth-token' },
        { kind: 'and', subject: 'governanceStatus', operator: 'is', value: 'ungoverned' },
        { kind: 'then', subject: 'action', operator: 'set', value: 'block' },
      ],
    },
```

with:

```ts
    {
      // Was 'block' until that action was removed from the vocabulary — it had no
      // target state and nothing distinguished it from quarantine. Kept Suspended:
      // it is the only seed exercising that status in the list's facet counts.
      name: 'Quarantine dormant OAuth tokens',
      status: 'suspended',
      tokens: [
        { kind: 'when', subject: 'type', operator: 'is', value: 'oauth-token' },
        { kind: 'and', subject: 'governanceStatus', operator: 'is', value: 'ungoverned' },
        { kind: 'then', subject: 'action', operator: 'set', value: 'quarantine' },
      ],
    },
```

- [ ] **Step 4: Verify no `block` remains anywhere**

Run: `grep -rn "'block'" src/`

Expected: no matches.

- [ ] **Step 5: Typecheck and test**

Run: `npm run typecheck && npm test`

Expected: both pass. Note the repo gotcha — `npx tsc --noEmit` at the root checks **nothing** because the root tsconfig is `{"files":[],"references":[...]}`. Always use `npm run typecheck`, which is `tsc -b --noEmit`.

- [ ] **Step 6: Commit**

```bash
git add src/mocks/policy.ts src/mocks/generators.ts && git commit -m "feat(govern): remove the block action from the policy vocabulary"
```

---

### Task 2: Verify the `PolicyAction` entity

**Files:**
- Verify: `src/mocks/types.ts` (block inserted above `export type SessionStepKind`)

- [ ] **Step 1: Confirm the entity is present and complete**

Run: `grep -n "PolicyActionOutcome\|PolicyActionReason\|interface PolicyAction\|SweepReason" src/mocks/types.ts`

Expected: matches for `PolicyActionOutcome`, `PolicyActionReason`, `POLICY_ACTION_REASON_LABELS`, `SweepReason`, and `interface PolicyAction`.

If any are missing, insert this immediately before `export type SessionStepKind = 'prompt' | 'tool-call' | 'model-response';`:

```ts
/**
 * What an active policy did to one identity, once.
 *
 * Only `quarantine` produces these. `review` and `alert` mark rather than act —
 * a flag is derived from the current match set, an alert is an Alert — and a
 * rotate policy proposes a rotation rather than running one. None of those three
 * leave a discrete cloud-side outcome, so none of them appear here.
 */
export type PolicyActionOutcome = 'quarantined' | 'failed' | 'skipped' | 'released';

/**
 * Typed causes rather than free text, so identical failures can be counted and
 * fixed once — "12 failures, all the same missing permission" is the useful
 * reading, and a sentence per row makes it ungreppable.
 */
export type PolicyActionReason =
  | 'connector-permission'
  | 'identity-gone'
  | 'already-quarantined'
  | 'self-protection'
  | 'provider-error';

export const POLICY_ACTION_REASON_LABELS: Record<PolicyActionReason, string> = {
  'connector-permission': 'Connector lacks permission for this action',
  'identity-gone': 'Identity no longer exists at the provider',
  'already-quarantined': 'Already quarantined — nothing to do',
  'self-protection': "Self-protection — Acrivault's own connector is never acted on",
  'provider-error': 'Provider rejected the call',
};

/** Why a sweep ran. A release is a person's doing, so it belongs to no sweep. */
export type SweepReason = 'activation' | 're-evaluation';

export interface PolicyAction {
  id: string;
  policyId: string;
  /**
   * The policy's name AT THE TIME. Stamped rather than resolved on read, so
   * renaming a policy cannot rewrite what the log says happened.
   */
  policyName: string;
  identityId: string;
  outcome: PolicyActionOutcome;
  /** Set on `failed` and `skipped`; absent otherwise. */
  reason?: PolicyActionReason;
  /** A person's own words, and only ever theirs — carried on a release. */
  note?: string;
  /**
   * Who is answerable: whoever ACTIVATED the rule, not whoever drafted it.
   * Activation is the separately-permissioned decision (`policy.activate`), and
   * an Analyst who drafts a rule cannot authorize it to enforce. Stamped for the
   * same reason as `policyName` — a policy reactivated by someone else must not
   * retroactively reassign responsibility for what already happened.
   */
  accountable: string;
  /** Groups the rows one sweep produced. Absent on a release. */
  sweepId?: string;
  sweepReason?: SweepReason;
  /** The action a release reverses. */
  reversesId?: string;
  at: string;
} // append-only
```

- [ ] **Step 2: Confirm line endings are CRLF**

The repo uses CRLF. Run:

```bash
node -e "const s=require('fs').readFileSync('src/mocks/types.ts','utf8'); console.log('has LF-only lines:', /[^\r]\n/.test(s));"
```

Expected: `has LF-only lines: false`. If `true`, normalize:

```bash
node -e "const fs=require('fs'),p='src/mocks/types.ts';fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n').replace(/\n/g,'\r\n'));"
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/mocks/types.ts && git commit -m "feat(govern): add the PolicyAction entity"
```

---

### Task 3: Seed policy actions

**Files:**
- Modify: `src/mocks/generators.ts`
- Modify: `src/mocks/dataset.ts`

- [ ] **Step 1: Add the imports**

In `src/mocks/generators.ts`, add to the existing `from './types'` import list (keep it alphabetical, matching the file's convention):

```ts
  type PolicyAction,
  type PolicyActionReason,
```

- [ ] **Step 2: Write the generator**

Append to `src/mocks/generators.ts`, immediately after `generatePolicies` (before the `/* ------ rotation jobs */` banner):

```ts
/* --------------------------------------------------------- policy actions */

/**
 * How many rows one seeded sweep produces. A real sweep acts on every match, but
 * the fixture scales to 50k identities and a row per match would swamp the tab.
 * The sweep header counts the rows that exist rather than the live match count,
 * so what the summary says and what the list shows always agree.
 */
const SWEEP_ROWS = 18;

/**
 * A failure cause that is a property of the cloud, not of the identity — so
 * failures cluster the way real ones do and "N share the same cause" is true.
 */
function failureFor(cloud: Cloud): PolicyActionReason {
  if (cloud === 'gcp') return 'connector-permission';
  if (cloud === 'aws') return 'identity-gone';
  return 'provider-error';
}

/**
 * Actions left behind by policies that have enforced. Only a quarantine policy
 * produces any: review and alert mark rather than act, and rotate is out of scope.
 * A Suspended policy keeps its history — it enforced before it was stopped.
 */
export function generatePolicyActions(
  identities: Identity[],
  policies: Policy[],
  users: User[],
  seed: number,
  now: Date,
): PolicyAction[] {
  const rng = new Rng(seed ^ 0xac7104);
  const accountable = users[0]?.email ?? 'system';
  const releaser = users[1]?.email ?? accountable;
  const out: PolicyAction[] = [];
  let seq = 0;
  const nextId = () => `pac_${(seq++).toString(36).padStart(5, '0')}`;

  const enforcing = policies.filter(
    (p) =>
      (p.status === 'active' || p.status === 'suspended') &&
      p.tokens.some((t) => t.kind === 'then' && t.subject === 'action' && t.value === 'quarantine'),
  );

  for (const policy of enforcing) {
    const matched = identities.filter((i) => matchesPolicy(i, policy.tokens));
    if (matched.length === 0) continue;

    const activatedMs = new Date(policy.activatedAt ?? policy.updatedAt).getTime();
    const sweepId = `swp_${policy.id}_a`;
    const quarantined: PolicyAction[] = [];

    // The activation sweep: everything matching at the moment the rule went live.
    for (const identity of matched.slice(0, SWEEP_ROWS)) {
      const at = new Date(activatedMs + rng.int(0, 90) * 1000).toISOString();
      const base = {
        id: nextId(),
        policyId: policy.id,
        policyName: policy.name,
        identityId: identity.id,
        accountable,
        sweepId,
        sweepReason: 'activation' as const,
        at,
      };
      // An identity already in that state is a skip, not a failure — the guard
      // worked. Derived from the seeded status so the log reconciles with the
      // inventory rather than asserting something the identity contradicts.
      if (identity.status === 'quarantined') {
        out.push({ ...base, outcome: 'skipped', reason: 'already-quarantined' });
        continue;
      }
      if (rng.bool(0.12)) {
        out.push({
          ...base,
          outcome: 'failed',
          reason: failureFor(identity.sources[0]?.cloud ?? 'aws'),
        });
        continue;
      }
      const action: PolicyAction = { ...base, outcome: 'quarantined' };
      out.push(action);
      quarantined.push(action);
    }

    // One later re-evaluation, for policies still enforcing.
    if (policy.status === 'active' && matched.length > SWEEP_ROWS) {
      const identity = matched[SWEEP_ROWS];
      out.push({
        id: nextId(),
        policyId: policy.id,
        policyName: policy.name,
        identityId: identity.id,
        outcome: 'quarantined',
        accountable,
        sweepId: `swp_${policy.id}_r`,
        sweepReason: 're-evaluation',
        at: new Date(now.getTime() - rng.int(5, 240) * 60000).toISOString(),
      });
    }

    // A reversal or two. These are the most useful rows on the screen — a
    // quarantine a person undid is the signal that the rule is wrong.
    for (const reversed of quarantined.slice(0, rng.int(1, 2))) {
      out.push({
        id: nextId(),
        policyId: policy.id,
        policyName: policy.name,
        identityId: reversed.identityId,
        outcome: 'released',
        note: 'Still in active use — released pending a rule change.',
        accountable: releaser,
        reversesId: reversed.id,
        at: new Date(new Date(reversed.at).getTime() + rng.int(20, 180) * 60000).toISOString(),
      });
    }
  }

  return out.sort((a, b) => b.at.localeCompare(a.at));
}
```

- [ ] **Step 3: Wire it into the dataset**

In `src/mocks/dataset.ts`, add `generatePolicyActions` to the import list from `./generators`, then add the field to the `Dataset` interface after `policies`:

```ts
  policyActions: ReturnType<typeof generatePolicyActions>;
```

and to the returned object in `build()`, after `policies,`:

```ts
    policyActions: generatePolicyActions(identities, policies, users, SEED, NOW),
```

- [ ] **Step 4: Verify the fixture produces rows**

Run:

```bash
npx vitest run --reporter=verbose -t "nothing" 2>/dev/null; node --experimental-strip-types -e "1" 2>/dev/null; echo "use the test in step 5 instead"
```

The mock dataset imports `@/` aliases and browser globals, so it is not inspectable from a bare `node -e`. Verification happens through the unit test in Task 5 and the running app in Task 9.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/mocks/generators.ts src/mocks/dataset.ts && git commit -m "feat(govern): seed policy enforcement actions"
```

---

### Task 4: Serve policy actions from the mock API

**Files:**
- Modify: `src/mocks/api.ts`

- [ ] **Step 1: Add the types and endpoint**

In `src/mocks/api.ts`, add `PolicyAction` and `PolicyActionOutcome` to the existing `from './types'` import, then add this immediately after `listPolicies` / `getPolicy` (near line 505):

```ts
/**
 * An action joined to the identity fields the row renders. Raw ids are not UI
 * labels, and the row reuses the builder's TestResult vocabulary — type glyph,
 * cloud marks, risk pill, orphan flag — so it carries the same fields.
 */
export type PolicyActionWithIdentity = PolicyAction & {
  identityName: string;
  identityType: NhiType;
  identityClouds: Cloud[];
  identityRiskScore: number;
  identityOrphaned: boolean;
};

function withActionIdentity(action: PolicyAction): PolicyActionWithIdentity {
  const identity = getDataset().identityById.get(action.identityId);
  return {
    ...action,
    identityName: identity?.name ?? action.identityId,
    identityType: identity?.type ?? 'service-account',
    // Deduped: a correlated identity often reports the same cloud twice.
    identityClouds: identity ? [...new Set(identity.sources.map((s) => s.cloud))] : [],
    identityRiskScore: identity?.riskScore ?? 0,
    identityOrphaned: identity?.orphaned ?? false,
  };
}

export interface PolicyActionQuery {
  policyId?: string;
  outcome?: PolicyActionOutcome;
}

/**
 * The append-only record of what active policies have done. Read-only by design:
 * there is no mutation here, because an entry is never edited — a release is a
 * new entry that points back at what it reverses.
 */
export function listPolicyActions(query: PolicyActionQuery = {}): Promise<PolicyActionWithIdentity[]> {
  return respond(() => {
    if (isEmptyForced()) return [];
    let rows = getDataset().policyActions;
    if (query.policyId) rows = rows.filter((a) => a.policyId === query.policyId);
    if (query.outcome) rows = rows.filter((a) => a.outcome === query.outcome);
    return rows.map(withActionIdentity);
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. If `Cloud` or `NhiType` are not already imported in `api.ts`, add them to the `./types` import.

- [ ] **Step 3: Commit**

```bash
git add src/mocks/api.ts && git commit -m "feat(govern): serve policy actions from the mock API"
```

---

### Task 5: Pure selection and sweep-grouping module

**Files:**
- Create: `src/features/govern/policyActivity.ts`
- Test: `src/features/govern/policyActivity.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/govern/policyActivity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  OUTCOME_FILTERS,
  failureSummary,
  filterByOutcome,
  groupIntoSweeps,
  outcomeCounts,
} from './policyActivity';
import type { PolicyAction } from '@/mocks/types';

function action(over: Partial<PolicyAction> & { id: string; outcome: PolicyAction['outcome'] }): PolicyAction {
  return {
    policyId: 'pol_0000',
    policyName: 'Quarantine orphaned AI agents',
    identityId: `idn-${over.id}`,
    accountable: 'dana@acrivault.io',
    at: '2026-08-20T10:00:00.000Z',
    ...over,
  };
}

const SWEEP_A = { sweepId: 'swp_a', sweepReason: 'activation' as const, at: '2026-08-20T10:00:00.000Z' };
const SWEEP_B = { sweepId: 'swp_b', sweepReason: 're-evaluation' as const, at: '2026-08-25T03:00:00.000Z' };

const ACTIONS: PolicyAction[] = [
  action({ id: 'a1', outcome: 'quarantined', ...SWEEP_A }),
  action({ id: 'a2', outcome: 'failed', reason: 'connector-permission', ...SWEEP_A }),
  action({ id: 'a3', outcome: 'failed', reason: 'connector-permission', ...SWEEP_A }),
  action({ id: 'a4', outcome: 'skipped', reason: 'already-quarantined', ...SWEEP_A }),
  action({ id: 'b1', outcome: 'quarantined', ...SWEEP_B }),
  action({ id: 'r1', outcome: 'released', reversesId: 'a1', at: '2026-08-26T09:00:00.000Z' }),
];

const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

describe('groupIntoSweeps', () => {
  it('groups actions by sweep, newest group first', () => {
    const groups = groupIntoSweeps(ACTIONS);
    expect(groups.map((g) => g.id)).toEqual(['manual:r1', 'swp_b', 'swp_a']);
  });

  it('gives a release its own group — it belongs to no sweep', () => {
    const release = groupIntoSweeps(ACTIONS).find((g) => g.reason === 'manual');
    expect(release).toBeDefined();
    expect(ids(release!.actions)).toEqual(['r1']);
  });

  it('orders failures first within a group — they are why you opened this', () => {
    const sweep = groupIntoSweeps(ACTIONS).find((g) => g.id === 'swp_a')!;
    expect(ids(sweep.actions)).toEqual(['a2', 'a3', 'a1', 'a4']);
  });

  it('counts outcomes per group', () => {
    const sweep = groupIntoSweeps(ACTIONS).find((g) => g.id === 'swp_a')!;
    expect(sweep.counts).toEqual({ quarantined: 1, failed: 2, skipped: 1, released: 0 });
  });

  it('carries the stamped policy name, not a live lookup', () => {
    const sweep = groupIntoSweeps(ACTIONS).find((g) => g.id === 'swp_a')!;
    expect(sweep.policyName).toBe('Quarantine orphaned AI agents');
  });
});

describe('failureSummary', () => {
  it('reports the shared cause when two or more failures agree', () => {
    expect(failureSummary(ACTIONS)).toEqual({ failed: 2, total: 6, sharedCause: 2 });
  });

  it('reports no shared cause when every failure differs', () => {
    const mixed = [
      action({ id: 'x', outcome: 'failed', reason: 'connector-permission' }),
      action({ id: 'y', outcome: 'failed', reason: 'identity-gone' }),
    ];
    expect(failureSummary(mixed)).toEqual({ failed: 2, total: 2, sharedCause: 0 });
  });

  it('reports zero failures for a clean log', () => {
    expect(failureSummary([action({ id: 'q', outcome: 'quarantined' })])).toEqual({
      failed: 0,
      total: 1,
      sharedCause: 0,
    });
  });
});

describe('filterByOutcome', () => {
  it('returns everything for "all"', () => {
    expect(filterByOutcome(ACTIONS, 'all')).toHaveLength(6);
  });

  it('narrows to one outcome', () => {
    expect(ids(filterByOutcome(ACTIONS, 'failed'))).toEqual(['a2', 'a3']);
  });
});

describe('outcomeCounts', () => {
  it('counts the whole population so a pill count is stable under filtering', () => {
    expect(outcomeCounts(ACTIONS)).toEqual({ quarantined: 2, failed: 2, skipped: 1, released: 1 });
  });
});

describe('OUTCOME_FILTERS', () => {
  it('leads with the outcomes worth acting on', () => {
    expect(OUTCOME_FILTERS).toEqual(['all', 'failed', 'skipped', 'quarantined', 'released']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/govern/policyActivity.test.ts`
Expected: FAIL — `Failed to resolve import "./policyActivity"`.

- [ ] **Step 3: Write the implementation**

Create `src/features/govern/policyActivity.ts`:

```ts
// Filtering, grouping and summarising for the Govern Activity tab. Pure functions
// so the rules are unit-testable independently of the screen — the same split
// policyList.ts uses for the policy list.

import type { PolicyAction, PolicyActionOutcome } from '@/mocks/types';

export type OutcomeFilter = 'all' | PolicyActionOutcome;

/**
 * Filter vocabulary, ordered by what someone opening this tab is looking for.
 * Failures lead because they are the only rows that need a decision; the
 * successes are identical to one another and carry no signal on their own.
 */
export const OUTCOME_FILTERS: OutcomeFilter[] = [
  'all',
  'failed',
  'skipped',
  'quarantined',
  'released',
];

export const OUTCOME_LABELS: Record<PolicyActionOutcome, string> = {
  quarantined: 'Quarantined',
  failed: 'Failed',
  skipped: 'Skipped',
  released: 'Released',
};

const OUTCOMES: PolicyActionOutcome[] = ['quarantined', 'failed', 'skipped', 'released'];

/**
 * A sweep is one run of a policy against the estate. `manual` is not a sweep —
 * it is a single human act (a release) that belongs to no run, given a group of
 * its own so the timeline stays one ordered list.
 */
export type SweepGroupReason = 'activation' | 're-evaluation' | 'manual';

export interface SweepGroup<T extends PolicyAction> {
  id: string;
  reason: SweepGroupReason;
  policyName: string;
  /** The newest action in the group — what the group is sorted and labelled by. */
  at: string;
  counts: Record<PolicyActionOutcome, number>;
  actions: T[];
}

export function outcomeCounts(actions: Pick<PolicyAction, 'outcome'>[]): Record<PolicyActionOutcome, number> {
  const counts = Object.fromEntries(OUTCOMES.map((o) => [o, 0])) as Record<PolicyActionOutcome, number>;
  for (const a of actions) counts[a.outcome] += 1;
  return counts;
}

export function filterByOutcome<T extends Pick<PolicyAction, 'outcome'>>(
  actions: T[],
  filter: OutcomeFilter,
): T[] {
  return filter === 'all' ? actions : actions.filter((a) => a.outcome === filter);
}

/**
 * How many failed, and how many of those share one cause. The shared-cause count
 * is the actionable half: forty-four rows and one missing connector permission is
 * one fix, and a per-row sentence would never say so.
 */
export function failureSummary(
  actions: Pick<PolicyAction, 'outcome' | 'reason'>[],
): { failed: number; total: number; sharedCause: number } {
  const failures = actions.filter((a) => a.outcome === 'failed');
  const byReason = new Map<string, number>();
  for (const f of failures) {
    const key = f.reason ?? 'unknown';
    byReason.set(key, (byReason.get(key) ?? 0) + 1);
  }
  const largest = Math.max(0, ...byReason.values());
  return {
    failed: failures.length,
    total: actions.length,
    // One failure is not a shared cause, however you count it.
    sharedCause: largest > 1 ? largest : 0,
  };
}

/** Failures first, then the rest newest-first — the TestResult card's ordering rule. */
function orderWithinGroup<T extends PolicyAction>(actions: T[]): T[] {
  return [...actions].sort((a, b) => {
    const aFailed = a.outcome === 'failed' ? 0 : 1;
    const bFailed = b.outcome === 'failed' ? 0 : 1;
    if (aFailed !== bFailed) return aFailed - bFailed;
    return b.at.localeCompare(a.at);
  });
}

/**
 * Group actions into the sweeps that produced them, newest group first.
 *
 * Grouping is load-bearing, not decoration: activating a rule that matches forty
 * identities writes forty rows stamped the same second, and a flat chronological
 * list of those is unreadable.
 */
export function groupIntoSweeps<T extends PolicyAction>(actions: T[]): SweepGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const a of actions) {
    const key = a.sweepId ?? `manual:${a.id}`;
    const list = groups.get(key) ?? [];
    list.push(a);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([id, rows]) => {
      const ordered = orderWithinGroup(rows);
      const newest = rows.reduce((n, r) => (r.at.localeCompare(n) > 0 ? r.at : n), rows[0].at);
      return {
        id,
        reason: (rows[0].sweepReason ?? 'manual') as SweepGroupReason,
        policyName: rows[0].policyName,
        at: newest,
        counts: outcomeCounts(rows),
        actions: ordered,
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

export const SWEEP_LABELS: Record<SweepGroupReason, string> = {
  activation: 'First sweep after activation',
  're-evaluation': 'Re-evaluation',
  manual: 'By a person',
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/govern/policyActivity.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/features/govern/policyActivity.ts src/features/govern/policyActivity.test.ts && git commit -m "feat(govern): add pure sweep-grouping for the activity tab"
```

---

### Task 6: Query hook

**Files:**
- Modify: `src/features/govern/queries.ts`

- [ ] **Step 1: Add the hook**

In `src/features/govern/queries.ts`, add `listPolicyActions` to the `@/mocks/api` import, then append:

```ts
/**
 * The action log. `enabled` keeps it off the wire until the Activity tab is
 * actually open — the policy list is the default view and should not pay for it.
 */
export function usePolicyActions(opts: { policyId?: string; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['policy-actions', opts.policyId ?? null],
    queryFn: () => listPolicyActions({ policyId: opts.policyId }),
    enabled: opts.enabled ?? true,
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/govern/queries.ts && git commit -m "feat(govern): add the usePolicyActions query hook"
```

---

### Task 7: The Activity tab

**Files:**
- Modify: `src/features/govern/policyList.ts:15`
- Modify: `src/features/govern/usePolicyFilters.ts`
- Create: `src/features/govern/PolicyActivityPanel.tsx`
- Modify: `src/features/govern/PolicyListScreen.tsx`

- [ ] **Step 1: Widen the tab type**

In `src/features/govern/policyList.ts`, replace:

```ts
export type PolicyTab = 'live' | 'archive';
```

with:

```ts
/**
 * Two populations of policies, plus the record of what the active ones have
 * actually done. Activity is not a filtered view of the same rows — it is a
 * different entity — but it is a view of Govern, so it belongs in the same bar.
 */
export type PolicyTab = 'live' | 'archive' | 'activity';
```

- [ ] **Step 2: Parse and write `?tab=activity`**

In `src/features/govern/usePolicyFilters.ts`, replace the `tab` derivation:

```ts
    const tab: PolicyTab =
      params.get('tab') === 'archive' || parsed.includes('archived') ? 'archive' : 'live';
```

with:

```ts
    const raw = params.get('tab');
    // Before the archive became its own tab, it was reached with ?status=archived.
    // Translate those links instead of leaving them on an empty live list.
    const tab: PolicyTab =
      raw === 'archive' || parsed.includes('archived')
        ? 'archive'
        : raw === 'activity'
          ? 'activity'
          : 'live';
```

and replace `setTab`:

```ts
  const setTab = useCallback(
    (next: string) =>
      update((n) => {
        if (next === 'archive') n.set('tab', 'archive');
        else n.delete('tab');
        ['q', 'status'].forEach((k) => n.delete(k));
      }),
    [update],
  );
```

with:

```ts
  /** A tab switch changes population, so it resets the narrowing scoped to the old one. */
  const setTab = useCallback(
    (next: string) =>
      update((n) => {
        if (next === 'live') n.delete('tab');
        else n.set('tab', next);
        ['q', 'status'].forEach((k) => n.delete(k));
      }),
    [update],
  );
```

Delete the now-duplicated comment line above the old `setTab` if it remains.

- [ ] **Step 3: Write the panel**

Create `src/features/govern/PolicyActivityPanel.tsx`:

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ListChecks } from 'lucide-react';
import { usePolicyActions } from './queries';
import {
  OUTCOME_FILTERS,
  OUTCOME_LABELS,
  SWEEP_LABELS,
  failureSummary,
  filterByOutcome,
  groupIntoSweeps,
  outcomeCounts,
  type OutcomeFilter,
} from './policyActivity';
import { POLICY_ACTION_REASON_LABELS, type PolicyActionOutcome } from '@/mocks/types';
import type { PolicyActionWithIdentity } from '@/mocks/api';
import { Card } from '@/components/ui/Card';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RiskPill } from '@/components/ui/RiskPill';
import { NhiTypeIcon } from '@/components/ui/NhiTypeIcon';
import { ProviderMark } from '@/components/ui/ProviderMark';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { count, relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * Outcome tone. `skipped` is deliberately neutral, not critical: a guard
 * declining to act is the system working, and colouring it like a failure trains
 * people to "fix" the guard. `released` is info — a reversal is a state change
 * worth seeing, not a problem.
 */
const OUTCOME_TONE: Record<PolicyActionOutcome, BadgeTone> = {
  quarantined: 'success',
  failed: 'critical',
  skipped: 'neutral',
  released: 'info',
};

function ActionRow({ action }: { action: PolicyActionWithIdentity }) {
  return (
    <li className="border-b border-border px-3 py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={OUTCOME_TONE[action.outcome]}>{OUTCOME_LABELS[action.outcome]}</Badge>
        <NhiTypeIcon type={action.identityType} className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
        <Link
          to={`/discover/${action.identityId}`}
          className="truncate font-mono text-[length:var(--fs-small)] text-text hover:underline"
        >
          {action.identityName}
        </Link>
        {action.identityOrphaned && (
          <span className="text-[length:var(--fs-micro)] text-warn-fg" title="Orphaned — no accountable owner">
            orphaned
          </span>
        )}
        <span className="flex items-center gap-1">
          {action.identityClouds.map((c) => (
            <ProviderMark key={c} cloud={c} className="h-3.5" />
          ))}
        </span>
        <RiskPill score={action.identityRiskScore} size="sm" />
        <span className="ml-auto whitespace-nowrap text-[length:var(--fs-micro)] text-text-tertiary">
          {relativeTime(action.at)}
        </span>
      </div>

      {action.reason && (
        <p
          className={cn(
            'mt-1 text-[length:var(--fs-small)]',
            action.outcome === 'failed' ? 'text-crit-fg' : 'text-text-secondary',
          )}
        >
          {POLICY_ACTION_REASON_LABELS[action.reason]}
        </p>
      )}
      {action.note && (
        <p className="mt-1 text-[length:var(--fs-small)] text-text-secondary">{action.note}</p>
      )}

      <p className="mt-1 text-[length:var(--fs-micro)] text-text-tertiary">
        <Link to={`/govern/builder/${action.policyId}`} className="text-accent-text hover:underline">
          {action.policyName}
        </Link>
        {' · '}
        <span className="font-mono">{action.accountable}</span>
      </p>
    </li>
  );
}

/**
 * Every action the active policies have performed. Read-only: an entry is never
 * edited, because a release is a new entry that points at what it reverses.
 */
export function PolicyActivityPanel() {
  const [filter, setFilter] = useState<OutcomeFilter>('all');
  const query = usePolicyActions();

  return (
    <QueryBoundary
      query={query}
      loadingFallback={
        <Card>
          <SkeletonTableRows rows={8} cols={3} />
        </Card>
      }
      isEmpty={(rows: PolicyActionWithIdentity[]) => rows.length === 0}
      empty={
        <Card>
          <EmptyState
            icon={<ListChecks className="h-5 w-5" />}
            headline="No policy has acted yet"
            guidance="Only an active quarantine policy records actions here. Flag-for-review and alert policies mark identities rather than changing them, so they leave no entries."
          />
        </Card>
      }
    >
      {(rows: PolicyActionWithIdentity[]) => {
        const counts = outcomeCounts(rows);
        const summary = failureSummary(rows);
        const visible = filterByOutcome(rows, filter);
        const groups = groupIntoSweeps(visible);

        return (
          <div>
            {summary.failed > 0 && (
              <p className="mb-3 flex items-baseline gap-1.5 text-[length:var(--fs-small)] text-crit-fg">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 translate-y-0.5" aria-hidden="true" />
                <span>
                  <span className="tnum font-semibold">{count(summary.failed)}</span> of{' '}
                  <span className="tnum">{count(summary.total)}</span> actions failed.
                  {summary.sharedCause > 0 && (
                    <> <span className="tnum">{count(summary.sharedCause)}</span> share the same cause.</>
                  )}
                </span>
              </p>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              {OUTCOME_FILTERS.map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? 'secondary' : 'ghost'}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? `All ${count(rows.length)}` : `${OUTCOME_LABELS[f]} ${count(counts[f])}`}
                </Button>
              ))}
            </div>

            {visible.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<ListChecks className="h-5 w-5" />}
                  headline="No actions with that outcome"
                  guidance="Clear the filter to see the whole log."
                  action={
                    <Button size="sm" variant="secondary" onClick={() => setFilter('all')}>
                      Clear filter
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => (
                  <Card key={group.id}>
                    {group.reason !== 'manual' && (
                      <div className="border-b border-border bg-surface-2 px-3 py-2">
                        <span className="eyebrow">{SWEEP_LABELS[group.reason]}</span>
                        <span className="ml-2 text-[length:var(--fs-small)] text-text-secondary">
                          {group.policyName} · {count(group.actions.length)}{' '}
                          {group.actions.length === 1 ? 'action' : 'actions'} ·{' '}
                          {count(group.counts.failed)} failed · {relativeTime(group.at)}
                        </span>
                      </div>
                    )}
                    <ul>
                      {group.actions.map((a) => (
                        <ActionRow key={a.id} action={a} />
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
      }}
    </QueryBoundary>
  );
}
```

- [ ] **Step 4: Add the tab to the screen**

In `src/features/govern/PolicyListScreen.tsx`, add the import:

```tsx
import { PolicyActivityPanel } from './PolicyActivityPanel';
```

Then in the `tabs` array passed to `<Tabs>`, add a third entry after the archive one:

```tsx
                { value: 'activity', label: 'Activity' },
```

and add a third `TabPanel` immediately before the closing `</Tabs>`:

```tsx
              <TabPanel value="activity">
                <PolicyActivityPanel />
              </TabPanel>
```

The Activity tab carries no count in its label on purpose: the other two count policies, and a third number counting a different entity in the same bar reads as though it counts policies too.

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both PASS. If `RiskPill` does not accept `size="sm"`, check its signature at `src/components/ui/RiskPill.tsx` and drop the prop.

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/govern/ && git commit -m "feat(govern): add the Activity tab to the policy screen"
```

---

### Task 8: Link into the tab from a policy row

**Files:**
- Modify: `src/features/govern/PolicyListScreen.tsx:136`

- [ ] **Step 1: Add the actions link to the affected-count cell**

In `src/features/govern/PolicyListScreen.tsx`, find the affected-count cell:

```tsx
        <div className="tnum text-[length:var(--fs-body)] text-text">{count(policy.affectedCount)}</div>
        <div className="text-[length:var(--fs-micro)] text-text-tertiary">affected</div>
```

and replace it with:

```tsx
        <div className="tnum text-[length:var(--fs-body)] text-text">{count(policy.affectedCount)}</div>
        <div className="text-[length:var(--fs-micro)] text-text-tertiary">affected</div>
        {/* Two different denominators: "affected" is who matches NOW, the action
            log is what was done OVER TIME. Labelled, never adjacent bare numbers. */}
        {policy.activatedAt && (
          <Link
            to="/govern?tab=activity"
            onClick={(e) => e.stopPropagation()}
            className="text-[length:var(--fs-micro)] text-accent-text hover:underline"
          >
            View actions
          </Link>
        )}
```

`stopPropagation` is required: the row itself navigates to the builder via `onClick` at line 117, so without it the link would be swallowed.

- [ ] **Step 2: Verify the link does not trigger the row navigation**

Run: `npm run dev`, open `http://localhost:5173/govern`, and click "View actions" on the active policy.
Expected: the Activity tab opens. The Policy Builder does **not** open.

- [ ] **Step 3: Typecheck and commit**

```bash
npm run typecheck && git add src/features/govern/PolicyListScreen.tsx && git commit -m "feat(govern): link policy rows into the activity tab"
```

---

### Task 9: Full verification

**Files:** none — verification only.

- [ ] **Step 1: Run the whole suite**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all three PASS.

- [ ] **Step 2: Verify the vocabulary change in the running app**

Run `npm run dev` and open `http://localhost:5173/govern`.

Expected:
- The policy formerly called "Block dormant OAuth tokens" now reads "Quarantine dormant OAuth tokens" and is still **Suspended**.
- Opening it in the builder shows a complete sentence ending "then quarantine it." — not a bare "block".
- The THEN action dropdown offers exactly: quarantine, flag for review, raise an alert.

- [ ] **Step 3: Verify the Activity tab**

Click Activity.

Expected:
- Groups appear newest-first, each headed by its sweep reason and policy name.
- Failures appear before successes inside a group.
- The red summary line reports a failure count, and a shared-cause count when two or more failures agree.
- `Skipped` renders in the neutral tone, **not** red.
- Identity names link to `/discover/:id`; policy names link to `/govern/builder/:id`.
- Timestamps read "4 min ago" / "2 hr ago", never "today".

- [ ] **Step 4: Verify the URL is shareable**

Reload the page while on the Activity tab.
Expected: the URL is `/govern?tab=activity` and it reopens on Activity, not on Policies.

- [ ] **Step 5: Verify the empty state**

Append `?tab=activity&scenario=empty` if the Scenario Switcher is available in dev, or temporarily set every seeded policy's `status` to `'draft'` in `generators.ts`.
Expected: the empty state explains that only active quarantine policies record actions — it does not simply say "no data".

- [ ] **Step 6: Commit any fixes and push**

```bash
git add -A && git commit -m "test(govern): verify the activity tab end to end"
```

---

## Out of scope

Deliberately excluded — each needs its own plan:

- **Real enforcement.** Nothing writes a `PolicyAction` at runtime; the log is seeded. `activatePolicy` does not sweep, and `Identity.status` is never mutated to `'quarantined'` by a policy.
- **Release from the log.** Rows show that a release happened; there is no button to perform one. That needs `session.quarantineRelease` gating and a confirm dialog.
- **"Reverse this sweep."** The bulk undo for a rule that wrongly quarantined a whole match set.
- **The derived review flag** and its Inventory filter.
- **`Alert.policyId`** and the Monitor grouping that a policy-raised alert needs.
- **Rotate as recommend-only**, and the `RotationHistoryEntry` changes it needs (`policyId`, a `failed` outcome, a non-person actor).
- **Repeat-action roll-up.** An identity flapping across a threshold produces N honest rows that read as volume.

## Open questions for the Architect

Neither blocks this plan, but both change what the log means:

1. **Is a rule a trigger or an invariant?** If it fires once on entering the match set, a quarantine stands until something outside Govern undoes it. If it is continuously enforced, an identity whose risk falls back below the threshold should be released automatically — and that release is a policy action with the same trigger, not a human one.
2. **`Identity.status` is commented "derived — ASSUMPTION: derived upstream"** (`src/mocks/types.ts:71`). If enforcement writes `'quarantined'` to it, it is no longer derived. Either quarantine sets an explicit field alongside `status`, or `status` stops being derived.
