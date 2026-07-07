# Link Text Styles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Figma plugin that scans text nodes, matches each to the nearest existing local text style (and optionally binds its fill to a matching semantic color variable), and applies changes only after user review.

**Architecture:** Pure, unit-tested matching engine (`text-props` → `match`/`color-match`) fed by thin Figma-API adapters (`figma-read`, `apply`) behind dependency-injected structural interfaces, orchestrated by `scan.ts`, driven by a branded review UI (`ui.html`) via a small message protocol in `code.ts`. Mirrors the Acrivault DC plugin's conventions (esbuild bundle, Vitest + in-memory `FakeFigma`, TS strict). Nothing mutates the document until the user clicks Apply.

**Tech Stack:** TypeScript (strict), esbuild, Vitest, `@figma/plugin-typings`, Figma Plugin API (Variables + Styles + Scene).

**Spec:** `docs/superpowers/specs/2026-07-02-link-text-styles-design.md`

**Working directory:** all paths below are relative to `link-text-styles/` (a new folder beside `figma-plugin/`), unless noted. Commands run from inside `link-text-styles/`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json`, `tsconfig.json`, `vitest.config.ts`, `build.mjs`, `manifest.json`, `.gitignore` | Scaffold / build / test config. |
| `src/types.ts` | All shared types + `DEFAULT_TOLERANCES`. No logic. |
| `src/lib/color.ts` | Copied color math (hex/rgba/mix/toHex). Pure. |
| `src/lib/text-props.ts` | Read + normalize a text node's typographic props; detect `figma.mixed`. Pure. |
| `src/lib/match.ts` | Weighted scoring, confidence tiers, tie-break. Pure. |
| `src/lib/color-match.ts` | Exact-hex fill → color variable, semantic preferred. Pure. |
| `src/lib/figma-read.ts` | Collect text nodes by scope; load style + color candidates (resolves variable aliases to hex). |
| `src/lib/apply.ts` | Apply accepted decisions: load fonts, `setTextStyleIdAsync`, bind color; idempotent, error-isolated. |
| `src/lib/scan.ts` | Orchestrator: collect → read → match → `ScanReport`. |
| `src/code.ts` | Plugin entry + message protocol (`scan`/`apply`/`focus`); retains last scan for font lookup. |
| `src/ui.html` | Branded review panel. |
| `test/fake-figma.ts` | In-memory Figma harness (text nodes, pages, styles, variables). |
| `test/*.test.ts` | One test file per `src/lib` module. |

---

## Task 1: Scaffold the plugin

**Files:**
- Create: `link-text-styles/package.json`, `tsconfig.json`, `vitest.config.ts`, `build.mjs`, `manifest.json`, `.gitignore`

- [ ] **Step 1: Create the folder and config files**

`package.json`:
```json
{
  "name": "acrivault-link-text-styles",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node build.mjs",
    "watch": "node build.mjs --watch",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@figma/plugin-typings": "^1.100.0",
    "esbuild": "^0.24.0",
    "typescript": "^5.9.0",
    "vitest": "^3.0.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "typeRoots": ["./node_modules/@types", "./node_modules/@figma"],
    "resolveJsonModule": true
  },
  "include": ["src", "test"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['test/**/*.test.ts'] } });
```

`build.mjs` (no model-generation step — this plugin reads live from Figma):
```js
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
const ctx = { entryPoints: ['src/code.ts'], bundle: true, outfile: 'dist/code.js', target: 'es2020', format: 'iife' };
const inlineUi = () => writeFileSync('dist/ui.html', readFileSync('src/ui.html', 'utf8'));

if (process.argv.includes('--watch')) {
  const c = await esbuild.context(ctx); await c.watch(); inlineUi();
  console.log('watching…');
} else { await esbuild.build(ctx); inlineUi(); console.log('built dist/'); }
```

`manifest.json`:
```json
{
  "name": "Link Text Styles",
  "id": "acrivault-link-text-styles",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "editorType": ["figma"],
  "documentAccess": "dynamic-page",
  "networkAccess": { "allowedDomains": ["none"] }
}
```

`.gitignore`:
```
node_modules/
dist/
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: creates `node_modules/` and `package-lock.json`, no errors.

- [ ] **Step 3: Initialize git and commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Link Text Styles plugin"
```
Expected: one commit created. (This folder is its own repo, like `figma-plugin/`.)

---

## Task 2: Shared types

**Files:**
- Create: `src/types.ts`
- Test: `test/types.test.ts`

- [ ] **Step 1: Write the failing test**

`test/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_TOLERANCES } from '../src/types';

