// lib/sso.ts
// Entra SAML/SCIM setup logic. Acrivault federates with Microsoft Entra ID only,
// so every check below can be specific about what Entra actually serves — which is
// what lets the form catch the mistakes the setup guide used to merely warn about.
//
// x509 is not decoded here: this file recognises the *shape* of what was pasted
// (which of Entra's three downloads it is), and the readable summary — subject,
// thumbprint, expiry — arrives already parsed from upstream. See mocks/api.ts.

import type { CertSummary, SamlConfig, ScimConfig } from '@/mocks/types';

/** Entra's Microsoft Entra Identifier is always an sts.windows.net address. */
const ENTITY_HOST = /sts\.windows\.net/i;
/** Entra's Login URL is always a login.microsoftonline.com address. */
const SSO_HOST = /login\.microsoftonline\.com/i;
const GUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const PEM_OPEN = '-----BEGIN CERTIFICATE-----';
const PEM_CLOSE = '-----END CERTIFICATE-----';

/** Days of certificate life left before we start asking the admin to roll it. */
export const CERT_WARN_DAYS = 30;

export type SamlField = 'entityId' | 'ssoUrl' | 'certificate';

export interface SamlDraft {
  entityId: string;
  ssoUrl: string;
  certificate: string;
}

/* ------------------------------------------------------------ certificate */

/** Which of Entra's downloads the admin pasted, when it wasn't the right one. */
export type CertProblem = 'empty' | 'xml' | 'raw' | 'malformed';

export type CertParse = { ok: true } | { ok: false; problem: CertProblem };

/**
 * Entra offers Certificate (Base64), Certificate (Raw) and Federation Metadata XML
 * within a few pixels of each other, and only the first one works here. Naming the
 * wrong choice back to the admin is far more useful than "invalid certificate".
 */
export function parseCertificate(input: string): CertParse {
  const value = input.trim();
  if (!value) return { ok: false, problem: 'empty' };
  if (value.startsWith('<')) return { ok: false, problem: 'xml' };
  if (!value.startsWith(PEM_OPEN)) return { ok: false, problem: 'raw' };

  const body = value
    .slice(PEM_OPEN.length, value.endsWith(PEM_CLOSE) ? value.length - PEM_CLOSE.length : undefined)
    .replace(/\s+/g, '');
  if (!body || !/^[A-Za-z0-9+/]+={0,2}$/.test(body)) return { ok: false, problem: 'malformed' };
  return { ok: true };
}

/** The Entra tenant a URL belongs to, or null when it carries no GUID. */
export function tenantGuidOf(value: string): string | null {
  const match = GUID.exec(value ?? '');
  return match ? match[0].toLowerCase() : null;
}

/* -------------------------------------------------------------- validation */

export type SamlIssue =
  | { kind: 'swapped' }
  | { kind: 'required'; field: SamlField }
  | { kind: 'wrong-value'; field: SamlField }
  | { kind: 'cert-format'; problem: CertProblem }
  | { kind: 'tenant-mismatch' };

/**
 * Every issue in the draft, most-blocking first, so a caller can shout the first
 * one and merely mark the rest. A swap outranks a missing field because swapping
 * is one click and usually fills both boxes at once.
 */
export function validateSaml(draft: SamlDraft): SamlIssue[] {
  const entityId = draft.entityId.trim();
  const ssoUrl = draft.ssoUrl.trim();
  const issues: SamlIssue[] = [];

  const entityHoldsSso = SSO_HOST.test(entityId) && !ENTITY_HOST.test(entityId);
  const ssoHoldsEntity = ENTITY_HOST.test(ssoUrl) && !SSO_HOST.test(ssoUrl);
  const swapped = entityHoldsSso || ssoHoldsEntity;
  if (swapped) issues.push({ kind: 'swapped' });

  const fields: [SamlField, string][] = [
    ['entityId', entityId],
    ['ssoUrl', ssoUrl],
    ['certificate', draft.certificate.trim()],
  ];
  for (const [field, value] of fields) {
    if (!value) issues.push({ kind: 'required', field });
  }

  // Once a swap is on the table its own fix resolves the shape complaint too.
  if (!swapped) {
    if (entityId && !ENTITY_HOST.test(entityId)) issues.push({ kind: 'wrong-value', field: 'entityId' });
    if (ssoUrl && !SSO_HOST.test(ssoUrl)) issues.push({ kind: 'wrong-value', field: 'ssoUrl' });
  }

  if (draft.certificate.trim()) {
    const cert = parseCertificate(draft.certificate);
    if (!cert.ok) issues.push({ kind: 'cert-format', problem: cert.problem });
  }

  // Two valid-looking URLs from different applications is otherwise invisible.
  const a = tenantGuidOf(entityId);
  const b = tenantGuidOf(ssoUrl);
  if (!swapped && a && b && a !== b) issues.push({ kind: 'tenant-mismatch' });

  return issues;
}

