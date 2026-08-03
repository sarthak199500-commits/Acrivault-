# Registration & Login Flow — Create Password, Domain Verification, OTP Reset

**Date:** 2026-08-03
**Status:** Approved
**Scope:** `src/features/auth`, `src/features/onboarding` entry, `src/mocks/api.ts`, `src/stores/flow.ts`, one new shared UI component.

## Problem

Three gaps in the registration and authentication flows:

1. **No password is ever created during registration.** The tenant admin completes
   `/register → verify → terms → complete → mfa/setup → onboarding` without setting a
   password, yet the login screen offers email + password sign-in. A registered owner
   cannot use the password path they are offered.
2. **Domain verification is not a screen.** It runs as an automatic backend phase inside
   `VerifyEmailScreen` (spinner → auto-advance). There is no surface showing the DNS
   record the organization must publish, and no way to retry deliberately.
3. **Password recovery is link-based, not OTP-based.** `ForgotPasswordScreen` ends in a
   terminal "check your email" state and `ResetPasswordScreen` is reached only via
   `/reset-password/:token`. There is no code-entry step.

## Non-goals

- Real authentication, MFA cryptography, DNS resolution, or IdP integration. All of it
  stays simulated against the in-memory store; those concerns are upstream and
  Architect-owned.
- Changing the SSO sign-in path or the MFA challenge.
- Re-ordering `AcceptInviteScreen`'s password-before-MFA sequence.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Create-password placement | Before `/mfa/setup`, after `/register/complete` | User-specified: align with `AcceptInviteScreen`, where the password precedes MFA. First factor established before the second is added. |
| Progress model | 5 steps | User-specified. `Account · Verify · Domain · Terms · Secure` — domain gets its own numbered step; `Secure` spans password then MFA. |
| Domain verification gate | Blocking, with retry | An unverified domain never reaches tenant provisioning. |
| Password reset mechanism | Add OTP screen, **modify** the existing reset screen | User-specified: do not delete and rebuild `ResetPasswordScreen`. The emailed-link path stays routable. |
| Password policy | ≥12 chars + upper + lower + digit + symbol | Single source of truth in `src/lib/password.ts`, shared by UI and mock validation. |

Both entry flows now order the factors identically:

- **Registration:** Create Password (5a) → MFA Setup (5b) → Onboarding.
- **Invitation:** Accept Invitation (sets password) → MFA Setup → Dashboard.

`MfaSetupScreen` enforces it: a first-run owner without `passwordSet` is redirected to
`/register/password`, so the password step cannot be skipped by URL. Invited users have
`firstRun` false and are unaffected.

## Design

### Registration routes

| Route | Screen | Progress step |
|---|---|---|
| `/register` | `RequestAccessScreen` — clears downstream flags on re-entry | 1 · Account |
| `/register/verify` | `VerifyEmailScreen` — domain phases removed, email code only | 2 · Verify |
| `/register/domain` | **`VerifyDomainScreen`** (new) | 3 · Domain |
| `/register/terms` | `LegalTermsScreen` — guarded on `domainVerified` | 4 · Terms |
| `/register/complete` | `RegisterCompleteScreen` — exits to `/register/password` | — |
| `/register/password` | **`CreatePasswordScreen`** (new) → `/mfa/setup` | 5 · Secure |
| `/mfa/setup` | `MfaSetupScreen` — guarded on `passwordSet`; → `/onboarding` | 5 · Secure |

`VerifyEmailScreen` loses `Phase`, `SuccessMark`, `runDomainVerification`, and the
`domain-verified` auto-advance timer. On a successful code it sets `registerVerified` and
navigates to `/register/domain`.

**`VerifyDomainScreen`** renders the DNS challenge as a three-column `Type / Name / Data`
table (`TXT`, `@`, `acrivault-verify=<32-hex>`), an info banner explaining the action, a
copy control on the record value, and a primary `Verify Domain & Continue` button. On
failure it renders a `warning` Banner: "TXT record not found on the domain yet. DNS
changes can take up to an hour to propagate — try again shortly." The success beat (mark +
domain, ~1.8s hold) moves here from `VerifyEmailScreen` and then advances to
`/register/terms`.

**`CreatePasswordScreen`** uses `PasswordFields`, calls `createPassword`, sets
`passwordSet`, and navigates to `/mfa/setup`. Guarded: requires `registerEmail` and
`firstRun`, else redirects to `/login`. It deliberately does **not** clear `firstRun` —
MFA still needs it, and clearing it here would re-arm this screen's own guard mid-submit.
`MfaSetupScreen` clears it on completion.

### Recovery routes

| Route | Screen |
|---|---|
| `/forgot-password` | `ForgotPasswordScreen` — terminal "check your email" state replaced by a navigate |
| `/forgot-password/verify` | **`ResetOtpScreen`** (new) — 6-digit code, 10-min TTL, resend, auto-resend on expiry |
| `/reset-password` | `ResetPasswordScreen` — `token` param now optional |
| `/reset-password/:token` | Same component; emailed-link path and expired-link state unchanged |

`ResetPasswordScreen` gains one guard: with neither a `token` param nor
`resetOtpVerified`, redirect to `/forgot-password`. Its hand-rolled password inputs are
replaced by `PasswordFields`.

