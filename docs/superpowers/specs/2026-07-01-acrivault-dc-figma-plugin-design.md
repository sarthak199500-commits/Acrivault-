# Acrivault DC — Figma design-system plugin · Design Spec

**Date:** 2026-07-01 · **Status:** Draft for review · **Author:** design-system session

> "Acrivault DC" (Design System) — a purpose-built Figma plugin that builds the
> entire Acrivault design system inside a Figma file in one click: variables
> (3 layers, theme-aware), text styles, and effect styles — properly named,
> grouped, and aliased. It bypasses Tokens Studio entirely and uses the Figma
> Plugin API directly, which removes the import friction we hit repeatedly.

---

## 1. Goals

1. **One click, no import dance.** A designer opens the plugin, clicks **Build / Update design system**, and the full system materializes. No pasting JSON, no per-set creation, no Tokens Studio.
2. **Three properly-aliased layers** — Primitives → Semantic (Dark/Light) → Component — so `Button/Primary/Background` traces to `Brand/Accent/Strong` traces to a raw color, and flipping a frame's mode reflows everything.
3. **Faithful to the code.** Primitives + Semantic are generated from `src/styles/tokens.css` (single source of truth). The Component layer is generated from an audit of how the real `src/components/**` consume tokens.
4. **Idempotent.** Re-running updates variables/styles in place by name — never duplicates.
5. **Well-organized like a real design system** — Title-Case `/`-grouped names, sensible collections, no orphan root tokens.

## 2. Non-goals

