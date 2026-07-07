# Acrivault DC — Figma Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Acrivault DC", a Figma plugin that creates the full Acrivault design system (Primitives → Semantic → Component variables, text styles, effect styles) in one click, idempotently.

**Architecture:** A build step parses `src/styles/tokens.css` into a token model, merges it with authored promoted-tokens and a component-map, and emits `model.generated.json`. The plugin's `code.ts` walks the model and creates Figma collections/variables/styles via the Figma Plugin API. All value/alias logic is pure and unit-tested in Node; the Figma API is accessed through injected wrappers tested against an in-memory fake.

**Tech Stack:** TypeScript, esbuild (bundler), Vitest (tests), `@figma/plugin-typings`. No runtime deps. Node 24 / npm 11 (already installed).

**Spec:** `docs/superpowers/specs/2026-07-01-acrivault-dc-figma-plugin-design.md`

**Source of truth for data:**
- Primitives + Semantic values: `E:\Projects\Acrivault\Design V3\src\styles\tokens.css`
- Existing parser to port: `C:\Users\sarth\Downloads\Acrivault Tokens\gen-tokens-studio.js`
- Component-map data: audit output `C:\Users\sarth\AppData\Local\Temp\claude\E--Projects-Acrivault-Design-V3\ef3b5124-e236-498f-92d6-f3f244b578f3\tasks\w8avwuz3s.output` + gap families in spec §8.

**Note:** the project is not a git repo. "Commit" steps below use `git` only if a repo is initialized; otherwise treat each commit step as a checkpoint (skip the command). Consider `git init` in `figma-plugin/` at Task 1 so commits work.

---

## File Structure

```
figma-plugin/
  manifest.json
  package.json
  tsconfig.json
  vitest.config.ts
  build.mjs                     # esbuild driver + runs build-model + inlines ui
  src/
    types.ts                    # shared model types
    model/
      parse-tokens.ts           # tokens.css -> {primitives, semanticDark, semanticLight}
      promoted-tokens.ts        # the new §7.3 tokens (primitives + semantic additions)
      component-map.ts          # authored Component layer (~330 entries)
      build-model.ts            # assemble + validate -> Model
      build-model.node.ts       # CLI wrapper: writes model.generated.json
    lib/
      color.ts                  # hex/rgba/mix/resolve (ported from gen-tokens-studio.js)
      figma-variables.ts        # DI wrappers: find-or-create collection/mode/variable/alias
      figma-styles.ts           # DI wrappers: text + effect styles
    code.ts                     # plugin sandbox entry: orchestrates build from model
    ui.html                     # button + options + log
    model.generated.json        # emitted by build-model.node.ts (gitignored)
  test/
    parse-tokens.test.ts
    promoted-tokens.test.ts
    component-map.test.ts
    build-model.test.ts
    figma-variables.test.ts
    figma-styles.test.ts
    fake-figma.ts               # in-memory Figma API fake for tests
```

Responsibilities: `model/*` is pure data assembly (Node-testable). `lib/color.ts` is pure math. `lib/figma-*.ts` take a `figma`-shaped object (injected) so tests use `fake-figma.ts`. `code.ts` is the only file that touches the real global `figma`.

---

## Task 1: Scaffold the plugin project

**Files:**
- Create: `figma-plugin/package.json`, `figma-plugin/tsconfig.json`, `figma-plugin/manifest.json`, `figma-plugin/vitest.config.ts`, `figma-plugin/build.mjs`, `figma-plugin/src/ui.html`, `figma-plugin/src/code.ts` (stub), `figma-plugin/.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "acrivault-dc",
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

- [ ] **Step 2: Create `tsconfig.json`**

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

- [ ] **Step 3: Create `manifest.json`**

```json
{
  "name": "Acrivault DC",
  "id": "acrivault-design-system",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "editorType": ["figma"],
  "documentAccess": "dynamic-page",
  "networkAccess": { "allowedDomains": ["none"] }
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: ['test/**/*.test.ts'] } });
```

- [ ] **Step 5: Create `.gitignore`**

```
node_modules/
dist/
src/model.generated.json
```

- [ ] **Step 6: Create `src/code.ts` stub**

```ts
figma.showUI(__html__, { width: 320, height: 420 });
figma.ui.onmessage = (msg: { type: string }) => {
  if (msg.type === 'build') figma.notify('Acrivault DC: not implemented yet');
};
```

- [ ] **Step 7: Create `src/ui.html` stub**

```html
<button id="build">Build / Update design system</button>
<script>
  document.getElementById('build').onclick = () =>
    parent.postMessage({ pluginMessage: { type: 'build' } }, '*');
