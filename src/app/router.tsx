import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './AppShell';
import { AuthLayout } from './AuthLayout';
import { RouteError, NotFoundScreen } from './routes/NotFoundScreen';
import { useAuthStore } from '@/stores/auth';

/**
 * Gate the app shell behind the simulated session. Unauthenticated access to any
 * in-app route redirects to /login. (The demo session defaults to authenticated;
 * Sign out clears it.) // ASSUMPTION: real session enforcement is upstream.
 */
function ProtectedShell() {
  const authenticated = useAuthStore((s) => s.authenticated);
  if (!authenticated) return <Navigate to="/login" replace />;
  return <AppShell />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedShell />,
    errorElement: <RouteError />,
    children: [
      // Real screens (lazy for route-level code splitting).
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/features/dashboard/DashboardScreen')).DashboardScreen }),
      },
      {
        path: 'onboarding',
        lazy: async () => ({ Component: (await import('@/features/onboarding/OnboardingScreen')).OnboardingScreen }),
      },
      {
        path: 'design-system',
        lazy: async () => ({ Component: (await import('@/features/platform/DesignSystemScreen')).DesignSystemScreen }),
      },

      // Identity Inventory + Detail (detail renders as a right-side panel overlay).
      {
        path: 'discover',
        lazy: async () => ({ Component: (await import('@/features/discover/InventoryScreen')).InventoryScreen }),
        children: [
          {
            path: ':identityId',
            lazy: async () => ({ Component: (await import('@/features/discover/IdentityDetailPanel')).IdentityDetailPanel }),
          },
        ],
      },

      // Govern — policy list + builder.
      {
        path: 'govern',
        lazy: async () => ({ Component: (await import('@/features/govern/PolicyListScreen')).PolicyListScreen }),
      },
      {
        path: 'govern/builder',
        lazy: async () => ({ Component: (await import('@/features/govern/PolicyBuilderScreen')).PolicyBuilderScreen }),
      },
      {
        path: 'govern/builder/:policyId',
        lazy: async () => ({ Component: (await import('@/features/govern/PolicyBuilderScreen')).PolicyBuilderScreen }),
      },

      // Monitor — alert feed + detail panel.
      {
        path: 'monitor',
        lazy: async () => ({ Component: (await import('@/features/monitor/MonitorScreen')).MonitorScreen }),
        children: [
          {
            path: ':alertId',
            lazy: async () => ({ Component: (await import('@/features/monitor/AlertDetailPanel')).AlertDetailPanel }),
          },
        ],
      },

      // Blast Radius (read-only).
      {
        path: 'resilience/blast-radius',
        lazy: async () => ({ Component: (await import('@/features/resilience/BlastRadiusScreen')).BlastRadiusScreen }),
      },

      // Agent Session Replay.
      {
        path: 'intelligence',
        lazy: async () => ({ Component: (await import('@/features/intelligence/SessionListScreen')).SessionListScreen }),
      },
      {
        path: 'intelligence/:sessionId',
        lazy: async () => ({ Component: (await import('@/features/intelligence/SessionReplayScreen')).SessionReplayScreen }),
      },
      {
        path: 'resilience/rehearsals',
        lazy: async () => ({ Component: (await import('@/features/resilience/RehearsalsScreen')).RehearsalsScreen }),
      },
      {
        path: 'resilience/copilot',
        lazy: async () => ({ Component: (await import('@/features/resilience/CopilotScreen')).CopilotScreen }),
      },
      {
        path: 'rotate',
        lazy: async () => ({ Component: (await import('@/features/rotate/RotateScreen')).RotateScreen }),
      },
      {
        path: 'rotate/:jobId',
        lazy: async () => ({ Component: (await import('@/features/rotate/RotationJobDetail')).RotationJobDetail }),
      },
      {
        path: 'settings',
        lazy: async () => ({ Component: (await import('@/features/platform/SettingsScreen')).SettingsScreen }),
      },
      {
        path: 'settings/sso',
        lazy: async () => ({ Component: (await import('@/features/platform/SsoScreen')).SsoScreen }),
      },
      // User administration (add-on). Invite / Edit are modals over the list.
      {
        path: 'settings/users',
        lazy: async () => ({ Component: (await import('@/features/admin/UsersScreen')).UsersScreen }),
      },
      {
        path: 'audit',
        lazy: async () => ({ Component: (await import('@/features/platform/AuditScreen')).AuditScreen }),
      },
      {
        path: 'notifications',
        lazy: async () => ({ Component: (await import('@/features/platform/NotificationsScreen')).NotificationsScreen }),
      },

      { path: '*', element: <NotFoundScreen /> },
    ],
  },

  // Public registration & authentication (centered AuthLayout, no app shell).
  {
    element: <AuthLayout />,
    errorElement: <RouteError />,
    children: [
      {
        path: 'register',
        lazy: async () => ({ Component: (await import('@/features/auth/RequestAccessScreen')).RequestAccessScreen }),
      },
      {
        path: 'register/verify',
        lazy: async () => ({ Component: (await import('@/features/auth/VerifyEmailScreen')).VerifyEmailScreen }),
      },
      {
        // Second half of step 2 — domain ownership. Blocking: Terms redirects back
        // here until it passes.
        path: 'register/domain',
        lazy: async () => ({ Component: (await import('@/features/auth/VerifyDomainScreen')).VerifyDomainScreen }),
      },
      {
        path: 'register/terms',
        lazy: async () => ({ Component: (await import('@/features/auth/LegalTermsScreen')).LegalTermsScreen }),
      },
      {
        path: 'register/complete',
        lazy: async () => ({ Component: (await import('@/features/auth/RegisterCompleteScreen')).RegisterCompleteScreen }),
      },
      {
        // Final registration step, after MFA enrollment — exits to onboarding.
        path: 'register/password',
        lazy: async () => ({ Component: (await import('@/features/auth/CreatePasswordScreen')).CreatePasswordScreen }),
      },
      {
        path: 'login',
        lazy: async () => ({ Component: (await import('@/features/auth/LoginScreen')).LoginScreen }),
      },
      {
        path: 'accept-invite/:token',
        lazy: async () => ({ Component: (await import('@/features/auth/AcceptInviteScreen')).AcceptInviteScreen }),
      },
      {
        path: 'mfa/setup',
        lazy: async () => ({ Component: (await import('@/features/auth/MfaSetupScreen')).MfaSetupScreen }),
      },
      {
        path: 'mfa/challenge',
        lazy: async () => ({ Component: (await import('@/features/auth/MfaChallengeScreen')).MfaChallengeScreen }),
      },
      {
        path: 'forgot-password',
        lazy: async () => ({ Component: (await import('@/features/auth/ForgotPasswordScreen')).ForgotPasswordScreen }),
      },
      {
        path: 'forgot-password/verify',
        lazy: async () => ({ Component: (await import('@/features/auth/ResetOtpScreen')).ResetOtpScreen }),
      },
      // Two ways in: the recovery code (no token) or an emailed link (tokened).
      {
        path: 'reset-password',
        lazy: async () => ({ Component: (await import('@/features/auth/ResetPasswordScreen')).ResetPasswordScreen }),
      },
      {
        path: 'reset-password/:token',
        lazy: async () => ({ Component: (await import('@/features/auth/ResetPasswordScreen')).ResetPasswordScreen }),
      },
    ],
  },
], {
  future: {
    // Opt in early to v7 behavior to silence the dev future-flag warnings.
    v7_relativeSplatPath: true,
  },
});
