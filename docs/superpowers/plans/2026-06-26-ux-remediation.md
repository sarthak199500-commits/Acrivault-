# Acrivault UX Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 10 findings (F-1…F-10) from [UX-AUDIT.md](../../../UX-AUDIT.md) without regressing the "resting view is calm; colour only where there is risk" principle, WCAG 2.2 AA, or theme parity.

**Architecture:** Fix at the lowest shared layer (token → shared component → screen). F-1 is a token-only change. F-2/F-6 reuse patterns/components that already exist (`role="img"`+hidden-`<table>`; `KpiTile` delta props). F-3/F-4 restructure two screens. F-5 finishes partially-done Inventory work. F-7…F-10 are a cross-cutting polish batch.

**Tech Stack:** Vite 6 + React 18 + TS strict, Tailwind v4 CSS-first `@theme`, tokens in `src/styles/tokens.css`, Radix primitives, Recharts, TanStack Query, Zustand, Vitest + axe-core.

---

## Conventions for this plan (read once)

1. **No git in this repo.** Replace the usual "commit" step with a **Verification Gate** at the end of each task. Do not run `git`. Do not initialize git unless the user asks.
2. **Verification commands** (run from project root `E:\Projects\Acrivault\Design V3`):
   - `npm run typecheck` → expect `tsc` exits 0, no errors.
   - `npm run lint` → expect 0 errors.
   - `npx vitest run <path>` → run a single test file; expect PASS.
   - `npm run test` → full suite (currently 57 tests); expect all PASS.
   - `npm run build` → expect success.
