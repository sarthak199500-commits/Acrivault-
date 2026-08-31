import { describe, expect, it } from 'vitest';
import {
  certDaysLeft,
  effectiveScimStatus,
  parseCertificate,
  samlStatus,
  scimStatus,
  swapDraft,
  tenantGuidOf,
  validateSaml,
  type SamlDraft,
} from './sso';
import type { SamlConfig, ScimConfig } from '@/mocks/types';

const ENTITY_ID = 'https://sts.windows.net/818437a1-5008-44d7-bb45-1da663f1308d/';
const SSO_URL = 'https://login.microsoftonline.com/818437a1-5008-44d7-bb45-1da663f1308d/saml2';
const PEM = ['-----BEGIN CERTIFICATE-----', 'MIIC8DCCAdigAwIBAgIQRJGmR4o4PptMEDvXzn8Ozj', '-----END CERTIFICATE-----'].join('\n');

const draft = (over: Partial<SamlDraft> = {}): SamlDraft => ({
  entityId: ENTITY_ID,
  ssoUrl: SSO_URL,
  certificate: PEM,
  ...over,
});

describe('parseCertificate', () => {
  it('accepts a Base64 PEM block', () => {
    expect(parseCertificate(PEM)).toEqual({ ok: true });
  });

  it('tolerates surrounding whitespace', () => {
    expect(parseCertificate(`\n\n  ${PEM}  \n`)).toEqual({ ok: true });
  });

  it('reports an empty field rather than guessing', () => {
    expect(parseCertificate('   ')).toEqual({ ok: false, problem: 'empty' });
  });

  // Entra offers Federation Metadata XML right beside Certificate (Base64);
  // pasting the wrong one is the single most common setup mistake.
  it('recognises Federation Metadata XML', () => {
    expect(parseCertificate('<?xml version="1.0"?><EntityDescriptor/>')).toEqual({
      ok: false,
      problem: 'xml',
    });
    expect(parseCertificate('<EntityDescriptor xmlns="urn:oasis">')).toEqual({
      ok: false,
      problem: 'xml',
    });
  });

  it('recognises a raw (non-Base64) certificate', () => {
    expect(parseCertificate('0\x82\x02\xf0\x30\x82')).toEqual({ ok: false, problem: 'raw' });
  });

  it('rejects a PEM whose body is not Base64', () => {
    const bad = '-----BEGIN CERTIFICATE-----\nnot base64 !!!\n-----END CERTIFICATE-----';
    expect(parseCertificate(bad)).toEqual({ ok: false, problem: 'malformed' });
  });
});

describe('tenantGuidOf', () => {
  it('reads the tenant GUID out of either Entra URL', () => {
    expect(tenantGuidOf(ENTITY_ID)).toBe('818437a1-5008-44d7-bb45-1da663f1308d');
    expect(tenantGuidOf(SSO_URL)).toBe('818437a1-5008-44d7-bb45-1da663f1308d');
  });

  it('is case-insensitive', () => {
    expect(tenantGuidOf(ENTITY_ID.toUpperCase())).toBe('818437a1-5008-44d7-bb45-1da663f1308d');
  });

  it('returns null when there is no GUID', () => {
    expect(tenantGuidOf('https://sts.windows.net/')).toBeNull();
    expect(tenantGuidOf('')).toBeNull();
  });
});

describe('validateSaml', () => {
  it('passes a well-formed draft', () => {
    expect(validateSaml(draft())).toEqual([]);
  });

  it('flags each empty required field, in field order', () => {
    expect(validateSaml(draft({ entityId: '', ssoUrl: '', certificate: '' }))).toEqual([
      { kind: 'required', field: 'entityId' },
      { kind: 'required', field: 'ssoUrl' },
      { kind: 'required', field: 'certificate' },
    ]);
  });

  // The two URLs look alike and Entra lists them adjacently.
  it('detects the two URLs being swapped', () => {
    const issues = validateSaml(draft({ entityId: SSO_URL, ssoUrl: ENTITY_ID }));
    expect(issues[0]).toEqual({ kind: 'swapped' });
  });

  it('detects a sign-on URL pasted into the entity ID even when the other field is empty', () => {
    const issues = validateSaml(draft({ entityId: SSO_URL, ssoUrl: '' }));
    expect(issues[0]).toEqual({ kind: 'swapped' });
  });

  // A swap is one click to fix, so it outranks "this field is required".
  it('ranks a swap above every missing field', () => {
    const issues = validateSaml(draft({ entityId: SSO_URL, ssoUrl: '', certificate: '' }));
    expect(issues).toEqual([
      { kind: 'swapped' },
      { kind: 'required', field: 'ssoUrl' },
      { kind: 'required', field: 'certificate' },
    ]);
  });

  it('flags a value that is neither Entra URL', () => {
    expect(validateSaml(draft({ entityId: 'https://example.com/nope' }))).toEqual([
      { kind: 'wrong-value', field: 'entityId' },
    ]);
    expect(validateSaml(draft({ ssoUrl: 'https://example.com/nope' }))).toEqual([
      { kind: 'wrong-value', field: 'ssoUrl' },
    ]);
  });

  it('reports the certificate problem it found', () => {
    expect(validateSaml(draft({ certificate: '<?xml version="1.0"?>' }))).toEqual([
      { kind: 'cert-format', problem: 'xml' },
    ]);
  });

  // Values collected from two different Entra applications or tenants.
  it('catches URLs whose tenant GUIDs disagree', () => {
    const other = SSO_URL.replace('818437a1', '99999999');
    expect(validateSaml(draft({ ssoUrl: other }))).toEqual([{ kind: 'tenant-mismatch' }]);
  });

  it('does not claim a tenant mismatch when a GUID is absent', () => {
    const issues = validateSaml(draft({ ssoUrl: 'https://login.microsoftonline.com/saml2' }));
    expect(issues).not.toContainEqual({ kind: 'tenant-mismatch' });
  });
});

