# Entra-provisioned users — design

**Date:** 2026-08-31 · **Status:** approved, in build

## The model change

Users stop being invited from Acrivault and start being pushed in by Microsoft Entra ID
over SCIM. Entra owns *who exists*; Acrivault owns *what they can do*.

Decisions taken by the founder (31 Aug 2026):

1. **Entra only.** No Okta, no generic SAML, no provider picker. Copy speaks Entra.
2. **Entra is the only way in.** No manual add, no invitations.
3. **Auto-suspend on deprovision.** When Entra deactivates someone, Acrivault cuts
   access immediately and keeps the row and its audit history.

## Lockout risk (accepted, mitigated)

With no manual add, the only non-Entra account is the Tenant Owner created during
registration. If SAML breaks, everyone is locked out except whoever can still use
password fallback. Two mitigations ship with this work:

- Password fallback stays on until a test sign-in passes, and turning it off is a
  confirmed action that names the consequence.
- Saving a SAML config that would leave zero usable sign-in paths is refused.

## Screen 1 — `/settings/sso`

One route, two modes. **Setup** while unconfigured; **console** once connected, with
the form behind `Edit`. Each step card carries a status that is *observed*, never
asserted: a step is only green once Entra has actually exercised it.

| | not started | waiting | connected | attention | failing |
|---|---|---|---|---|---|
| SAML | nothing saved | saved, no sign-in yet | a real assertion landed | cert expires ≤30d | cert expired |
| SCIM | no token | token issued, Entra hasn't called | Entra synced | — | — |

The stepper derives from these two. It cannot show two ticks while a token is missing.

**Step 2 is locked until step 1 is connected**, with the reason stated: Entra can't
provision into an app it can't sign into.

### Validation replaces documentation

Every warning the old Azure guide carried becomes a check on the field:

| Field | Detect | Response |
|---|---|---|
| IdP entity ID | holds a `login.microsoftonline.com` value | offer **Swap them** |
| IdP sign-on URL | holds an `sts.windows.net` value | mirrored |
| Certificate | `<?xml` / `<EntityDescriptor` | "that's the Federation Metadata XML" |
| Certificate | not Base64 PEM | "that looks like Certificate (Raw)" |
| Both URLs | tenant GUIDs differ | "these came from two different Entra tenants" |

Issues are **ordered**; the UI shouts only the first blocking one and marks the rest.
A parsed certificate shows subject, thumbprint and expiry so the admin can confirm it
before saving, and warns at 30 days.

### The guide

The popover is removed. Its content splits three ways: the Entra-only preamble becomes
a collapsible in-card block, the copy/paste steps dissolve into the sections they
describe, and the warnings become the validation above. Field names are tagged with the
app that owns them — Entra fields one treatment, Acrivault fields another — because the
whole task is moving values between two applications.

### Token

Generated in a reveal-once dialog: shown in full once, copyable, dismissed only by an
explicit "I've pasted it into Entra". Never readable afterwards. Re-issuing revokes the
previous token, which is stated before it happens.

## Screen 2 — `/settings/users`

- Sync is demoted from primary to a timestamped refresh that reports what changed.
- The primary job surfaces as triage: people Entra sent who have no role yet.
- Statuses: `active`, `suspended` (by an admin), `suspended-idp` (by Entra), `deleted`.
  "Needs role" is derived from `role === null`, not a status.
- The Tenant Owner carries a `Local` marker — the one account Entra doesn't manage.

## Data model

```
User.role: Role | null        null = provisioned, not yet assigned
User.source: 'entra' | 'local'
User.addedAt: string          replaces invitedAt/invitedBy
UserStatus: active | suspended | suspended-idp | deleted
Tenant.saml: { entityId, ssoUrl, certificate, cert, savedAt, lastSignInAt }
Tenant.scim: { tokenIssuedAt, lastSyncAt, usersReceived }
Tenant.passwordFallback: boolean
```

## Removed

`AddUserDialog`, `AcceptInviteScreen` and its route, the `invitations` fixture,
`addUser` / `resendInvite` / `resolveInvite` / `acceptInvite`, the `invited` and
`pending` statuses, and the `isProfilePending` placeholder-name treatment (SCIM sends
the name at provision time, so names never arrive late).

`ValidityWindowField` survives on Edit — an access window is Acrivault's policy, not
Entra's.
