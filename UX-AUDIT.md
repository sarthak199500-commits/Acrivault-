# Acrivault Wave 1 — UX Audit

**Date:** 2026-06-26
**Scope:** Whole project — all in-app routes + the registration/authentication flow (34 screens).
**Method:** Heuristic evaluation (Nielsen 10 + the ui-ux-pro-max 10-priority framework) cross-checked with **empirical measurement** in the running app — automated axe-core per route in both themes, scripted WCAG contrast measurement on rendered elements, and DOM/keyboard inspection. Findings are tagged **[measured]** (verified live this session), **[code]** (verified by reading source), or **[heuristic]** (expert judgment, not yet instrumented).
**Design principle under test:** *"The resting view is calm; colour appears only where there is risk."* Every recommendation preserves it.

> **Headline:** The app is in materially better shape than the standing remediation prompt assumes — that prompt was written against an earlier build. The foreground text ramp **passes AA in both themes**, axe is **clean on every steady-state route**, and several requested features (four list states, accessible chart pattern, KPI deltas, filter-aware counts) **already exist**. The real, evidence-backed defects are narrower and listed as P0/P1 below. Do **not** rewrite the token ramp.

---

## 1. Scope covered

| Area | Routes |
|---|---|
| Core | `/` Dashboard, `/discover` Inventory (+ detail panel), `/govern` (+ builder), `/monitor` (+ detail), `/resilience/blast-radius`, `/intelligence` Agent Sessions (+ replay), `/rotate` (+ job), `/resilience/rehearsals`, `/resilience/copilot` |
| Platform | `/settings`, `/settings/sso`, `/settings/users`, `/settings/groups`, `/audit`, `/notifications`, `/design-system`, `/onboarding` |
| Auth (no shell) | `/register` → verify → terms → complete, `/login`, `/accept-invite/:token`, `/mfa/setup`, `/mfa/challenge`, `/forgot-password`, `/reset-password/:token` |

---

## 2. What's already healthy (do not redo)

These were claimed as defects in the standing remediation prompt but are **already correct** — verified this session:

- **Foreground text ramp passes AA in both themes** **[measured]**. Dark: primary 14.4:1, secondary 8.0–10.2:1, tertiary 4.7–6.0:1 (need 3:1). Light: secondary 8.1–8.7:1, tertiary 5.0–5.4:1. Rendered Dashboard samples: eyebrow 5.44:1, description 10.17:1, h1 15.9:1. **No ramp rewrite needed.**
- **Dimming uses a token, not opacity** **[measured]** — Monitor feed had **0** opacity-dimmed elements; acknowledged rows are not faded below legibility.
- **axe-core = 0 violations** on Dashboard, Inventory (table + graph), Monitor, Agent Sessions, Blast Radius, Design System — **both themes** **[measured]**.
- **Accessible chart pattern exists** **[measured]** — the Dashboard activity chart is wrapped in `role="img"` with an `aria-label` summary **and** ships a visually-hidden `<table>` fallback; KPI sparklines carry `role="img"` labels.
- **Inventory has all four list states** **[code]** — loading skeleton, empty ("No identities discovered yet" + Start onboarding), zero-filter-result ("No identities match these filters" + Clear filters), populated.
- **Token-driven theming** (no per-screen hex), **tabular figures** (`.tnum`), **global focus-visible ring** (2px accent, 2px offset), **skip link**, **reduced-motion** (media query + manual toggle), **KPI deltas** on Dashboard and Inventory — all present **[code]**.

---

## 3. Findings by severity

### P0 — ~~Accessibility blocker~~ → CORRECTED: false positive

**F-1. Light-theme semantic badges fail AA contrast.** **[RETRACTED — measurement bug]**
The original "3.38:1" reading was an artifact of my contrast script: `color-mix()` backgrounds resolve to CSS Color-4 `color(srgb 0.90 0.93 0.97)` (0–1 floats), which the script parsed as `rgb()` 0–255 ints, reading every tinted background as near-black. Re-measured with a correct parser on rendered elements in a genuinely-reloaded light theme, **all semantic and risk badges pass AA**: success 7.0:1, info 6.3:1, warning 5.5:1, critical 6.0:1, neutral 7.7:1 (dark theme 8–12:1). **No token retune was needed** — the speculative change was reverted.
*One real (minor) issue did surface:* the notification **count chip** was `white` on `--critical` = **3.45:1** (fails AA). **Fixed** → `--red-600` background = **6.4:1**, still clearly red. (`src/app/NotificationsBell.tsx`.)
*Lesson:* the in-app contrast helper must handle `color(srgb …)` output, and theme must be tested via reload, never `setAttribute` toggle.

