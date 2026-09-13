# Act > Quarantine filters — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/act/quarantine` a search field and two filter menus (Type, Produced by), with the filter state in the URL.

**Architecture:** The mock API gains one derived field, `producer`, so the UI never
matches on a display label. A URL-backed hook (`useQuarantineFilters`) holds the state
and ships a pure `applyQuarantineFilter` beside it; a `QuarantineToolbar` component
renders the controls; the screen composes them. Same shape as
`useSessionFilters` / `useUsersFilters` + `UsersToolbar`.

**Tech Stack:** React 19, TypeScript, react-router-dom `useSearchParams`, TanStack
Query, Tailwind v4 with CSS-variable tokens, Vitest.

**Spec:** [`docs/superpowers/specs/2026-09-13-quarantine-filters-design.md`](../specs/2026-09-13-quarantine-filters-design.md)

---

## File structure

| File | Responsibility |
|---|---|
| `src/mocks/types.ts` (modify) | Declares `ProducerFacet` and the pure `producerFacet(source)` derivation, beside `QuarantineSource` which it reads. |
| `src/mocks/api.ts` (modify) | `QuarantinedIdentity` carries `producer`; `listQuarantined` fills it from the record. |
| `src/mocks/act.test.ts` (modify) | Guards that `producer` is derived from the record, not from a resolved label. |
| `src/features/act/useQuarantineFilters.ts` (create) | URL contract, toggle callbacks, and the pure `applyQuarantineFilter`. |
| `src/features/act/useQuarantineFilters.test.ts` (create) | Covers the pure parse + filter functions. No router, no rendering. |
| `src/features/act/QuarantineToolbar.tsx` (create) | The three controls and their facet counts. |
| `src/features/act/QuarantineScreen.tsx` (modify) | Composes the toolbar, the `N of M` count, and the filtered-empty state. |

---

### Task 1: `producer` on the quarantine row

**Files:**
- Modify: `src/mocks/types.ts:76-88` (after `QuarantineSource` / `QuarantineRecord`)
- Modify: `src/mocks/api.ts:23`, `:47` (imports), `:1077-1095` (interface), `:1147-1162` (`listQuarantined`)
- Test: `src/mocks/act.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/mocks/act.test.ts`, add these to the **first** describe block
(`Act > Quarantine provenance`), immediately after the
`'demonstrates all three producer outcomes in the seeded data'` test (which ends
around line 53).

Position matters: later tests in this block call `releaseQuarantine`, which drops
rows from the list. Appended at the end, the count assertions below would run against
a dataset those tests had already mutated — and the released rows are the newest ones,
so whether the single policy-produced or replay-backed row survives would be luck.

```ts
  // Derived from the RECORD, never from the label: a filter that read
  // `byLabel.startsWith('Policy · ')` would break the next time that copy moves.
  it('emits a producer facet agreeing with the record, for every row', async () => {
    const rows = await listQuarantined();
    const byId = new Map(getDataset().identities.map((i) => [i.id, i]));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const by = byId.get(row.id)?.quarantine?.by;
      if (!by) throw new Error(`fixture: ${row.id} listed without a quarantine record`);
      const expected = by.kind === 'policy' ? 'policy' : by.viaSessionId ? 'replay' : 'person';
      expect(row.producer).toBe(expected);
    }
  });

  // All three facets have to occur, or the menu ships with a dead option and the
  // test above passes vacuously on whichever two survived.
  it('produces all three facets across the seeded data', async () => {
    const rows = await listQuarantined();
    expect([...new Set(rows.map((r) => r.producer))].sort()).toEqual([
      'person',
      'policy',
      'replay',
    ]);
  });
```

Then add this to the **second** describe block
(`Act > Quarantine - a containment raised from a replay`), immediately after the
`'names a removed session as removed instead of linking nowhere'` test:

