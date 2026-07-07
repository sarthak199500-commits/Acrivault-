# Link Text Styles — Figma Plugin Design Spec

- **Date:** 2026-07-02
- **Status:** Approved (brainstorming) → ready for implementation plan
- **Companion to:** Acrivault DC plugin (`figma-plugin/`), which *creates* the design system (variables, text styles, effect styles). This plugin *links existing content to it*.

## 1. Purpose

A standalone Figma plugin that scans text nodes in a file, matches each to the **nearest existing local text style** (and, when toggled, binds the text fill to the matching **semantic color variable**), presents a **review panel**, and applies changes **only on explicit user confirmation**.

Nothing in the document is mutated until the user clicks Apply. The plugin is advisory until that point — consistent with the human-in-the-loop, least-privilege operating principle (no autonomous state changes).

## 2. Decisions (resolved during brainstorming)

| # | Decision | Choice |
|---|----------|--------|
| D1 | Link scope | **Typography always; color-variable binding is an opt-in toggle** in the same review panel. |
| D2 | Match strategy | **Nearest within tolerance**, tagged by confidence tier; beyond threshold = "No match"; user reviews before apply. |
| D3 | Match source | **Live local styles + variables in the file** (`getLocalTextStylesAsync` / `getLocalVariablesAsync`), not a bundled token model. |
| D4 | Tie-break | On equal score, **role styles win over `Scale/*`**; runner-up surfaced as an alternate. |
| D5 | Pre-check defaults | **Exact + High pre-checked** to apply; Medium + Low unchecked (opt-in). |
| D6 | Mixed-property nodes | **Skipped for typography** (can't apply one style); color still bindable if the fill is uniform. |
| D7 | Color matching | **Exact hex equality only** (no fuzzy color) — fuzzy cross-mode color matching is error-prone; typography uses tolerance, color does not. |

## 3. Non-goals (YAGNI)

- No creation of styles/variables (that is Acrivault DC's job). If the file has zero local text styles, the plugin stops with "Run Acrivault DC first."
- No per-character/segment restyling of mixed-property nodes — they are reported and skipped.
- No fuzzy/nearest color matching or ΔE distance — color is exact-hex only.
- No editing of the Acrivault DC plugin or refactor into a shared monorepo. `color.ts` is copied in (small, deliberate duplication) to keep both plugins independently shippable.
- No autonomous / scheduled runs — user-initiated only.

## 4. Architecture

Standalone folder `link-text-styles/` beside `figma-plugin/`, same conventions as Acrivault DC:

- TypeScript strict, ES2020.
- `esbuild` bundles `src/code.ts` → `dist/code.js` (iife) and inlines `src/ui.html` → `dist/ui.html`.
- `vitest` (node env) with an in-memory `FakeFigma` harness; the Figma API is reached only through injected structural interfaces so pure logic is testable without a live session.
- Deterministic IDs in the fake (counter-based, never `Date.now()`/`Math.random()`).

Manifest: `{ name: "Link Text Styles", id: "acrivault-link-text-styles", api: "1.0.0", editorType: ["figma"], documentAccess: "dynamic-page", networkAccess: { allowedDomains: ["none"] } }`.

### 4.1 Modules

| Module | Responsibility | Depends on |
|--------|----------------|------------|
| `src/types.ts` | Shared types: `TextProps`, `StyleCandidate`, `ColorCandidate`, `MatchResult`, `Confidence`, `ScanReport`, `ApplyDecision`, `ApplySummary`. | — |
| `src/lib/color.ts` | Copied from Acrivault DC: hex/rgba parse, `toHex`, `colorStr`. Used to resolve fills for color matching. | — |
| `src/lib/text-props.ts` | `readTextProps(node)`: extract + normalize typographic props from a `TextNode`; detect `figma.mixed` → sentinel. `normalizeLineHeight`, `normalizeLetterSpacing`. | color |
| `src/lib/match.ts` | **Pure engine.** `scoreStyle(node, style)` weighted distance; `matchText(node, candidates, tol)` → best + confidence + alternates. Family is a hard gate; tie-break prefers role over scale. | types |
| `src/lib/color-match.ts` | **Pure.** `matchFill(hex, colorCandidates)` → exact-hex variable match(es), semantic preferred, alternates surfaced. | types, color |
| `src/lib/figma-read.ts` | `collectTextNodes(figma, scope)` (selection / page / all pages, `loadAllPagesAsync` for all); `loadStyleCandidates(figma)`; `loadColorCandidates(figma)`. | — |
| `src/lib/apply.ts` | `applyDecisions(figma, decisions)`: dedupe + `loadFontAsync`, `setTextStyleIdAsync`, color bind via `setBoundVariableForPaint`; per-node try/catch; idempotent (already-linked → skipped). | — |
| `src/lib/scan.ts` | Orchestrator: collect → read → match → assemble `ScanReport` (grouped, counted). | text-props, match, color-match, figma-read |
| `src/code.ts` | Message handler: `scan` → `buildReport`; `apply` → `applyDecisions`; `focus` → select+zoom a node. | scan, apply |
| `src/ui.html` | Branded review panel (Acrivault greens, Georgia). | — |

## 5. Matching engine

### 5.1 Normalized text properties

`TextProps = { family: string; style: string; size: number; lineHeightPx: number | 'auto'; letterSpacingPx: number; textCase: TextCase; mixed: boolean }`

- `family` = `fontName.family`; `style` = `fontName.style` (e.g. `"Semi Bold"`). Both node and candidate come from Figma, so **style strings compare directly** — no weight-number → name mapping.
- `lineHeightPx`: `AUTO` → `'auto'`; `PIXELS` → value; `PERCENT` → `value/100 * size`.
- `letterSpacingPx`: `PIXELS` → value; `PERCENT` → `value/100 * size`.
- If any of `fontName` / `fontSize` / `lineHeight` / `letterSpacing` / `textCase` is `figma.mixed`, set `mixed = true` (typography match skipped).

### 5.2 Scoring (lower is better; used for ranking + tie-break)

```
if node.family !== style.family        → score = Infinity   (hard gate: never match)
relSize = |node.size - style.size| / style.size
relLh   = (both numeric) |Δ| / node.size ; auto==auto → 0 ; auto vs numeric → 1
relLs   = |Δ| / max(node.size, 1)
score = 1.0*relSize + 0.5*(style eq ? 0:1) + 0.3*(case eq ?0:1) + 0.1*relLh + 0.05*relLs
```

### 5.3 Confidence tiers (explicit rules, independent of the raw score)

Evaluated **top-down; the first satisfied tier wins** (so the High rule is only reached when Exact fails, etc.).

| Tier | Rule |
|------|------|
| **Exact** | family eq ∧ style eq ∧ \|Δsize\|≤0.5px ∧ lineHeight eq (≤0.5px or both auto) ∧ \|Δls\|≤0.1px ∧ textCase eq |
| **High** | family eq ∧ style eq ∧ \|Δsize\|≤0.5px (lh/ls/case may differ) |
| **Medium** | family eq ∧ style eq ∧ relSize ≤ 3% |
| **Low** | family eq ∧ relSize ≤ 8% (style may differ) |
| **No match** | otherwise (left untouched) |

Tolerances are named constants (`SIZE_EPS_PX=0.5`, `LS_EPS_PX=0.1`, `MEDIUM_REL=0.03`, `LOW_REL=0.08`) with these defaults.

### 5.4 Result & tie-break

`matchText` returns the lowest-score candidate as `best`, up to 3 next-best (same family) as `alternates`, plus the confidence tier. On a **score tie**, prefer a **role** style (name not starting with `Scale/`) over a `Scale/*` style; then alphabetical. The chosen tie loser appears in `alternates`.

## 6. Color binding (opt-in)

For a node whose fill is a **single SOLID paint at opacity 1** and not already variable-bound: resolve its hex and match (exact) against local **COLOR** variables' mode values (dark **or** light). Binding is mode-independent — the bound fill auto-swaps with the consuming frame's mode. If several variables share the hex, prefer the **Semantic** collection and surface the rest as alternates. Multi-paint / non-solid / partial-opacity fills → no color proposal (reported). Applied via `figma.variables.setBoundVariableForPaint`.

## 7. Review & apply flow

1. **Scan**: user picks scope (Selection / Current page / All pages) + color toggle.
2. Plugin gathers → matches → returns `ScanReport` grouped with counts, e.g. `Exact 40 · High 12 · Medium 7 · Low 3 · No match 5 · Skipped 2`.
3. **Review panel**: each row shows node name, current size/weight → proposed style + confidence badge, an override dropdown (any local style, or "Don't link"), and a color-variable line when the toggle is on. Clicking a row posts `focus` → select + zoom to that node. Exact+High pre-checked; Medium+Low unchecked.
4. **Apply selected**: dedupe + `loadFontAsync` for target styles, `setTextStyleIdAsync` per node, bind color vars if toggled, return `ApplySummary { applied, skipped, errors, notes[] }`.
5. **Idempotent**: a node already bound to the target style → reported "already linked," skipped. Re-running never double-applies.

## 8. Edge cases (reported, never fatal)

- **Mixed-property** text → skipped for typography (reason surfaced); color still allowed if fill uniform.
- **Font not installed** → per-node `loadFontAsync` catch → skipped with reason.
- **Inside a component instance / locked** → skipped with reason.
- **Empty / zero-length** text → skipped.
- **No local text styles** → hard stop with "Run Acrivault DC first."
- **All-pages** scope → `figma.loadAllPagesAsync()` first.
- Per-node try/catch isolation — one failure never aborts the batch.

## 9. Testing (TDD, mirrors Acrivault DC)

- **match.ts**: exact; 1px line-height drift → High; 3% size → Medium; 8%+ → No match; family mismatch → Infinity/disqualified; role-vs-`Scale` tie-break; `Label/Eyebrow` uppercase via textCase.
- **text-props.ts**: PIXELS/PERCENT/AUTO line-height + letter-spacing normalization; mixed → sentinel.
- **color-match.ts**: exact hex → variable; ambiguous → alternates (semantic preferred); no-match → null.
- **FakeFigma** (extended): text nodes with `fontName`/`fontSize`/`lineHeight`/`letterSpacing`/`textCase`/`fills`; `getLocalTextStylesAsync`; `setTextStyleIdAsync`; `loadFontAsync` (rejects family `"Missing"`); `setBoundVariableForPaint`; pages + selection; `loadAllPagesAsync`.
- **apply.ts**: applies accepted only; idempotent re-run; font-missing skip; error isolation.
- **scan.ts**: report shape, grouping/counts, scope handling, "no styles" guard.

## 10. Real-API items to verify in a live Figma file

(Unit tests use the fake; these behaviors only a live doc confirms.)

1. `setTextStyleIdAsync` requires the style's font loaded first; behavior on instance/locked nodes.
2. `lineHeight` / `letterSpacing` unit-object shapes match assumptions (`AUTO`/`PIXELS`/`PERCENT`).
3. `figma.variables.setBoundVariableForPaint(paint, 'color', variable)` signature + reassigning `node.fills`.
4. `figma.mixed` detection per property.
5. `loadAllPagesAsync` + cross-page select/zoom (`setCurrentPageAsync` before selecting off-page nodes).

## 11. Branding

Manifest name **Link Text Styles**. UI panel uses the Acrivault palette (`#2C8A6E` primary, `#3FA888` accent, `#0A1F1C` dark, `#5A6F69` muted, `#F4F8F6` bg tint) and a Georgia-family stack, matching the Acrivault DC panel.
