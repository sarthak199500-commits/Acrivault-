import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RANK, type Role } from '@/lib/permissions';
import {
  DEFAULT_SCENARIO,
  type AuthScenario,
  type ScenarioConfig,
  type ScenarioState,
  type SignInMethod,
} from '@/mocks/scenarios';

export type Theme = 'dark' | 'light';
export type Density = 'compact' | 'comfortable';

interface UiState {
  theme: Theme;
  role: Role;
  density: Density;
  reducedMotion: boolean;
  scenario: ScenarioConfig;
  /**
   * Whether the tenant has discovered identities yet. The demo (Acme) tenant is
   * populated (true); a brand-new tenant starts empty (false) until onboarding's
   * scan runs. Not persisted — reloads start from the demo's populated state.
   */
  discovered: boolean;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setRole: (role: Role) => void;
  setDensity: (density: Density) => void;
  setReducedMotion: (value: boolean) => void;
  setScenarioState: (state: ScenarioState) => void;
  setDiscovered: (value: boolean) => void;
  setLatency: (ms: number) => void;
  setAuthScenario: (auth: AuthScenario) => void;
  setSignIn: (signIn: SignInMethod) => void;
  resetScenario: () => void;
}

/** Reflect a state value onto the <html> data-* attributes the tokens key off. */
function applyToDocument(state: Pick<UiState, 'theme' | 'density' | 'reducedMotion'>): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', state.theme);
  root.setAttribute('data-density', state.density);
  if (state.reducedMotion) root.setAttribute('data-reduced-motion', 'true');
  else root.removeAttribute('data-reduced-motion');
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      // Default actor is the Tenant Admin (org owner) so the full admin surface is
      // visible out of the box; the dev Role Switcher previews every other role.
      role: 'tenant-admin',
      density: 'comfortable',
      reducedMotion: false,
      scenario: DEFAULT_SCENARIO,
      discovered: true,

      setTheme: (theme) => {
        set({ theme });
        applyToDocument({ ...get(), theme });
      },
      toggleTheme: () => {
        const theme = get().theme === 'dark' ? 'light' : 'dark';
        set({ theme });
        applyToDocument({ ...get(), theme });
      },
      setRole: (role) => set({ role }),
      setDensity: (density) => {
        set({ density });
        applyToDocument({ ...get(), density });
      },
      setReducedMotion: (reducedMotion) => {
        set({ reducedMotion });
        applyToDocument({ ...get(), reducedMotion });
      },
      setScenarioState: (state) =>
        set((s) => ({ scenario: { ...s.scenario, state } })),
      setDiscovered: (discovered) => set({ discovered }),
      setLatency: (latencyMs) => set((s) => ({ scenario: { ...s.scenario, latencyMs } })),
      setAuthScenario: (auth) => set((s) => ({ scenario: { ...s.scenario, auth } })),
      setSignIn: (signIn) => set((s) => ({ scenario: { ...s.scenario, signIn } })),
      resetScenario: () => set({ scenario: DEFAULT_SCENARIO }),
    }),
    {
      name: 'acrivault.ui',
      // Bumped when the role model changed: v2 renamed 'admin' to 'security-admin'
      // and added Tenant Admin on top; v3 added Tenant Owner above that. No v3
      // value rewrite is needed — every persisted role stayed valid — but the
      // bump re-runs the unknown-role guard below.
      version: 3,
      migrate: (persisted, version) => {
        const state = { ...((persisted ?? {}) as Record<string, unknown>) };
        if (version < 2 && state.role === 'admin') {
          state.role = 'security-admin';
        }
        // Guard against any unknown role value (e.g. a future downgrade).
        if (typeof state.role !== 'string' || !(state.role in RANK)) {
          state.role = 'tenant-admin';
        }
        return state as unknown as UiState;
      },
      // Scenario is a dev control; do not persist it so reloads start clean.
      partialize: (s) => ({
        theme: s.theme,
        role: s.role,
        density: s.density,
        reducedMotion: s.reducedMotion,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) applyToDocument(state);
      },
    },
  ),
);

/** Read the current scenario synchronously (used by the non-React mock API). */
export function currentScenario(): ScenarioConfig {
  return useUiStore.getState().scenario;
}

/**
 * Whether the tenant has discovered any identities yet (false for a brand-new
 * tenant until onboarding's scan runs). Read synchronously by the mock API so the
 * dashboard, inventory, and every other view show their empty state pre-onboarding.
 */
export function tenantHasData(): boolean {
  return useUiStore.getState().discovered;
}
