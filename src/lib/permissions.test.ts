import { describe, expect, it } from 'vitest';
import { can, canActOnUser, canAssignRole, assignableRoles } from './permissions';

describe('permission matrix', () => {
  it('only the tenant owner can transfer ownership', () => {
    expect(can('tenant-owner', 'tenant.transferOwnership')).toBe(true);
    expect(can('tenant-admin', 'tenant.transferOwnership')).toBe(false);
    expect(can('security-admin', 'tenant.transferOwnership')).toBe(false);
  });

  it('the tenant owner holds everything a tenant admin does', () => {
    expect(can('tenant-owner', 'users.delete')).toBe(true);
    expect(can('tenant-owner', 'sso.manage')).toBe(true);
    expect(can('tenant-owner', 'rotate.emergency')).toBe(true);
    expect(can('tenant-owner', 'connector.manage')).toBe(true);
  });

  it('tenant admin manages the tenant, users, SSO, connectors, and rotation', () => {
    expect(can('tenant-admin', 'tenant.manage')).toBe(true);
    expect(can('tenant-admin', 'users.delete')).toBe(true);
    expect(can('tenant-admin', 'sso.manage')).toBe(true);
    expect(can('tenant-admin', 'connector.manage')).toBe(true);
    expect(can('tenant-admin', 'rotate.standard')).toBe(true);
    expect(can('tenant-admin', 'rotate.emergency')).toBe(true);
    expect(can('tenant-admin', 'session.quarantineRelease')).toBe(true);
    expect(can('tenant-admin', 'notifications.routing')).toBe(true);
    // Security Admin cannot manage billing/other users/SSO/tenant.
    expect(can('security-admin', 'tenant.manage')).toBe(false);
    expect(can('security-admin', 'users.manage')).toBe(false);
    expect(can('security-admin', 'users.add')).toBe(false);
    expect(can('security-admin', 'sso.manage')).toBe(false);
  });

  it('security admin runs policy and alert operations, but not onboarding or rotation', () => {
    expect(can('security-admin', 'policy.create')).toBe(true);
    expect(can('security-admin', 'policy.activate')).toBe(true);
    expect(can('security-admin', 'policy.lifecycle')).toBe(true);
    expect(can('security-admin', 'alert.resolve')).toBe(true);
    expect(can('security-admin', 'session.quarantine')).toBe(true);
    expect(can('security-admin', 'identity.assignOwner')).toBe(true);
    // Spec §4 "Onboarding & Connect" is None below Tenant Admin.
    expect(can('security-admin', 'connector.manage')).toBe(false);
    // Spec §5: releasing from quarantine is Tenant Owner / Tenant Admin only.
    expect(can('security-admin', 'session.quarantineRelease')).toBe(false);
  });

  it('analyst can investigate, acknowledge, draft policies, and recommend', () => {
    expect(can('analyst', 'view')).toBe(true);
    expect(can('analyst', 'investigate')).toBe(true);
    expect(can('analyst', 'alert.acknowledge')).toBe(true);
    // Draft/Test — authors and simulates, never activates or archives.
    expect(can('analyst', 'policy.create')).toBe(true);
    expect(can('analyst', 'policy.test')).toBe(true);
    expect(can('analyst', 'policy.activate')).toBe(false);
    expect(can('analyst', 'policy.lifecycle')).toBe(false);
    // Recommend — proposes, cannot execute.
    expect(can('analyst', 'rotate.request')).toBe(true);
    expect(can('analyst', 'rotate.standard')).toBe(false);
    expect(can('analyst', 'rotate.emergency')).toBe(false);
    expect(can('analyst', 'session.quarantineRecommend')).toBe(true);
    expect(can('analyst', 'session.quarantine')).toBe(false);

    expect(can('analyst', 'alert.resolve')).toBe(false);
    expect(can('analyst', 'users.add')).toBe(false);
    expect(can('analyst', 'export')).toBe(false);
  });

  it('auditor (read-only) views everything and exports the audit log only', () => {
    expect(can('viewer', 'view')).toBe(true);
    expect(can('viewer', 'audit.view')).toBe(true);
    expect(can('viewer', 'audit.export')).toBe(true);
    expect(can('viewer', 'investigate')).toBe(false);
    expect(can('viewer', 'alert.acknowledge')).toBe(false);
    expect(can('viewer', 'export')).toBe(false);
  });

  it('every role manages its own notification preferences', () => {
    expect(can('viewer', 'notifications.self')).toBe(true);
    expect(can('analyst', 'notifications.self')).toBe(true);
    expect(can('security-admin', 'notifications.self')).toBe(true);
    // Tenant-wide routing stops at Tenant Admin.
    expect(can('analyst', 'notifications.routing')).toBe(false);
    expect(can('security-admin', 'notifications.routing')).toBe(false);
  });
});