/** Exchange the two URL fields — the one-click fix for a `swapped` issue. */
export function swapDraft(draft: SamlDraft): SamlDraft {
  return { ...draft, entityId: draft.ssoUrl, ssoUrl: draft.entityId };
}

/** True when the draft is safe to save. */
export function isSamlDraftValid(draft: SamlDraft): boolean {
  return validateSaml(draft).length === 0;
}

/* ---------------------------------------------------------------- statuses */

/**
 * What a setup step has actually achieved — never what it has merely been told.
 * `connected` requires evidence from Entra: a real assertion, or a real SCIM call.
 */
export type StepStatus = 'not-started' | 'waiting' | 'connected' | 'attention' | 'failing';

/** Whole days until the certificate expires; negative once it has. */
export function certDaysLeft(cert: CertSummary, now: Date): number {
  return Math.floor((new Date(cert.expiresAt).getTime() - now.getTime()) / 86400000);
}

export function samlStatus(saml: SamlConfig, now: Date): StepStatus {
  if (!saml.savedAt) return 'not-started';
  if (saml.cert) {
    const days = certDaysLeft(saml.cert, now);
    if (days < 0) return 'failing';
    // An expiring certificate outranks "never signed in": it is the louder problem.
    if (days <= CERT_WARN_DAYS) return 'attention';
  }
  return saml.lastSignInAt ? 'connected' : 'waiting';
}

export function scimStatus(scim: ScimConfig): StepStatus {
  if (!scim.tokenIssuedAt) return 'not-started';
  return scim.lastSyncAt ? 'connected' : 'waiting';
}

/**
 * Whether people can actually sign in through Entra today. An expiring certificate
 * still works, so `attention` counts; an expired one does not.
 */
export function isSignInFederated(saml: SamlConfig, now: Date): boolean {
  const status = samlStatus(saml, now);
  return status === 'connected' || status === 'attention';
}

/** How loudly a summary should be read. The caller maps this to its own styling. */
export type SummaryTone = 'neutral' | 'warning' | 'critical';

/**
 * One sentence on whether people can sign in, for anywhere outside the setup
 * screen that summarises federation. Every branch is named because the tempting
 * shortcut — "federated or not" — reports an expired certificate as "not set up",
 * which sends an admin to build a second configuration instead of fixing the one
 * that is failing.
 */
export function signInSummary(
  saml: SamlConfig,
  providerLabel: string,
  now: Date,
): { tone: SummaryTone; text: string } {
  switch (samlStatus(saml, now)) {
    case 'not-started':
      return { tone: 'neutral', text: 'Single sign-on is not set up yet.' };
    case 'waiting':
      return { tone: 'warning', text: 'Saved, but nobody has signed in with it yet.' };
    case 'failing':
      return {
        tone: 'critical',
        text: `The ${providerLabel} certificate has expired — sign-in is failing.`,
      };
    case 'attention': {
      const days = saml.cert ? certDaysLeft(saml.cert, now) : 0;
      return { tone: 'warning', text: `${providerLabel} certificate expires in ${days} days.` };
    }
    case 'connected':
      return { tone: 'neutral', text: `Sign-in is federated with ${providerLabel}.` };
  }
}

/**
 * Entra cannot provision into an application it cannot sign into, so step 2 stays
 * locked until step 1 has proven itself.
 */
export function scimUnlocked(saml: SamlConfig, now: Date): boolean {
  return isSignInFederated(saml, now);
}

/**
 * What step 2 is really doing, accounting for step 1. A locked step reports
 * `not-started` however much SCIM history it has: editing the SAML configuration
 * un-proves sign-in, and a stepper that still claimed "provisioning connected"
 * would contradict the card sitting underneath it.
 */
export function effectiveScimStatus(saml: SamlConfig, scim: ScimConfig, now: Date): StepStatus {
  return scimUnlocked(saml, now) ? scimStatus(scim) : 'not-started';
}
