import { describe, expect, it } from 'vitest';
import { can, canActOnUser, canAssignRole, assignableRoles } from './permissions';

describe('permission matrix', () => {
  it('only the tenant admin manages the tenant, users, and SSO', () => {
    expect(can('tenant-admin', 'tenant.manage')).toBe(true);
    expect(can('tenant-admin', 'users.delete')).toBe(true);
    expect(can('tenant-admin', 'sso.manage')).toBe(true);
    // Security Admin cannot manage billing/other users/SSO/tenant.
    expect(can('security-admin', 'tenant.manage')).toBe(false);
    expect(can('security-admin', 'users.manage')).toBe(false);
    expect(can('security-admin', 'users.invite')).toBe(false);
    expect(can('security-admin', 'sso.manage')).toBe(false);
  });

  it('security admin runs security operations: policies, alerts, rotation, connect', () => {
    expect(can('security-admin', 'policy.create')).toBe(true);
    expect(can('security-admin', 'policy.activate')).toBe(true);
    expect(can('security-admin', 'alert.resolve')).toBe(true);
    expect(can('security-admin', 'session.quarantine')).toBe(true);
    expect(can('security-admin', 'rotate.emergency')).toBe(true);
    expect(can('security-admin', 'connector.manage')).toBe(true);
  });

  it('analyst can view, investigate, and acknowledge — but not change policies or settings', () => {
    expect(can('analyst', 'view')).toBe(true);
    expect(can('analyst', 'investigate')).toBe(true);
    expect(can('analyst', 'alert.acknowledge')).toBe(true);
    expect(can('analyst', 'alert.resolve')).toBe(false);
    expect(can('analyst', 'policy.create')).toBe(false);
    expect(can('analyst', 'rotate.request')).toBe(false);
    expect(can('analyst', 'users.invite')).toBe(false);
    expect(can('analyst', 'export')).toBe(false);
  });

  it('auditor (read-only) can only view', () => {
    expect(can('viewer', 'view')).toBe(true);
    expect(can('viewer', 'investigate')).toBe(false);
    expect(can('viewer', 'alert.acknowledge')).toBe(false);
    expect(can('viewer', 'export')).toBe(false);
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
  });

  it('only a tenant admin may grant tenant admin', () => {
    expect(canAssignRole('tenant-admin', 'tenant-admin')).toBe(true);
    expect(canAssignRole('security-admin', 'tenant-admin')).toBe(false);
  });

  it('a tenant admin can assign every role', () => {
    expect(assignableRoles('tenant-admin')).toEqual([
      'tenant-admin',
      'security-admin',
      'analyst',
      'viewer',
    ]);
  });
});

describe('canActOnUser', () => {
  it('a tenant admin may act on anyone, including peers and themselves (API guards the last one)', () => {
    expect(canActOnUser('tenant-admin', 'a', 'analyst', 'b')).toBe(true);
    expect(canActOnUser('tenant-admin', 'a', 'tenant-admin', 'b')).toBe(true);
    expect(canActOnUser('tenant-admin', 'self', 'tenant-admin', 'self')).toBe(true);
  });

  it('non-admins need strictly higher rank and never act on self', () => {
    expect(canActOnUser('security-admin', 'a', 'analyst', 'b')).toBe(true);
    expect(canActOnUser('security-admin', 'a', 'security-admin', 'b')).toBe(false);
    expect(canActOnUser('security-admin', 'a', 'tenant-admin', 'b')).toBe(false);
    expect(canActOnUser('analyst', 'self', 'viewer', 'self')).toBe(false);
  });
});
