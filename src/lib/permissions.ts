// lib/permissions.ts
// Reconciled against the Acrivault User Access Management Specification
// (Role & Module-Wise Permission Specification). Five rank-ordered roles.
// Role gating in the UI is least-privilege *presentation* only; real
// authorization is enforced upstream.
//
// Internal RANK uses higher number = more access (the gating math relies on it).
// The product describes ranks as 1=highest..5=lowest — see ROLE_RANK_LABEL.
//
// The hierarchy is additive (a higher role holds everything below it) with two
// deliberate exceptions the spec states outright. Both are marked at the point
// they are applied and asserted in permissions.test.ts so they are not silently
// "tidied away" later:
//   1. Audit Log export — held by the Auditor and by Tenant Admin and above,
//      but NOT by Analyst or Security Admin (spec §4, Audit Log row).
//   2. Rotation — Analyst may recommend; Security Admin may not act at all
//      (spec §4 Rotate row and §5 "Rotate / revoke a credential").

export type Role = 'tenant-owner' | 'tenant-admin' | 'security-admin' | 'analyst' | 'viewer';

/** Strict ordering for "higher rank can act on lower" gating. Higher number = more access. */
export const RANK: Record<Role, number> = {
  'tenant-owner': 5,
  'tenant-admin': 4,
  'security-admin': 3,
  analyst: 2,
  viewer: 1,
};

/** Product-facing rank label where 1 = highest (Tenant Owner) … 5 = lowest (Auditor). */
export const ROLE_RANK_LABEL: Record<Role, number> = {
  'tenant-owner': 1,
  'tenant-admin': 2,
  'security-admin': 3,
  analyst: 4,
  viewer: 5,
};

/** Roles ordered high → low. The single source for switchers and dropdowns. */
export const ROLES: Role[] = [
  'tenant-owner',
  'tenant-admin',
  'security-admin',
  'analyst',
  'viewer',
];

export type Capability =
  | 'view'
  | 'investigate'
  | 'alert.acknowledge'
  | 'alert.resolve'
  | 'session.markReviewed'
  | 'session.quarantine'
  // Analyst's "Recommend" level: propose a quarantine for an admin to approve.
  | 'session.quarantineRecommend'
  // Release from quarantine is Tenant Owner / Tenant Admin only (spec §5).
  | 'session.quarantineRelease'
  | 'policy.create'
  | 'policy.test'
  | 'policy.activate'
  // Suspend / reactivate / archive. Grouped with activation in the Govern spec's
  // RBAC matrix (§15.2) but named separately — archiving is not activating.
  | 'policy.lifecycle'
  // `rotate.request` is the "Recommend" level: propose a rotation without running
  // it. `rotate.standard` / `rotate.emergency` execute.
  | 'rotate.request'
  | 'rotate.standard'
  | 'rotate.emergency'
  | 'connector.manage'
  | 'export'
  | 'audit.view'
  | 'audit.export'
  | 'identity.assignOwner'
  // notification preferences are personal; routing is tenant-wide (spec §4)
  | 'notifications.self'
  | 'notifications.routing'
  // user & tenant administration
  | 'users.manage'
  | 'users.add'
  | 'users.edit'
  | 'users.suspend'
  | 'users.delete'
  | 'tenant.manage'
  | 'tenant.transferOwnership'
  | 'sso.manage'
  | 'settings.manage';

// Read-only / Auditor (rank 5): view dashboards, inventory, evidence — no changes.
// Exports the audit log, which is the auditor's evidence package (spec §4: "Full"
// on the Audit Log row means view + export).
const AUDITOR_CAPS: Capability[] = ['view', 'audit.view', 'audit.export', 'notifications.self'];

// Analyst (rank 4): investigate, triage alerts, draft and test policies, and
// recommend the actions it cannot execute.
// EXCEPTION 1 — deliberately NOT a superset of AUDITOR_CAPS: no `audit.export`.
const ANALYST_CAPS: Capability[] = [
  'view',
  'audit.view',
  'notifications.self',
  'investigate',
  'alert.acknowledge',
  // Draft/Test: author and simulate policies, but never activate or archive them.
  'policy.create',
  'policy.test',
  // Recommend: proposes; a role holding the matching execute capability approves.
  'rotate.request',
  'session.quarantineRecommend',
];

// Security Admin (rank 3): policy authority, alert resolution, quarantine, and
// owner assignment. Cannot rotate credentials, connect clouds, or manage
// billing, other users, SSO, or tenant settings.
// EXCEPTION 2 — deliberately NOT a superset of ANALYST_CAPS: no `rotate.request`.
const SECURITY_ADMIN_CAPS: Capability[] = [
  ...ANALYST_CAPS.filter((c) => c !== 'rotate.request'),
  'alert.resolve',
  'session.markReviewed',
  'session.quarantine',
  'policy.activate',
  'policy.lifecycle',
  'identity.assignOwner',
];