```ts
  // The facet comes off `by.viaSessionId`, not off whether `viaLabel` resolved to
  // a link. Deriving it from the label would silently re-file this row as
  // `person` the moment its session was deleted — losing, from the filter, the
  // one containment whose evidence is most worth finding.
  it('still reads as replay-backed when the cited session has been deleted', async () => {
    useUiStore.getState().setRole('tenant-admin');
    const { identity } = pickReplayCandidate();
    await quarantineAgent(identity.id, undefined, 'ses_does_not_exist');
    const row = (await listQuarantined()).find((r) => r.id === identity.id);
    if (!row) throw new Error('fixture: expected the just-contained identity to be listed');
    expect(row.viaLabel).toBe('Removed session');
    expect(row.producer).toBe('replay');
    await releaseQuarantine(identity.id);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/mocks/act.test.ts -t "producer facet"
```

Expected: FAIL — `expected undefined to be 'person'`. `producer` does not exist on the
row yet, so it reads `undefined`.

- [ ] **Step 3: Declare the facet and its derivation**

In `src/mocks/types.ts`, insert immediately after the `QuarantineRecord` interface
(which ends at line 88, before `export interface Identity`):

```ts
/**
 * Which of the three DISPLAY outcomes a containment reads as — the axis Act >
 * Quarantine filters on.
 *
 * This is NOT a data-model kind. `QuarantineSource` has exactly two and stays
 * that way (act.test.ts guards the set): a session is evidence, not an actor.
 * This union splits the `user` kind by whether a replay evidenced the decision,
 * which is a presentation concern and lives here as one.
 */
export type ProducerFacet = 'policy' | 'person' | 'replay';

/** The facet a containment reads as, derived from the record rather than its label. */
export function producerFacet(source: QuarantineSource): ProducerFacet {
  if (source.kind === 'policy') return 'policy';
  return source.viaSessionId ? 'replay' : 'person';
}
```

- [ ] **Step 4: Carry it on the row**

In `src/mocks/api.ts` line 23, add `producerFacet` to the value import:

```ts
import {
  ACTION_OBJECT,
  isCrossCloud,
  isFlaggedStep,
  NOTIFICATION_CATEGORIES,
  producerFacet,
} from './types';
```

In the `import type { … } from './types'` block, add `ProducerFacet,` between
`PolicyToken,` and `QuarantineRecord,` (the list is alphabetical).

In the `QuarantinedIdentity` interface (starts line 1077), add this field directly
after `at: string;`:

```ts
  /**
   * Which of the three display outcomes this row is, for Act > Quarantine's
   * "Produced by" filter. Carried structurally so nothing has to match on
   * `byLabel`, whose copy is free to change.
   */
  producer: ProducerFacet;
```

In `listQuarantined` (starts line 1147), add one line to the `.map`, after `at`:

```ts
      .map((i) => ({
        id: i.id,
        name: i.name,
        type: i.type,
        at: i.quarantine.at,
        producer: producerFacet(i.quarantine.by),
        ...quarantineLabel(i.quarantine),
      }))
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx vitest run src/mocks/act.test.ts
```

Expected: PASS — all tests in the file, including the three new ones.

- [ ] **Step 6: Commit**

```bash
git add src/mocks/types.ts src/mocks/api.ts src/mocks/act.test.ts
git commit -m "feat(act): carry the producer facet on a quarantine row"
```

---

### Task 2: The filter hook and its pure filter