3. **a11y / contrast gate** (pure-visual changes can't be unit-tested): use the preview MCP. Reload to switch theme (do **not** eval-toggle `data-theme` to *test* — only to *measure* token math). The app exposes `window.__axeRun()` → returns a violations array; expect `[]`.
   - **Axe snippet** (run on each touched route, **dark and light**):
     ```js
     (async () => (await window.__axeRun()).map(v => v.id))()
     ```
   - **Rendered-contrast snippet** (paste, returns ratio for a selector against its own background):
     ```js
     (sel => { const el=document.querySelector(sel); const g=getComputedStyle(el);
       const rgb=s=>(s.match(/[\d.]+/g)||[]).map(Number);
       const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
       const L=([r,g,b])=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
       const f=L(rgb(g.color)), b=L(rgb(g.backgroundColor));
       const hi=Math.max(f,b),lo=Math.min(f,b);
       return Math.round((hi+0.05)/(lo+0.05)*100)/100; })('SELECTOR')
     ```
4. **Reuse, don't reinvent.** Existing components: `Badge`/`StatusBadge`, `KpiTile`, `RiskPill`, `FilterMenu`, `SegmentedControl`, `EmptyState`, `QueryBoundary`, `Card`, `ScreenHeader`. Tokens are the only place raw colour lives.
5. **Simulated values** stay marked `// ASSUMPTION:`.
6. **Always read the target file before editing it** — this plan gives precise locations and the changed snippet, not full file dumps.

---

## File Structure (what each task touches)

| Task | Create | Modify |
|---|---|---|
| F-1 | — | `src/styles/tokens.css` |
| F-9a | — | `src/lib/format.ts`, `src/lib/format.test.ts` |
| F-2 | `src/features/resilience/BlastRadiusTable.tsx` | `src/features/resilience/BlastRadiusScreen.tsx`, radial component |
| F-3 | `src/features/monitor/alertGrouping.ts`, `src/features/monitor/alertGrouping.test.ts` | `src/features/monitor/MonitorScreen.tsx`, alert row component |
| F-4 | — | `src/features/intelligence/SessionListScreen.tsx`, session row component |
| F-5 | — | `src/app/AppShell.tsx` (TopBar), `src/features/discover/InventoryFilters.tsx`, `src/features/discover/InventoryScreen.tsx` |
| F-6 | — | `src/features/dashboard/DashboardScreen.tsx` |
| F-7 | — | `src/features/rotate/RotateScreen.tsx` |
| F-8 | — | user-admin form fields (`src/features/admin/*`, `src/components/ui/ValidityWindowField.tsx`) |
| F-10 | — | `src/styles/tokens.css` (`--scrim` light) |

---

## Task 1 (F-1): Fix light-theme semantic badge contrast — **P0**

**Files:**
- Modify: `src/styles/tokens.css` (light theme block, ~lines 232–242)

Confirmed failures (light theme, measured on rendered badges): **info 2.87:1, critical 3.01:1, warning 3.38:1** (need ≥4.5:1). Success/neutral pass. Dark theme passes for all — **do not touch the dark block**.

- [ ] **Step 1: Measure baseline (light) to confirm the failing set**

Navigate preview to `/design-system`, reload, switch the app to **light** theme via the UI toggle. Run the contrast snippet for one badge of each tone (info = the "Synthetic data" topbar badge; critical/warning on the design-system badges section). Record the numbers; expect info≈2.87, critical≈3.01, warning≈3.38.

- [ ] **Step 2: Darken the failing light foregrounds to the -700 ramp stops**

In `src/styles/tokens.css`, inside `[data-theme='light'] { … }`, change only these three:

```css
  --crit-fg: var(--red-700);   /* #832c1f — was #9e3722 (3.01:1) */
  --info-fg: var(--blue-700);  /* #234571 — was #2e5790 (2.87:1) */
  --warn-fg: var(--amber-700); /* #6f3f11 — was #835910 (3.38:1) */
```

Leave `--ok-fg` (#1c5a48) and `--neutral-fg` unchanged (they pass).

- [ ] **Step 3: Verify each fixed pair clears AA in light**

Reload `/design-system` in **light** theme. Run the contrast snippet on the info/critical/warning badges. Expected: **each ≥ 4.5**. If any is still <4.5, drop to the -800 stop (`--red-800`/`--blue-800`/`--amber-800`) and re-measure.

- [ ] **Step 4: Confirm no dark-theme regression**

Reload `/design-system` in **dark** theme. Re-measure the same three badges. Expected: unchanged (≈8–9:1) — the dark block wasn't touched, so this is a sanity check only.

- [ ] **Step 5: Check the numeric count badge ("4")**

The notification count badge measured 3.44:1 in **both** themes (it uses an accent-tint background, not a semantic tone). Run the contrast snippet on it (`.tnum` count chip in the topbar bell). If <4.5, raise its background opacity or use `text-accent-text` so it clears 4.5:1 in both themes. File: the notification bell badge in `src/app/NotificationsBell.tsx`.

- [ ] **Step 6: Verification Gate**

Run: `npm run typecheck` (CSS-only change → still must pass) and `npm run build`. Then axe `/design-system`, `/intelligence`, `/settings/users` in **both** themes (`(async()=>(await window.__axeRun()).map(v=>v.id))()`). Expected: `typecheck` 0 errors, `build` ok, axe `[]` everywhere, all three badge ratios ≥4.5 in light.

---

## Task 2 (F-9a): Add a `pluralize` helper (foundation for F-2/F-3/F-5 copy)

**Files:**
- Modify: `src/lib/format.ts`, `src/lib/format.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/format.test.ts`:

```ts
import { pluralize } from './format';

describe('pluralize', () => {
  it('uses the singular for exactly 1', () => {
    expect(pluralize(1, 'identity', 'identities')).toBe('1 identity');
  });
  it('uses the plural for 0 and N', () => {
    expect(pluralize(0, 'identity', 'identities')).toBe('0 identities');
    expect(pluralize(5, 'identity', 'identities')).toBe('5 identities');
  });
  it('derives a default plural with +s when none given', () => {
    expect(pluralize(2, 'alert')).toBe('2 alerts');
  });
  it('uses tabular-friendly grouped counts', () => {
    expect(pluralize(1500, 'identity', 'identities')).toBe('1,500 identities');
  });
});
```

- [ ] **Step 2: Run it; verify it fails**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL — `pluralize is not a function`.

- [ ] **Step 3: Implement**

Add to `src/lib/format.ts` (reuse the existing `count` grouping helper already in this file):

```ts
/** "1 identity" / "5 identities". Grouped count + singular/plural agreement. */
export function pluralize(n: number, singular: string, plural = `${singular}s`): string {
  return `${count(n)} ${n === 1 ? singular : plural}`;
}
```

- [ ] **Step 4: Run it; verify it passes**

Run: `npx vitest run src/lib/format.test.ts`
Expected: PASS (4 new assertions).

- [ ] **Step 5: Verification Gate**

Run: `npm run typecheck`. Expected: 0 errors.

---

## Task 3 (F-2): Blast Radius — accessible radial (text path, keyboard, double-encoding, plural)

**Files:**
- Read first: `src/features/resilience/BlastRadiusScreen.tsx` and the radial SVG component it renders.
- Create: `src/features/resilience/BlastRadiusTable.tsx`
- Modify: the radial SVG component, `BlastRadiusScreen.tsx`

Pattern to copy: the Dashboard activity chart wraps its chart in `role="img"` + `aria-label` and renders a visually-hidden `<table>` fallback. Find it in `src/features/dashboard/` (search for `role="img"`) and mirror it.

- [ ] **Step 1: Give the radial an accessible name + summary**

On the radial root `<svg>`, add `role="img"` and an `aria-label` summarising reach, e.g.:
`aria-label={`Blast radius for ${focus.label}: ${pluralize(direct, 'direct identity', 'direct identities')}, ${pluralize(transitive,'transitive identity','transitive identities')}, ${pluralize(cascade,'cascade identity','cascade identities')}.`}`
Import `pluralize` from `@/lib/format`. This also fixes the `1 identities` grammar bug.

- [ ] **Step 2: Add the visually-hidden table fallback**

Create `src/features/resilience/BlastRadiusTable.tsx`:

```tsx
import { pluralize } from '@/lib/format';

export interface ReachRow { ring: 'Direct' | 'Transitive' | 'Cascade'; count: number; }

/** Screen-reader / no-JS fallback for the radial. Visually hidden, always in DOM. */
export function BlastRadiusTable({ rows, focusLabel }: { rows: ReachRow[]; focusLabel: string }) {
  return (
    <table className="sr-only">
      <caption>Blast radius reach for {focusLabel}</caption>
      <thead><tr><th scope="col">Ring</th><th scope="col">Identities reached</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.ring}><th scope="row">{r.ring}</th><td>{pluralize(r.count, 'identity', 'identities')}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
```
If `.sr-only` is not defined globally, add it to `src/styles/globals.css` `@layer base` (clip-rect pattern). Check first with a grep for `sr-only`.

- [ ] **Step 3: Make ring nodes keyboard-reachable**

Render each node as a focusable element (`<button>` overlay or SVG `<g tabIndex={0} role="button" aria-label=…>`), participating in tab order, with the global focus-visible ring (already defined). Pressing Enter/Space selects the node (same handler as click).

- [ ] **Step 4: Double-encode edge type (not colour alone)**

For edges: `cascade` = solid `var(--risk-critical)`; `transitive` = **dashed** `var(--cat-3)` (`stroke-dasharray`); `direct` = solid `var(--cat-2)`. Confirm the existing Direct/Transitive/Cascade legend reflects the same stroke styles (add the dashed swatch to the transitive legend item).

- [ ] **Step 5: Verify**

Preview `/resilience/blast-radius`. Run:
```js
(() => { const s=document.querySelector('#main-content svg'); return { role:s.getAttribute('role'), label:s.getAttribute('aria-label'), focusable:s.querySelectorAll('[tabindex]').length, table: !!document.querySelector('#main-content table'); }; })()
```
Expected: `role:"img"`, non-empty `label` with correct singular/plural, `focusable > 0`, `table:true`. Tab through nodes — focus ring visible on each. axe `[]` in both themes.

- [ ] **Step 6: Verification Gate**

Run: `npm run typecheck`, `npm run lint`, `npm run build`. Expected: all clean.

---

## Task 4 (F-3): Monitor — time-bucket the feed, collapse acknowledged, double-encode severity

**Files:**
- Read first: `src/features/monitor/MonitorScreen.tsx` and the alert row component.
- Create: `src/features/monitor/alertGrouping.ts`, `src/features/monitor/alertGrouping.test.ts`
- Modify: `MonitorScreen.tsx`, alert row component

- [ ] **Step 1: Write failing tests for the bucketing logic**

Create `src/features/monitor/alertGrouping.test.ts`:

```ts
import { bucketByTime, splitAcknowledged } from './alertGrouping';

const at = (iso: string, acknowledged = false) => ({ id: iso, raisedAt: iso, acknowledged });
const NOW = new Date('2026-06-26T12:00:00Z').getTime();

describe('bucketByTime', () => {
  it('labels same-day as Today and within 7d as Earlier this week', () => {
    const rows = [at('2026-06-26T09:00:00Z'), at('2026-06-24T09:00:00Z'), at('2026-06-10T09:00:00Z')];
    const buckets = bucketByTime(rows, NOW);
    expect(buckets.map((b) => b.label)).toEqual(['Today', 'Earlier this week', 'Older']);
    expect(buckets[0].rows).toHaveLength(1);
  });
  it('omits empty buckets', () => {
    expect(bucketByTime([at('2026-06-26T09:00:00Z')], NOW).map((b) => b.label)).toEqual(['Today']);
  });
});

describe('splitAcknowledged', () => {
  it('separates acknowledged from active, preserving order', () => {
    const { active, acknowledged } = splitAcknowledged([at('a'), at('b', true), at('c')]);
    expect(active.map((r) => r.id)).toEqual(['a', 'c']);
    expect(acknowledged.map((r) => r.id)).toEqual(['b']);
  });
});
```

- [ ] **Step 2: Run; verify fail**

Run: `npx vitest run src/features/monitor/alertGrouping.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the pure logic**

Create `src/features/monitor/alertGrouping.ts`:

```ts
export interface TimedAlert { raisedAt: string; acknowledged?: boolean; [k: string]: unknown; }
export interface TimeBucket<T> { label: string; rows: T[]; }

const DAY = 86_400_000;

export function bucketByTime<T extends TimedAlert>(rows: T[], now = Date.now()): TimeBucket<T>[] {
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();
  const order = ['Today', 'Earlier this week', 'Older'] as const;
  const of = (t: number) => (t >= todayMs ? 'Today' : t >= todayMs - 7 * DAY ? 'Earlier this week' : 'Older');
  const map = new Map<string, T[]>();
  for (const r of rows) (map.get(of(new Date(r.raisedAt).getTime())) ?? map.set(of(new Date(r.raisedAt).getTime()), []).get(of(new Date(r.raisedAt).getTime()))!).push(r);
  return order.filter((l) => map.has(l)).map((l) => ({ label: l, rows: map.get(l)! }));
}

export function splitAcknowledged<T extends TimedAlert>(rows: T[]) {
  return { active: rows.filter((r) => !r.acknowledged), acknowledged: rows.filter((r) => r.acknowledged) };
}
```
(If the readability of the `bucketByTime` map line is poor, refactor to a clear `for` loop with a `label` const — keep behaviour identical.)

- [ ] **Step 4: Run; verify pass**

Run: `npx vitest run src/features/monitor/alertGrouping.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into MonitorScreen**

In `MonitorScreen.tsx`: split with `splitAcknowledged`, bucket `active` with `bucketByTime`. Render each bucket under a **sticky** subheader (`className="sticky top-0 z-[1] bg-bg/90 backdrop-blur eyebrow px-..."`). Render acknowledged inside a collapsible section (use the existing disclosure/`<details>` pattern or a Radix-free button toggle) labelled `Acknowledged ({count})` via `pluralize` — **rows at full contrast when expanded** (no opacity).

- [ ] **Step 6: Severity double-encoding on each row**

Each alert row: a left severity **rail** (`border-l-2` coloured by band) **plus** a `RiskPill`/severity badge (shape+label), so severity survives a colourblind read. Right-align the timestamp with `.tnum`. Reuse `RiskPill` (it already renders a band glyph + label).

- [ ] **Step 7: Verify**

Preview `/monitor`. Confirm: sticky subheaders appear on scroll; `Acknowledged (N)` collapses/expands; expanded rows measure full contrast (run the contrast snippet on an acknowledged row's text ≥4.5); severity has both rail and badge. axe `[]` both themes.

- [ ] **Step 8: Verification Gate**

Run: `npm run typecheck`, `npm run lint`, `npx vitest run src/features/monitor/alertGrouping.test.ts`, `npm run build`. Expected: all clean.

---

## Task 5 (F-4): Agent Sessions — fixed risk column, row hierarchy, status chip, virtualize

**Files:**
- Read first: `src/features/intelligence/SessionListScreen.tsx` and the session row component.
- Modify: those files.

- [ ] **Step 1: Fixed right-hand risk column**

Lay each row as a grid: `[primary | meta | status | risk]`. Risk column is fixed-width, right-aligned: the score in `.tnum` with a small severity label beneath (reuse `RiskPill` or `RiskScore`). Colour the risk number + a `border-l-2` rail **only** when band is `critical`/`high`; everything else stays calm/neutral.

- [ ] **Step 2: Promote the session ID + metadata**

Session ID → primary text weight (`font-medium text-text`). Beneath it, metadata line: `time · {pluralize(steps,'step')} · {pluralize(anomalies,'anomaly','anomalies')}` in `text-text-secondary`.

- [ ] **Step 3: Status chip**

Add an Open / Reviewed / Quarantined chip using `Badge` (Open = neutral/info calm, Reviewed = success, Quarantined = warning — never critical-red, keep red for risk). If session status isn't in the mock yet, add it to the session generator in `src/mocks/generators.ts` and the type in `src/mocks/types.ts` (// ASSUMPTION: review workflow is upstream).

- [ ] **Step 4: Virtualize at 50+ rows**

Check `package.json` for `@tanstack/react-virtual`. If present, use it; if not, install (`npm i @tanstack/react-virtual`) and virtualize the list body. Keep keyboard nav and row focus working. If the dataset is <50 rows, gate virtualization behind a length check so small lists render plainly.

- [ ] **Step 5: Verify**

Preview `/intelligence`. Confirm: risk numbers align in a column; Critical rows are visually louder than Minimal (rail + colour); ID is primary weight; status chip present; scrolling stays smooth with 50+ rows. axe `[]` both themes. Run the contrast snippet on a Minimal-risk row (must still pass — calm ≠ illegible).

- [ ] **Step 6: Verification Gate**

Run: `npm run typecheck`, `npm run lint`, `npm run test` (in case generator/type changes touched other suites), `npm run build`. Expected: all clean.

---

## Task 6 (F-5): Inventory — search differentiation, filter groups, active pills, filter-aware count

**Files:**
- Read first: `src/app/AppShell.tsx` (TopBar), `src/features/discover/InventoryFilters.tsx`, `src/features/discover/InventoryScreen.tsx`.
- Modify: those files.

- [ ] **Step 1: Demote the global search to a "jump to" pill**

In `AppShell.tsx` `TopBar`, shrink the command-palette trigger to a compact pill (icon + `Ctrl K` kbd, no full-width input look, `w-auto`), so it reads as a command launcher, not a text field. Keep its `aria-label="Open command palette"`.

- [ ] **Step 2: Make the page search the clear primary**

In `InventoryFilters.tsx`, give the page search a larger control with an accent focus treatment (`focus-visible:ring-2 ring-accent` / `border-accent` on focus). It must visually dominate the toolbar.

- [ ] **Step 3: Group filters under Type / Severity / Status labels**

Wrap the `FilterMenu`s so the trio reads as labelled groups: **Type** (resource type), **Severity** (risk band — rename the current "Risk" menu label to "Severity" for consistency with Monitor/Sessions), **Status** (move the Orphaned and Conflicts toggles here under a "Status" group). Keep Provider as-is or fold under Type per layout.

- [ ] **Step 4: Selected pills get a real active state**

Any pill toggle (Orphaned/Conflicts, and selected `FilterMenu` options) when active: filled accent background + leading check icon + `aria-pressed="true"`. Unselected: quiet outline, `aria-pressed="false"`. (`FilterMenu`'s trigger already shows an active count — extend the same treatment to the standalone pills.)

- [ ] **Step 5: Filter-aware count + Clear**

Replace the header's `{count(data.total)} shown` (in `InventoryScreen.tsx`, the `ScreenHeader actions`) with a filter-aware line:
`{filters.activeCount === 0 ? pluralize(data.total,'identity','identities') : `${count(data.shown)} of ${count(data.total)} · filtered by ${activeFilterSummary}`}` plus an inline **Clear** button (calls `filters.clearAll`) shown only when `activeCount > 0`. Derive `activeFilterSummary` from the active filter labels. Confirm `data.total` vs filtered count semantics in `src/mocks/api.ts` — use the unfiltered population total as the denominator.

- [ ] **Step 6: Verify**

Preview `/discover`. Confirm: top-bar search is a small pill; page search is clearly primary; filters read as Type/Severity/Status; selected pills are filled + checked + `aria-pressed`; count shows "N of M · filtered by …" with Clear. Counts reconcile with the Graph view and Dashboard. axe `[]` both themes.

- [ ] **Step 7: Verification Gate**

Run: `npm run typecheck`, `npm run lint`, `npm run build`. Expected: all clean.

---

## Task 7 (F-6): Dashboard — consistent KPI trend treatment

**Files:**
- Read first: `src/features/dashboard/DashboardScreen.tsx`.
- Modify: that file (component already supports `delta`/`deltaLabel`/`deltaInverted`/`sparkline`).

- [ ] **Step 1: Apply the trend rule per tile**

- AI Agents → `delta` (e.g. `12` / "this week"), positive neutral (more agents isn't inherently bad → neutral/success).
- Critical risk → `delta` with `deltaInverted` (up = bad → red only when rising).
- Orphaned → `delta` with `deltaInverted`.
- Total identities → **no delta** (slow scale) — leave plain.
All numbers already use `.tnum` via `KpiTile`. Mark deltas `// ASSUMPTION:` (synthetic trend).

- [ ] **Step 2: Verify**

Preview `/`. Confirm: the three moving tiles show deltas, Total stays plain, Critical-risk delta is red only when the arrow points up. axe `[]` both themes. Confirm Dashboard KPI numbers still reconcile with Inventory KPIs.

- [ ] **Step 3: Verification Gate**

Run: `npm run typecheck`, `npm run lint`, `npm run build`. Expected: all clean.

---

## Task 8 (F-7): Rotate phase steps — keyboard reachable + focus ring

**Files:**
- Read first: `src/features/rotate/RotateScreen.tsx`.
- Modify: that file.

- [ ] **Step 1: Make phase steps focusable controls**

If the rotation phase steps are clickable, render them as `<button>`s (or `tabIndex={0}` + `role="button"` + key handler) so they're in tab order with the global focus-visible ring. If they're purely presentational (non-interactive status), leave them but ensure the current phase is conveyed by text/`aria-current`, not colour alone.

- [ ] **Step 2: Verify**

Preview `/rotate`. Tab to each phase step; focus ring visible; Enter/Space activates. axe `[]` both themes.

- [ ] **Step 3: Verification Gate**

Run: `npm run typecheck`, `npm run lint`, `npm run build`. Expected: all clean.

---

## Task 9 (F-8): Forms — persistent labels, adjacent errors, styled date inputs

**Files:**
- Read first: `src/components/ui/ValidityWindowField.tsx`, `src/features/admin/InviteUserDialog.tsx`, `src/features/admin/EditUserDialog.tsx`, plus any `<input type="date">` usages (grep `type="date"`).
- Modify: the offenders found.

- [ ] **Step 1: Audit**

Run a grep for `type="date"` and for inputs without an associated `<label>`. List offenders.

- [ ] **Step 2: Fix labels + error placement**

Every field: a persistent visible `<label htmlFor>` (not placeholder-only); error text rendered **adjacent** to the field with `role="alert"`/`aria-describedby` wiring. (RHF + zod is already in use — surface `formState.errors[field]` beside the input.)

- [ ] **Step 3: Style native date inputs**

Replace raw `dd-mm-yyyy` native date inputs with the app's styled control (match `Input` styling; if a styled date picker doesn't exist, wrap the native input with the app `Input` classes and `color-scheme` already set per theme so the calendar matches).

- [ ] **Step 4: Verify**

Preview the Invite/Edit user dialogs. Confirm every field has a visible label, errors appear beside the field and are announced (`role="alert"`), date control matches the theme. axe `[]` (dialog open) both themes.

- [ ] **Step 5: Verification Gate**

Run: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`. Expected: all clean.

---

## Task 10 (F-10): Modal scrim strength (light theme)

**Files:**
- Modify: `src/styles/tokens.css` (light `--scrim`).

- [ ] **Step 1: Strengthen the light scrim**

Light `--scrim` is `rgba(24,24,27,0.42)` — at the low end. Raise to `rgba(24,24,27,0.5)` (within the 40–60% guidance) so foreground content is isolated. Dark scrim (0.62) is fine — leave it.

- [ ] **Step 2: Verify**

Open any modal (e.g. Invite user) in **light** theme; confirm the background is visibly dimmed/isolated. Confirm focus trap + Esc still work (Radix Dialog — unchanged). axe `[]`.

- [ ] **Step 3: Verification Gate**

Run: `npm run build`. Expected: success.

---

## Task 11 (F-9b): Microcopy & spacing-rhythm sweep

**Files:**
- Modify: screens flagged during the sweep; `src/components/ui/ScreenHeader.tsx` if the header→description→content gap is inconsistent.

- [ ] **Step 1: Plural/casing sweep**

Grep for hardcoded count strings and `} identit` / `} alert` / `} step` patterns; replace ad-hoc concatenations with `pluralize(...)`. Ensure buttons are verb-first and labels are sentence case.

- [ ] **Step 2: Spacing rhythm**

Confirm `ScreenHeader` enforces one spacing tier (e.g. title→description `mt-1`, header→first-content `mb-6`/`mb-4` consistently). If screens set their own ad-hoc gaps, route them through `ScreenHeader`.

- [ ] **Step 3: Verify + Gate**

Spot-check 4–5 screens for consistent vertical rhythm and correct singular/plural. Run: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`. Expected: all clean.

---

## Final full-app verification (after all tasks)

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → all pass (57 existing + new: `pluralize`, `alertGrouping`)
- [ ] `npm run build` → success
- [ ] axe `[]` on `/`, `/discover`, `/govern`, `/monitor`, `/resilience/blast-radius`, `/intelligence`, `/rotate`, `/settings/users`, `/design-system` — **dark and light** (reload to switch theme)
- [ ] Re-run the light-theme badge contrast snippet → info/critical/warning ≥4.5
- [ ] Update [UX-AUDIT.md](../../../UX-AUDIT.md) acceptance-criteria table to ✅ and append a short remediation note to `memory/acrivault-build.md`

---

## Self-Review (performed against the audit)

- **Spec coverage:** F-1→Task 1, F-2→Task 3, F-3→Task 4, F-4→Task 5, F-5→Task 6, F-6→Task 7, F-7→Task 8, F-8→Task 9, F-9→Tasks 2+11, F-10→Task 10. All 10 findings covered.
- **Type consistency:** `pluralize(n, singular, plural?)` defined in Task 2 and used identically in Tasks 3/4/5/6/11; `bucketByTime`/`splitAcknowledged` defined and consumed in Task 4 only; `ReachRow` defined and consumed in Task 3 only.
- **Placeholder scan:** no "TBD"/"add error handling" — each task gives exact files, the changed snippet, and a measurable gate. The two screen-restructure tasks (4, 5) intentionally say "read the file first" because exact JSX depends on current structure; the *behavioural* logic they add (bucketing, status chip, risk column) is fully specified.
- **Ordering:** P0 (Task 1) first; the `pluralize` foundation (Task 2) precedes its consumers; analyst-journey tasks (4, 5) before polish.