describe('DEFAULT_TOLERANCES', () => {
  it('has the spec default thresholds', () => {
    expect(DEFAULT_TOLERANCES.sizeEpsPx).toBe(0.5);
    expect(DEFAULT_TOLERANCES.lsEpsPx).toBe(0.1);
    expect(DEFAULT_TOLERANCES.mediumRel).toBe(0.03);
    expect(DEFAULT_TOLERANCES.lowRel).toBe(0.08);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/types.test.ts`
Expected: FAIL — cannot find module `../src/types`.

- [ ] **Step 3: Write `src/types.ts`**

```ts
/** Confidence tiers, best→worst. 'none' means "no match, leave untouched". */
export type Confidence = 'exact' | 'high' | 'medium' | 'low' | 'none';

/** Normalized line-height: pixels, or 'auto' for Figma AUTO. */
export type LineHeight = number | 'auto';

/** Typographic properties read off a text node or a text style. */
export interface TextProps {
  family: string;
  style: string; // Figma style name, e.g. "Regular", "Semi Bold"
  size: number; // px
  lineHeightPx: LineHeight;
  letterSpacingPx: number;
  textCase: string; // 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | ...
  mixed: boolean; // true if any source prop was figma.mixed
}

export interface StyleCandidate {
  id: string;
  name: string;
  font: { family: string; style: string };
  props: TextProps; // mixed always false
}

export interface ColorCandidate {
  id: string;
  name: string;
  collectionName: string;
  hexes: string[]; // opaque lowercase hexes this variable can resolve to
}

export interface Match {
  styleId: string;
  styleName: string;
  confidence: Confidence;
  score: number;
}

export interface ColorMatch {
  variableId: string;
  variableName: string;
  alternates: Array<{ variableId: string; variableName: string }>;
}

export interface MatchResult {
  nodeId: string;
  nodeName: string;
  current: TextProps;
  best: Match | null; // null = no typography match
  alternates: Match[];
  color?: ColorMatch | null; // present only when color scan requested
  skipped?: { reason: string };
}

export interface Tolerances {
  sizeEpsPx: number;
  lsEpsPx: number;
  mediumRel: number;
  lowRel: number;
}

export const DEFAULT_TOLERANCES: Tolerances = {
  sizeEpsPx: 0.5,
  lsEpsPx: 0.1,
  mediumRel: 0.03,
  lowRel: 0.08,
};

export type Scope = 'selection' | 'page' | 'all';

export interface Counts {
  exact: number;
  high: number;
  medium: number;
  low: number;
  none: number;
  skipped: number;
}

export interface ScanReport {
  results: MatchResult[];
  counts: Counts;
  styleCount: number;
}

export interface ApplyDecision {
  nodeId: string;
  nodeName: string;
  styleId?: string; // omit = don't change typography
  styleFont?: { family: string; style: string }; // required alongside styleId (to load the font)
  colorVariableId?: string; // omit = don't bind color
}

export interface ApplySummary {
  applied: number;
  skipped: number;
  errors: number;
  notes: string[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/types.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types.ts test/types.test.ts
git commit -m "feat: shared types + default tolerances"
```

---

## Task 3: Copy color math

**Files:**
- Create: `src/lib/color.ts`
- Test: `test/color.test.ts`

- [ ] **Step 1: Write the failing test**

`test/color.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { toHex, parseHex } from '../src/lib/color';

describe('color', () => {
  it('round-trips a hex through parseHex/toHex', () => {
    expect(toHex(parseHex('#2C8A6E'))).toBe('#2c8a6e');
  });
  it('parses 3-digit hex', () => {
    expect(toHex(parseHex('#fff'))).toBe('#ffffff');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/color.test.ts`
Expected: FAIL — cannot find module `../src/lib/color`.

- [ ] **Step 3: Create `src/lib/color.ts`**

Copy the exact contents of `figma-plugin/src/lib/color.ts` (paste in full):
```ts
/**
 * Pure color math. Mirrors the CSS resolution used by the app's tokens.css
 * (color-mix in srgb with premultiplied alpha). No deps, no Figma APIs.
 */
export interface RGBA {
  r: number; // 0..1
  g: number;
  b: number;
  a: number;
}

export function parseHex(hex: string): RGBA {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
    a: 1,
  };
}

export function parseRgba(str: string): RGBA {
  const m = str.match(/rgba?\(([^)]+)\)/i);
  if (!m) throw new Error('not an rgb(a) color: ' + str);
  const p = m[1].split(',').map((s) => s.trim());
  return { r: +p[0] / 255, g: +p[1] / 255, b: +p[2] / 255, a: p[3] === undefined ? 1 : +p[3] };
}

export const TRANSPARENT: RGBA = { r: 0, g: 0, b: 0, a: 0 };

/** CSS `color-mix(in srgb, A pct%, B)` with premultiplied alpha. */
export function mix(A: RGBA, pct: number, B: RGBA): RGBA {
  const pa = pct / 100;
  const pb = 1 - pa;
  const a = A.a * pa + B.a * pb;
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const pre = (ca: number, cb: number) => ca * A.a * pa + cb * B.a * pb;
  return { r: pre(A.r, B.r) / a, g: pre(A.g, B.g) / a, b: pre(A.b, B.b) / a, a };
}

export function toHex(c: RGBA): string {
  const h = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return ('#' + h(c.r) + h(c.g) + h(c.b)).toLowerCase();
}

export function colorStr(c: RGBA): string {
  if (c.a >= 1) return toHex(c);
  const ch = (x: number) => Math.round(x * 255);
  return `rgba(${ch(c.r)}, ${ch(c.g)}, ${ch(c.b)}, ${+c.a.toFixed(4)})`;
}

export function resolveColor(expr: string, map: Record<string, string>): RGBA {
  expr = expr.trim();
  if (expr.startsWith('var(')) {
    const name = expr.slice(4, -1).trim().replace(/^--/, '');
    if (!(name in map)) throw new Error('unresolved var(--' + name + ')');
    return resolveColor(map[name], map);
  }
  if (expr.startsWith('#')) return parseHex(expr);
  if (expr.startsWith('rgb')) return parseRgba(expr);
  if (expr === 'white') return parseHex('#ffffff');
  if (expr === 'black') return parseHex('#000000');
  if (expr === 'transparent') return TRANSPARENT;
  if (expr.startsWith('color-mix')) {
    const inner = expr.slice(expr.indexOf('(') + 1, expr.lastIndexOf(')'));
    const parts = inner.split(',').map((s) => s.trim());
    const aPart = parts[1];
    const bPart = parts[2];
    const pctMatch = aPart.match(/(-?[\d.]+)%/);
    const pct = pctMatch ? +pctMatch[1] : 50;
    const aColor = aPart.replace(/\s*-?[\d.]+%/, '').trim();
    const bColor = bPart.replace(/\s*-?[\d.]+%/, '').trim();
    return mix(resolveColor(aColor, map), pct, resolveColor(bColor, map));
  }
  throw new Error('cannot resolve color: ' + expr);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/color.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/color.ts test/color.test.ts
git commit -m "feat: copy color math from acrivault-dc"
```

---

## Task 4: Read + normalize text props

**Files:**
- Create: `src/lib/text-props.ts`
- Test: `test/text-props.test.ts`

- [ ] **Step 1: Write the failing test**

`test/text-props.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { readTextProps, normalizeLineHeight, normalizeLetterSpacing, isMixed } from '../src/lib/text-props';

const MIXED = Symbol('mixed'); // stands in for figma.mixed

describe('normalizeLineHeight', () => {
  it('AUTO -> "auto"', () => expect(normalizeLineHeight({ unit: 'AUTO' }, 16)).toBe('auto'));
  it('PIXELS -> value', () => expect(normalizeLineHeight({ unit: 'PIXELS', value: 20 }, 16)).toBe(20));
  it('PERCENT -> value% of size', () => expect(normalizeLineHeight({ unit: 'PERCENT', value: 150 }, 16)).toBe(24));
});

describe('normalizeLetterSpacing', () => {
  it('PIXELS -> value', () => expect(normalizeLetterSpacing({ unit: 'PIXELS', value: 0.5 }, 16)).toBe(0.5));
  it('PERCENT -> value% of size', () => expect(normalizeLetterSpacing({ unit: 'PERCENT', value: -2 }, 100)).toBe(-2));
});

describe('isMixed', () => {
  it('true for a symbol', () => expect(isMixed(MIXED)).toBe(true));
  it('false for an object', () => expect(isMixed({ family: 'Inter' })).toBe(false));
});

describe('readTextProps', () => {
  it('reads a uniform node', () => {
    const node = {
      fontName: { family: 'Inter', style: 'Semi Bold' },
      fontSize: 24,
      lineHeight: { unit: 'PIXELS', value: 32 },
      letterSpacing: { unit: 'PERCENT', value: -2 },
      textCase: 'ORIGINAL',
      characters: 'Hello',
    };
    expect(readTextProps(node)).toEqual({
      family: 'Inter', style: 'Semi Bold', size: 24,
      lineHeightPx: 32, letterSpacingPx: -0.48, textCase: 'ORIGINAL', mixed: false,
    });
  });
  it('flags mixed when any prop is a symbol', () => {
    const node = {
      fontName: MIXED, fontSize: 24,
      lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PIXELS', value: 0 },
      textCase: 'ORIGINAL', characters: 'x',
    };
    expect(readTextProps(node).mixed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/text-props.test.ts`
Expected: FAIL — cannot find module `../src/lib/text-props`.

- [ ] **Step 3: Write `src/lib/text-props.ts`**

```ts
import type { TextProps, LineHeight } from '../types';

/** figma.mixed is a unique symbol; any per-range-varying prop reads as one. */
export function isMixed(v: unknown): boolean {
  return typeof v === 'symbol';
}

type LH = { unit: 'AUTO' } | { unit: 'PIXELS' | 'PERCENT'; value: number };
type LS = { unit: 'PIXELS' | 'PERCENT'; value: number };

export function normalizeLineHeight(lh: LH, size: number): LineHeight {
  if (lh.unit === 'AUTO') return 'auto';
  if (lh.unit === 'PERCENT') return (lh.value / 100) * size;
  return lh.value;
}

export function normalizeLetterSpacing(ls: LS, size: number): number {
  if (ls.unit === 'PERCENT') return (ls.value / 100) * size;
  return ls.value;
}

/** Structural shape of the parts of a TextNode we read. Real figma.mixed
 *  values (symbols) are tolerated on any field. */
export interface TextNodeLike {
  fontName: unknown;
  fontSize: unknown;
  lineHeight: unknown;
  letterSpacing: unknown;
  textCase?: unknown;
  characters?: string;
}

export function readTextProps(node: TextNodeLike): TextProps {
  const mixed =
    isMixed(node.fontName) || isMixed(node.fontSize) ||
    isMixed(node.lineHeight) || isMixed(node.letterSpacing) || isMixed(node.textCase);
  if (mixed) {
    return { family: '', style: '', size: 0, lineHeightPx: 'auto', letterSpacingPx: 0, textCase: 'ORIGINAL', mixed: true };
  }
  const fontName = node.fontName as { family: string; style: string };
  const size = node.fontSize as number;
  return {
    family: fontName.family,
    style: fontName.style,
    size,
    lineHeightPx: normalizeLineHeight(node.lineHeight as LH, size),
    letterSpacingPx: normalizeLetterSpacing(node.letterSpacing as LS, size),
    textCase: (node.textCase as string) ?? 'ORIGINAL',
    mixed: false,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/text-props.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/text-props.ts test/text-props.test.ts
git commit -m "feat: read + normalize text node props"
```

---

## Task 5: Matching engine

**Files:**
- Create: `src/lib/match.ts`
- Test: `test/match.test.ts`

- [ ] **Step 1: Write the failing test**

`test/match.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { scoreStyle, classify, matchText } from '../src/lib/match';
import { DEFAULT_TOLERANCES } from '../src/types';
import type { StyleCandidate, TextProps } from '../src/types';

const props = (o: Partial<TextProps>): TextProps => ({
  family: 'Inter', style: 'Regular', size: 16, lineHeightPx: 24, letterSpacingPx: 0, textCase: 'ORIGINAL', mixed: false, ...o,
});
const cand = (id: string, name: string, p: Partial<TextProps>): StyleCandidate => ({
  id, name, font: { family: p.family ?? 'Inter', style: p.style ?? 'Regular' }, props: props(p),
});

describe('scoreStyle', () => {
  it('is 0 for an identical style', () => {
    expect(scoreStyle(props({}), props({}))).toBe(0);
  });
  it('is Infinity for a different family (hard gate)', () => {
    expect(scoreStyle(props({ family: 'Inter' }), props({ family: 'JetBrains Mono' }))).toBe(Infinity);
  });
  it('penalizes size difference', () => {
    expect(scoreStyle(props({ size: 18 }), props({ size: 16 }))).toBeGreaterThan(0);
  });
});

describe('classify', () => {
  const tol = DEFAULT_TOLERANCES;
  it('exact when everything matches', () => {
    expect(classify(props({}), props({}), tol)).toBe('exact');
  });
  it('high when only line-height drifts 1px', () => {
    expect(classify(props({ lineHeightPx: 25 }), props({ lineHeightPx: 24 }), tol)).toBe('high');
  });
  it('medium when size is within 3% and style matches', () => {
    expect(classify(props({ size: 16.4 }), props({ size: 16 }), tol)).toBe('medium');
  });
  it('low when size within 8% but style differs', () => {
    expect(classify(props({ size: 17, style: 'Medium' }), props({ size: 16, style: 'Regular' }), tol)).toBe('low');
  });
  it('none when size is way off', () => {
    expect(classify(props({ size: 40 }), props({ size: 16 }), tol)).toBe('none');
  });
});

describe('matchText', () => {
  it('picks the exact candidate', () => {
    const cands = [cand('a', 'Body/Regular', {}), cand('b', 'Heading/1', { size: 24, style: 'Semi Bold' })];
    const r = matchText(props({}), cands);
    expect(r.best?.styleId).toBe('a');
    expect(r.best?.confidence).toBe('exact');
  });
  it('never matches across font families', () => {
    const cands = [cand('m', 'Code', { family: 'JetBrains Mono' })];
    expect(matchText(props({ family: 'Inter' }), cands).best).toBeNull();
  });
  it('prefers a role style over a Scale/* style on a tie', () => {
    const cands = [cand('scale', 'Scale/Text-MD', {}), cand('role', 'Body/Regular', {})];
    const r = matchText(props({}), cands);
    expect(r.best?.styleId).toBe('role');
    expect(r.alternates[0]?.styleId).toBe('scale');
  });
  it('distinguishes an uppercase Eyebrow via textCase', () => {
    const cands = [
      cand('micro', 'Label/Micro', { size: 12, style: 'Medium', textCase: 'ORIGINAL' }),
      cand('eye', 'Label/Eyebrow', { size: 12, style: 'Semi Bold', textCase: 'UPPER' }),
    ];
    const r = matchText(props({ size: 12, style: 'Semi Bold', textCase: 'UPPER' }), cands);
    expect(r.best?.styleId).toBe('eye');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/match.test.ts`
Expected: FAIL — cannot find module `../src/lib/match`.

- [ ] **Step 3: Write `src/lib/match.ts`**

```ts
import type { TextProps, StyleCandidate, Confidence, Match, Tolerances, LineHeight } from '../types';
import { DEFAULT_TOLERANCES } from '../types';

/** Role styles (anything not under Scale/) win ties over Scale/* styles. */
export const isRole = (name: string): boolean => !name.startsWith('Scale/');

function lhRel(a: LineHeight, b: LineHeight, size: number): number {
  if (a === 'auto' && b === 'auto') return 0;
  if (a === 'auto' || b === 'auto') return 1;
  return Math.abs(a - b) / Math.max(size, 1);
}

function lhEqual(a: LineHeight, b: LineHeight, eps: number): boolean {
  if (a === 'auto' && b === 'auto') return true;
  if (a === 'auto' || b === 'auto') return false;
  return Math.abs(a - b) <= eps;
}

/** Weighted distance; lower is better. Infinity => never match (family gate). */
export function scoreStyle(node: TextProps, style: TextProps): number {
  if (node.family !== style.family) return Infinity;
  const relSize = Math.abs(node.size - style.size) / (style.size || 1);
  const styleEq = node.style === style.style ? 0 : 1;
  const caseEq = node.textCase === style.textCase ? 0 : 1;
  const relLh = lhRel(node.lineHeightPx, style.lineHeightPx, node.size);
  const relLs = Math.abs(node.letterSpacingPx - style.letterSpacingPx) / Math.max(node.size, 1);
  return 1.0 * relSize + 0.5 * styleEq + 0.3 * caseEq + 0.1 * relLh + 0.05 * relLs;
}

/** Confidence tier, evaluated top-down; first satisfied wins. */
export function classify(node: TextProps, style: TextProps, tol: Tolerances): Confidence {
  if (node.family !== style.family) return 'none';
  const dSize = Math.abs(node.size - style.size);
  const relSize = dSize / (style.size || 1);
  const styleEq = node.style === style.style;
  const sizeExact = dSize <= tol.sizeEpsPx;
  const lhOk = lhEqual(node.lineHeightPx, style.lineHeightPx, tol.sizeEpsPx);
  const lsOk = Math.abs(node.letterSpacingPx - style.letterSpacingPx) <= tol.lsEpsPx;
  const caseEq = node.textCase === style.textCase;
  if (styleEq && sizeExact && lhOk && lsOk && caseEq) return 'exact';
  if (styleEq && sizeExact) return 'high';
  if (styleEq && relSize <= tol.mediumRel) return 'medium';
  if (relSize <= tol.lowRel) return 'low';
  return 'none';
}

/** Best candidate + up to 3 alternates. best is null when the top match is 'none'. */
export function matchText(
  node: TextProps,
  candidates: StyleCandidate[],
  tol: Tolerances = DEFAULT_TOLERANCES,
): { best: Match | null; alternates: Match[] } {
  const scored = candidates
    .map((c) => ({ c, score: scoreStyle(node, c.props) }))
    .filter((x) => Number.isFinite(x.score))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      const ar = isRole(a.c.name), br = isRole(b.c.name);
      if (ar !== br) return ar ? -1 : 1;
      return a.c.name.localeCompare(b.c.name);
    });
  if (scored.length === 0) return { best: null, alternates: [] };
  const toMatch = (x: { c: StyleCandidate; score: number }): Match => ({
    styleId: x.c.id, styleName: x.c.name, confidence: classify(node, x.c.props, tol), score: x.score,
  });
  const top = toMatch(scored[0]);
  if (top.confidence === 'none') return { best: null, alternates: [] };
  return { best: top, alternates: scored.slice(1, 4).map(toMatch) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/match.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/match.ts test/match.test.ts
git commit -m "feat: weighted matching engine with confidence tiers + tie-break"
```

---

## Task 6: Color matching

**Files:**
- Create: `src/lib/color-match.ts`
- Test: `test/color-match.test.ts`

- [ ] **Step 1: Write the failing test**

`test/color-match.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { matchFill } from '../src/lib/color-match';
import type { ColorCandidate } from '../src/types';

const c = (id: string, name: string, collectionName: string, hexes: string[]): ColorCandidate =>
  ({ id, name, collectionName, hexes });

describe('matchFill', () => {
  it('returns null when no variable has the hex', () => {
    expect(matchFill('#123456', [c('1', 'Text/Primary', 'Semantic', ['#fafafa'])])).toBeNull();
  });
  it('matches by exact hex (case-insensitive)', () => {
    const m = matchFill('#FAFAFA', [c('1', 'Text/Primary', 'Semantic', ['#fafafa'])]);
    expect(m?.variableId).toBe('1');
    expect(m?.alternates).toEqual([]);
  });
  it('prefers a Semantic variable over a Primitive on a tie, surfacing the rest', () => {
    const m = matchFill('#fafafa', [
      c('p', 'Color/Neutral/50', 'Primitives', ['#fafafa']),
      c('s', 'Text/Primary', 'Semantic', ['#fafafa']),
    ]);
    expect(m?.variableId).toBe('s');
    expect(m?.alternates.map((a) => a.variableId)).toEqual(['p']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/color-match.test.ts`
Expected: FAIL — cannot find module `../src/lib/color-match`.

- [ ] **Step 3: Write `src/lib/color-match.ts`**

```ts
import type { ColorCandidate, ColorMatch } from '../types';

/** Exact-hex match of a fill to a color variable. Semantic collection preferred;
 *  remaining matches surfaced as alternates. Returns null when nothing matches. */
export function matchFill(hex: string, candidates: ColorCandidate[]): ColorMatch | null {
  const h = hex.toLowerCase();
  const hits = candidates.filter((cand) => cand.hexes.includes(h));
  if (hits.length === 0) return null;
  const ranked = hits.slice().sort((a, b) => {
    const as = a.collectionName === 'Semantic' ? 0 : 1;
    const bs = b.collectionName === 'Semantic' ? 0 : 1;
    if (as !== bs) return as - bs;
    return a.name.localeCompare(b.name);
  });
  const [first, ...rest] = ranked;
  return {
    variableId: first.id,
    variableName: first.name,
    alternates: rest.map((r) => ({ variableId: r.id, variableName: r.name })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/color-match.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/color-match.ts test/color-match.test.ts
git commit -m "feat: exact-hex color fill matching, semantic preferred"
```

---

## Task 7: In-memory Figma harness

**Files:**
- Create: `test/fake-figma.ts`

This is test infrastructure used by Tasks 8–10. It has no test of its own; Task 8's failing test exercises it first.

- [ ] **Step 1: Write `test/fake-figma.ts`**

```ts
/**
 * In-memory fake of the Figma subset used by figma-read.ts / apply.ts / scan.ts.
 * Deterministic ids via counters (never Date.now()/Math.random()). Real
 * figma.mixed is a symbol; tests pass MIXED where they want a mixed prop.
 */
export const MIXED = Symbol('figma.mixed');

export type Unit = 'AUTO' | 'PIXELS' | 'PERCENT';
export interface FakePaint {
  type: string; // 'SOLID' | ...
  color?: { r: number; g: number; b: number };
  opacity?: number;
  visible?: boolean;
  boundVariables?: Record<string, { type: 'VARIABLE_ALIAS'; id: string }>;
}

export interface FakeTextInit {
  id: string;
  name: string;
  fontName?: unknown;
  fontSize?: unknown;
  lineHeight?: unknown;
  letterSpacing?: unknown;
  textCase?: unknown;
  characters?: string;
  fills?: FakePaint[];
  textStyleId?: string;
  locked?: boolean;
}

export class FakeText {
  type = 'TEXT' as const;
  id: string; name: string;
  fontName: unknown; fontSize: unknown; lineHeight: unknown; letterSpacing: unknown;
  textCase: unknown; characters: string; fills: FakePaint[]; textStyleId: string; locked: boolean;
  appliedStyleId: string | null = null; // records setTextStyleIdAsync calls

  constructor(init: FakeTextInit) {
    this.id = init.id;
    this.name = init.name;
    this.fontName = init.fontName ?? { family: 'Inter', style: 'Regular' };
    this.fontSize = init.fontSize ?? 16;
    this.lineHeight = init.lineHeight ?? { unit: 'PIXELS', value: 24 };
    this.letterSpacing = init.letterSpacing ?? { unit: 'PERCENT', value: 0 };
    this.textCase = init.textCase ?? 'ORIGINAL';
    this.characters = init.characters ?? 'Text';
    this.fills = init.fills ?? [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    this.textStyleId = init.textStyleId ?? '';
    this.locked = init.locked ?? false;
  }
  async setTextStyleIdAsync(id: string): Promise<void> {
    this.textStyleId = id;
    this.appliedStyleId = id;
  }
}

export class FakePage {
  type = 'PAGE' as const;
  selection: FakeText[] = [];
  constructor(public id: string, public name: string, public children: FakeText[]) {}
  findAllWithCriteria(c: { types: string[] }): FakeText[] {
    return c.types.includes('TEXT') ? this.children.slice() : [];
  }
}

export interface FakeStyleInit {
  id: string; name: string;
  fontName: { family: string; style: string };
  fontSize: number;
  lineHeight: { unit: Unit; value?: number };
  letterSpacing: { unit: 'PIXELS' | 'PERCENT'; value: number };
  textCase?: string;
}

export interface FakeVarInit {
  id: string; name: string; collectionId: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING';
  valuesByMode: Record<string, unknown>;
}

export class FakeFigma {
  root: { children: FakePage[] };
  currentPage: FakePage;
  private allPagesLoaded = false;
  private textStyles: FakeStyleInit[];
  private vars: FakeVarInit[];
  private collections: { id: string; name: string }[];

  constructor(opts: {
    pages: FakePage[];
    textStyles?: FakeStyleInit[];
    variables?: FakeVarInit[];
    collections?: { id: string; name: string }[];
  }) {
    this.root = { children: opts.pages };
    this.currentPage = opts.pages[0];
    this.textStyles = opts.textStyles ?? [];
    this.vars = opts.variables ?? [];
    this.collections = opts.collections ?? [];
  }

  async loadAllPagesAsync(): Promise<void> { this.allPagesLoaded = true; }
  wasAllPagesLoaded(): boolean { return this.allPagesLoaded; }

  async loadFontAsync(fontName: { family: string; style: string }): Promise<void> {
    if (fontName.family === 'Missing') throw new Error(`font not available: ${fontName.family} ${fontName.style}`);
  }

  async getLocalTextStylesAsync(): Promise<FakeStyleInit[]> { return this.textStyles; }

  async getNodeByIdAsync(id: string): Promise<FakeText | null> {
    for (const p of this.root.children) {
      const hit = p.children.find((n) => n.id === id);
      if (hit) return hit;
    }
    return null;
  }

  async setCurrentPageAsync(page: FakePage): Promise<void> { this.currentPage = page; }

  variables = {
    getLocalVariablesAsync: async (): Promise<FakeVarInit[]> => this.vars,
    getLocalVariableCollectionsAsync: async (): Promise<{ id: string; name: string }[]> => this.collections,
    getVariableByIdAsync: async (id: string): Promise<FakeVarInit | null> => this.vars.find((v) => v.id === id) ?? null,
    setBoundVariableForPaint: (paint: FakePaint, field: string, variable: FakeVarInit): FakePaint => ({
      ...paint,
      boundVariables: { ...(paint.boundVariables ?? {}), [field]: { type: 'VARIABLE_ALIAS', id: variable.id } },
    }),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add test/fake-figma.ts
git commit -m "test: in-memory Figma harness (nodes, pages, styles, variables)"
```

---

## Task 8: Figma read adapters

**Files:**
- Create: `src/lib/figma-read.ts`
- Test: `test/figma-read.test.ts`

- [ ] **Step 1: Write the failing test**

`test/figma-read.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { collectTextNodes, loadStyleCandidates, loadColorCandidates, resolveVariableHexes } from '../src/lib/figma-read';
import { FakeFigma, FakePage, FakeText } from './fake-figma';

function makeFigma() {
  const t1 = new FakeText({ id: 't1', name: 'Title' });
  const t2 = new FakeText({ id: 't2', name: 'Body' });
  const p1 = new FakePage('p1', 'Page 1', [t1, t2]);
  const t3 = new FakeText({ id: 't3', name: 'Other' });
  const p2 = new FakePage('p2', 'Page 2', [t3]);
  return new FakeFigma({
    pages: [p1, p2],
    textStyles: [{
      id: 's1', name: 'Body/Regular', fontName: { family: 'Inter', style: 'Regular' },
      fontSize: 16, lineHeight: { unit: 'PIXELS', value: 24 }, letterSpacing: { unit: 'PERCENT', value: 0 },
    }],
    collections: [{ id: 'cP', name: 'Primitives' }, { id: 'cS', name: 'Semantic' }],
    variables: [
      { id: 'vN50', name: 'Color/Neutral/50', collectionId: 'cP', resolvedType: 'COLOR',
        valuesByMode: { m1: { r: 250 / 255, g: 250 / 255, b: 250 / 255, a: 1 } } },
      { id: 'vText', name: 'Text/Primary', collectionId: 'cS', resolvedType: 'COLOR',
        valuesByMode: { dark: { type: 'VARIABLE_ALIAS', id: 'vN50' }, light: { r: 0.1, g: 0.1, b: 0.1, a: 1 } } },
      { id: 'vSpace', name: 'Space/1', collectionId: 'cP', resolvedType: 'FLOAT', valuesByMode: { m1: 4 } },
    ],
  });
}

describe('collectTextNodes', () => {
  it('page scope returns current-page text nodes', async () => {
    const f = makeFigma();
    const nodes = await collectTextNodes(f as any, 'page');
    expect(nodes.map((n) => n.id)).toEqual(['t1', 't2']);
  });
  it('all scope loads all pages and returns every text node', async () => {
    const f = makeFigma();
    const nodes = await collectTextNodes(f as any, 'all');
    expect(f.wasAllPagesLoaded()).toBe(true);
    expect(nodes.map((n) => n.id).sort()).toEqual(['t1', 't2', 't3']);
  });
  it('selection scope returns selected text nodes', async () => {
    const f = makeFigma();
    f.currentPage.selection = [f.currentPage.children[1]];
    const nodes = await collectTextNodes(f as any, 'selection');
    expect(nodes.map((n) => n.id)).toEqual(['t2']);
  });
});

describe('loadStyleCandidates', () => {
  it('maps local text styles to candidates with normalized props', async () => {
    const cands = await loadStyleCandidates(makeFigma() as any);
    expect(cands).toHaveLength(1);
    expect(cands[0]).toMatchObject({
      id: 's1', name: 'Body/Regular', font: { family: 'Inter', style: 'Regular' },
    });
    expect(cands[0].props.size).toBe(16);
    expect(cands[0].props.lineHeightPx).toBe(24);
  });
});

describe('resolveVariableHexes', () => {
  it('follows aliases and keeps opaque hexes', () => {
    const f = makeFigma();
    const byId = new Map((f as any).vars.map((v: any) => [v.id, v]));
    const textVar = byId.get('vText');
    expect(resolveVariableHexes(textVar, byId as any).sort()).toEqual(['#1a1a1a', '#fafafa']);
  });
});

describe('loadColorCandidates', () => {
  it('returns only COLOR variables with resolved hexes + collection name', async () => {
    const cands = await loadColorCandidates(makeFigma() as any);
    const names = cands.map((c) => c.name).sort();
    expect(names).toEqual(['Color/Neutral/50', 'Text/Primary']);
    const text = cands.find((c) => c.name === 'Text/Primary')!;
    expect(text.collectionName).toBe('Semantic');
    expect(text.hexes.sort()).toEqual(['#1a1a1a', '#fafafa']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/figma-read.test.ts`
Expected: FAIL — cannot find module `../src/lib/figma-read`.

- [ ] **Step 3: Write `src/lib/figma-read.ts`**

```ts
import { toHex, type RGBA } from './color';
import { normalizeLineHeight, normalizeLetterSpacing, type TextNodeLike } from './text-props';
import type { Scope, StyleCandidate, ColorCandidate } from '../types';

/* ---- structural Figma surfaces (satisfied by real figma + FakeFigma) ---- */
interface NodeLike extends TextNodeLike { id: string; name: string; type: string; }
interface ContainerLike { findAllWithCriteria(c: { types: string[] }): NodeLike[]; }
interface PageLike extends ContainerLike { selection: readonly NodeLike[]; }
interface StyleLike {
  id: string; name: string;
  fontName: { family: string; style: string };
  fontSize: number;
  lineHeight: { unit: 'AUTO' | 'PIXELS' | 'PERCENT'; value?: number };
  letterSpacing: { unit: 'PIXELS' | 'PERCENT'; value: number };
  textCase?: string;
}
interface VarLike {
  id: string; name: string; variableCollectionId?: string;
  resolvedType: 'COLOR' | 'FLOAT' | 'STRING';
  valuesByMode: Record<string, unknown>;
}
export interface FigmaReadLike {
  currentPage: PageLike;
  root: { children: PageLike[] };
  loadAllPagesAsync(): Promise<void>;
  getLocalTextStylesAsync(): Promise<StyleLike[]>;
  variables: {
    getLocalVariablesAsync(): Promise<VarLike[]>;
    getLocalVariableCollectionsAsync(): Promise<{ id: string; name: string }[]>;
  };
}

/** Gather text nodes for the requested scope. */
export async function collectTextNodes(figma: FigmaReadLike, scope: Scope): Promise<NodeLike[]> {
  if (scope === 'selection') {
    const out: NodeLike[] = [];
    for (const n of figma.currentPage.selection) {
      if (n.type === 'TEXT') out.push(n);
      else if (typeof (n as unknown as ContainerLike).findAllWithCriteria === 'function') {
        out.push(...(n as unknown as ContainerLike).findAllWithCriteria({ types: ['TEXT'] }));
      }
    }
    return out;
  }
  if (scope === 'all') {
    await figma.loadAllPagesAsync();
    const out: NodeLike[] = [];
    for (const p of figma.root.children) out.push(...p.findAllWithCriteria({ types: ['TEXT'] }));
    return out;
  }
  return figma.currentPage.findAllWithCriteria({ types: ['TEXT'] });
}

/** Map local text styles → matcher candidates (normalized props). */
export async function loadStyleCandidates(figma: FigmaReadLike): Promise<StyleCandidate[]> {
  const styles = await figma.getLocalTextStylesAsync();
  return styles.map((s) => ({
    id: s.id,
    name: s.name,
    font: { family: s.fontName.family, style: s.fontName.style },
    props: {
      family: s.fontName.family,
      style: s.fontName.style,
      size: s.fontSize,
      lineHeightPx: normalizeLineHeight(s.lineHeight as never, s.fontSize),
      letterSpacingPx: normalizeLetterSpacing(s.letterSpacing as never, s.fontSize),
      textCase: s.textCase ?? 'ORIGINAL',
      mixed: false,
    },
  }));
}

function asRgba(v: unknown): RGBA | null {
  if (v && typeof v === 'object' && typeof (v as { r?: unknown }).r === 'number') {
    const c = v as { r: number; g: number; b: number; a?: number };
    return { r: c.r, g: c.g, b: c.b, a: c.a ?? 1 };
  }
  return null;
}

/** Resolve one mode value (color or alias) to RGBA, following aliases. */
function resolveValue(v: unknown, byId: Map<string, VarLike>, depth = 0): RGBA | null {
  if (depth > 8) return null;
  if (v && typeof v === 'object' && (v as { type?: string }).type === 'VARIABLE_ALIAS') {
    const target = byId.get((v as { id: string }).id);
    if (!target) return null;
    for (const mv of Object.values(target.valuesByMode)) {
      const r = resolveValue(mv, byId, depth + 1);
      if (r) return r;
    }
    return null;
  }
  return asRgba(v);
}

/** All opaque hexes a COLOR variable can resolve to (across its modes). */
export function resolveVariableHexes(variable: VarLike, byId: Map<string, VarLike>): string[] {
  const out = new Set<string>();
  for (const mv of Object.values(variable.valuesByMode)) {
    const rgba = resolveValue(mv, byId, 0);
    if (rgba && rgba.a >= 1) out.add(toHex(rgba));
  }
  return [...out];
}

/** Map local COLOR variables → color candidates with resolved hexes. */
export async function loadColorCandidates(figma: FigmaReadLike): Promise<ColorCandidate[]> {
  const all = await figma.variables.getLocalVariablesAsync();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const nameByCollection = new Map(collections.map((c) => [c.id, c.name]));
  const byId = new Map(all.map((v) => [v.id, v]));
  const out: ColorCandidate[] = [];
  for (const v of all) {
    if (v.resolvedType !== 'COLOR') continue;
    const hexes = resolveVariableHexes(v, byId);
    if (hexes.length === 0) continue;
    out.push({
      id: v.id, name: v.name,
      collectionName: nameByCollection.get(v.variableCollectionId ?? '') ?? '',
      hexes,
    });
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/figma-read.test.ts`
Expected: PASS. (Note `#1a1a1a` = `0.1*255≈25.5→26→0x1a` for r,g,b.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/figma-read.ts test/figma-read.test.ts
git commit -m "feat: figma read adapters — collect nodes, load style/color candidates"
```

---

## Task 9: Apply decisions

**Files:**
- Create: `src/lib/apply.ts`
- Test: `test/apply.test.ts`

- [ ] **Step 1: Write the failing test**

`test/apply.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { applyDecisions } from '../src/lib/apply';
import { FakeFigma, FakePage, FakeText } from './fake-figma';
import type { ApplyDecision } from '../src/types';

function figmaWith(nodes: FakeText[]) {
  return new FakeFigma({
    pages: [new FakePage('p1', 'Page 1', nodes)],
    variables: [{ id: 'vText', name: 'Text/Primary', collectionId: 'cS', resolvedType: 'COLOR', valuesByMode: { d: { r: 1, g: 1, b: 1, a: 1 } } }],
  });
}

describe('applyDecisions', () => {
  it('applies a text style to the node', async () => {
    const n = new FakeText({ id: 't1', name: 'Title' });
    const f = figmaWith([n]);
    const decisions: ApplyDecision[] = [{ nodeId: 't1', nodeName: 'Title', styleId: 's1', styleFont: { family: 'Inter', style: 'Regular' } }];
    const summary = await applyDecisions(f as any, decisions);
    expect(n.appliedStyleId).toBe('s1');
    expect(summary.applied).toBe(1);
  });
  it('is idempotent — a node already on the target style is skipped', async () => {
    const n = new FakeText({ id: 't1', name: 'Title', textStyleId: 's1' });
    const f = figmaWith([n]);
    const summary = await applyDecisions(f as any, [{ nodeId: 't1', nodeName: 'Title', styleId: 's1', styleFont: { family: 'Inter', style: 'Regular' } }]);
    expect(summary.applied).toBe(0);
    expect(summary.skipped).toBe(1);
  });
  it('skips (not errors) when the font is unavailable', async () => {
    const n = new FakeText({ id: 't1', name: 'Title' });
    const f = figmaWith([n]);
    const summary = await applyDecisions(f as any, [{ nodeId: 't1', nodeName: 'Title', styleId: 's1', styleFont: { family: 'Missing', style: 'Black' } }]);
    expect(summary.skipped).toBe(1);
    expect(summary.applied).toBe(0);
    expect(summary.notes.some((x) => x.includes('font not available'))).toBe(true);
  });
  it('binds the fill to a color variable', async () => {
    const n = new FakeText({ id: 't1', name: 'Title', fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }] });
    const f = figmaWith([n]);
    await applyDecisions(f as any, [{ nodeId: 't1', nodeName: 'Title', colorVariableId: 'vText' }]);
    expect(n.fills[0].boundVariables?.color?.id).toBe('vText');
  });
  it('isolates a bad node — one failure does not abort the batch', async () => {
    const good = new FakeText({ id: 't1', name: 'Good' });
    const f = figmaWith([good]);
    const decisions: ApplyDecision[] = [
      { nodeId: 'missing', nodeName: 'Gone', styleId: 's1', styleFont: { family: 'Inter', style: 'Regular' } },
      { nodeId: 't1', nodeName: 'Good', styleId: 's1', styleFont: { family: 'Inter', style: 'Regular' } },
    ];
    const summary = await applyDecisions(f as any, decisions);
    expect(good.appliedStyleId).toBe('s1');
    expect(summary.applied).toBe(1);
    expect(summary.skipped).toBe(1); // missing node
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/apply.test.ts`
Expected: FAIL — cannot find module `../src/lib/apply`.

- [ ] **Step 3: Write `src/lib/apply.ts`**

```ts
import type { ApplyDecision, ApplySummary } from '../types';

interface PaintLike { type: string; boundVariables?: Record<string, unknown>; [k: string]: unknown; }
interface NodeLike {
  textStyleId: string;
  fills: PaintLike[] | unknown;
  setTextStyleIdAsync(id: string): Promise<void>;
}
export interface FigmaApplyLike {
  getNodeByIdAsync(id: string): Promise<NodeLike | null>;
  loadFontAsync(f: { family: string; style: string }): Promise<void>;
  variables: {
    getVariableByIdAsync(id: string): Promise<unknown | null>;
    setBoundVariableForPaint(paint: PaintLike, field: string, variable: unknown): PaintLike;
  };
}

/** Apply accepted decisions. Per-node try/catch isolation; idempotent for
 *  typography (a node already on the target style is skipped). */
export async function applyDecisions(figma: FigmaApplyLike, decisions: ApplyDecision[]): Promise<ApplySummary> {
  let applied = 0, skipped = 0, errors = 0;
  const notes: string[] = [];

  for (const d of decisions) {
    try {
      const node = await figma.getNodeByIdAsync(d.nodeId);
      if (!node) { skipped++; notes.push(`${d.nodeName}: node no longer exists`); continue; }
      let changed = false;

      if (d.styleId && d.styleFont) {
        if (node.textStyleId === d.styleId) {
          notes.push(`${d.nodeName}: already linked to this style`);
        } else {
          try {
            await figma.loadFontAsync(d.styleFont);
          } catch {
            skipped++;
            notes.push(`${d.nodeName}: font not available (${d.styleFont.family} ${d.styleFont.style})`);
            continue;
          }
          await node.setTextStyleIdAsync(d.styleId);
          changed = true;
        }
      }

      if (d.colorVariableId) {
        const variable = await figma.variables.getVariableByIdAsync(d.colorVariableId);
        if (variable && Array.isArray(node.fills) && node.fills.length > 0) {
          const fills = (node.fills as PaintLike[]).map((p) => ({ ...p }));
          fills[0] = figma.variables.setBoundVariableForPaint(fills[0], 'color', variable);
          (node as { fills: PaintLike[] }).fills = fills;
          changed = true;
        }
      }

      if (changed) applied++;
      else skipped++;
    } catch (e) {
      errors++;
      notes.push(`${d.nodeName}: ${(e as Error).message}`);
    }
  }

  return { applied, skipped, errors, notes };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/apply.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/apply.ts test/apply.test.ts
git commit -m "feat: apply decisions — text style + color bind, idempotent, isolated"
```

---

## Task 10: Scan orchestrator

**Files:**
- Create: `src/lib/scan.ts`
- Test: `test/scan.test.ts`

- [ ] **Step 1: Write the failing test**

`test/scan.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildReport } from '../src/lib/scan';
import { FakeFigma, FakePage, FakeText, MIXED } from './fake-figma';

const bodyStyle = {
  id: 's1', name: 'Body/Regular', fontName: { family: 'Inter', style: 'Regular' },
  fontSize: 16, lineHeight: { unit: 'PIXELS' as const, value: 24 }, letterSpacing: { unit: 'PERCENT' as const, value: 0 },
};

function figmaWith(nodes: FakeText[], withStyles = true) {
  return new FakeFigma({ pages: [new FakePage('p1', 'Page 1', nodes)], textStyles: withStyles ? [bodyStyle] : [] });
}

describe('buildReport', () => {
  it('throws a helpful error when the file has no text styles', async () => {
    const f = figmaWith([new FakeText({ id: 't1', name: 'A' })], false);
    await expect(buildReport(f as any, 'page', false)).rejects.toThrow(/Run Acrivault DC first/);
  });
  it('classifies an exact match', async () => {
    const n = new FakeText({ id: 't1', name: 'A', fontName: { family: 'Inter', style: 'Regular' }, fontSize: 16, lineHeight: { unit: 'PIXELS', value: 24 }, letterSpacing: { unit: 'PERCENT', value: 0 } });
    const report = await buildReport(figmaWith([n]) as any, 'page', false);
    expect(report.counts.exact).toBe(1);
    expect(report.results[0].best?.styleName).toBe('Body/Regular');
  });
  it('reports mixed nodes as skipped', async () => {
    const n = new FakeText({ id: 't1', name: 'Mixed', fontName: MIXED });
    const report = await buildReport(figmaWith([n]) as any, 'page', false);
    expect(report.counts.skipped).toBe(1);
    expect(report.results[0].skipped?.reason).toMatch(/mixed/i);
  });
  it('counts a too-far node as no match', async () => {
    const n = new FakeText({ id: 't1', name: 'Huge', fontSize: 96 });
    const report = await buildReport(figmaWith([n]) as any, 'page', false);
    expect(report.counts.none).toBe(1);
    expect(report.results[0].best).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/scan.test.ts`
Expected: FAIL — cannot find module `../src/lib/scan`.

- [ ] **Step 3: Write `src/lib/scan.ts`**

```ts
import { readTextProps } from './text-props';
import { matchText } from './match';
import { matchFill } from './color-match';
import { collectTextNodes, loadStyleCandidates, loadColorCandidates, type FigmaReadLike } from './figma-read';
import { toHex } from './color';
import type { Scope, ScanReport, MatchResult, Counts, ColorCandidate, Tolerances, ColorMatch } from '../types';
import { DEFAULT_TOLERANCES } from '../types';

interface PaintLike { type: string; color?: { r: number; g: number; b: number }; opacity?: number; visible?: boolean; }
interface FullNode { id: string; name: string; characters?: string; fills?: PaintLike[] | unknown; [k: string]: unknown; }

/** Exact-hex color proposal for a node with a single opaque solid fill. */
function colorForNode(node: FullNode, candidates: ColorCandidate[]): ColorMatch | null {
  const fills = node.fills;
  if (!Array.isArray(fills) || fills.length !== 1) return null;
  const p = fills[0] as PaintLike;
  if (p.type !== 'SOLID' || !p.color) return null;
  if (p.visible === false) return null;
  if (p.opacity !== undefined && p.opacity < 1) return null;
  return matchFill(toHex({ ...p.color, a: 1 }), candidates);
}

const emptyCounts = (): Counts => ({ exact: 0, high: 0, medium: 0, low: 0, none: 0, skipped: 0 });

export async function buildReport(
  figma: FigmaReadLike,
  scope: Scope,
  wantColor: boolean,
  tol: Tolerances = DEFAULT_TOLERANCES,
): Promise<ScanReport> {
  const styles = await loadStyleCandidates(figma);
  if (styles.length === 0) throw new Error('No local text styles found. Run Acrivault DC first.');
  const colorCands = wantColor ? await loadColorCandidates(figma) : [];
  const nodes = (await collectTextNodes(figma, scope)) as unknown as FullNode[];

  const results: MatchResult[] = [];
  const counts = emptyCounts();

  for (const node of nodes) {
    const current = readTextProps(node as never);
    if (current.mixed) {
      results.push({ nodeId: node.id, nodeName: node.name, current, best: null, alternates: [], skipped: { reason: 'mixed properties' } });
      counts.skipped++;
      continue;
    }
    if (!node.characters || node.characters.length === 0) {
      results.push({ nodeId: node.id, nodeName: node.name, current, best: null, alternates: [], skipped: { reason: 'empty text' } });
      counts.skipped++;
      continue;
    }
    const { best, alternates } = matchText(current, styles, tol);
    const color = wantColor ? colorForNode(node, colorCands) : undefined;
    results.push({ nodeId: node.id, nodeName: node.name, current, best, alternates, color });
    if (best) counts[best.confidence]++;
    else counts.none++;
  }

  return { results, counts, styleCount: styles.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/scan.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the whole suite + typecheck**

Run: `npx vitest run` then `npx tsc --noEmit`
Expected: all test files PASS; tsc prints nothing.

- [ ] **Step 6: Commit**

```bash
git add src/lib/scan.ts test/scan.test.ts
git commit -m "feat: scan orchestrator building the match report"
```

---

## Task 11: Plugin entry + review UI

**Files:**
- Create: `src/code.ts`, `src/ui.html`

- [ ] **Step 1: Write `src/code.ts`**

```ts
import { buildReport } from './lib/scan';
import { applyDecisions } from './lib/apply';
import type { Scope, StyleCandidate, ApplyDecision, MatchResult } from './types';
import { loadStyleCandidates } from './lib/figma-read';

figma.showUI(__html__, { width: 380, height: 560 });

// Retained between scan and apply so the UI can send back ids only; the plugin
// looks up each style's font (needed to load it before applying).
let lastStyles: StyleCandidate[] = [];

type ScanMsg = { type: 'scan'; scope: Scope; color: boolean };
type ApplyMsg = { type: 'apply'; decisions: Array<{ nodeId: string; nodeName: string; styleId?: string; colorVariableId?: string }> };
type FocusMsg = { type: 'focus'; nodeId: string };
type Msg = ScanMsg | ApplyMsg | FocusMsg;

figma.ui.onmessage = async (msg: Msg) => {
  try {
    if (msg.type === 'scan') {
      lastStyles = await loadStyleCandidates(figma as never);
      const report = await buildReport(figma as never, msg.scope, msg.color);
      figma.ui.postMessage({ type: 'report', report });
      return;
    }
    if (msg.type === 'apply') {
      const fontById = new Map(lastStyles.map((s) => [s.id, s.font]));
      const decisions: ApplyDecision[] = msg.decisions.map((d) => ({
        nodeId: d.nodeId,
        nodeName: d.nodeName,
        styleId: d.styleId,
        styleFont: d.styleId ? fontById.get(d.styleId) : undefined,
        colorVariableId: d.colorVariableId,
      }));
      const summary = await applyDecisions(figma as never, decisions);
      figma.notify(`Link Text Styles — ${summary.applied} applied, ${summary.skipped} skipped, ${summary.errors} errors`);
      figma.ui.postMessage({ type: 'applied', summary });
      return;
    }
    if (msg.type === 'focus') {
      const node = await figma.getNodeByIdAsync(msg.nodeId);
      if (node && 'type' in node) {
        const page = (node as BaseNode).parent && findPage(node as BaseNode);
        if (page && page !== figma.currentPage) await figma.setCurrentPageAsync(page);
        figma.currentPage.selection = [node as SceneNode];
        figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
      }
      return;
    }
  } catch (e) {
    figma.ui.postMessage({ type: 'error', message: (e as Error).message });
    figma.notify('Link Text Styles failed: ' + (e as Error).message, { error: true });
  }
};

function findPage(node: BaseNode): PageNode | null {
  let n: BaseNode | null = node;
  while (n && n.type !== 'PAGE') n = n.parent;
  return (n as PageNode) ?? null;
}

export type { MatchResult };
```

- [ ] **Step 2: Write `src/ui.html`**

```html
<style>
  :root { --primary:#2C8A6E; --accent:#3FA888; --dark:#0A1F1C; --muted:#5A6F69; --divider:#DCE5E2; --bg-tint:#F4F8F6; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: Georgia,'Segoe UI',system-ui,sans-serif; background:var(--bg-tint); color:var(--dark); display:flex; flex-direction:column; height:100vh; }
  header { background:var(--dark); padding:12px 16px; flex-shrink:0; }
  header h1 { margin:0; font-size:14px; letter-spacing:0.04em; color:var(--accent); font-weight:normal; }
  header p { margin:2px 0 0; font-size:10px; font-style:italic; color:#cfe9e0; }
  .controls { padding:10px 16px; border-bottom:1px solid var(--divider); flex-shrink:0; }
  .controls .line { display:flex; align-items:center; gap:10px; font-size:12px; margin-bottom:6px; }
  select, button { font-family:inherit; }
  select { padding:4px 6px; border:1px solid var(--divider); border-radius:5px; background:white; }
  button.primary { background:var(--primary); color:white; border:none; border-radius:6px; padding:8px 12px; font-size:12px; cursor:pointer; }
  button.primary:hover { background:var(--accent); }
  button.primary:disabled { background:var(--divider); color:var(--muted); cursor:default; }
  main { flex:1; overflow-y:auto; padding:8px 16px; }
  .summary { font-size:11px; color:var(--muted); margin:4px 0 8px; }
  .grp { font-size:10px; text-transform:uppercase; letter-spacing:0.05em; color:var(--muted); margin:10px 0 4px; }
  .row { display:flex; align-items:center; gap:8px; padding:5px 6px; border:1px solid var(--divider); border-radius:5px; background:white; margin-bottom:4px; font-size:12px; }
  .row input[type=checkbox] { accent-color:var(--primary); }
  .row .name { flex:1; cursor:pointer; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .row .name small { color:var(--muted); }
  .badge { font-size:9px; padding:1px 6px; border-radius:9px; text-transform:uppercase; letter-spacing:0.04em; }
  .badge.exact{background:#DDF3EC;color:#1c6b54;} .badge.high{background:#E4F1EC;color:#2C8A6E;}
  .badge.medium{background:#FBF0D8;color:#8a6d1f;} .badge.low{background:#FBE3DE;color:#a4432f;}
  .footer { padding:10px 16px; border-top:1px solid var(--divider); flex-shrink:0; display:flex; gap:8px; align-items:center; }
  .footer .grow { flex:1; }
  #log { font-family:Consolas,Menlo,monospace; font-size:10px; color:var(--muted); }
</style>

<header>
  <h1>LINK TEXT STYLES</h1>
  <p>Securing every identity that has no face.</p>
</header>

<div class="controls">
  <div class="line">
    <label for="scope">Scope</label>
    <select id="scope">
      <option value="selection">Selection</option>
      <option value="page" selected>Current page</option>
      <option value="all">All pages</option>
    </select>
    <label><input type="checkbox" id="color"> Bind color variables</label>
  </div>
  <button class="primary" id="scan">Scan</button>
</div>

<main>
  <div class="summary" id="summary">Choose a scope and Scan to preview matches. Nothing changes until you Apply.</div>
  <div id="list"></div>
</main>

<div class="footer">
  <span class="grow" id="log"></span>
  <button class="primary" id="apply" disabled>Apply selected</button>
</div>

<script>
  const $ = (id) => document.getElementById(id);
  const listEl = $('list'), summaryEl = $('summary'), logEl = $('log');
  let current = null; // last report
  const CONF_ORDER = ['exact','high','medium','low','none','skipped'];
  const preChecked = { exact:true, high:true, medium:false, low:false };

  $('scan').onclick = () => {
    listEl.innerHTML = ''; summaryEl.textContent = 'Scanning…'; $('apply').disabled = true;
    parent.postMessage({ pluginMessage: { type:'scan', scope:$('scope').value, color:$('color').checked } }, '*');
  };

  function rowEl(r, colorOn) {
    const row = document.createElement('div'); row.className = 'row';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.dataset.node = r.nodeId;
    const conf = r.best ? r.best.confidence : (r.skipped ? 'skipped' : 'none');
    cb.checked = !!(r.best && preChecked[conf]); cb.disabled = !r.best && !(colorOn && r.color);
    if (r.best) cb.dataset.style = r.best.styleId;
    if (colorOn && r.color) cb.dataset.color = r.color.variableId;
    const name = document.createElement('div'); name.className = 'name';
    const proposed = r.best ? r.best.styleName : (r.skipped ? r.skipped.reason : 'no match');
    const cur = r.current;
    name.innerHTML = `${escapeHtml(r.nodeName)} <small>· ${cur.mixed ? 'mixed' : Math.round(cur.size)+'/'+escapeHtml(cur.style)} → ${escapeHtml(proposed)}${colorOn && r.color ? ' · '+escapeHtml(r.color.variableName) : ''}</small>`;
    name.onclick = () => parent.postMessage({ pluginMessage:{ type:'focus', nodeId:r.nodeId } }, '*');
    row.appendChild(cb); row.appendChild(name);
    if (r.best) { const b = document.createElement('span'); b.className='badge '+conf; b.textContent=conf; row.appendChild(b); }
    return row;
  }

  function render(report) {
    current = report; listEl.innerHTML = '';
    const c = report.counts;
    summaryEl.textContent = `Exact ${c.exact} · High ${c.high} · Medium ${c.medium} · Low ${c.low} · No match ${c.none} · Skipped ${c.skipped} (${report.styleCount} styles)`;
    const colorOn = $('color').checked;
    for (const conf of CONF_ORDER) {
      const rows = report.results.filter((r) => (r.best ? r.best.confidence : (r.skipped ? 'skipped' : 'none')) === conf);
      if (!rows.length) continue;
      const h = document.createElement('div'); h.className='grp'; h.textContent = conf + ' (' + rows.length + ')'; listEl.appendChild(h);
      rows.forEach((r) => listEl.appendChild(rowEl(r, colorOn)));
    }
    $('apply').disabled = false;
  }

  $('apply').onclick = () => {
    const decisions = [];
    listEl.querySelectorAll('input[type=checkbox]').forEach((cb) => {
      if (!cb.checked) return;
      const r = current.results.find((x) => x.nodeId === cb.dataset.node);
      decisions.push({ nodeId: cb.dataset.node, nodeName: r ? r.nodeName : cb.dataset.node, styleId: cb.dataset.style, colorVariableId: cb.dataset.color });
    });
    if (!decisions.length) { logEl.textContent = 'Nothing selected.'; return; }
    $('apply').disabled = true; logEl.textContent = 'Applying '+decisions.length+'…';
    parent.postMessage({ pluginMessage:{ type:'apply', decisions } }, '*');
  };

  function escapeHtml(s){ return String(s).replace(/[&<>"]/g, (c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

  window.onmessage = (event) => {
    const msg = event.data.pluginMessage; if (!msg) return;
    if (msg.type === 'report') render(msg.report);
    else if (msg.type === 'applied') { $('apply').disabled = false; const s = msg.summary; logEl.textContent = `${s.applied} applied, ${s.skipped} skipped, ${s.errors} errors`; }
    else if (msg.type === 'error') { $('apply').disabled = false; summaryEl.textContent = 'Error: ' + msg.message; }
  };
</script>
```

- [ ] **Step 3: Build and typecheck**

Run: `npm run build` then `npx tsc --noEmit`
Expected: `built dist/` printed; `dist/code.js` and `dist/ui.html` exist; tsc prints nothing.

- [ ] **Step 4: Run the full suite once more**

Run: `npx vitest run`
Expected: all test files PASS.

- [ ] **Step 5: Commit**

```bash
git add src/code.ts src/ui.html
git commit -m "feat: plugin entry + branded review UI (scan/apply/focus)"
```

---

## Task 12: README + manual verification handoff

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# Link Text Styles

Companion to the Acrivault DC plugin. Scans text nodes, matches each to the nearest
existing **local text style**, and (optionally) binds the text fill to the matching
**semantic color variable**. Everything is proposed in a review panel — nothing is
changed until you click **Apply selected**.

## Build

```bash
cd link-text-styles
npm install
npm run build
```

## Run in Figma

Plugins → Development → Import plugin from manifest… → select `link-text-styles/manifest.json`.
Run **Link Text Styles**. Pick a scope (Selection / Current page / All pages), optionally
tick **Bind color variables**, and click **Scan**. Review the grouped proposals
(Exact + High are pre-checked; Medium + Low are opt-in), adjust, then **Apply selected**.

Requires the file to already contain local text styles (run **Acrivault DC** first),
and the styles' fonts (Inter, JetBrains Mono) to be installed — unavailable fonts are
reported and skipped, never fatal.

## How matching works

Font family is a hard gate (Inter is never matched to a Mono style). Confidence tiers,
top-down: **Exact** (all props equal) → **High** (family+style+size equal) →
**Medium** (size within 3%) → **Low** (size within 8%) → **No match**. On a tie, role
styles win over `Scale/*`. Color matching is exact-hex only.

## Development

```bash
npm test          # vitest, pure-logic suites
npm run watch     # rebuild on change
npx tsc --noEmit  # typecheck
```

Pure logic (`match`, `color-match`, `text-props`, `scan`) is unit-tested against an
in-memory `FakeFigma`. Idempotent: re-running never double-applies.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with build/run/matching notes"
```

- [ ] **Step 3: Manual verification in a real Figma file (report back)**

The unit suite uses the in-memory fake; these behaviors only a live document confirms.
In Figma (a file that has already had **Acrivault DC** run on it):

1. Import the manifest, run the plugin, **Scan** the current page. Confirm the counts summary looks sane and rows render grouped by confidence.
2. Click a row → confirm it selects + zooms to that node.
3. Apply an Exact/High selection → confirm the text nodes gain the style (Figma right panel shows the text style), and the notify toast reports applied/skipped/errors.
4. **Re-scan + Apply** the same nodes → confirm they now report "already linked" (idempotent, no duplicates).
5. Tick **Bind color variables**, scan, apply a color proposal → confirm the fill shows the bound variable and flips when you switch the frame's Semantic mode.
6. Watch specifically for the real-API items in spec §10: `setTextStyleIdAsync` + font-load ordering, `lineHeight`/`letterSpacing` unit shapes, `setBoundVariableForPaint` signature, `figma.mixed` detection, `loadAllPagesAsync` + cross-page zoom.

Report anything that misbehaves so it can be fixed against live-API reality.

---

## Self-Review (completed by plan author)

- **Spec coverage:** D1 color-toggle → Task 11 UI `#color` + scan `wantColor` + `colorForNode`. D2 tolerance tiers → Task 5 `classify`. D3 live source → Task 8 `loadStyleCandidates`/`loadColorCandidates`. D4 tie-break → Task 5 `matchText`. D5 pre-check defaults → Task 11 `preChecked`. D6 mixed skipped → Task 10 + Task 4. D7 exact-hex color → Task 6. Edge cases (empty/no-styles/font-missing/error-isolation) → Tasks 9–10. Real-API checklist → Task 12.
- **Placeholder scan:** none — every code/test step contains complete code.
- **Type consistency:** `ApplyDecision.styleFont` defined in Task 2, populated in Task 11 `code.ts`, consumed in Task 9 `apply.ts`. `StyleCandidate.font` defined Task 2, produced Task 8, used Task 11. `Counts` keys match `Confidence` + `skipped` across Tasks 2/5/10/11. `FigmaReadLike`/`FigmaApplyLike` surfaces are satisfied by `FakeFigma` (Task 7).
- **Known approximation:** `#1a1a1a` in Task 8 assumes `Math.round(0.1*255)=26=0x1a`; the fixture uses `0.1` deliberately.
````
