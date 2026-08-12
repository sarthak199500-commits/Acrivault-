# design-sync notes — Acrivault

Repo-specific gotchas for future syncs. Read this before re-running anything.

## Shape: `package`, but the repo is an app, not a library

Acrivault is a Vite **application** — `private: true`, no `main`/`module`/`exports`,
no `dist/` library entry, no shipped `.d.ts` tree. Three consequences:

- **`--entry` is mandatory.** Without it the converter sets `PKG_DIR` to
  `node_modules/acrivault`, which never exists (npm won't self-install), and dies
  with `ENOENT … acrivault/package.json`. With `--entry` it walks up from the
  entry file to the repo's own `package.json` instead.
- **`componentSrcMap` must enumerate every component.** With an `--entry`
  override the converter skips synth-entry discovery and reads exports from a
  `.d.ts` tree this repo doesn't have, so discovery yields zero.
- **`.design-sync/gen-entry.mjs` generates all of it** — the entry barrel, the
  `componentSrcMap`, the per-component doc stubs, and `theme-default.css`. It is
  the first step of `cfg.buildCmd`, so a normal re-sync picks up added/removed
  components automatically. Run it manually after touching `src/components/**`
  if you are not running the full `buildCmd`.

## Grouping comes from doc frontmatter, not the file tree

`src/components/ui/` maps to group `general` because `ui` is in the converter's
`GENERIC_DIR` list. Groups are therefore set by `category:` frontmatter in
`.design-sync/docs/<Name>.md`, using the 9 section names from the team's own
showcase page (`src/features/platform/design-system/`). The group table lives in
`GROUPS` at the top of `gen-entry.mjs`; it fails loudly if a component on disk is
ungrouped, or a grouped name is no longer on disk. `docsDir` discovery binds the
files — this is not a `docsMap` enumeration.

Doc **bodies** are hand-written prose; `gen-entry.mjs` only owns the frontmatter
block and leaves everything below it alone.

## The dark theme had to be made real (important)

`src/styles/tokens.css` puts every surface token behind `[data-theme='dark']` /
`[data-theme='light']`, and the density tokens behind `[data-density='…']`.
Nothing in CSS supplies a default — the running app only works because
`index.html` hardcodes `data-theme="dark" data-density="comfortable"` on `<html>`.

A preview card, or a design the claude.ai/design agent builds from this system,
has no such attribute, so `--bg` / `--text-primary` / `--row-py` resolve to
nothing: white page, black text, dark component surfaces floating on top.

`gen-entry.mjs` therefore re-projects the `[data-theme='dark']` and
`[data-density='comfortable']` blocks under `:root:not([data-theme])` /
`:root:not([data-density])` into `.design-sync/theme-default.css`, which
`buildCmd` appends to the compiled stylesheet. Both themes stay selectable —
setting `data-theme="light"` still wins.

**Re-run `gen-entry.mjs` whenever the theme blocks in tokens.css change**, or the
shipped default silently drifts from the source of truth.

## CSS: Tailwind v4, and why it must be compiled first

`cfg.cssEntry` points at `.design-sync/.cache/compiled.css`, which `buildCmd`
produces by running the app's own Vite build and copying the content-hashed
`dist/assets/index-*.css` to a stable path (then appending `theme-default.css`).

- The **source** `src/styles/globals.css` is useless as `cssEntry` — it is
  `@import 'tailwindcss'` plus `@theme`, with no utilities in it.
- `cfg.tokensGlob` does **nothing** here. `copyTokens()` returns immediately
  unless `cfg.tokensPkg` is also set, and Acrivault has no separate tokens
  package. Tokens ship inside `_ds_bundle.css` instead (globals.css imports
  tokens.css, so the compiled output carries them). `ds-bundle/tokens/` is
  empty by design.
- `.design-sync/.cache/` is gitignored, so `compiled.css` does not survive a
  fresh clone. That is fine — `buildCmd` regenerates it — but never run the
  converter without running `buildCmd` first on a clean checkout.

## Preview authoring conventions

- Import components from `'acrivault'`; `lucide-react` also resolves. `@/…`
  aliases resolve via `cfg.tsconfig` → `tsconfig.app.json`.
- **Scaffolding (frames, grids, labels) uses inline styles, never Tailwind
  classes.** Tailwind only emits classes it finds when the app CSS is compiled,
  so a class used *only* in a preview is absent until the next app build — a
  preview authored and captured in one pass would grade against a stylesheet
  missing its own layout classes. Components keep their real bundle classes.
- Every cell is framed on `var(--bg)` with `borderRadius: var(--r-md)` and
  ~20px padding, because the card template hardcodes a white page background
  (`lib/emit.mjs`, not forkable) and this DS is dark-first.
- Content is real NHI-domain material — service accounts, AWS key IDs, ARNs,
  rotation states. Never `foo`/`bar`.
- **Check story names against the render.** `CodeBlock` was authored with an
  `Unlabeled` cell; the component falls back to a default label, so the name was
  a lie and became `SingleLine`.

## Config changes that need a full rebuild

Editing `cfg.overrides` or `cfg.titleMap` and then running `preview-rebuild.mjs`
fails with `[CONFIG_STALE]` — only `package-build.mjs` re-stamps grade keys. Run
the full build after any override change.

## Fonts

The repo declares `Inter` and `JetBrains Mono` in tokens.css but ships **no**
`@font-face`, no font files, and no Google Fonts link — the app itself renders in
system fallback. Both families are SIL OFL and are now vendored into
`.design-sync/fonts/` from the `@fontsource/*` npm packages (latin subsets;
Inter 400/500/600/700, JetBrains Mono 400/500/700), wired via `cfg.extraFonts`.

The user explicitly approved shipping real webfonts. **This means the design
system renders in different type than the running app does** — worth fixing in
the app separately.

## Playwright

The render check needs playwright + chromium. This machine already had
`chromium-1228` cached under `~/AppData/Local/ms-playwright/`, which is pinned by
**playwright 1.61.1** — installed into `.ds-sync/`, so no ~200MB download. If the
cache is ever cleared, re-check the pin before installing a different version;
a mismatch fails with `browserType.launch: Executable doesn't exist`.

## Known render warns

Triaged and legitimate — a re-sync should not treat these as new:

- (none recorded yet — populate as authored components settle)

## Re-sync risks

- **`theme-default.css` is generated from tokens.css.** If someone edits the
  `[data-theme='dark']` or `[data-density='comfortable']` blocks without
  re-running `gen-entry.mjs`, the shipped default drifts from source. `buildCmd`
  runs the generator first, so this only bites if the converter is run directly.
- **`GROUPS` in `gen-entry.mjs` is hand-maintained.** A new component fails the
  generator loudly (by design) rather than landing in a wrong group — add it to
  the table.
- **Preview scaffolding depends on inline styles staying inline.** If a future
  author uses Tailwind classes in a preview, it will look correct only after the
  next app CSS build, and broken in the pass that authored it.
- **Fonts are vendored, not referenced.** A brand font change in the app will not
  reach the design system until the woff2 files in `.design-sync/fonts/` are
  refreshed.
- **The app build is a hard dependency of the sync.** `buildCmd` runs
  `tsc -b && vite build`; if the app stops type-checking, the sync cannot produce
  a stylesheet.
