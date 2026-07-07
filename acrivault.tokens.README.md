# Acrivault design tokens → Figma

`acrivault.tokens.json` is a **Tokens Studio for Figma** file. It mirrors the app's
token contract (`src/styles/tokens.css`) so design and code stay in sync.

## Import (Tokens Studio plugin — recommended)

1. In Figma, install the free **Tokens Studio for Figma** plugin and open it.
2. Plugin menu → **Tools → Import** → **Single file** (or drag the JSON in).
3. Select `acrivault.tokens.json`. Three token sets load: `primitives`, `theme/light`, `theme/dark`.
4. Open the **Themes** tab — two themes are predefined: **Light** and **Dark**. Each enables
   `primitives` as *source* plus its `theme/*` set.
5. Click **Create / sync variables** (or **Export → Variables**) to push everything into native
   **Figma Variables** as collections, with one mode per theme.

## How it's organized

- **`primitives`** (theme-independent): the raw palette and scales.
  - `color.green / neutral / red / amber / blue` — full `50 → 900` ramps
  - `color.accent` (aliases the green ramp), `color.risk`, `color.status`, `color.categorical`
  - `space`, `size`, `radius`, `borderWidth`, `opacity`, `blur`, `zIndex`, `breakpoint`,
    `duration`, `easing`
  - `font.family / weight / size / lineHeight / tracking` + composite `text.*` text styles
    (display, h1, h2, body, small, micro, eyebrow, code)
- **`theme/dark`** & **`theme/light`** (the semantic layer that flips per theme):
  `bg`, `surface.*`, `border.*`, `text.*`, `accent.*`, `risk.*`, the badge pairs
  (`ok/warn/crit/info/neutral-badge` → `bg`+`fg`), `grid-line`, `scrim`, and `shadow.*`.

## Notes

- All `color-mix()` values from the CSS are pre-resolved to static hex (Figma can't compute them).
- Aliases use `{group.token}` syntax and all resolve against `primitives`.
- Colors with transparency use 8-digit hex (e.g. `scrim` = `#0000009e`).
- Validated: 220 tokens, 57 aliases, 0 broken references.