**Files:**
- Create: `src/features/act/useQuarantineFilters.ts`
- Test: `src/features/act/useQuarantineFilters.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/act/useQuarantineFilters.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  applyQuarantineFilter,
  parseQuarantineParams,
  type QuarantineFilter,
} from './useQuarantineFilters';
import type { NhiType, ProducerFacet } from '@/mocks/types';

interface Row {
  id: string;
  name: string;
  type: NhiType;
  producer: ProducerFacet;
  byLabel: string;
  viaLabel?: string;
}

const ROWS: Row[] = [
  {
    id: 'a',
    name: 'svc-billing-00755',
    type: 'service-account',
    producer: 'person',
    byLabel: 'Jordan Rivera · Security Admin',
  },
  {
    id: 'b',
    name: 'key-webhook-00291',
    type: 'api-key',
    producer: 'person',
    byLabel: 'Dana Brooks · Tenant Admin',
  },
  {
    id: 'c',
    name: 'tok-refresh-00412',
    type: 'oauth-token',
    producer: 'policy',
    byLabel: 'Policy · Quarantine dormant OAuth tokens',
  },
  {
    id: 'd',
    name: 'agt-triage-00107',
    type: 'ai-agent',
    producer: 'replay',
    byLabel: 'Alex Kim · Tenant Admin',
    viaLabel: 'Session review · ses_00318',
  },
];

const NONE: QuarantineFilter = { search: '', types: [], producers: [] };
const ids = (rows: Row[]) => rows.map((r) => r.id);
const params = (qs: string) => parseQuarantineParams(new URLSearchParams(qs));

describe('parseQuarantineParams', () => {
  it('reads the three params off the URL', () => {
    expect(params('q=billing&type=api-key,ai-agent&by=policy')).toEqual({
      search: 'billing',
      types: ['api-key', 'ai-agent'],
      producers: ['policy'],
    });
  });

  it('defaults to an unfiltered view when the URL is bare', () => {
    expect(params('')).toEqual(NONE);
  });

  // A stale or hand-edited link should lose the part it got wrong, not return an
  // empty table with nothing on screen explaining why.
  it('drops unknown values instead of narrowing to nothing', () => {
    expect(params('by=policy,wat').producers).toEqual(['policy']);
    expect(params('type=not-a-type').types).toEqual([]);
    expect(applyQuarantineFilter(ROWS, params('type=not-a-type'))).toHaveLength(4);
  });
});

describe('applyQuarantineFilter', () => {
  it('returns every row when nothing is set', () => {
    expect(ids(applyQuarantineFilter(ROWS, NONE))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ORs the values within the type axis', () => {
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, types: ['api-key', 'ai-agent'] }))).toEqual([
      'b',
      'd',
    ]);
  });

  // The partition the design accepted (spec, 13 Sep 2026): `person` does NOT
  // include the replay-backed containment, even though a person produced it.
  it('treats the three producer facets as exclusive buckets', () => {
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, producers: ['person'] }))).toEqual(['a', 'b']);
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, producers: ['replay'] }))).toEqual(['d']);
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, producers: ['policy', 'replay'] }))).toEqual([
      'c',
      'd',
    ]);
  });

  it('ANDs across axes', () => {
    expect(
      ids(applyQuarantineFilter(ROWS, { ...NONE, types: ['api-key'], producers: ['policy'] })),
    ).toEqual([]);
  });

  it('ignores a search below the minimum instead of narrowing on one keystroke', () => {
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, search: 'a' }))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('matches the identity name', () => {
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, search: 'webhook' }))).toEqual(['b']);
  });

  // Why there is no separate "quarantined by" menu: the producer label is in the
  // haystack, so a person's name or a policy's name narrows on its own.
  it('matches the producer label, not just the identity', () => {
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, search: 'jordan' }))).toEqual(['a']);
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, search: 'dormant oauth' }))).toEqual(['c']);
  });

  it('matches a cited session id', () => {
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, search: 'ses_00318' }))).toEqual(['d']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/features/act/useQuarantineFilters.test.ts
```

Expected: FAIL — `Failed to load url ./useQuarantineFilters`. The module does not exist.

- [ ] **Step 3: Write the hook and the pure functions**

Create `src/features/act/useQuarantineFilters.ts`:

