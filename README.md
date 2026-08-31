# Acrivault — Wave 1 console

> Securing every identity that has no face.

A frontend-only, production-grade React application for Acrivault's Wave 1 surface:
discovery, governance, monitoring, rotation, intelligence, and a read-only blast
radius for the non-human identities (service accounts, API keys, OAuth tokens,
workload identities, and AI agents) that act inside cloud systems with no person
behind them.

There is **no backend**. All data comes from a typed, seeded, in-memory mock layer
that behaves like a real API (async, paginated, fallible). **Synthetic data only** —
no real accounts, credentials, or customer data.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173 — opens to a populated dashboard in dark mode
```

Other scripts:

```bash
npm run build      # type-check (strict) + production build
npm run preview    # serve the production build
npm run lint       # ESLint (typescript-eslint + jsx-a11y)
npm run typecheck  # tsc -b, no emit
npm test           # Vitest (formatters, risk bands, permissions, four-states, count reconciliation)
```

Requirements: Node 20.19+ / 22.12+ / 24 and npm.

## The two switchers (how to see every state)

This UI ships every data screen in **four states** — loading, empty, error,
populated — plus a **role-restricted** state, all reachable without editing code.

- **Scenario Switcher** — a floating panel in the bottom-right corner (dev builds
  only, hidden in production). It forces any screen into loading / empty / error /
  populated, and flips **role**, **theme**, **density**, **latency**, and
  **reduced motion**. This is the fastest way to review every state.
- **Top-bar controls** — the theme toggle, density toggle, and **role switcher**
  (Tenant Admin / Security Admin / Security Analyst / Viewer-Auditor) are always
  available. Role gates the UI through one permission matrix
  (`src/lib/permissions.ts`), including the rank rules that govern who can invite,
  edit, suspend, and delete other users.
- The Scenario Switcher also has an **Auth & admin** control that forces the named
  registration/administration failure modes (email outage, expired code, legal-docs
  failure, provisioning failure, invite-email failure, generic API failure).

Theme, role, and density persist to `localStorage`; the scenario does not (so reloads
start clean). Dark is the default; light is first-class.

### Scaling the dataset

The inventory targets smooth performance at 50,000 rows. The default population is
small for fast loads. To scale up, append `?scale=50000` to the URL (or set
`localStorage['acrivault.scale']`). Counts reconcile at any size.

## Where things live

```
src/
  app/          router, providers, AppShell (sidebar/topbar), scenario switcher
  components/
    ui/         the bespoke design system (Button, RiskPill, QueryBoundary, …)
    charts/     Recharts wrappers + custom SVG graphs
  app/          …also AuthLayout (centered, for the public auth routes)
  features/     one folder per screen (dashboard, onboarding, platform, auth, admin, …)
  lib/          format, risk band mapping, permissions, a11y, cn, apiError
  mocks/        types (the domain contract), seeded dataset, generators, async API
  stores/       Zustand UI store (theme/role/density/scenario), auth session, wizard flow
  styles/       tokens.css (the only place raw colors live) + globals.css
```

The **design system** is documented at the in-app route **`/design-system`**.

## Registration & administration (add-on)

A second route group lives **outside** the app shell in a centered `AuthLayout`:
organization registration and the authentication screens those flows route through.
The administration surface (Manage Users, Single Sign-On) lives **inside** the shell
under `/settings`.

There is **no backend**: every auth, SAML, SCIM, MFA, email-verification, and
tenant-provisioning behavior is simulated against the mock layer and marked
`// ASSUMPTION:` in code. The app defaults to an **authenticated** demo Tenant Admin
so the in-app screens stay directly reachable; **Sign out** (account menu) clears the
session and exercises the unauthenticated → `/login` guard.

Demo entry points (synthetic):

- **Register**: `/register` — use any work email on a fresh domain (e.g.
  `founder@newco.com`). `@acme.com`/`@globex.com` are "already registered"; personal
  domains (gmail, yahoo, …) are rejected.
- **Verification & MFA codes**: `123456`.
- **Login**: `/login` — SSO is the prominent path; the password fallback accepts any
  password. Try `morgan.ellis@acme.com` (suspended) or `taylor.quinn@acme.com`
  (expired) to see those error states.
