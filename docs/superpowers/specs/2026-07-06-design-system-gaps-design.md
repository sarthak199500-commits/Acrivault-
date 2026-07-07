# Design: Close the four design-system gaps

**Date:** 2026-07-06
**Scope:** Acrivault design system — the app (`src/`) and the Figma plugin (`figma-plugin/`)
**Status:** Approved (scope + decisions), pending spec review

## Background

A token/variable audit (2026-07-06) found the system sound and fully coverage-guarded, with four gaps:

1. **Chart & organism node trees missing** — tokens exist, Figma components don't.
2. **Tokens Studio export is a 2-tier subset** — not full parity with the Figma model; also the "two generators to keep in sync" liability.
3. **Off-scale web values** — a handful of arbitrary Tailwind values bypass the token scale.
4. **Missing library families** — a few app components have no Figma component.

The user chose to fix **all four**, with: **exhaustive** off-scale cleanup, the generator rebuilt as a **transform of `model.generated.json`**, and the **full** build list (ScreenHeader, Logo, 5 charts + 4 organisms, auth composites).

## Goals / non-goals

- **Goal:** every design-system *quantity* used by the app is a named token; the Tokens Studio export mirrors the Figma model from a single source; every app component (charts, organisms, auth screens included) has a faithful, token-bound Figma component.
- **Non-goal:** data-accurate charts (representative sample content is fine, matching the library's existing approach). Not tokenizing genuinely one-off layout/viewport/content/artwork dimensions (enumerated as exempt below).
- **Invariant preserved:** `tokens.css` stays the single source of raw values; Semantic remains 100% aliases; the coverage guard, per-family preflight, value-safe binding, and `skip-if-exists` idempotency are all retained.

## Current baseline

Model: **255 primitives / 56 semantic / 520 component / 25 text / 12 effect**; 52 library families in 8 groups; 146 tests; `tsc` clean.

---

## Phase 1 — Tokens & generator (gaps 3 + 2)

These are coupled (new tokens must flow through both generators), so they ship together.

### 1a. Exhaustive off-scale tokenization

Add to `src/styles/tokens.css` `:root` (5 new vars), route them in `figma-plugin/src/model/parse-tokens.ts`, and consume them in the app.

| Off-scale value | Occurrences | Resolution | New token(s) |
|---|---|---|---|
| `text-[32px] leading-9` (32/36) | KpiTile prominent value | Promote a real KPI hero role | `--fs-kpi:32px`, `--lh-kpi:36px` → `Font/Size/KPI`, `Font/Line Height/KPI` → text style **`Heading/KPI`** (Semibold 32/36, Tight) |
| `w-[360px]` | Toaster viewport | Reference existing token (= `--panel-w`) | none — web edit only |
| `border-l-[3px]` / `w-[3px]` | MonitorScreen, SessionListScreen, DashboardScreen severity bar (×3) | Recurring accent-bar width | `--bw-3:3px` → `Border Width/3` |
| `text-[10px]` | NotificationsBell count + 2 doc pages (×3) | Recurring nano label | `--fs-2xs:10px` → `Font/Size/2XS` → text style **`Label/Nano`** (Semibold 10, lh reuses `Micro`) |
| `rounded-[2px]` | Dashboard legend swatch | Micro radius | `--r-2xs:2px` → `Radius/2XSmall` |
| `h-[18px] w-[18px]` | AppShell sidebar nav icon | Snap to existing `Size/Icon/Large` (20px) — keeps the 14/16/20 ladder clean; +2px on sidebar nav is acceptable | none (web edit: `size-5`/token) |
| `tracking-[0.08em]` | DashboardScreen inline eyebrow | Reference `--tracking-eyebrow` (use `.eyebrow` class) | none — web edit only |

**Exempt (documented, NOT tokenized — one-off layout/viewport/content/artwork, not system quantities):** chart container heights (`min-h-[220px]`, `min-h-[260px]`), skeleton/scroll heights (`h-[460px]`, `h-[500px]`, `max-h-[600px]`), illustration art widths (`w-[180px]`, `w-[190px]`), table min-width (`min-w-[1088px]`), CSS grid track templates (`grid-cols-[…]`), overlay viewport math (`top-[12vh]`, `w-[calc(100vw-2rem)]`), Logo wordmark proportion (`h-[15px]`) and Switch thumb travel (`translate-x-[18px]`, derived geometry), design-system doc-page meta layout (`min-w-[84px]`, `max-w-[150px]`, `min-w-[600px]`). A short comment block in `tokens.css` (or a spec appendix) records why.

**Plugin routing changes:**
- `parse-tokens.ts`: route the 5 new `:root` vars (`fs-kpi`, `lh-kpi`, `fs-2xs`, `bw-3`, `r-2xs`) into `Font/Size/*`, `Font/Line Height/*`, `Border Width/*`, `Radius/*` (coverage guard then passes).
- `styles-map.ts`: add `Heading/KPI` and `Label/Nano` (25 → 27 text styles).
- `scopes.ts`: `Font/Size/KPI`,`Font/Size/2XS` → `FONT_SIZE`; `Font/Line Height/KPI` → `LINE_HEIGHT`; `Border Width/3` → `STROKE_FLOAT`; `Radius/2XSmall` → `CORNER_RADIUS`.
- Optional: bind the library's KpiTile **Prominent** variant value to `Heading/KPI` (currently `Heading/H1`), fixing the pre-existing library/app mismatch.

**Web changes:** KpiTile (`text-display-kpi`/token util for the prominent value), Toaster (`w-[var(--panel-w)]`), the 3 severity bars (`Border Width/3` util), NotificationsBell + doc pages (nano size util), Dashboard swatch (`rounded-[var(--r-2xs)]`), AppShell nav icon (`size-5`), Dashboard eyebrow (`.eyebrow`). Verify pixel-identical in both themes where "no visual change" is claimed; the two intended shifts are the nav icon (18→20) and any doc-page nano rounding.

**Model after 1a:** 260 primitives (+5) / 56 semantic / 520 component / 27 text (+2) / 12 effect.

### 1b. Tokens Studio generator → transform of `model.generated.json`

Replace the standalone `C:/Users/sarth/Downloads/Acrivault Tokens/gen-tokens-studio.js` (which re-derives from `tokens.css`) with a generator that **consumes the plugin's already-built `model.generated.json`** and transforms it into Tokens Studio format.

- **Location:** move into the plugin repo (e.g. `figma-plugin/scripts/gen-tokens-studio.mjs`), run as a step of `npm run build` (after `model.generated.json` is written). Output still written to the user's Tokens folder (path configurable, defaults preserved).
- **Output shape (parity):** primitives set (raw + promoted primitives, composite typography + boxShadow as today), plus a **`semantic`** set (Dark/Light modes), a **`component`** set (520 vars → `{semantic…}`/`{primitive…}` refs), text styles and effect styles as composite tokens. `$themes`/`$metadata` extended to include the component set.
- **Coverage guarantee (replaces the old per-var guard):** a test asserts every entry in `model.generated.json` (primitive/semantic/component/text/effect) appears in the emitted JSON, and every alias resolves to an emitted token. Because the input is the single built model, drift is structurally impossible.
- **Retire** the Downloads script (leave a one-line pointer/readme so a stale copy isn't run by habit). Update the `figma-plugin` note in memory.

**Tests:** new `test/gen-tokens-studio.test.ts` (model → valid TS JSON, full coverage, refs resolve, set/theme shape). Existing suites updated for the +5 primitives / +2 text styles counts (`parse-tokens.test`, `styles-map.test`, `scopes.test`, `build-model.test`).

---

## Phase 2 — ScreenHeader family (gap 4)

Add one library family; frames + text only (no new capability, no new tokens).

- `library-map.ts`: `ScreenHeader` in a suitable group (Navigation or a new "Layout" group). Node tree: `col` → optional eyebrow (`Label/Eyebrow`, `Nav/Text/Eyebrow`/`Accent/Text`), title (`Heading/H1`, `Text/Primary`), description (`Body/Regular`, `Text/Secondary`), and a right-aligned actions slot (row of placeholder buttons). One variant (Default); optionally a `HasActions` variant.
- Validated automatically by `library-map.test.ts` (every var/style ref must exist).

Toggles (ThemeToggle/DensityToggle → `IconButton` instances) and icon components (NhiTypeIcon/CloudGlyph) are intentionally **not** families.

---

## Phase 3 — Renderer extension (enables Phase 4/5)

Extend the library DSL (`types.ts`), renderer (`figma-library.ts`), and test double (`test/fake-figma.ts`) with three capabilities. Keep every addition value-safe and variable-bound.

1. **Vector node** — `LibVector { kind:'vector'; path:string; ... }` (or `data` as an SVG path / Figma `vectorPaths`). Renders `figma.createVector()`. Fill/stroke bind to COLOR vars as today. Used for line/area chart strokes, area outlines, and the Logo mark/wordmark (real `MARK_PATHS`/`WORDMARK_PATH`).
2. **Gradient fill** — a `gradient?: { angle?; stops: { pos:number; var:string }[] }` field on the node base. Builds a `GRADIENT_LINEAR` paint; each stop's color is bound to a `Chart/*-Gradient/*` var by constructing `boundVariables.color` on the `ColorStop` manually (Figma's `setBoundVariableForPaint` is solid-only — this mirrors the technique already used in `rebind.ts` `relinkGradient`). Used for ActivityChart/Sparkline area fills.
3. **Arc / ring** — an `arc?: { start:number; end:number; innerRadius:number }` field on an ellipse (Figma `ARC` via `arcData`). Used for RadialGraph guide rings + progress arc; stroke/fill bind to `RadialGraph/*` + `Categorical/*`/`Status/*`.

`fake-figma.ts` gains `createVector`, gradient-paint modelling, and `arcData` so the render tests run headless. New geometry tests in `figma-library.test.ts`.

---

## Phase 4 — Charts (gap 1)

Five representative, token-bound chart components in a new **"Data Viz"** group. Sample content is fixed/believable, not data-driven.

- **BarChart** — rects (bars) bound to `Categorical/*`/`BarChart/*`; baseline + grid lines bound to `Effect/Grid Line` (`BarChart/Grid`). *(Uses only existing rect support + Phase 3 lines.)*
- **Sparkline** — a vector polyline (`Sparkline/Stroke`/`accent-300`) + gradient area fill bound to `Chart/Sparkline-Gradient/Start|End`.
- **LineChart** — vector polyline(s) (`LineChart/Series-*`/`Categorical/*`) + grid (`LineChart/Grid` → `Effect/Grid Line`).
- **ActivityChart** — area gradient (`Chart/Area-Gradient/Start|End`) + accent stroke + alert markers (`Status/Warning`) + grid (`ActivityChart/Grid`). Mirrors `ActivityChart.tsx`.
- **RadialGraph** — arc rings (`RadialGraph/GuideRing` → `Effect/Grid Line`) + a progress arc (`RadialGraph/*`/`Categorical/*`).

All chart *tokens* already exist in the Component collection and promoted primitives (gradients added 2026-07-06). No new tokens; `library-map.test`/`figma-library.test` cover ref-validity and geometry.

---

## Phase 5 — Logo, organisms, auth composites (gaps 1 + 4)

Flattened frames assembled from the existing `row`/`col`/`t`/`icon`/`dot` helpers plus Phase 3 vectors, reusing existing component vars/text styles (no new tokens). All `skip-if-exists`.

- **Logo** (Controls or Brand group) — variants `horizontal`/`stacked`/`mark`; `MARK_PATHS` as vectors bound to `Brand/Logo Mark`, `WORDMARK_PATH` bound to `Text/Primary`.
- **TopBar** — Logo mark + breadcrumb/title + spacer + RoleSwitcher + IconButtons (theme/density/notifications) + Avatar.
- **Sidebar** — Logo horizontal + grouped nav (eyebrow labels + `SideNavItem` rows in Default/Selected) + collapse control.
- **CommandPalette** — search row + result groups (item + active item) + footer hint (built on Popover/Dialog surfaces).
- **MobileNav** — mobile sheet: Logo + nav items + close.
- **Auth composites** — `MfaEnroll` (QR placeholder + `CodeInput` + copy), `MfaChallenge` (`CodeInput` + resend), `LegalConsent` (checkbox rows + legal text), `RegistrationProgress` (`Stepper` + copy), on the `AuthCard` surface.

New group(s) added to `libraryMap`'s ordered export; the plugin's Components tab picks them up automatically (`code.ts` derives groups from `libraryMap`).

---

## Sequencing & dependencies

```
Phase 1 (tokens + generator)  ─┐
Phase 2 (ScreenHeader)         ─┼─ independent after P1
Phase 3 (renderer extension)  ──┘  → Phase 4 (charts) → Phase 5 (Logo, organisms, auth)
```

Phase 1 is the foundation (all tiers rebuild on the new tokens). Phase 3 gates Phases 4–5 (they need vectors/gradients/arcs). Phase 2 can land any time after Phase 1.

## Testing & verification

- **Per phase:** `npm run build` (regenerates model + dist), `npx vitest run`, `npx tsc --noEmit` all green; coverage guard must pass on every `tokens.css` change.
- **Counts asserted** in `build-model.test` update as tiers grow.
- **Web parity:** for every "no visual change" edit, confirm pixel-identical in both themes (the KPI hero, toast, severity bars, swatch); axe clean.
- **Plugin apply:** dry-run in Figma, then real run; idempotent re-run repoints existing imports. Charts/organisms are new families (skip-if-exists), so they create cleanly and don't detach placed instances.

## Risks

- **Renderer extension (Phase 3)** is the highest-risk change (new Figma node types + gradient-stop binding + arc geometry). Mitigate with `fake-figma` modelling + geometry tests before authoring any chart.
- **Generator relocation (Phase 1b)** changes the build workflow and retires a file outside the repo; verify the Tokens Studio import still round-trips before deleting the old script.
- **Exhaustive tokenization** risks over-tokenizing; the exempt list is the guardrail — new tokens are only for recurring system quantities.

## Out of scope / future

- Data-driven chart rendering; a Figma "playground" page wiring organisms from real instances (we use flattened frames).
- Any refactor of the app beyond the enumerated off-scale edits.
