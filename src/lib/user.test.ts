import { describe, expect, it } from 'vitest';
import { displayName, isProfilePending } from './user';
import type { User } from '@/mocks/types';

function makeUser(overrides: Partial<User>): User {
  return {
    id: 'usr_x',
    tenantId: 'tnt_x',
    name: 'Alex Kim',
    email: 'alex.kim@acme.com',
    role: 'analyst',
    status: 'active',
    groups: [],
    authMethod: 'sso',
    ...overrides,
  };
}

describe('displayName', () => {
  it('returns the IdP-sourced name once the user has authenticated', () => {
    expect(displayName(makeUser({ status: 'active', name: 'Alex Kim' }))).toBe('Alex Kim');
    expect(displayName(makeUser({ status: 'suspended', name: 'Taylor Quinn' }))).toBe('Taylor Quinn');
  });

  it('falls back to the email local part for invited and pending users (no IdP profile yet)', () => {
    expect(
      displayName(makeUser({ status: 'invited', name: 'Jamie Fox', email: 'jamie.fox@acme.com' })),
    ).toBe('jamie.fox');
    expect(
      displayName(makeUser({ status: 'pending', name: 'Robin Park', email: 'robin.park@acme.com' })),
    ).toBe('robin.park');
  });

  it('lowercases the local part and ignores any stored display name for pending users', () => {
    expect(
      displayName(makeUser({ status: 'pending', name: 'John Doe', email: 'John.Doe@Company.com' })),
    ).toBe('john.doe');
  });
});

describe('isProfilePending', () => {
  it('is true only before the first IdP-authenticated login', () => {
    expect(isProfilePending(makeUser({ status: 'invited' }))).toBe(true);
    expect(isProfilePending(makeUser({ status: 'pending' }))).toBe(true);
    expect(isProfilePending(makeUser({ status: 'active' }))).toBe(false);
    expect(isProfilePending(makeUser({ status: 'suspended' }))).toBe(false);
  });
});
