import { describe, expect, it } from 'vitest';
import { displayName, isIdpManaged, needsRole } from './user';
import type { User } from '@/mocks/types';

function makeUser(overrides: Partial<User>): User {
  return {
    id: 'usr_x',
    tenantId: 'tnt_x',
    name: 'Alex Kim',
    email: 'alex.kim@acme.com',
    role: 'analyst',
    status: 'active',
    source: 'entra',
    authMethod: 'sso',
    addedAt: '2026-08-19T00:00:00.000Z',
    ...overrides,
  };
}

describe('displayName', () => {
  it('uses the name Entra provisioned', () => {
    expect(displayName(makeUser({ name: 'Alex Kim' }))).toBe('Alex Kim');
    expect(displayName(makeUser({ status: 'suspended', name: 'Taylor Quinn' }))).toBe('Taylor Quinn');
  });

  // Defensive only: SCIM normally carries a display name with the account.
  it('falls back to the email local part when Entra sent no name', () => {
    expect(displayName(makeUser({ name: '', email: 'Jamie.Fox@Acme.com' }))).toBe('jamie.fox');
    expect(displayName(makeUser({ name: '   ', email: 'robin.park@acme.com' }))).toBe('robin.park');
  });
});

describe('needsRole', () => {
  it('is true for someone Entra sent who has no role yet', () => {
    expect(needsRole(makeUser({ role: null }))).toBe(true);
  });

  it('is false once a role is assigned', () => {
    expect(needsRole(makeUser({ role: 'viewer' }))).toBe(false);
  });

  // A deleted row is not outstanding work.
  it('ignores deleted users', () => {
    expect(needsRole(makeUser({ role: null, status: 'deleted' }))).toBe(false);
  });

  it('still counts a suspended user with no role', () => {
    expect(needsRole(makeUser({ role: null, status: 'suspended-idp' }))).toBe(true);
  });
});

describe('isIdpManaged', () => {
  it('separates Entra accounts from the local one', () => {
    expect(isIdpManaged(makeUser({ source: 'entra' }))).toBe(true);
    expect(isIdpManaged(makeUser({ source: 'local' }))).toBe(false);
  });
});
