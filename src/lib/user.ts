// User display helpers. A user's name and email are sourced from the IdP and only
// exist once they have authenticated. Invited and pending users therefore have no
// profile yet — we show the email's local part as a placeholder until first login.

import type { User } from '@/mocks/types';

/** True before the user's first IdP-authenticated login, when no profile name exists. */
export function isProfilePending(user: Pick<User, 'status'>): boolean {
  return user.status === 'invited' || user.status === 'pending';
}

/**
 * Name to show for a user. For invited/pending users (no IdP data yet) this is the
 * email's local part, e.g. "john.doe"; otherwise the IdP-sourced display name.
 */
export function displayName(user: Pick<User, 'status' | 'name' | 'email'>): string {
  if (isProfilePending(user)) {
    return user.email.trim().toLowerCase().split('@')[0];
  }
  return user.name;
}