- Not a Tokens Studio file (that path is retired for this deliverable; the existing `Downloads/Acrivault Tokens/tokens.json` can stay as a portable export).
- Not a published Figma **library** step (the plugin builds locals; publishing to a team library is a manual Figma action afterward).
- No component **assembly** (it does not build Figma components/frames — only the token/style foundation they'd be built on).
- No round-trip import *from* Figma back to code.

## 3. Architecture

**Chosen: standalone TypeScript plugin, token model baked in at build time.**

- A build step re-parses `src/styles/tokens.css` (reusing the proven parser from `gen-tokens-studio.js`) and merges it with an authored **component map** + the **new promoted tokens** into a single embedded `model` object compiled into `code.js`.
- `code.ts` (plugin sandbox) walks the model and calls the Figma API to create collections, modes, variables, aliases, text styles, and effect styles.
- A minimal `ui.html` provides the **Build / Update** button, options, and a result log.

**Rejected — runtime JSON paste/upload.** Reintroduces the exact friction we're escaping; the plugin should be self-contained.

Rationale: baking the model means the plugin is deterministic and needs no file access at run time. To update after a token change: `npm run build` (re-parses `tokens.css`) → reload plugin → click Build.

## 4. Repository layout

Lives inside the app repo so the build can read `tokens.css`:

```
E:\Projects\Acrivault\Design V3\figma-plugin\
  manifest.json            # Figma plugin manifest (id, name "Acrivault DC", main, ui)
  package.json             # esbuild + typescript devDeps, "build"/"watch" scripts
  tsconfig.json
  src/
    code.ts                # plugin sandbox entry — builds the system via Figma API
    ui.html                # button + options + result log (inline CSS/JS)
    model/
      build-model.ts       # BUILD-TIME: parse tokens.css → primitives + semantic
      component-map.ts     # authored Component layer (from the audit) + gap families
      promoted-tokens.ts   # the new semantic/primitive tokens (§7.3)
      model.generated.json # emitted by build; imported by code.ts
    lib/
      figma-variables.ts   # find-or-create collection/mode/variable, setValue, alias
      figma-styles.ts      # find-or-create text & effect styles, bind to variables
  build.mjs                # esbuild driver: runs build-model, bundles code.ts + inlines ui
  README.md
```

## 5. Token model — layers, collections, modes

| Layer | Figma collection | Modes | Source | Count (approx) |
|---|---|---|---|---|
| **Primitives** | `Primitives` | 1 · `Value` | `tokens.css` + promoted primitives | ~185 vars |
| **Semantic** | `Semantic` | 2 · `Dark`, `Light` | `tokens.css` per-theme + promoted semantics | ~34 vars ×2 |
| **Component** | `Component` | 1 · `Value` | component audit + gap families | ~330 vars |
| **Text styles** | *(local text styles)* | — | `tokens.css` type + `Label/Eyebrow` | 19 styles |
| **Effect styles** | *(local effect styles)* | — | `tokens.css` shadows (named split) | 8 styles |

**Mode flow / theming.** `Semantic` variables hold different values per `Dark`/`Light` mode and **alias Primitives**. `Component` variables are single-mode and **alias Semantic** variables — so they inherit Dark/Light automatically through the alias chain (no need for the Component collection to carry modes). Set a frame's mode on the `Semantic` collection and the whole chain reflows.

## 6. Primitives naming (collection `Primitives`, mode `Value`)

Convention `Category/Group/Step`, Title Case, `/` = Figma group.

| Group | Variables |
|---|---|
| Color ramps | `Color/Green/50…900`, `Color/Neutral/*`, `Color/Red/*`, `Color/Amber/*`, `Color/Blue/*`, `Color/Black`, `Color/White` |
| Brand | `Brand/Accent/Default · Hover · Press · 300 · 700` (alias Green ramp where equal), **`Brand/Accent/Strong`** (new, §7.3) |
| Fixed status | `Status/Success · Warning · Critical · Info`, **`Status/Critical/Strong`** (new) |
| Risk | `Risk/Critical · High · Medium · Low · Minimal` |
| Data-viz | `Categorical/1…8` |
| Spacing/shape | `Space/1…16`, `Radius/None…Pill`, `Border Width/1 · 2 · Thick` (Thick=1.6, new), `Focus/Width` |
| Sizing | `Size/Icon·Control·Avatar/*`, `Layout/*` (incl. `Layout/Topbar`=56), `Density/*`, `Breakpoint/*`, **`Size/Dot/Small·Default`** (6·8), **`Size/Progress-Track/Small·Default`** (6·8) — all new |
| Type | `Font/Family/*`, `Font/Weight/*` (numeric 400–700), `Font/Size/*` (roles + 11-step scale), `Font/Line Height/*`, `Font/Letter Spacing/*` |
| Misc | `Opacity/*`, `Blur/*`, `Z Index/*`, `Duration/*` (Easing documented, no Figma var type) |

## 7. Semantic naming (collection `Semantic`, modes `Dark` + `Light`)

### 7.1 Carried from tokens.css (aliased to Primitives, per-mode values)

| Group | Variables |
|---|---|
| Surface | `Surface/Background · Base · Raised · Hover` |
| Text | `Text/Primary · Secondary · Tertiary` |
| Border | `Border/Default · Strong` |
| Accent | `Accent/Text · Tint` |
| Feedback | `Feedback/{Success·Warning·Critical·Info·Neutral}/{BG·Text}` |
| Effect | `Effect/Grid Line · Scrim` |
| Brand | `Brand/Logo Mark` |

### 7.2 Approved decisions baked in
- **Colors are variables only** (no paint styles).
- **Shadows are a named Dark/Light split** (§10), not variable-bound.
- **Text styles = 7 product roles + the full 11-step scale** (§9).

### 7.3 NEW promoted tokens (from "promote derived values" decision)

Derived, drifting, or missing values become real tokens so every component aliases something. This makes the Figma system a **superset** of `tokens.css` — a candidate list for later tightening the code.

| New token | Where | Value / derivation | Replaces (was derived in) |
|---|---|---|---|
| `Brand/Accent/Strong` | Primitives | `color-mix(accent 86%, black)` (AA on white) | Button/Primary default bg |
| `Status/Critical/Strong` | Primitives | `color-mix(critical 82%, black)` | Button/Danger default bg |
| `Focus/Ring/Default` | Semantic | accent @ 30% → transparent | ~10 inputs' focus rings |
| `Focus/Ring/Strong` | Semantic | accent @ 35% → transparent | Tabs/Timeline/Switch/Slider (SsoButton's 45% **normalized** to Strong) |
| `State/Disabled/Opacity` | Semantic (number) | `0.5` | all disabled states (the few 40% cases **normalized** to 50%) |
| `Accent/Tint-Weak` | Semantic | accent @ ~20% over surface | FilterPill/FilterMenu count chips |
| `Feedback/{Success·Warning·Critical·Info}/Border` | Semantic | `color-mix(tone ~45%, border)` (45/50% **reconciled** to 45%) | Banner + Toaster borders |
| `Size/Dot/*`, `Size/Progress-Track/*`, `Border Width/Thick` | Primitives | 6 / 8 / 1.6 px | StatusDot, ProviderBadge dot, ProgressBar heights, graph strokes |
| `Label/Eyebrow` (text style) | Styles | micro · 600 · +8% tracking · uppercase | `.eyebrow` in DropdownMenuLabel, FilterMenu, ScanProgress, CodeBlock |

**Normalizations flagged for your sign-off:** focus 45%→35%; disabled 40%→50%; feedback border 50%→45%. Each is a tiny visual change that removes drift; say the word if you'd rather preserve any exactly.

## 8. Component layer (collection `Component`, aliases Semantic)

Naming: `Component/Variant/Slot` (+ `#state` where non-default), e.g. `Button/Primary/Background`, `Button/Primary/Background#hover`. ~330 variables across **48 families**.

**Families (48):** Button, IconButton, SsoButton, RoleSwitcher, SegmentedControl, FilterPill, Checkbox, RadioGroup, Switch, Slider, Input, Textarea, Select, Combobox, CodeInput, ValidityWindowField, Card, KpiTile, AuthCard, Accordion, Banner, InlineAlert, Toaster, EmptyState, ErrorState, Badge, Tag, StatusBadge/StatusDot, RiskPill, ProviderBadge, Dialog, Drawer, Popover, DropdownMenu, Tooltip, CommandPalette, FilterMenu, ProgressBar, ScanProgress, Skeleton, Table, Avatar, CodeBlock, KeyValueList, PermissionsSummary, Tabs, Breadcrumb, Pagination, Stepper, Timeline, charts (Sparkline/Bar/Line/Activity/Radial), shell (Sidebar/SideNav/TopBar/MobileNav).

The **full enumerated map** (every variable → semantic alias, per state) is captured in `figma-plugin/src/model/component-map.ts`, generated from the audit output at
`…/tasks/w8avwuz3s.output` plus the gap families read this session. Representative families below define the shape; the data file is the exhaustive contract.

**Button** (representative)

| Variable | Aliases | State |
|---|---|---|
| `Button/Primary/Background` | `Brand/Accent/Strong` | default |
| `Button/Primary/Background#hover` | `Brand/Accent/Default` | hover |
| `Button/Primary/Background#active` | `Brand/Accent/Press` | active |
| `Button/Primary/Text` | `Color/White` | — |
| `Button/Secondary/Background` | `Surface/Raised` (hover `Surface/Hover`, active `Surface/Base`) | states |
| `Button/Secondary/Border` | `Border/Strong` | — |
| `Button/Secondary/Text` | `Text/Primary` | — |
| `Button/Secondary/Background#active` | `Surface/Base` | active |
| `Button/Ghost/Text` | `Text/Secondary` (hover `Text/Primary`) | states |
| `Button/Ghost/Background#hover` | `Surface/Hover` | hover |
| `Button/Danger/Background` | `Status/Critical/Strong` | default |
| `Button/Danger/Text` | `Color/White` | — |
| `Button/Disabled/{Background·Border·Text}` | `Surface/Raised · Border/Default · Text/Tertiary` | disabled |
| `Button/Radius` | `Radius/Small` | — |

\* hover/press brand accents live under `Brand/Accent/*` in Primitives.

**Input/field family** (Input, Textarea, Select, Combobox, CodeInput, ValidityWindowField) share: `…/Background → Surface/Base`, `…/Border → Border/Strong` (focus → `Border/Default` + `Focus/Ring/Default`), `…/Text → Text/Primary`, `…/Placeholder → Text/Tertiary`, `…/Label → Text/Secondary`, error → `Feedback/Critical/{BG,Text}`, `…/Radius → Radius/Small`.

**Badge/Status family:** `Badge/{tone}/{Background,Text} → Feedback/{tone}/{BG,Text}`; RiskPill maps Critical→Critical, High+Medium→Warning, Low→Success, Minimal→Neutral (see §12 ambiguity), radius `Pill`.

**Overlays** (Dialog/Drawer/Popover/DropdownMenu/Tooltip/CommandPalette): `Background → Surface/Base|Raised`, `Border → Border/Strong`, `Shadow → Shadow/Medium|XL`, `Radius → Medium|Large`, item hover `Surface/Hover`, menu label `Label/Eyebrow`.

**Gap families filled this session:**

| Family | Key mappings |
|---|---|
| **Table** (synthesized from ScrollableTable + doc conventions) | `Table/Header/Background → Surface/Raised`, `Table/Header/Text → Text/Tertiary`, `Table/Row/Border → Border/Default`, `Table/Row/Background#hover → Surface/Hover`, `Table/Cell/Text → Text/Primary` (secondary `Text/Secondary`), `Table/Focus Ring → Focus/Ring/Default` |
| **Avatar** | `Avatar/Background → Surface/Raised`, `Avatar/Border → Border/Default`, `Avatar/Text → Text/Secondary`, `Avatar/Status-Ring → Surface/Base`, `Avatar/Radius → Radius/Pill`, sizes → `Size/Avatar/{Sm·Md·Lg}`, type micro/small/h2 |
| **CodeBlock** | `Background → Surface/Raised`, `Border → Border/Default`, `Label → Label/Eyebrow`, `Copy/Text → Text/Tertiary` (hover `Text/Primary`), `Code/Text → Text/Secondary`, `Focus Ring → Focus/Ring/Default`, `Radius → Radius/Medium`, code type |
| **KeyValueList** | `Label → Text/Tertiary`, `Value → Text/Primary`, `Derived-Badge/Background → Surface/Raised`, `Derived-Badge/Text → Text/Secondary`, `Derived-Badge/Radius → Radius/XSmall` |
| **PermissionsSummary** | `Background → Surface/Raised`, `Border → Border/Default`, `Body → Text/Secondary`, `Role-Name → Text/Primary`, `Can-Icon → Feedback/Success/Text`, `Cannot → Text/Tertiary`, `Radius → Radius/Medium` |
| **Tabs** | `Trigger/Text → Text/Secondary` (hover/active `Text/Primary`), `Trigger/Indicator → Accent/Default`, `List/Border → Border/Default`, `Focus Ring → Focus/Ring/Strong`, type small·medium |
| **Breadcrumb** | `Link → Text/Tertiary` (hover `Text/Primary`), `Current → Text/Primary`, `Separator → Text/Tertiary`, type small |
| **Pagination** | `Button/{Background→Surface/Base, Border→Border/Default, Text→Text/Secondary}`, hover `Surface/Hover`, current `{Accent/Tint, Accent/Default, Accent/Text}`, disabled `State/Disabled/Opacity`, radius Small |
| **Stepper** | Done `{Accent/Default, Color/White}`, Current `{border Accent/Default, text Accent/Text}`, Upcoming `{Border/Default, Text/Tertiary}`, Connector `Border/Default`, node radius Pill |
| **Timeline** | Node Default `{Border/Strong, Surface/Base, Text/Tertiary}`, Anomaly `{Status/Critical, Feedback/Critical/BG, Feedback/Critical/Text}`, Active `{Accent/Default, Accent/Tint, Accent/Text}`, Done `{Accent/Default, Color/White}`, Item hover `Surface/Hover`, Focus `Focus/Ring/Strong` |

## 9. Text styles (19)

Bound to `Font/*` variables so weight/size/line-height are live.

- **Roles (7):** `Heading/Display`, `Heading/1`, `Heading/2`, `Body/Regular`, `Body/Small`, `Label/Micro`, `Code`
- **Full scale (11):** `Scale/Display-2XL … Scale/Display-XS`, `Scale/Text-XL … Scale/Text-XS`
- **`Label/Eyebrow` (1):** micro · 600 · +8% tracking · uppercase

Font weights exported numeric (`400/500/600/700`) so Figma maps to the font's real style names ("Semi Bold"). **Requires Inter + JetBrains Mono to be available in the Figma file** — otherwise those styles are skipped and reported (§14).

## 10. Effect styles (8)

Named Dark/Light split (effect styles have no modes): `Shadow/Dark/{Small·Medium·Large·XL}` + `Shadow/Light/{Small·Medium·Large·XL}`. Geometry identical per size across themes; color/opacity differs.

## 11. Idempotency & aliasing

- **Find-or-create by name** for every collection, variable, and style. Re-running updates values/aliases in place — no duplicates. Renames in the model orphan the old name (reported, not auto-deleted, to avoid surprise data loss).
- **Alias resolution order:** Primitives first, then Semantic (aliases resolve against already-created Primitives), then Component (aliases against Semantic). Build order enforces this.
- Where a Semantic value equals a Primitive (hex match), it aliases; otherwise it's a literal per mode (same rule as the existing generator: 12/48 semantic values alias, rest literal).

## 12. Ambiguities — resolutions

| # | Finding | Resolution |
|---|---|---|
| 1 | RiskPill **High and Medium both → Warning** (visually identical) | Keep as-is for fidelity; **flag** in README. Optional future `Feedback/High` tone if you want them distinct. |
| 2 | Input/Select focus **lightens** border (Strong→Default) + adds ring | Faithful to source; kept. Ring (`Focus/Ring/Default`) is the primary focus signal. |
| 3 | Checkbox state vocab (`active` vs `checked`) | Standardize on **`checked`** in the model. |
| 4 | Button double-typed (`SmallText`/`BodyText` vs `Text-*/Typography`) | Keep **typography** binding (text style), drop the redundant color rows. |
| 5 | Chart gradient fills (Sparkline, Activity) | Documented per-chart recipes; record base alias (`Accent/Text`/`Accent/Default`) so theme changes propagate. Not standalone tokens. |

## 13. Plugin UI

Single view: title, **Build / Update design system** (primary), and options (checkboxes): *Primitives, Semantic, Component, Text styles, Effect styles* (all on by default), plus *Dry run (report only)*. After running, a scrollable log lists created/updated/skipped counts per layer and any warnings (missing fonts, orphaned names).

## 14. Error handling

- **Missing fonts** → skip affected text styles, continue, and report which (don't fail the whole run). Load fonts via `figma.loadFontAsync` guarded by try/catch.
- **Figma plan mode limits** (free plans cap modes) → if creating the 2nd mode fails, report and fall back to a single-mode Semantic collection with Dark values.
- **Effect-color binding** N/A here (named split chosen), so no API-support risk.
- All API calls wrapped; a failure in one token logs and continues; final summary states partial success.

## 15. Build & install

1. `cd figma-plugin && npm install`
2. `npm run build` → parses `tokens.css`, emits `model.generated.json`, bundles `code.js` + inlines `ui.html`.
3. Figma → **Plugins → Development → Import plugin from manifest** → pick `figma-plugin/manifest.json`.
4. Run **Acrivault DC** → click **Build / Update design system**.
5. To update after token changes: `npm run build` → re-run the plugin.

## 16. Testing / verification

- **Build-model unit check:** the parser reuses the verified `gen-tokens-studio.js` logic; assert 202/202 css coverage + all component aliases resolve to an existing semantic/primitive name (fail the build on a dangling alias).
- **Dry-run mode** prints the full plan without mutating the document — reviewable before committing.
- Manual smoke: run in a scratch Figma file, verify collections/modes/counts, flip a frame Dark→Light and confirm bound fills reflow.

## 17. Open questions for reviewer

1. OK to introduce the §7.3 **new tokens** (Figma system as a superset of `tokens.css`)? — assumed **yes** (your "promote" choice).
2. OK with the three **normalizations** (focus 45→35%, disabled 40→50%, feedback border 50→45%)? — assumed yes; easy to preserve exactly if not.
3. Plugin **location** in-repo at `figma-plugin/` — OK, or prefer a standalone folder outside the app?
4. RiskPill **High=Medium=Warning** left as-is — acceptable?