</script>
```

- [ ] **Step 8: Create `build.mjs`**

```js
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

mkdirSync('dist', { recursive: true });
// 1) generate the model json (Task 5 provides build-model.node.ts)
try { execSync('node --experimental-strip-types src/model/build-model.node.ts', { stdio: 'inherit' }); }
catch (e) { console.warn('build-model skipped (not yet implemented):', e.message); }
// 2) bundle code.ts
const ctx = { entryPoints: ['src/code.ts'], bundle: true, outfile: 'dist/code.js', target: 'es2020', format: 'iife' };
// 3) inline ui.html
const inlineUi = () => writeFileSync('dist/ui.html', readFileSync('src/ui.html', 'utf8'));
if (process.argv.includes('--watch')) {
  const c = await esbuild.context(ctx); await c.watch(); inlineUi();
  console.log('watching…');
} else { await esbuild.build(ctx); inlineUi(); console.log('built dist/'); }
```

- [ ] **Step 9: Install and verify build**

Run: `cd figma-plugin && npm install && npm run build`
Expected: `built dist/` printed; `dist/code.js` and `dist/ui.html` exist. (build-model warning is expected until Task 5.)

- [ ] **Step 10: Commit** — `git init` (if needed) then commit `chore: scaffold Acrivault DC figma plugin`.

---

## Task 2: Port color helpers

**Files:**
- Create: `figma-plugin/src/lib/color.ts`, `figma-plugin/test/color.test.ts`

- [ ] **Step 1: Write failing test** (`test/color.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { parseHex, toHex, mix, resolveColor } from '../src/lib/color';