```ts
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NHI_TYPES, type NhiType, type ProducerFacet } from '@/mocks/types';

export type { ProducerFacet };

/** Menu order: the two rare producers bracket the common one, rarest first. */
export const PRODUCER_FACETS: ProducerFacet[] = ['policy', 'person', 'replay'];

export const PRODUCER_LABELS: Record<ProducerFacet, string> = {
  policy: 'Policy',
  person: 'Person',
  replay: 'From a session replay',
};

/** Borrowed from the session list: don't run a search until it can narrow anything. */
export const MIN_SEARCH_CHARS = 2;

export interface QuarantineFilter {
  search: string;
  types: NhiType[];
  producers: ProducerFacet[];
}

function parseList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  return raw.split(',').filter((v): v is T => (allowed as readonly string[]).includes(v));
}

/**
 * The URL contract, as a pure function so it can be tested without a router.
 *
 * Unknown `type` / `by` values are DROPPED, not kept: a stale or hand-edited link
 * should lose the part it got wrong rather than render an empty table with
 * nothing on screen to explain it.
 */
export function parseQuarantineParams(params: URLSearchParams): QuarantineFilter {
  return {
    search: params.get('q') ?? '',
    types: parseList(params.get('type'), NHI_TYPES),
    producers: parseList(params.get('by'), PRODUCER_FACETS),
  };
}

/**
 * Quarantine's filters, kept in the URL (?q / ?type / ?by) like the inventory's and
 * the session list's — so a narrowing survives refresh, the back button undoes it,
 * and an auditor can share what they are looking at.
 *
 * Writes go through the functional `setParams` form, not a snapshot of `params`:
 * `onClear` toggles every selected value in one tick, and a snapshot would make
 * each of those toggles overwrite the last.
 */
export function useQuarantineFilters() {
  const [params, setParams] = useSearchParams();

  const filter = useMemo(() => parseQuarantineParams(params), [params]);

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

  const setSearch = useCallback(
    (value: string) => update((n) => (value ? n.set('q', value) : n.delete('q'))),
    [update],
  );

  const toggleInList = useCallback(
    (key: string, value: string) =>
      update((n) => {
        const current = n.get(key)?.split(',').filter(Boolean) ?? [];
        const nextList = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        if (nextList.length) n.set(key, nextList.join(','));
        else n.delete(key);
      }),
    [update],
  );

  const clearAll = useCallback(
    () => update((n) => ['q', 'type', 'by'].forEach((k) => n.delete(k))),
    [update],
  );

  // A sub-minimum search narrows nothing, so it does not count as active either —
  // otherwise "Clear (1)" would appear next to a table that never changed.
  const activeCount =
    (filter.search.trim().length >= MIN_SEARCH_CHARS ? 1 : 0) +
    filter.types.length +
    filter.producers.length;

  return {
    filter,
    setSearch,
    toggleType: (t: NhiType) => toggleInList('type', t),
    toggleProducer: (p: ProducerFacet) => toggleInList('by', p),
    clearAll,
    activeCount,
  };
}

/** The fields the filter reads. Structural, so the tests need no mock API row. */
export interface FilterableQuarantineRow {
  name: string;
  type: NhiType;
  producer: ProducerFacet;
  byLabel: string;
  viaLabel?: string;
}

/**
 * Apply the filter to the loaded rows. Client-side over the whole contained set,
 * like every peer screen. Axes AND together; values inside an axis OR.
 */
export function applyQuarantineFilter<T extends FilterableQuarantineRow>(
  rows: T[],
  filter: QuarantineFilter,
): T[] {
  const raw = filter.search.trim().toLowerCase();
  const needle = raw.length >= MIN_SEARCH_CHARS ? raw : '';
  return rows.filter((row) => {
    if (filter.types.length && !filter.types.includes(row.type)) return false;
    if (filter.producers.length && !filter.producers.includes(row.producer)) return false;
    // The producer label is in the haystack on purpose: it is what lets a person's
    // name narrow the table without a fourth control for it.
    if (needle && !`${row.name} ${row.byLabel} ${row.viaLabel ?? ''}`.toLowerCase().includes(needle))
      return false;
    return true;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/features/act/useQuarantineFilters.test.ts
```

Expected: PASS — 11 tests across the two describe blocks.

- [ ] **Step 5: Commit**

