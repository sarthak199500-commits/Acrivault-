---
category: Status
---

The single component that expresses **risk severity**, and the only place in the
status family where colour is spent freely. It takes a precomputed 0..100 score, maps
it to a band via `lib/risk.ts`, and renders the band label with the number. It never
computes a score itself — scoring happens upstream.

Bands are Critical (80+), High (60+), Medium (40+), Low (20+), Minimal (below 20).
Every pill pairs its colour with both a written band label and a direction glyph
(up / flat / down), so severity survives greyscale and colourblind viewing. The
token triplets are contrast-tuned to pass AA in both themes.

Use `size="sm"` inside table rows and `md` in detail headers; `showScore={false}`
drops the number where the exact score already appears nearby. Do not substitute a
`Badge` with a red tone for this — RiskPill is what makes risk consistent and
auditable across the console.