describe('color', () => {
  it('parses and re-emits hex lowercase', () => {
    expect(toHex(parseHex('#2C8A6E'))).toBe('#2c8a6e');
  });
  it('color-mix accent 86% black matches AA-darkened button', () => {
    // color-mix(in srgb, #2c8a6e 86%, black)
    const c = mix(parseHex('#2c8a6e'), 86, parseHex('#000000'));
    expect(toHex(c)).toBe('#26765e');
  });
  it('resolveColor follows var() via a map', () => {
    const map = { accent: '#2c8a6e', 'accent-300': '#6fd9b8' };
    expect(toHex(resolveColor('var(--accent-300)', map))).toBe('#6fd9b8');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- color`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/color.ts`**

Port `parseHex`, `parseRgba`, `mix`, `toHex`, `colorStr`, `resolveColor` verbatim from `C:\Users\sarth\Downloads\Acrivault Tokens\gen-tokens-studio.js` (lines ~55–109), converting to TS with exported functions and an `RGBA = {r,g,b,a}` type. `mix` uses premultiplied alpha as in the source.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- color`
Expected: PASS. (If `#26765e` differs, correct the expected value to the tool's computed output and note it — the source `mix` is authoritative.)

- [ ] **Step 5: Commit** — `feat: port color helpers`.

---

## Task 3: Define model types

**Files:**
- Create: `figma-plugin/src/types.ts`

- [ ] **Step 1: Write `src/types.ts`** (no test — pure types)

```ts
export type VarType = 'COLOR' | 'FLOAT' | 'STRING';

/** A primitive variable (single value). */
export interface PrimitiveVar { name: string; type: VarType; value: string | number; }

/** A semantic variable: per-mode value that is either a literal or an alias (by variable name). */
export interface ModeValue { literal?: string | number; alias?: string; }
export interface SemanticVar { name: string; type: VarType; dark: ModeValue; light: ModeValue; }

/** A component variable: single mode, aliases a semantic/primitive var by name (or a literal). */
export interface ComponentVar { name: string; type: VarType; alias?: string; literal?: string | number; note?: string; }

export interface TextStyleDef {
  name: string;
  fontFamilyVar: string; fontWeightVar: string; fontSizeVar: string; lineHeightVar: string; letterSpacingVar: string;
  textCase?: 'ORIGINAL' | 'UPPER';
}
export interface EffectStyleDef {
  name: string; // e.g. Shadow/Dark/Small
  x: number; y: number; blur: number; spread: number; color: string; // rgba
}

export interface Model {
  primitives: PrimitiveVar[];
  semantic: SemanticVar[];
  component: ComponentVar[];
  textStyles: TextStyleDef[];
  effectStyles: EffectStyleDef[];
}
```

- [ ] **Step 2: Commit** — `feat: model types`.

---

## Task 4: Parse tokens.css → primitives + semantic

**Files:**
- Create: `figma-plugin/src/model/parse-tokens.ts`, `figma-plugin/test/parse-tokens.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { parseTokens } from '../src/model/parse-tokens';

const model = parseTokens(); // reads the real tokens.css via an absolute path constant

describe('parseTokens', () => {
  it('emits the green ramp under Color/Green', () => {
    const g500 = model.primitives.find((p) => p.name === 'Color/Green/500');
    expect(g500?.value).toBe('#2c8a6e');
  });
  it('nests black/white under Color (never at root)', () => {
    expect(model.primitives.find((p) => p.name === 'Color/White')?.value).toBe('#ffffff');
    expect(model.primitives.some((p) => p.name === 'White')).toBe(false);
  });
  it('semantic Surface/Base differs per mode and aliases where equal', () => {
    const s = model.semantic.find((v) => v.name === 'Surface/Base')!;
    expect(s.dark.alias).toBe('Color/Neutral/900'); // #11241f
    expect(s.light.alias).toBe('Color/White');      // #ffffff
  });
  it('z-index sticky=1000 dropdown=1100 (matches current css)', () => {
    expect(model.primitives.find((p) => p.name === 'Z Index/Sticky')?.value).toBe(1000);
    expect(model.primitives.find((p) => p.name === 'Z Index/Dropdown')?.value).toBe(1100);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test -- parse-tokens` → FAIL.

- [ ] **Step 3: Implement `parse-tokens.ts`**

Port the parse + build logic from `gen-tokens-studio.js` (block splitting, `take`, ramps, accent, status, risk, categorical, scales, font, layout, etc.), but emit **Figma names** per spec §6/§7.1 instead of Tokens Studio dot-paths. Key differences:
- Names use Title-Case `/` groups: `colors.green.500` → `Color/Green/500`; `surface.bg` → `Surface/Background`; `font.size.role.h1` → `Font/Size/Role/H1`; `z-index.sticky` → `Z Index/Sticky`.
- Types map to Figma: colors → `COLOR`, numeric scales → `FLOAT`, font family/weight → `STRING` (weight numeric string ok).
- Semantic vars produce `{dark, light}` ModeValues: if the resolved hex equals a primitive (ramp/black/white) use `alias: <PrimitiveName>`, else `literal: <hex>`. Reuse `resolveColor`/`mix` for `color-mix()`/`var()`.
- Constant `SRC = 'E:/Projects/Acrivault/Design V3/src/styles/tokens.css'` (read at build time).
- Keep the coverage guard: throw if any css var goes unconsumed.

- [ ] **Step 4: Run to verify pass** — `npm test -- parse-tokens` → PASS.

- [ ] **Step 5: Commit** — `feat: parse tokens.css into figma-named primitives + semantic`.

---

## Task 5: Promoted tokens + assemble & validate model

**Files:**
- Create: `figma-plugin/src/model/promoted-tokens.ts`, `figma-plugin/src/model/build-model.ts`, `figma-plugin/src/model/build-model.node.ts`, `figma-plugin/test/build-model.test.ts`

- [ ] **Step 1: Write failing test** (`test/build-model.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { buildModel, validateModel } from '../src/model/build-model';

const model = buildModel();

describe('buildModel', () => {
  it('includes promoted primitives', () => {
    expect(model.primitives.find((p) => p.name === 'Brand/Accent/Strong')?.value).toBe('#26765e');
    expect(model.primitives.find((p) => p.name === 'Status/Critical/Strong')).toBeTruthy();
  });
  it('includes promoted semantics', () => {
    expect(model.semantic.find((v) => v.name === 'Focus/Ring/Default')).toBeTruthy();
    expect(model.semantic.find((v) => v.name === 'Feedback/Critical/Border')).toBeTruthy();
  });
  it('every component alias resolves to a real primitive/semantic var', () => {
    const names = new Set([...model.primitives, ...model.semantic].map((v) => v.name));
    const dangling = model.component.filter((c) => c.alias && !names.has(c.alias));
    expect(dangling.map((c) => `${c.name}->${c.alias}`)).toEqual([]);
  });
  it('validateModel throws on a dangling alias', () => {
    const bad = { ...model, component: [...model.component, { name: 'X/Y', type: 'COLOR', alias: 'Nope/Nope' } as any] };
    expect(() => validateModel(bad)).toThrow(/dangling/i);
  });
  it('has 19 text styles and 8 effect styles', () => {
    expect(model.textStyles.length).toBe(19);
    expect(model.effectStyles.length).toBe(8);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test -- build-model` → FAIL.

- [ ] **Step 3: Implement `promoted-tokens.ts`**

Export `promotedPrimitives: PrimitiveVar[]` and `promotedSemantic: SemanticVar[]` exactly per spec §7.3:
```ts
import type { PrimitiveVar, SemanticVar } from '../types';
export const promotedPrimitives: PrimitiveVar[] = [
  { name: 'Brand/Accent/Strong', type: 'COLOR', value: '#26765e' },   // color-mix(accent 86%, black)
  { name: 'Status/Critical/Strong', type: 'COLOR', value: '#bd4f3c' }, // color-mix(critical 82%, black) — verify via color.mix
  { name: 'Size/Dot/Small', type: 'FLOAT', value: 6 },
  { name: 'Size/Dot/Default', type: 'FLOAT', value: 8 },
  { name: 'Size/Progress-Track/Small', type: 'FLOAT', value: 6 },
  { name: 'Size/Progress-Track/Default', type: 'FLOAT', value: 8 },
  { name: 'Border Width/Thick', type: 'FLOAT', value: 1.6 },
];
// Focus rings/tint-weak are accent@opacity (theme-independent value, same both modes).
// Compute the exact rgba via color.mix(accent, N, transparent) when implementing.
export const promotedSemantic: SemanticVar[] = [
  { name: 'Focus/Ring/Default', type: 'COLOR', dark: { literal: 'rgba(44,138,110,0.3)' }, light: { literal: 'rgba(44,138,110,0.3)' } },
  { name: 'Focus/Ring/Strong',  type: 'COLOR', dark: { literal: 'rgba(44,138,110,0.35)' }, light: { literal: 'rgba(44,138,110,0.35)' } },
  { name: 'State/Disabled/Opacity', type: 'FLOAT', dark: { literal: 0.5 }, light: { literal: 0.5 } },
  { name: 'Accent/Tint-Weak', type: 'COLOR', dark: { literal: 'rgba(44,138,110,0.2)' }, light: { literal: 'rgba(44,138,110,0.2)' } },
  { name: 'Feedback/Success/Border', type: 'COLOR', dark: { literal: '<mix success 45% + border-dark>' }, light: { literal: '<mix success 45% + border-light>' } },
  { name: 'Feedback/Warning/Border', type: 'COLOR', dark: { literal: '…' }, light: { literal: '…' } },
  { name: 'Feedback/Critical/Border', type: 'COLOR', dark: { literal: '…' }, light: { literal: '…' } },
  { name: 'Feedback/Info/Border', type: 'COLOR', dark: { literal: '…' }, light: { literal: '…' } },
];
```
When implementing, replace each `<mix …>`/`…`/`'#bd4f3c'` placeholder by computing it with `lib/color.mix` against the real `tokens.css` values (accent `#2c8a6e`, critical `#e5604a`, per-theme border/feedback). Add a test asserting `Status/Critical/Strong === toHex(mix(parseHex('#e5604a'),82,parseHex('#000000')))` so the value is derived, not guessed.

- [ ] **Step 4: Implement `build-model.ts`**

```ts
import { parseTokens } from './parse-tokens';
import { promotedPrimitives, promotedSemantic } from './promoted-tokens';
import { componentMap } from './component-map';
import { textStyles, effectStyles } from './styles-map';
import type { Model } from '../types';

export function buildModel(): Model {
  const base = parseTokens();
  const model: Model = {
    primitives: [...base.primitives, ...promotedPrimitives],
    semantic: [...base.semantic, ...promotedSemantic],
    component: componentMap,
    textStyles, effectStyles,
  };
  validateModel(model);
  return model;
}

export function validateModel(m: Model): void {
  const names = new Set([...m.primitives, ...m.semantic].map((v) => v.name));
  const dangling = m.component.filter((c) => c.alias && !names.has(c.alias));
  if (dangling.length) throw new Error('dangling component aliases: ' + dangling.map((c) => `${c.name}->${c.alias}`).join(', '));
  const semNames = new Set(m.primitives.map((v) => v.name));
  const semDangling = m.semantic.filter((v) =>
    [v.dark, v.light].some((mv) => mv.alias && !semNames.has(mv.alias)));
  if (semDangling.length) throw new Error('dangling semantic aliases: ' + semDangling.map((v) => v.name).join(', '));
}
```

- [ ] **Step 5: Implement `build-model.node.ts`** (writes the json)

```ts
import { writeFileSync } from 'node:fs';
import { buildModel } from './build-model';
writeFileSync(new URL('../model.generated.json', import.meta.url), JSON.stringify(buildModel(), null, 2));
console.log('model.generated.json written');
```

- [ ] **Step 6: Run to verify pass** — `npm test -- build-model` → PASS. (Tasks 6/8 provide `component-map.ts` and `styles-map.ts`; stub them minimally first so imports resolve, then this test's component/style assertions pass once those tasks complete. If executing strictly in order, create empty `componentMap = []`, `textStyles = []`, `effectStyles = []` stubs now and let the counts assertion fail until Task 6/9 — or reorder Task 6 before this step.)

- [ ] **Step 7: Commit** — `feat: promoted tokens + model assembly with alias validation`.

---

## Task 6: Author the component-map (guarded data entry)

**Files:**
- Create: `figma-plugin/src/model/component-map.ts`, `figma-plugin/test/component-map.test.ts`

> **Data-entry task.** This transcribes the audit result into typed data. Inlining all ~330 rows here is impractical; instead the exact source and a total-coverage guard are specified. The `validateModel` alias check (Task 5) + the family/count test below make transcription safe — a wrong or missing alias fails the build.

- [ ] **Step 1: Write the guard test** (`test/component-map.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { componentMap } from '../src/model/component-map';

const families = new Set(componentMap.map((c) => c.name.split('/')[0]));

describe('componentMap', () => {
  it('covers all 48 families', () => {
    for (const f of ['Button','IconButton','SsoButton','RoleSwitcher','SegmentedControl','FilterPill',
      'Checkbox','RadioGroup','Switch','Slider','Input','Textarea','Select','Combobox','CodeInput',
      'ValidityWindowField','Card','KpiTile','AuthCard','Accordion','Banner','InlineAlert','Toaster',
      'EmptyState','ErrorState','Badge','Tag','StatusDot','RiskPill','ProviderBadge','Dialog','Drawer',
      'Popover','DropdownMenu','Tooltip','CommandPalette','FilterMenu','ProgressBar','ScanProgress',
      'Skeleton','Table','Avatar','CodeBlock','KeyValueList','PermissionsSummary','Tabs','Breadcrumb',
      'Pagination','Stepper','Timeline','Sidebar','TopBar']) {
      expect(families.has(f), `missing family ${f}`).toBe(true);
    }
  });
  it('has no duplicate names', () => {
    const seen = new Set<string>(); const dups: string[] = [];
    for (const c of componentMap) { if (seen.has(c.name)) dups.push(c.name); seen.add(c.name); }
    expect(dups).toEqual([]);
  });
  it('every entry is a resolvable alias or an explicit literal', () => {
    expect(componentMap.every((c) => !!c.alias || c.literal !== undefined)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test -- component-map` → FAIL.

- [ ] **Step 3: Author `component-map.ts`**

Transcribe every row from the audit output (`…/tasks/w8avwuz3s.output`, the per-family tables) plus the gap families in spec §8 into a typed array. Apply the §12 resolutions and §7.3 promotions while transcribing:
- Derived button bgs → `alias: 'Brand/Accent/Strong'` / `'Status/Critical/Strong'`.
- Focus rings → `alias: 'Focus/Ring/Default'|'Focus/Ring/Strong'`.
- Disabled → `alias: 'State/Disabled/Opacity'` (FLOAT).
- Count chips → `alias: 'Accent/Tint-Weak'`.
- Banner/Toaster borders → `alias: 'Feedback/{tone}/Border'`.
- Dot/track sizes/stroke widths → the promoted `Size/*` / `Border Width/*` primitives.
- Names use `Component/Variant/Slot` with `#state` suffix for non-default states.
- Shape:
```ts
import type { ComponentVar } from '../types';
export const componentMap: ComponentVar[] = [
  { name: 'Button/Primary/Background', type: 'COLOR', alias: 'Brand/Accent/Strong' },
  { name: 'Button/Primary/Background#hover', type: 'COLOR', alias: 'Brand/Accent/Default' },
  { name: 'Button/Primary/Background#active', type: 'COLOR', alias: 'Brand/Accent/Press' },
  { name: 'Button/Primary/Text', type: 'COLOR', alias: 'Color/White' },
  // …transcribe all families…
  { name: 'Table/Header/Background', type: 'COLOR', alias: 'Surface/Raised' },
  { name: 'Table/Row/Background#hover', type: 'COLOR', alias: 'Surface/Hover' },
  // …
];
```
> **Efficiency note (ultracode):** this bulk transcription is a good candidate to delegate to one subagent that reads the audit output + spec §8 and emits the typed file, then the guard test + `validateModel` verify it. If any alias is wrong, tests fail with the exact `name->alias`.

- [ ] **Step 4: Run to verify pass** — `npm test -- component-map build-model` → PASS (families present, no dups, no dangling aliases).

- [ ] **Step 5: Commit** — `feat: component-map (48 families, aliased & validated)`.

---

## Task 7: Styles map (text + effect)

**Files:**
- Create: `figma-plugin/src/model/styles-map.ts`, `figma-plugin/test/styles-map.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest';
import { textStyles, effectStyles } from '../src/model/styles-map';

describe('styles-map', () => {
  it('19 text styles incl. roles, scale, eyebrow', () => {
    expect(textStyles.length).toBe(19);
    expect(textStyles.map((s) => s.name)).toContain('Heading/1');
    expect(textStyles.map((s) => s.name)).toContain('Scale/Display-2XL');
    const eb = textStyles.find((s) => s.name === 'Label/Eyebrow')!;
    expect(eb.textCase).toBe('UPPER');
  });
  it('8 effect styles split dark/light', () => {
    expect(effectStyles.length).toBe(8);
    expect(effectStyles.find((s) => s.name === 'Shadow/Dark/Small')?.color).toBe('rgba(0, 0, 0, 0.5)');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `styles-map.ts`** — the 7 roles + 11 scale + `Label/Eyebrow` `TextStyleDef`s referencing `Font/*` var names (per spec §9), and the 8 `EffectStyleDef`s from `tokens.css` shadows (dark sm/md/lg/xl + light sm/md/lg/xl, geometry per spec §10).

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Commit** — `feat: text + effect styles map`.

---

## Task 8: In-memory Figma fake + variables wrappers (TDD)

**Files:**
- Create: `figma-plugin/test/fake-figma.ts`, `figma-plugin/src/lib/figma-variables.ts`, `figma-plugin/test/figma-variables.test.ts`

- [ ] **Step 1: Write `test/fake-figma.ts`** — a minimal in-memory implementation of the subset used: `variables.createVariableCollection(name)`, `collection.addMode`/`modes`/`renameMode`, `variables.createVariable(name, collection, resolvedType)`, `variable.setValueForMode(modeId, value)`, `variables.createVariableAlias(variable)`, `variables.getLocalVariableCollectionsAsync()`, `variables.getLocalVariablesAsync()`. Track created objects in arrays so tests can assert.

- [ ] **Step 2: Write failing test** (`test/figma-variables.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { FakeFigma } from './fake-figma';
import { findOrCreateCollection, upsertPrimitive, upsertAlias } from '../src/lib/figma-variables';

describe('figma-variables', () => {
  it('is idempotent: creating the same collection twice returns one', async () => {
    const f = new FakeFigma();
    const a = await findOrCreateCollection(f as any, 'Primitives', ['Value']);
    const b = await findOrCreateCollection(f as any, 'Primitives', ['Value']);
    expect(a.id).toBe(b.id);
    expect((await f.variables.getLocalVariableCollectionsAsync()).length).toBe(1);
  });
  it('upsertPrimitive sets value and re-run updates in place', async () => {
    const f = new FakeFigma();
    const col = await findOrCreateCollection(f as any, 'Primitives', ['Value']);
    const v1 = await upsertPrimitive(f as any, col, { name: 'Color/Green/500', type: 'COLOR', value: '#2c8a6e' });
    const v2 = await upsertPrimitive(f as any, col, { name: 'Color/Green/500', type: 'COLOR', value: '#000000' });
    expect(v1.id).toBe(v2.id);
    expect((await f.variables.getLocalVariablesAsync()).length).toBe(1);
  });
});
```

- [ ] **Step 3: Run to verify it fails** — FAIL.

- [ ] **Step 4: Implement `src/lib/figma-variables.ts`**

Functions take `figma` as first arg (DI). Implement: `findOrCreateCollection(figma, name, modeNames)` (find by name in `getLocalVariableCollectionsAsync`, else create + set modes), `upsertPrimitive(figma, collection, PrimitiveVar)` (find-or-create var by name+collection, `setValueForMode` on the single mode; convert hex→Figma `RGB(A)` via `lib/color`), `upsertSemantic(figma, collection, SemanticVar, primIndex)` (per-mode literal or `createVariableAlias`), `upsertComponent(figma, collection, ComponentVar, resolveIndex)` (alias or literal). Names with `/` create Figma groups automatically. `#state` suffix stays literal in the variable name (Figma has no state concept — documented).

- [ ] **Step 5: Run to verify pass** — PASS.

- [ ] **Step 6: Commit** — `feat: idempotent figma variable wrappers + fake`.

---

## Task 9: Figma styles wrappers (TDD)

**Files:**
- Create: `figma-plugin/src/lib/figma-styles.ts`, `figma-plugin/test/figma-styles.test.ts` (extend `fake-figma.ts` with `createTextStyle`, `createEffectStyle`, `getLocalTextStylesAsync`, `getLocalEffectStylesAsync`, `loadFontAsync`).

- [ ] **Step 1: Write failing test** — assert `upsertTextStyle` is idempotent by name; assert a missing font is caught and the style is reported as skipped (fake `loadFontAsync` throws for `{family:'Missing'}`); assert `upsertEffectStyle` creates a DROP_SHADOW with parsed rgba.

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `src/lib/figma-styles.ts`** — `upsertTextStyle(figma, def, resolveFontVars)` loads the font (try/catch → return `{skipped:true, reason}`), sets family/size/lineHeight/letterSpacing/textCase, binds fields to `Font/*` variables via `setBoundVariable` when available; `upsertEffectStyle(figma, def)` sets a single `DropShadowEffect` from parsed rgba + geometry. Both find-or-create by name.

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Commit** — `feat: idempotent figma style wrappers + font-guard`.

---

## Task 10: Orchestrator (code.ts) + UI

**Files:**
- Modify: `figma-plugin/src/code.ts`, `figma-plugin/src/ui.html`
- Create: `figma-plugin/src/lib/apply-model.ts`, `figma-plugin/test/apply-model.test.ts`

- [ ] **Step 1: Write failing test** (`test/apply-model.test.ts`) — `applyModel(fakeFigma, model, options)` returns a summary `{created, updated, skipped}` and, against the fake, creates 3 collections with the right modes, N variables, and the styles; a second `applyModel` run yields `created:0` (all updated) proving idempotency; `dryRun:true` mutates nothing.

- [ ] **Step 2: Run to verify it fails** — FAIL.

- [ ] **Step 3: Implement `src/lib/apply-model.ts`** — order: Primitives collection (mode `Value`) → Semantic collection (modes `Dark`,`Light`) → Component collection (mode `Value`) → text styles → effect styles. Build a name→variable index after each layer so later aliases resolve. Respect `options` (per-layer toggles, `dryRun`). Return counts + warnings (skipped fonts, orphaned names present in file but absent from model).

- [ ] **Step 4: Run to verify pass** — PASS.

- [ ] **Step 5: Implement `code.ts`** — import `model.generated.json`, on `build` message call `applyModel(figma, model, options)`, `figma.notify` the summary, post the log back to the UI. Wrap in try/catch → report partial success.

- [ ] **Step 6: Implement `ui.html`** — title, primary **Build / Update design system** button, per-layer checkboxes (all checked), **Dry run** checkbox, and a scrollable `<pre>` log populated from `onmessage`. Inline CSS using the brand palette (primary `#2C8A6E`).

- [ ] **Step 7: Run full test suite + build** — `npm test && npm run build` → all green; `dist/code.js`, `dist/ui.html`, `src/model.generated.json` exist.

- [ ] **Step 8: Commit** — `feat: orchestrator + plugin UI`.

---

## Task 11: Manual verification in Figma + README

**Files:**
- Create: `figma-plugin/README.md`

- [ ] **Step 1: Load & run** — Figma → Plugins → Development → Import plugin from manifest → `figma-plugin/manifest.json`. Open a scratch file. Run **Acrivault DC** → **Dry run** first (inspect the log), then uncheck and **Build**.

- [ ] **Step 2: Verify** — 3 collections (`Primitives` 1 mode, `Semantic` Dark+Light, `Component` 1 mode) with expected counts; spot-check `Button/Primary/Background` → `Brand/Accent/Strong`; local text styles (19) + effect styles (8) present; flip a frame's Semantic mode Dark→Light and confirm a fill bound to `Surface/Base` reflows. Note whether Inter was available (else text styles reported skipped).

- [ ] **Step 3: Re-run idempotency check** — run Build again; confirm no duplicate collections/variables/styles.

- [ ] **Step 4: Write `README.md`** — what it builds, install/build/run steps (spec §15), update workflow (`npm run build` after `tokens.css` changes), font requirement (Inter + JetBrains Mono), and the §12/§17 notes (RiskPill High=Medium, normalizations).

- [ ] **Step 5: Commit** — `docs: plugin README`.

---

## Self-Review (completed against spec)

- **Coverage:** Architecture (Task 1,10), baked model from tokens.css (Task 4), promoted tokens §7.3 (Task 5), Component layer 48 families §8 (Task 6), 19 text + 8 effect styles §9/§10 (Task 7), idempotency §11 (Tasks 8–10), aliasing/mode-flow §5/§11 (Tasks 4,5,8,10), font error handling §14 (Task 9), UI/dry-run §13 (Task 10), install/verify §15/§16 (Task 11). All spec sections map to a task.
- **Type consistency:** `PrimitiveVar/SemanticVar/ComponentVar/Model` defined in Task 3 and used verbatim in Tasks 4–10. Wrapper names (`findOrCreateCollection`, `upsertPrimitive`, `upsertSemantic`, `upsertComponent`, `upsertTextStyle`, `upsertEffectStyle`, `applyModel`) are consistent across tasks.
- **Known allowed exceptions:** Task 6 is guarded data-entry (exhaustive rows not inlined) — justified and protected by `validateModel` + family/dup guard tests. Task 5 Step 6 notes a build-order dependency on Task 6/7 stubs.