```bash
git add src/features/act/useQuarantineFilters.ts src/features/act/useQuarantineFilters.test.ts
git commit -m "feat(act): add the quarantine filter hook and its pure filter"
```

---

### Task 3: The toolbar

**Files:**
- Create: `src/features/act/QuarantineToolbar.tsx`

No test of its own: it is presentation over `useQuarantineFilters`, which Task 2
covers, and the repo has no component-level test for `UsersToolbar` either. Task 5
verifies it in the browser.

- [ ] **Step 1: Write the component**

Create `src/features/act/QuarantineToolbar.tsx`:

```tsx
import { ShieldX, X } from 'lucide-react';
import { NHI_TYPES, NHI_TYPE_LABELS, type NhiType } from '@/mocks/types';
import type { QuarantinedIdentity } from '@/mocks/api';
import { DebouncedSearch } from '@/components/ui/DebouncedSearch';
import { FilterMenu } from '@/components/ui/FilterMenu';
import {
  PRODUCER_FACETS,
  PRODUCER_LABELS,
  type ProducerFacet,
  type useQuarantineFilters,
} from './useQuarantineFilters';

type Filters = ReturnType<typeof useQuarantineFilters>;

export function QuarantineToolbar({
  filters,
  rows,
}: {
  filters: Filters;
  rows: QuarantinedIdentity[];
}) {
  const { filter } = filters;

  // Facet counts over the whole contained set, never the post-filter one: they
  // answer "how many of each exist", so they hold still while you narrow.
  const typeCounts: Partial<Record<NhiType, number>> = {};
  const producerCounts: Partial<Record<ProducerFacet, number>> = {};
  for (const row of rows) {
    typeCounts[row.type] = (typeCounts[row.type] ?? 0) + 1;
    producerCounts[row.producer] = (producerCounts[row.producer] ?? 0) + 1;
  }

  // Only types actually present — an option that can only ever return nothing is
  // noise, and at 21 rows most of the five are usually absent.
  const typeOptions = NHI_TYPES.filter((t) => typeCounts[t] !== undefined).map((t) => ({
    value: t,
    label: NHI_TYPE_LABELS[t],
    count: typeCounts[t],
  }));

  // Every facet always shows, including at zero: the three are the screen's whole
  // subject, and one quietly missing would read as "this cannot happen" rather
  // than "none right now".
  const producerOptions = PRODUCER_FACETS.map((p) => ({
    value: p,
    label: PRODUCER_LABELS[p],
    count: producerCounts[p] ?? 0,
  }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="min-w-64 flex-1">
        <DebouncedSearch
          label="Search quarantined identities"
          placeholder="Identity or who quarantined it…"
          value={filter.search}
          onChange={filters.setSearch}
        />
      </div>

      <FilterMenu
        label="Type"
        options={typeOptions}
        selected={filter.types}
        onToggle={(v) => filters.toggleType(v as NhiType)}
        onClear={() => filter.types.forEach((t) => filters.toggleType(t))}
      />
      <FilterMenu
        label="Produced by"
        icon={<ShieldX className="h-3.5 w-3.5" />}
        options={producerOptions}
        selected={filter.producers}
        onToggle={(v) => filters.toggleProducer(v as ProducerFacet)}
        onClear={() => filter.producers.forEach((p) => filters.toggleProducer(p))}
      />

      {filters.activeCount > 0 && (
        <button
          type="button"
          onClick={filters.clearAll}
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-[var(--r-sm)] px-2.5 text-[length:var(--fs-small)] text-text-secondary hover:bg-surface-hover hover:text-text"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Clear ({filters.activeCount})
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: exit 0, no output. (The component is not imported anywhere yet; this
confirms its own types resolve.)

- [ ] **Step 3: Commit**

```bash
git add src/features/act/QuarantineToolbar.tsx
git commit -m "feat(act): add the quarantine filter toolbar"
```

---

### Task 4: Wire the screen

**Files:**
- Modify: `src/features/act/QuarantineScreen.tsx`

- [ ] **Step 1: Update the imports**

Replace the first three import lines:

```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';
```

with:

```tsx
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilterX, ShieldX } from 'lucide-react';
```

Change the `format` import to pull in `count`:

```tsx
import { count, dateTime, relativeTime } from '@/lib/format';
```

And add these two beside the other feature-local imports (after the
`import { useReleaseQuarantine } …` line):

```tsx
import { applyQuarantineFilter, useQuarantineFilters } from './useQuarantineFilters';
import { QuarantineToolbar } from './QuarantineToolbar';
```

- [ ] **Step 2: Add the filter state**

Directly after the existing `const [confirm, setConfirm] = useState…` line, add:

```tsx
  const filters = useQuarantineFilters();

  // Filtered once, up here, rather than inside the boundary: the header's count
  // and the table have to be the same number, and computing it twice is how they
  // start disagreeing.
  const all = useMemo(() => query.data ?? [], [query.data]);
  const filtered = useMemo(() => applyQuarantineFilter(all, filters.filter), [all, filters.filter]);
