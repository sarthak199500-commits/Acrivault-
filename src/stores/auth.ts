// Simulated auth session. There is no backend: this only models "is someone
// signed in, and who". The app defaults to an authenticated demo Tenant Admin so
// the existing in-app screens stay directly reachable; Sign out clears the session
// and exercises the unauthenticated → /login guard. // ASSUMPTION: real session,
// SSO, and MFA are upstream and Architect-owned.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Role } from '@/lib/permissions';
import { useUiStore } from './ui';

/** The fixed signed-in demo user (Acme's Tenant Admin / org owner). */
export const CURRENT_USER_ID = 'usr_1';

interface AuthState {
  authenticated: boolean;
  userId: string;
  signIn: (userId?: string) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      authenticated: true,
      userId: CURRENT_USER_ID,
      signIn: (userId = CURRENT_USER_ID) => set({ authenticated: true, userId }),
      signOut: () => set({ authenticated: false }),
    }),
    { name: 'acrivault.auth' },
  ),
);

/**
 * The current actor for least-privilege gating: the signed-in user's id paired
 * with the effective (viewing) role. The dev Role Switcher overrides the role so
 * a reviewer can preview every variation without re-authenticating.
 */
export function currentActor(): { id: string; role: Role } {
  return { id: useAuthStore.getState().userId, role: useUiStore.getState().role };
}