describe('swapDraft', () => {
  it('exchanges the two URL fields and leaves the certificate alone', () => {
    expect(swapDraft(draft({ entityId: SSO_URL, ssoUrl: ENTITY_ID }))).toEqual(draft());
  });
});

/* --------------------------------------------------------------- statuses */

const NOW = new Date('2026-08-31T12:00:00.000Z');
const saml = (over: Partial<SamlConfig> = {}): SamlConfig => ({
  entityId: ENTITY_ID,
  ssoUrl: SSO_URL,
  certificate: PEM,
  cert: { subject: 'CN=Test', thumbprint: '3A9F 2B41', expiresAt: '2027-03-14T00:00:00.000Z' },
  savedAt: '2026-08-20T00:00:00.000Z',
  lastSignInAt: '2026-08-31T11:54:00.000Z',
  ...over,
});
const scim = (over: Partial<ScimConfig> = {}): ScimConfig => ({
  tokenIssuedAt: '2026-08-21T00:00:00.000Z',
  lastSyncAt: '2026-08-31T11:56:00.000Z',
  usersReceived: 12,
  ...over,
});

describe('samlStatus', () => {
  it('is not started until something is saved', () => {
    expect(samlStatus(saml({ savedAt: null }), NOW)).toBe('not-started');
  });

  // Saved fields are a claim; a real assertion is proof.
  it('waits for a first sign-in before claiming success', () => {
    expect(samlStatus(saml({ lastSignInAt: null }), NOW)).toBe('waiting');
  });

  it('is connected once an assertion has landed', () => {
    expect(samlStatus(saml(), NOW)).toBe('connected');
  });

  it('asks for attention while the certificate is inside 30 days', () => {
    const soon = { subject: 'CN=Test', thumbprint: 'x', expiresAt: '2026-09-24T00:00:00.000Z' };
    expect(samlStatus(saml({ cert: soon }), NOW)).toBe('attention');
  });

  it('fails once the certificate has expired', () => {
    const gone = { subject: 'CN=Test', thumbprint: 'x', expiresAt: '2026-08-30T00:00:00.000Z' };
    expect(samlStatus(saml({ cert: gone }), NOW)).toBe('failing');
  });
});

describe('scimStatus', () => {
  it('is not started without a token', () => {
    expect(scimStatus(scim({ tokenIssuedAt: null }))).toBe('not-started');
  });

  it('waits until Entra actually calls', () => {
    expect(scimStatus(scim({ lastSyncAt: null }))).toBe('waiting');
  });

  it('is connected once a sync has happened', () => {
    expect(scimStatus(scim())).toBe('connected');
  });
});

describe('effectiveScimStatus', () => {
  // A stepper that claimed "provisioning connected" over a locked card would be
  // the same dishonest status the redesign set out to remove.
  it('reports not-started while sign-in is unproven, however much SCIM history exists', () => {
    expect(effectiveScimStatus(saml({ lastSignInAt: null }), scim(), NOW)).toBe('not-started');
  });

  it('reports the real SCIM status once sign-in is proven', () => {
    expect(effectiveScimStatus(saml(), scim(), NOW)).toBe('connected');
    expect(effectiveScimStatus(saml(), scim({ lastSyncAt: null }), NOW)).toBe('waiting');
  });

  // An expiring certificate still signs people in, so it must not lock step 2.
  it('stays unlocked while the certificate is merely expiring', () => {
    const soon = { subject: 'CN=Test', thumbprint: 'x', expiresAt: '2026-09-24T00:00:00.000Z' };
    expect(effectiveScimStatus(saml({ cert: soon }), scim(), NOW)).toBe('connected');
  });
});

describe('certDaysLeft', () => {
  it('counts whole days remaining', () => {
    expect(certDaysLeft({ subject: '', thumbprint: '', expiresAt: '2026-09-24T12:00:00.000Z' }, NOW)).toBe(24);
  });

  it('goes negative once expired', () => {
    expect(certDaysLeft({ subject: '', thumbprint: '', expiresAt: '2026-08-29T12:00:00.000Z' }, NOW)).toBe(-2);
  });
});