```

- [ ] **Step 3: Show the count in the header**

Add an `actions` prop to the existing `<ScreenHeader>`, after its `description`:

```tsx
        actions={
          filters.activeCount > 0 && all.length > 0 ? (
            <span className="hidden text-[length:var(--fs-small)] text-text-secondary sm:inline">
              <span className="tnum">{count(filtered.length)}</span> of{' '}
              <span className="tnum">{count(all.length)}</span>
            </span>
          ) : undefined
        }
```

- [ ] **Step 4: Render the toolbar and the filtered table**

Replace the `QueryBoundary` children — the whole `{(rows) => ( … )}` block, from
`{(rows) => (` down to its closing `)}` just before `</QueryBoundary>` — with:

```tsx
        {/* The toolbar lives INSIDE the boundary so it cannot appear over an empty
            set: "Nothing is quarantined" is a fact about the tenant, and filters
            above it would imply the emptiness might be something you did. */}
        {() => (
          <div className="space-y-3">
            <QuarantineToolbar filters={filters} rows={all} />

            <Card>
              {filtered.length === 0 ? (
                <EmptyState
                  icon={<FilterX className="h-5 w-5" />}
                  headline="No quarantined identities match your filters"
                  guidance="Try a different name, or widen the type or producer filter."
                  action={
                    <Button variant="secondary" onClick={filters.clearAll}>
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <ScrollableTable label="Quarantined identities">
                  <table className="w-full text-left text-[length:var(--fs-small)]">
                    <thead>
                      <tr className="border-b border-border text-text-tertiary">
                        <th scope="col" className="px-4 py-2.5 font-medium">
                          Identity
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-medium">
                          Type
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-medium">
                          Quarantined by
                        </th>
                        <th scope="col" className="px-4 py-2.5 font-medium">
                          When
                        </th>
                        <th scope="col" className="px-4 py-2.5 text-right font-medium">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-border last:border-b-0 hover:bg-surface-hover"
                        >
                          <td className="px-4 py-2.5 font-mono text-text">
                            <Link to={`/discover/${row.id}`} className="hover:underline">
                              {row.name}
                            </Link>
                          </td>
                          <td className="px-4 py-2.5 text-text-secondary">
                            {NHI_TYPE_LABELS[row.type]}
                          </td>
                          <td className="px-4 py-2.5 text-text-secondary">
                            {row.byHref ? (
                              <Link to={row.byHref} className="text-accent-text hover:underline">
                                {row.byLabel}
                              </Link>
                            ) : (
                              row.byLabel
                            )}
                            {/* The evidence sits UNDER the producer rather than
                                folded into it: one names who is answerable, the
                                other what they decided on, and an auditor follows
                                them separately. A removed session still shows,
                                unlinked, so the gap is visible instead of silent. */}
                            {row.viaLabel && (
                              <span className="mt-0.5 block text-[length:var(--fs-micro)] text-text-tertiary">
                                {row.viaHref ? (
                                  <Link
                                    to={row.viaHref}
                                    className="text-accent-text hover:underline"
                                  >
                                    {row.viaLabel}
                                  </Link>
                                ) : (
                                  row.viaLabel
                                )}
                              </span>
                            )}
                          </td>
                          <td
                            className="tnum px-4 py-2.5 text-text-tertiary"
                            title={dateTime(row.at)}
                          >
                            {relativeTime(row.at)}
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
              )}
            </Card>
          </div>
        )}
```

- [ ] **Step 5: Update the screen's doc comment**

The block comment above `export function QuarantineScreen()` ends with the Sep 2026
correction note. Append one paragraph inside that same `/** … */`, before the closing
`*/`:

```
 *
 * Filters (Sep 2026): search, Type, and a "Produced by" facet of Policy / Person /
 * From a session replay. Those three are a partition, so Person deliberately
 * EXCLUDES the replay-backed containment even though a person produced it — the
 * cost accepted in the design doc for a single menu over two axes. The row is
 * unchanged and still names both, so the separation survives everywhere but the
 * facet.
 */
```

- [ ] **Step 6: Typecheck and run the suite**

```bash
npm run typecheck
```

Expected: exit 0, no output.

```bash
npx vitest run src/mocks/act.test.ts src/features/act/useQuarantineFilters.test.ts
```

Expected: PASS, 2 files.

- [ ] **Step 7: Commit**

```bash
git add src/features/act/QuarantineScreen.tsx
git commit -m "feat(act): filter the quarantine table"
```

---

### Task 5: Verify against the running app

**Files:** none — verification only.

- [ ] **Step 1: Run the full gate**

```bash
npm run typecheck && npm run lint && npm run test
```

Expected: typecheck silent, lint silent, vitest reports all files passing. If any
suite unrelated to Act fails, check it against `main` before treating it as
regression — two onboarding suites are known to flake under full-suite load.

- [ ] **Step 2: Start the app**

Use the Browser pane: `preview_start` with `{name: "acrivault"}`, then navigate to
`/act/quarantine`.

- [ ] **Step 3: Confirm the unfiltered state**

`read_page`. Expected: the toolbar renders above the card; the header shows **no**
`N of M` (nothing is active yet); 21 rows in the table.

- [ ] **Step 4: Confirm the facet counts and the partition**

Navigate to `/act/quarantine?by=person`. Expected: 19 rows, header reads `19 of 21`,
the "Produced by" trigger carries a `1` badge, and a "Clear (1)" control is present.

Then `/act/quarantine?by=replay`. Expected: exactly 1 row, and it carries a
`Session review · …` sub-line under the person's name.

- [ ] **Step 5: Confirm the filtered-empty state**

Navigate to `/act/quarantine?type=ai-agent&by=policy`. Expected: no table; the
`FilterX` empty state with "No quarantined identities match your filters" and a
**Clear filters** button. Click it (`computer` with the button's `ref`) and confirm
the URL drops back to `/act/quarantine` with all 21 rows.

- [ ] **Step 6: Confirm search reaches the producer**

Type `Jordan` into the search field. Expected: the URL gains `?q=Jordan` and the table
narrows to the rows Jordan Rivera contained — proving the producer label is in the
haystack, which is the reason there is no fourth menu.

- [ ] **Step 7: Check the console**

`read_console_messages` with `onlyErrors: true`. Expected: empty.

- [ ] **Step 8: Screenshot and commit nothing**

Take a screenshot of the filtered view for the summary. No commit — this task changes
no files.

---

## Done when

- `npm run typecheck`, `npm run lint` and `npm run test` all pass.
- `/act/quarantine?by=replay` returns exactly the replay-backed containment, and
  `?by=person` returns 19 — the partition the design accepted, observed in the app.
- The empty, filtered-empty, and unfiltered states all render, and the console is clean.
