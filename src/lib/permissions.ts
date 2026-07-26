// lib/permissions.ts  // ASSUMPTION: interim matrix, BA owns the final version.
// Four rank-ordered roles. Role gating in the UI is least-privilege *presentation*
// only; real authorization is enforced upstream.
//
// Internal RANK uses higher number = more access (the gating math relies on it).
// The product describes ranks as 1=highest..4=lowest — see ROLE_RANK_LABEL.

export type Role = 'tenant-admin' | 'security-admin' | 'analyst' | 'viewer';

/** Strict ordering for "higher rank can act on lower" gating. Higher number = more access. */
export const RANK: Record<Role, number> = {
  'tenant-admin': 4,
  'security-admin': 3,
  analyst: 2,
  viewer: 1,
};

/** Product-facing rank label where 1 = highest (Tenant Admin) … 4 = lowest (Auditor). */
export const ROLE_RANK_LABEL: Record<Role, number> = {
  'tenant-admin': 1,
  'security-admin': 2,
  analyst: 3,
  viewer: 4,
};

/** Roles ordered high → low. The single source for switchers and dropdowns. */
export const ROLES: Role[] = ['tenant-admin', 'security-admin', 'analyst', 'viewer'];

export type Capability =
  | 'view'
  | 'investigate'
  | 'alert.acknowledge'
  | 'alert.resolve'
  | 'session.markReviewed'
  | 'session.quarantine'
  | 'policy.create'
  | 'policy.test'
  | 'policy.activate'
  // Suspend / reactivate / archive. Grouped with activation in the Govern spec's
  // RBAC matrix (§15.2) but named separately — archiving is not activating.
  | 'policy.lifecycle'
  | 'rotate.request'
  | 'rotate.standard'
  | 'rotate.emergency'
  | 'connector.manage'
  | 'export'
  | 'identity.assignOwner'
  // user & tenant administration
  | 'users.manage'
  | 'users.invite'
  | 'users.edit'
  | 'users.suspend'
  | 'users.delete'
  | 'tenant.manage'
  | 'sso.manage'
  | 'settings.manage';

// Auditor (Read-only): view dashboards, inventory, evidence — no changes.
const AUDITOR_CAPS: Capability[] = ['view'];

// Analyst: view inventory, investigate, acknowledge alerts. No policy/settings changes.
const ANALYST_CAPS: Capability[] = ['view', 'investigate', 'alert.acknowledge'];

// Security Admin: create/edit policies, respond to alerts, run rotations and the
// read-only cloud Connect. Cannot manage billing, other users, SSO, or tenant settings.
const SECURITY_ADMIN_CAPS: Capability[] = [
  ...ANALYST_CAPS,
  'alert.resolve',
  'session.markReviewed',
  'session.quarantine',
  'policy.create',
  'policy.test',
  'policy.activate',
  'policy.lifecycle',
  'rotate.request',
  'rotate.standard',
  'rotate.emergency',
  'connector.manage',
  'export',
  'identity.assignOwner',
];

// Tenant Admin: everything, including users, roles, SSO, tenant settings (and billing,
// which has no in-product surface in Wave 1).
const TENANT_ADMIN_CAPS: Capability[] = [
  ...SECURITY_ADMIN_CAPS,
  'users.manage',
  'users.invite',
  'users.edit',
  'users.suspend',
  'users.delete',
  'sso.manage',
  'settings.manage',
  'tenant.manage',
];

export const MATRIX: Record<Role, Capability[]> = {
  'tenant-admin': TENANT_ADMIN_CAPS,
  'security-admin': SECURITY_ADMIN_CAPS,
  analyst: ANALYST_CAPS,
  viewer: AUDITOR_CAPS,
};

export const ROLE_LABELS: Record<Role, string> = {
  'tenant-admin': 'Tenant Admin',
  'security-admin': 'Security Admin',
  analyst: 'Analyst',
  viewer: 'Read-only / Auditor',
};

/** Short label for tight surfaces (dev switcher chips). */
export const ROLE_SHORT: Record<Role, string> = {
  'tenant-admin': 'Tenant',
  'security-admin': 'Sec Admin',
  analyst: 'Analyst',
  viewer: 'Auditor',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  'tenant-admin':
    'Rank 1, highest access. Manage users, roles, SSO, billing, and all data and policies. No restrictions.',
  'security-admin':
    'Rank 2. Create and edit policies, assign owners, and respond to alerts. Cannot manage billing or other users.',
  analyst:
    'Rank 3. View inventory, investigate, and acknowledge alerts. Cannot change policies or settings.',
  viewer:
    'Rank 4, lowest access. View dashboards, inventory, and evidence. Cannot make changes.',
};

/** Does the given role hold the capability? */
export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role].includes(capability);
}

/**
 * Can the actor grant this role? At or below the actor's own rank, and only a
 * Tenant Admin may grant Tenant Admin. (In practice only a Tenant Admin holds
 * `users.invite`, so only a Tenant Admin assigns roles.)
 */
export function canAssignRole(actor: Role, target: Role): boolean {
  if (target === 'tenant-admin') return actor === 'tenant-admin';
  return RANK[target] <= RANK[actor];
}

/** The set of roles the actor may assign, ordered high → low. */
export function assignableRoles(actor: Role): Role[] {
  return ROLES.filter((r) => canAssignRole(actor, r));
}

/**
 * Can the actor manage (edit, suspend, delete) this subject?
 * A Tenant Admin may act on anyone — including other Tenant Admins and themselves;
 * the "last active Tenant Admin" guard is enforced server-side (see mocks/api.ts).
 * Everyone else needs strictly higher rank and may never act on themselves.
 */
export function canActOnUser(
  actor: Role,
  actorId: string,
  subjectRole: Role,
  subjectId: string,
): boolean {
  if (actor === 'tenant-admin') return true;
  if (actorId === subjectId) return false;
  return RANK[actor] > RANK[subjectRole];
}
