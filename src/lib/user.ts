// User display helpers. Names and emails are sourced from Microsoft Entra ID and
// arrive with the SCIM push that creates the account, so — unlike the invitation
// flow this replaced — a user never exists without a profile. The fallback below
// is defensive only, for the rare account Entra sends with no display name set.

import type { User } from '@/mocks/types';

/** Name to show for a user, falling back to the email's local part. */
export function displayName(user: Pick<User, 'name' | 'email'>): string {
  const name = user.name?.trim();
  if (name) return name;
  return user.email.trim().toLowerCase().split('@')[0];
}

/**
 * True for someone Entra has provisioned but no admin has given a role to. They can
 * sign in and see nothing, which is why the user list surfaces them as work to do.
 */
export function needsRole(user: Pick<User, 'role' | 'status'>): boolean {
  return user.role === null && user.status !== 'deleted';
}

/** Whether Entra manages this account — if not, it is the way back in. */
export function isIdpManaged(user: Pick<User, 'source'>): boolean {
  return user.source === 'entra';
}
