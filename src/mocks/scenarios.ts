// Per-app forced-state and latency control, read by the mock API and by
// QueryBoundary. The dev Scenario Switcher writes these; production hides it.

export type ScenarioState = 'auto' | 'loading' | 'empty' | 'error' | 'populated';

/**
 * Named failure modes for the registration, authentication, and administration
 * flows, which have richer error cases than the four generic data states. The
 * mock auth/admin operations read this so a reviewer can reach every edge case
 * (email outage, expired code, provisioning failure, invite email failure, …)
 * from the dev Scenario Switcher without editing code.
 */
export type AuthScenario =
  | 'normal'
  | 'email-outage' // verification/invitation email cannot be sent
  | 'code-expired' // verification code has expired (auto-resend + restart timer)
  | 'domain-unverified' // domain ownership cannot be confirmed after email verification
  | 'legal-docs-failed' // legal documents fail to load
  | 'provisioning-failed' // tenant provisioning fails
  | 'invite-email-failed' // user created but the invitation email failed
  | 'api-failure'; // a generic admin operation rejects

export const AUTH_SCENARIOS: AuthScenario[] = [
  'normal',
  'email-outage',
  'code-expired',
  'domain-unverified',
  'legal-docs-failed',
  'provisioning-failed',
  'invite-email-failed',
  'api-failure',
];

export const AUTH_SCENARIO_LABELS: Record<AuthScenario, string> = {
  normal: 'Normal',
  'email-outage': 'Email outage',
  'code-expired': 'Code expired',
  'domain-unverified': 'Domain unverified',
  'legal-docs-failed': 'Legal docs fail',
  'provisioning-failed': 'Provisioning fails',
  'invite-email-failed': 'Invite email fails',
  'api-failure': 'API failure',
};

/**
 * Dev preview of the tenant sign-in method. 'auto' follows the tenant's IdP
 * config (Tenant.sso.configured); 'sso' / 'password' force a path so a reviewer
 * can see both forks without reconfiguring the tenant.
 */
export type SignInMethod = 'auto' | 'sso' | 'password';

export interface ScenarioConfig {
  /** Force every data view into a state, or 'auto' to behave normally. */
  state: ScenarioState;
  /** Simulated network latency in ms applied by the mock API. */
  latencyMs: number;
  /** Force a named failure in the auth / admin flows, or 'normal'. */
  auth: AuthScenario;
  /** Preview the tenant sign-in fork (SSO vs password fallback). */
  signIn: SignInMethod;
}

export const DEFAULT_SCENARIO: ScenarioConfig = {
  state: 'auto',
  latencyMs: 320,
  auth: 'normal',
  signIn: 'auto',
};

export const LATENCY_PRESETS = [
  { label: 'Instant', value: 0 },
  { label: 'Fast', value: 120 },
  { label: 'Normal', value: 320 },
  { label: 'Slow', value: 900 },
  { label: 'Very slow', value: 2200 },
];