- **Single sign-on**: `/settings/sso` — Entra is the only identity provider. Press
  **Edit** on step 1 and paste the two URLs the wrong way round, or paste XML into the
  certificate box, to see the form catch it. **Rotate token** issues a token once and
  then waits for Entra to call back on its own (~12s, simulated).
- **Manage users**: `/settings/users` — **Sync** reports what changed; two people
  arrive from Entra with no role, which the triage banner surfaces.
- **Reset password**: `/reset-password/expired` shows the expired-link state.

The four roles are **Tenant Admin** (org owner), **Security Admin**, **Security
Analyst**, and **Viewer / Auditor**. Rank rules: you may only assign a role at or
below your own (only a Tenant Admin can grant Tenant Admin), and you may only edit /
suspend / delete a user of strictly lower rank (never yourself). Switch the role in the
top bar and watch the Manage Users actions menu gate per row. The mock enforces the
same rules server-side. Every successful admin action writes an immutable audit entry;
deleting a user removes them from the tenant but leaves their audit entries in place.

## Design intent

- The resting interface is **calm and near-monochrome**. Color is reserved for
  **risk and anomaly** — a screen with nothing wrong shows almost no color beyond the
  brand green.
- All numerals use **tabular figures** so columns and counts don't jitter.
- **Counts reconcile**: the dashboard total, the inventory total, and the per-type
  breakdown are the same numbers because they read from one dataset. This is asserted
  by a test (`src/mocks/reconcile.test.ts`).
- **Accessibility is a requirement**: WCAG 2.2 AA target, keyboard operable, visible
  focus, semantic landmarks, live-region announcements, reduced-motion honored. A dev
  axe pass logs violations to the console.

## This UI displays results; it never computes them

Risk scores, identity correlation, type classification, policy enforcement, rotation
mechanics, and reachability are produced **upstream** by systems this app does not own.
The fixtures carry these values precomputed; the UI reads and renders them. Each place
the mock layer fabricates such a value is marked in code with `// ASSUMPTION:`.

### Assumptions log

These are upstream or owned by another team. We display their outputs from fixtures and
flag each in code. Confirm before relying on them:

- Correlation and matching behavior.
- Type classification for the per-type breakdown.
- Risk-score derivation, bands, and thresholds.
- Policy grammar, the plain-English generation, the generated code, and enforcement.
- Rotation and cascade-revocation mechanics, and the six-phase lifecycle naming.
- Identity Firewall enforcement.
- Reachability and estimated containment (Resilience core).
- Cloud-connection mechanism and scopes.
- The final role list and permission matrix (BA owned).
- Whether SSO ships now or later for design partners.

Registration & administration add-on:

- **Four rank-ordered roles** (1 = highest): **Tenant Admin** (all access incl. users,
  roles, SSO, billing), **Security Admin** (policies, alerts, rotation, Connect — no user
  or billing management), **Analyst** (view, investigate, acknowledge — no policy/settings
  changes), **Read-only / Auditor** (view only). The capability split and the final matrix
  are **BA-owned** — implemented per the stated model, to confirm. Billing has no in-product
  surface in Wave 1.
- **Only a Tenant Admin manages users** (invite/edit/suspend/delete); enforced server-side
  by capability, not just rank.
- **Sign-in is decided per tenant**: a tenant with an IdP uses **SSO only** (password is
  never offered); a tenant with no IdP uses the **email + password** fallback, then
  mandatory MFA. A dev toggle on the sign-in/accept screens previews both forks.
- **Account lifecycle** uses one verb pair, **Suspend / Activate**. A lapsed **validity
  window maps to Suspended** — there is no separate "Expired" account status. You cannot
  suspend, delete, or demote the **last active Tenant Admin** (including yourself).
- **Onboarding / Connect is admin-only** (the Connect capability — Tenant Admin or Security
  Admin); other roles are gated out, not walked through read-only.
- Identity-provider integration and the **SSO handshake** (Entra ID, Okta).
- **MFA** enrollment and verification, and that it is fixed-on with no disable.
- **Email verification**, the 10-minute code time-to-live, and the email service.
- **Invitation** token issuance, expiry, and revocation.
- **Validity-window** enforcement (the UI displays and respects it; enforcement is
  upstream).