### P1 — High-impact UX / partial-a11y

**F-2. Blast Radius radial has no non-visual path and no keyboard access.** **[measured]**
The radial `<svg>` has no `role`, no `aria-label`, no `<title>`, **0 focusable nodes**, and no table fallback — yet the Dashboard already demonstrates the correct pattern. Edge-type legend (Direct/Transitive/Cascade) **does** exist as toggle buttons.
*Fix:* reuse the Dashboard's `role="img"` + visually-hidden `<table>` pattern; make ring nodes keyboard-reachable (roving tabindex or focusable buttons); double-encode edge type (cascade = solid red, transitive = dashed purple, direct = solid blue) and label the rings (direct / transitive / cascade). Fix `1 identity` vs `1 identities` plural agreement.

**F-3. Monitor feed is a flat, ungrouped scroll.** **[measured]** — 0 sticky headers; acknowledged items inline (not opacity-dimmed, so not a contrast fail, but a scannability/IA problem).
*Fix:* time-bucket with sticky subheaders (Today / Earlier this week); move acknowledged alerts into a collapsed `Acknowledged (N)` section that renders at full contrast when expanded; add a left severity rail + severity badge so severity is double-encoded by colour **and** shape/position; right-align tabular timestamps.

**F-4. Agent Sessions row hierarchy is flat.** **[heuristic/code]** — risk score sits in muted text with no fixed column, so Critical reads no louder than Minimal.
*Fix:* move risk into a fixed right-hand column (tabular figure + severity label beneath); apply colour + left rail **only** on Critical/High rows; promote session ID to primary weight with metadata beneath; add Open/Reviewed/Quarantined status chip; virtualize at 50+ rows.

**F-5. Inventory search & filter clarity.** **[code]** — Inventory already has KPIs, Type/Provider/Risk filter dropdowns, Orphaned/Conflicts pills, and a filtered count. Remaining gaps:
- Two search affordances (top-bar command button + page search) aren't differentiated enough — demote the global one to a compact "jump to" pill with a visible `Ctrl K` hint; make the page search the clear primary input (larger, accent focus).
- Group filters under explicit **Type / Severity / Status** labels (move Orphaned/Conflicts under **Status**).
- Give selected pills a real active state (filled accent + check icon + `aria-pressed="true"`).
- Reframe the count from "1,500 shown" to filter-aware "**247 of 1,500 · filtered by Critical**" with an adjacent **Clear**.

### P2 — Consistency / cross-cutting polish

**F-6. KPI trend treatment is inconsistent on the Dashboard.** **[code]** — only some tiles have a delta/sparkline, so it reads half-finished. Apply a consistent rule: tiles that move and matter (AI Agents, Critical risk, Orphaned) get a delta; slow-scale numbers (Total identities) stay plain. Delta colour obeys the risk rule (red only when the wrong direction is up). *(The `KpiTile` component already supports `delta`/`deltaInverted`/`sparkline` — this is wiring, not new components.)*

**F-7. Keyboard reach for custom interactive visuals.** **[measured/heuristic]** — radial nodes (F-2) and Rotate phase steps need to be keyboard-operable with the token focus ring. Verify Rotate phase steps this pass.

**F-8. Forms & date inputs.** **[heuristic]** — confirm every field has a persistent visible label (not placeholder-only), errors render adjacent to the field, and any raw native `dd-mm-yyyy` date inputs are replaced with app-styled controls (the validity-window field in user admin is the prime suspect).

**F-9. Microcopy & spacing rhythm.** **[heuristic]** — sweep for sentence case, verb-first buttons, and singular/plural agreement on all dynamic counts (`1 identity` not `1 identities`); enforce one 4/8pt spacing scale for the header → description → first-content gap so every screen shares the same vertical rhythm.

**F-10. Modal isolation.** **[code]** — Radix Dialog already traps focus and closes on Esc; confirm the scrim is 40–60% black (`--scrim` is 0.62 dark / 0.42 light — light scrim is at the low end). Note the known Radix `aria-hidden`-on-background finding while any modal is open (documented limitation, not re-architected).