### Shared component

**`PasswordFields`** (`src/components/ui/PasswordFields.tsx`) — new + confirm inputs, a
show/hide toggle, a strength meter, the policy requirements, and mismatch state. Reports
validity upward via `onValidityChange`. Consumed by `CreatePasswordScreen`,
`ResetPasswordScreen`, and `AcceptInviteScreen` (which previously duplicated a bare
12-char check).

The five requirements live in a **tooltip** rather than an always-on list, which keeps the
narrow auth card from spending five lines on them. Because `Tooltip`'s own contract is
that its content is supplementary and never the only route to the information, the card
keeps a live inline summary — `"3 of 5 requirements met"` / `"All requirements met"` —
which doubles as the tooltip trigger. It is a real `<button>`, so the list opens on
keyboard focus and touch, not hover alone. An `sr-only` copy of the full checklist stays
wired to the password field via `aria-describedby` and owns the polite live region, so
assistive tech gets per-rule state without discovering a hover affordance; the tooltip
copy is silent to avoid double announcements.

Note for tests: Radix throws without a `TooltipProvider`. The app mounts one in
`Providers`, but test renders of these screens must wrap it themselves.

Design-system compliance: `Input` for the fields, `Banner` tones for messaging,
`var(--r-sm)` / `var(--fs-small)` / `var(--ok-fg)` / `var(--crit-fg)` tokens throughout,
`IconButton`-style affordance for show/hide, `motion-safe:` guards on any transition. No
raw hex, no Tailwind default palette.

### Mock API additions (`src/mocks/api.ts`)

```
DomainChallenge { domain, recordType: 'TXT', name: '@', value: string }
getDomainChallenge(domain): DomainChallenge      // deterministic 32-hex from domain
verifyDomain(domain)                             // + DOMAIN_TXT_NOT_FOUND error
createPassword(email, password): { ok: true }    // full-policy validation; records the owner
verifyPasswordOtp(code): { ok: true }            // VERIFICATION_CODE, INVALID_CODE/CODE_EXPIRED
resendPasswordOtp(): { ok: true }                // EMAIL_OUTAGE
resetPassword(token: string | undefined, password)  // token optional
```

`createPassword` takes the email because it must record the owner as a known account.
`acceptLegal` deliberately does not persist the new tenant into the seeded Acme dataset,
so `login()` would otherwise reject the very password the owner just created — the
create-password screen would promise a credential the login screen refused. A
module-level `registeredOwners` set of emails closes the loop; the password itself is
never stored, consistent with the rest of the simulation, which does not verify passwords
at all. Like all mock state this is per-page-load, so a full reload forgets the owner.

The `domain-unverified` auth scenario keys the TXT-not-found failure, so the existing
scenario switcher exercises the new error state without new plumbing.

### Flow store additions (`src/stores/flow.ts`)

`domainVerified`, `passwordSet`, `resetEmail`, `resetOtpVerified` with setters, all
cleared by `reset()`.

## Implementation note: guard vs. Zustand render ordering

A route guard that redirects on a Zustand flag will fire against you if the same
handler clears that flag before navigating. `setResetOtpVerified(false)` flushes a
**synchronous** re-render (Zustand notifies via `useSyncExternalStore`) that jumps ahead
of any queued React state update in the same handler. The guard therefore re-arms and
`<Navigate replace>` wins before `navigate('/login')` on the next line ever runs — the
observed symptom was landing on `/forgot-password` after a successful reset.

`ResetPasswordScreen` latches with a **`useRef`**, set immediately before the flag is
burned. A ref mutates synchronously, so the guard sees it on that forced render; a
`useState` latch does not and reproduces the bug. `MfaSetupScreen` carries the same latch
for the same reason — it clears `firstRun` while its own guard reads it.

This is invisible to Testing Library: `userEvent` wraps interactions in `act()`, which
batches the forced render away, so the routing test passes with or without the latch.
It was reproduced against the dev server by instrumenting `history.pushState` /
`replaceState` — the failing signature is two `replaceState -> /forgot-password` entries
and no `pushState -> /login`.

`CreatePasswordScreen` is not affected: it writes only `passwordSet`, which its guard does
not read.

## Testing

Vitest + Testing Library, matching the existing `LoginScreen.test.tsx` / \
`OnboardingScreen.test.tsx` pattern:

- `password.test.ts` — policy checks at each boundary.
- `VerifyDomainScreen.test.tsx` — renders the TXT record; failure shows the propagation
  warning and stays on the screen; success advances.
- `CreatePasswordScreen.test.tsx` — submit disabled until policy + match satisfied;
  success navigates to `/mfa/setup`; `firstRun` survives for the MFA guard.
- `MfaSetupScreen.test.tsx` — a first-run owner without `passwordSet` is redirected to
  `/register/password`; invited users are admitted; the stepper appears only in a first
  run. Verified to fail when the guard is removed.
- `ResetOtpScreen.test.tsx` — invalid code clears and refocuses; verified state advances
  to `/reset-password`.
- Guard tests: `/register/terms` without `domainVerified` redirects to `/register/domain`;
  `/reset-password` without token or OTP redirects to `/forgot-password`.