- **Tenant provisioning** and the allowed-domain configuration tied to SSO.
- **Group** semantics beyond assignment and creation (minimal surface for now).
- The **password-fallback** path, including reset, and how it coexists with mandatory
  MFA.
- The **session model**: the app simulates a session that defaults to authenticated; a
  real session, SSO, and MFA are upstream.
- **Known a11y note**: while a Radix modal is open, the shell is `aria-hidden` and focus
  is trapped; axe reports `aria-hidden-focus` / missing-landmark against the hidden
  background. This is inherent to the shared Dialog primitive (every dialog in the app)
  and the modal's own focus management is correct. All steady-state routes are
  axe-clean in both themes.

## Build status

Built in phases (see the in-repo task list). Complete and verified (strict types, tests,
production build, lint, axe-clean, both themes):

- **Phase 0** — foundation (tokens, mock layer, app shell, design system).
- **Phase 1** — Dashboard + Onboarding.
- **Phase 2** — Identity Inventory (virtualized treegrid, smooth at 50k rows via
  `?scale=50000`; type/risk/orphaned/conflicts filters with reconciling counts; search;
  saved views; sort; selection + role-gated bulk actions; expandable correlated rows) and
  the **Identity Detail** right-panel (sources, attribute conflicts, derived labels, risk
  timeline, relationships, role-gated actions).
- **Phase 3** — Policy Builder: policy list + a WHEN/AND/THEN token canvas with a live
  plain-English preview, an affected-count that reconciles with the inventory, a read-only
  generated-code panel, Test (simulated evaluation), and Admin-gated Save & Activate
  (Analyst can author/test; Viewer is read-only).
- **Phase 4** — Monitor (baseline-learning/established strip, severity-filtered alert feed
  with reconciling counts, alert detail with recommended next step + identity risk timeline,
  role-gated acknowledge/resolve) and **Blast Radius** (read-only custom-SVG radial
  reachability graph with direct/transitive/cascade styling, reach summary, estimated
  containment, reach-kind filter).
- **Phase 5** — Agent Session Replay: session list + the signature replay (step timeline
  with distinct anomalies and jump-to-anomaly, step detail, provenance side rail, identity
  link, and role-gated mark-reviewed [Analyst+Admin] / quarantine [Admin] with confirms).
- **Phase 6** — Rotate (six-phase lifecycle track per job, standard + emergency entry
  points, the emergency **MFA + two-acknowledgement gate**, cascade-revocation view,
  immutable history) and Platform (Settings with Admin-gated user role management +
  connected clouds, SSO config with a timing-assumption note, append-only Audit log,
  Notifications feed + preferences).
- **Phase 7** — Wave 2 concept screens (Recovery Rehearsals — time-to-usable + rehearsal
  history; Defender Copilot — ranked, human-approved suggestions), then hardening: a
  full-route **axe sweep in both themes (0 violations)**, a contrast pass, and this README.
- **Phase 8 (add-on)** — Registration & Administration. 8a foundation (the fourth role +
  rank rules, domain types, mock tenants/users/groups/invitations + simulated
  auth/verify/SSO/MFA/provisioning with failure scenarios, new components, `AuthLayout`,
  auth session); 8b registration (Request Access → Verify → Legal Terms → provisioned);
  8c authentication (SSO-first Login + password fallback, MFA setup + challenge, password
  reset); 8d administration (Manage Users with rank-gated row actions, Edit,
  Suspend/Activate, Delete, audit writes, minimal Groups); 8e hardening (per-route axe in
  both themes, registration walked end to end, this README).
- **Phase 9 (add-on)** — Entra-provisioned users. Invitations are replaced by SAML
  federation plus SCIM provisioning: `/settings/sso` is a two-step setup whose status is
  observed rather than asserted (a step turns green only when Entra exercises it), the
  paste fields catch Entra's three classic mistakes, and Manage Users is reorganised
  around assigning roles to the people Entra sends.

**All build phases (0–7 plus the 8a–8e add-on) are complete.** Every route renders in both
themes with all four states plus role-restricted, reachable via the switchers without code
edits.

## Brand notes

Name **Acrivault**. Primary green `#2C8A6E`. Georgia is brand/wordmark only; the product
UI is **Inter**, with **JetBrains Mono** for code and identifiers.