// Tenant Admin (rank 2): full operational control of the tenant — users, roles,
// SSO, connectors, rotation, settings (and billing, which has no in-product
// surface in Wave 1). Cannot transfer ownership.
const TENANT_ADMIN_CAPS: Capability[] = [
  ...SECURITY_ADMIN_CAPS,
  // Re-granted here: withheld from Analyst and Security Admin by the two
  // exceptions above, but held by every role from Tenant Admin up.
  'audit.export',
  'rotate.request',
  'rotate.standard',
  'rotate.emergency',
  'session.quarantineRelease',
  'connector.manage',
  'export',
  'notifications.routing',
  'users.manage',
  'users.add',
  'users.edit',
  'users.suspend',
  'users.delete',
  'sso.manage',
  'settings.manage',
  'tenant.manage',
];

// Tenant Owner (rank 1): everything, plus the single action reserved to the
// Owner. Exactly one Owner exists per tenant.
const TENANT_OWNER_CAPS: Capability[] = [...TENANT_ADMIN_CAPS, 'tenant.transferOwnership'];

export const MATRIX: Record<Role, Capability[]> = {
  'tenant-owner': TENANT_OWNER_CAPS,
  'tenant-admin': TENANT_ADMIN_CAPS,
  'security-admin': SECURITY_ADMIN_CAPS,
  analyst: ANALYST_CAPS,
  viewer: AUDITOR_CAPS,
};

export const ROLE_LABELS: Record<Role, string> = {
  'tenant-owner': 'Tenant Owner',
  'tenant-admin': 'Tenant Admin',
  'security-admin': 'Security Admin',
  analyst: 'Analyst',
  viewer: 'Read-only / Auditor',
};

/** Short label for tight surfaces (dev switcher chips). */
export const ROLE_SHORT: Record<Role, string> = {
  'tenant-owner': 'Owner',
  'tenant-admin': 'Tenant',
  'security-admin': 'Sec Admin',
  analyst: 'Analyst',
  viewer: 'Auditor',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  'tenant-owner':
    'Rank 1, highest access. Everything a Tenant Admin can do, plus transferring ownership — the only role that can. No restrictions.',
  'tenant-admin':
    'Rank 2. Full operational control: users, roles, SSO, connectors, rotation, settings, and all data and policies. Cannot transfer ownership.',
  'security-admin':
    'Rank 3. Create, test, and activate policies, assign owners, resolve alerts, and quarantine. Cannot rotate credentials, connect clouds, or manage users.',
  analyst:
    'Rank 4. Investigate, acknowledge alerts, and draft and test policies. Can recommend rotation and quarantine for an admin to approve.',
  viewer:
    'Rank 5, lowest access. View dashboards, inventory, and evidence, and export the audit log. Cannot make changes.',
};

/** Does the given role hold the capability? */
export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role].includes(capability);
}

/**
 * Can the actor grant this role? At or below the actor's own rank. Tenant Owner
 * is never assignable from a role dropdown — a tenant has exactly one Owner and
 * the role changes hands only through Transfer Ownership (spec §5).
 */
export function canAssignRole(actor: Role, target: Role): boolean {
  if (target === 'tenant-owner') return false;
  return RANK[target] <= RANK[actor];
}

/** The set of roles the actor may assign, ordered high → low. */
export function assignableRoles(actor: Role): Role[] {
  return ROLES.filter((r) => canAssignRole(actor, r));
}

/**
 * Can the actor manage (edit, suspend, delete) this subject?
 * A Tenant Owner may act on anyone. A Tenant Admin may act on anyone except the
 * Tenant Owner, whom they cannot remove or demote (spec §2). Everyone else needs
 * strictly higher rank and may never act on themselves. The "last active Tenant
 * Admin" and "Owner is protected" guards are enforced server-side (mocks/api.ts).
 */
export function canActOnUser(
  actor: Role,
  actorId: string,
  subjectRole: Role | null,
  subjectId: string,
): boolean {
  if (actor === 'tenant-owner') return true;
  if (actor === 'tenant-admin') return subjectRole !== 'tenant-owner';
  if (actorId === subjectId) return false;
  // Someone Entra provisioned but nobody has given a role to outranks nobody:
  // assigning them their first role is exactly what needs to be possible.
  if (subjectRole === null) return true;
  return RANK[actor] > RANK[subjectRole];
}