// The hierarchy is otherwise additive. These two gaps are stated by the spec and
// are load-bearing — if a future change makes the matrix uniformly additive these
// tests fail, which is the intended alarm.
describe('deliberate breaks in the additive hierarchy', () => {
  it('audit-log export skips Analyst and Security Admin (spec §4, Audit Log row)', () => {
    expect(can('viewer', 'audit.export')).toBe(true);
    expect(can('analyst', 'audit.export')).toBe(false);
    expect(can('security-admin', 'audit.export')).toBe(false);
    expect(can('tenant-admin', 'audit.export')).toBe(true);
    expect(can('tenant-owner', 'audit.export')).toBe(true);
  });

  it('rotation skips Security Admin, who ranks above the Analyst who may recommend it (spec §5)', () => {
    expect(can('analyst', 'rotate.request')).toBe(true);
    expect(can('security-admin', 'rotate.request')).toBe(false);
    expect(can('security-admin', 'rotate.standard')).toBe(false);
    expect(can('security-admin', 'rotate.emergency')).toBe(false);
    expect(can('tenant-admin', 'rotate.request')).toBe(true);
  });
});

describe('canAssignRole', () => {
  it('grants at or below own rank', () => {
    expect(canAssignRole('security-admin', 'analyst')).toBe(true);
    expect(canAssignRole('security-admin', 'security-admin')).toBe(true);
    expect(canAssignRole('analyst', 'viewer')).toBe(true);
  });

  it('never grants above own rank', () => {
    expect(canAssignRole('analyst', 'security-admin')).toBe(false);
    expect(canAssignRole('viewer', 'analyst')).toBe(false);
    expect(canAssignRole('security-admin', 'tenant-admin')).toBe(false);
  });

  it('only a tenant admin may grant tenant admin', () => {
    expect(canAssignRole('tenant-admin', 'tenant-admin')).toBe(true);
    expect(canAssignRole('tenant-owner', 'tenant-admin')).toBe(true);
    expect(canAssignRole('security-admin', 'tenant-admin')).toBe(false);
  });

  it('tenant owner is never assignable — it moves only via Transfer Ownership', () => {
    expect(canAssignRole('tenant-owner', 'tenant-owner')).toBe(false);
    expect(canAssignRole('tenant-admin', 'tenant-owner')).toBe(false);
  });

  it('a tenant admin and a tenant owner can assign the same four roles', () => {
    const expected = ['tenant-admin', 'security-admin', 'analyst', 'viewer'];
    expect(assignableRoles('tenant-admin')).toEqual(expected);
    expect(assignableRoles('tenant-owner')).toEqual(expected);
  });
});

describe('canActOnUser', () => {
  it('a tenant owner may act on anyone, including themselves', () => {
    expect(canActOnUser('tenant-owner', 'a', 'tenant-admin', 'b')).toBe(true);
    expect(canActOnUser('tenant-owner', 'a', 'tenant-owner', 'b')).toBe(true);
    expect(canActOnUser('tenant-owner', 'self', 'tenant-owner', 'self')).toBe(true);
  });

  it('a tenant admin may act on anyone except the tenant owner', () => {
    expect(canActOnUser('tenant-admin', 'a', 'analyst', 'b')).toBe(true);
    expect(canActOnUser('tenant-admin', 'a', 'tenant-admin', 'b')).toBe(true);
    expect(canActOnUser('tenant-admin', 'self', 'tenant-admin', 'self')).toBe(true);
    expect(canActOnUser('tenant-admin', 'a', 'tenant-owner', 'b')).toBe(false);
  });

  it('non-admins need strictly higher rank and never act on self', () => {
    expect(canActOnUser('security-admin', 'a', 'analyst', 'b')).toBe(true);
    expect(canActOnUser('security-admin', 'a', 'security-admin', 'b')).toBe(false);
    expect(canActOnUser('security-admin', 'a', 'tenant-admin', 'b')).toBe(false);
    expect(canActOnUser('security-admin', 'a', 'tenant-owner', 'b')).toBe(false);
    expect(canActOnUser('analyst', 'self', 'viewer', 'self')).toBe(false);
  });
});