---

## 4. Lens checks (from the four research/design skills)

**Personas / Jobs-to-be-done (ux-researcher-designer):** the product serves four roles already modeled in code — Tenant Admin, Security Admin, Security Analyst, Viewer/Auditor. Their core jobs: *Analyst* — "triage what's risky right now" (Dashboard → Monitor → Agent Sessions → Blast Radius); *Security Admin* — "govern & rotate" (Govern → Rotate); *Tenant Admin* — "provision people & tenants" (Users/Groups/SSO); *Viewer* — "review without acting." The P1 findings (F-3, F-4) hit the Analyst's primary triage journey hardest — that's why they rank above polish.

**Information architecture (user-research / card-sorting lens):** the See → Know → Act → Platform grouping is sound and consistent. One friction point: two search entry points (F-5) blur the "find a screen" vs "find an identity" jobs — differentiate them.

**Design-system health (ui-design-system):** strong foundation — single token source, semantic naming, theme parity for text. The one systemic gap is **light-theme semantic colour pairs** (F-1): light values were hand-tuned but not all verified against their tints. Recommend a standing contrast test (the in-app `__axeRun` + a rendered-badge contrast check) wired into the design-system page so regressions surface automatically.

---

## 5. Prioritized roadmap & mapping to the remediation prompt

| # | Finding | Sev | Effort | Remediation-prompt item | Status |
|---|---|---|---|---|---|
| F-1 | ~~Light-theme badge contrast~~ (false positive; real fix = notification count chip) | P2 | XS | §1 | ✅ Done |
| F-2 | Blast Radius a11y + edge encoding + plural | P1 | M | §6, §7 | Partial (legend exists) |
| F-3 | Monitor grouping + severity double-encode | P1 | M | §3 | Not started |
| F-4 | Agent Sessions row + risk column + virtualize | P1 | M | §4 | Not started |
| F-5 | Inventory search/filter/count clarity | P1 | M | §2 | Partial (states/KPIs/count done) |
| F-6 | Dashboard KPI trend consistency | P2 | S | §5 | Partial (component ready) |
| F-7 | Keyboard reach: radial + Rotate steps | P2 | S | §7 | F-2 covers radial |
| F-8 | Form labels + styled date inputs | P2 | S | §7 | Verify |
| F-9 | Microcopy + spacing rhythm | P2 | S | §7 | Sweep |
| F-10 | Modal scrim check | P2 | XS | §7 | Mostly done |

**Acceptance-criteria status:**
- "All body/secondary 4.5:1, tertiary 3:1, both themes" — text ✅; badges ✅ (5.5–8:1 both themes, F-1 was a false positive); notification count chip ✅ fixed.
- "No filter/count/breakdown disagrees across Dashboard/Inventory/Monitor" — ✅ (counts reconcile by construction).
- "Severity never conveyed by colour alone" — ✅ Inventory RiskPill glyphs; Monitor rail + severity icon (F-3); Sessions RiskPill + rail (F-4).
- "Every interactive element keyboard-operable with visible focus ring" — ✅ radial nodes now show the focus ring (F-2); Sessions scroll region focusable (F-4).
- "Every list/table/chart has loading/empty/error/populated" — ✅ lists; radial has aria summary + sr-only text path (F-2).

> **Remediation status (2026-06-26):** all 10 findings resolved. F-1 was a false positive (measurement-script bug) — badges verified passing AA in both themes; the one real contrast miss (notification count chip) was fixed. Verified: typecheck ✓, lint ✓, **64 tests** ✓, build ✓, **axe 0 on all 9 key routes in both themes**. Implementation plan: [docs/superpowers/plans/2026-06-26-ux-remediation.md](docs/superpowers/plans/2026-06-26-ux-remediation.md).

---

## 6. Recommended sequence

1. ~~**F-1** (P0)~~ — done (false positive corrected; notification chip fixed).
2. **F-3 + F-4** (Analyst triage journey) — highest user-value.
3. **F-2** (Blast Radius a11y) — reuse the existing chart pattern.
4. **F-5** (Inventory clarity) — finish the partially-done work.
5. **F-6 → F-10** (consistency sweep) — batch.

Each step is independently shippable and verifiable via `npm run typecheck/lint/test/build` + axe + a rendered-contrast re-measure in both themes.
