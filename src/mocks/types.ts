// The shared domain contract. The identity model drives most of the product;
// implement it once here and reuse everywhere. Derived fields (risk, correlation,
// governance, reachability, baseline) are produced upstream — the UI displays them.

import type { Role } from '@/lib/permissions';

export type NhiType = 'ai-agent' | 'service-account' | 'api-key' | 'oauth-token' | 'workload-identity';
export type Cloud = 'aws' | 'gcp' | 'azure';
export type RiskBand = 'critical' | 'high' | 'medium' | 'low' | 'minimal';

export const NHI_TYPES: NhiType[] = [
  'ai-agent',
  'service-account',
  'api-key',
  'oauth-token',
  'workload-identity',
];
export const CLOUDS: Cloud[] = ['aws', 'gcp', 'azure'];

export const NHI_TYPE_LABELS: Record<NhiType, string> = {
  'ai-agent': 'AI Agent',
  'service-account': 'Service Account',
  'api-key': 'API Key',
  'oauth-token': 'OAuth Token',
  'workload-identity': 'Workload Identity',
};

export const CLOUD_LABELS: Record<Cloud, string> = {
  aws: 'AWS',
  gcp: 'Google Cloud',
  azure: 'Azure',
};

// Identity lifecycle status (derived, display-only). Distinct from governanceStatus.
export type IdentityStatus = 'active' | 'inactive' | 'quarantined';
export const IDENTITY_STATUSES: IdentityStatus[] = ['active', 'inactive', 'quarantined'];
export const IDENTITY_STATUS_LABELS: Record<IdentityStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  quarantined: 'Quarantined',
};

export interface SourceInstance {
  // a source is authoritative for its own attributes
  cloud: Cloud;
  externalId: string;
  attributes: Record<string, string>; // owned by the source
  lastSeen: string; // ISO
}

export interface AttributeConflict {
  // surfaced, never merged
  attribute: string;
  values: { cloud: Cloud; value: string }[];
}

export type GovernanceStatus = 'governed' | 'ungoverned' | 'drift';

export interface Identity {
  id: string;
  name: string;
  type: NhiType;
  sources: SourceInstance[]; // expand a correlated identity to instances
  correlated: boolean; // derived
  orphaned: boolean; // derived, first-class high-risk
  orphanReason?: string;
  conflicts: AttributeConflict[];
  riskScore: number; // 0..100, precomputed upstream (display only)
  riskBand: RiskBand; // derived from score, display mapping
  governanceStatus: GovernanceStatus; // derived
  status: IdentityStatus; // lifecycle state (derived) // ASSUMPTION: derived upstream
  owner?: string;
  relationships: { identityId: string; kind: string }[];
  riskSeries: { t: string; score: number }[]; // for the per-identity timeline
  createdAt: string;
  lastSeen: string;
}

export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  identityId: string;
  severity: RiskBand;
  title: string;
  description: string;
  recommendedNextStep: string;
  baseline: 'learning' | 'established';
  baselineProgress?: { day: number; of: number };
  status: AlertStatus;
  createdAt: string;
}

export interface PolicyToken {
  kind: 'when' | 'and' | 'then';
  subject: string;
  operator: string;
  value: string;
}

// Full lifecycle per the Govern module spec (FR-010/FR-011): Archived is reachable
// only from Suspended, and only Active policies affect live behaviour.
export type PolicyStatus = 'draft' | 'tested' | 'active' | 'suspended' | 'archived';
export const POLICY_STATUSES: PolicyStatus[] = [
  'draft',
  'tested',
  'active',
  'suspended',
  'archived',
];

export interface Policy {
  id: string;
  name: string;
  tokens: PolicyToken[];
  plainEnglish: string; // generated preview
  generatedCode: string; // read-only, illustrative // ASSUMPTION: grammar Architect-owned
  affectedCount: number; // precomputed
  status: PolicyStatus;
  updatedAt: string;
  /** Set on every successful dry-run. Null until first tested. */
  lastTestedAt?: string;
  /** Set on first activation; retained across suspend/reactivate. */
  activatedAt?: string;
  /**
   * The exact token set proven by the last dry-run. Activation requires this to
   * still match `tokens` (FR-005) — editing a rule invalidates its test.
   */
  testedTokens?: PolicyToken[];
}

/**
 * What an active policy did to one identity, once.
 *
 * Only `quarantine` produces these. `review` and `alert` mark rather than act —
 * a flag is derived from the current match set, an alert is an Alert — and a
 * rotate policy proposes a rotation rather than running one. None of those three
 * leave a discrete cloud-side outcome, so none of them appear here.
 */
export type PolicyActionOutcome = 'quarantined' | 'failed' | 'skipped' | 'released';

/**
 * Typed causes rather than free text, so identical failures can be counted and
 * fixed once — "12 failures, all the same missing permission" is the useful
 * reading, and a sentence per row makes it ungreppable.
 */
export type PolicyActionReason =
  | 'connector-permission'
  | 'identity-gone'
  | 'already-quarantined'
  | 'self-protection'
  | 'provider-error';

export const POLICY_ACTION_REASON_LABELS: Record<PolicyActionReason, string> = {
  'connector-permission': 'Connector lacks permission for this action',
  'identity-gone': 'Identity no longer exists at the provider',
  'already-quarantined': 'Already quarantined — nothing to do',
  'self-protection': "Self-protection — Acrivault's own connector is never acted on",
  'provider-error': 'Provider rejected the call',
};

/** Why a sweep ran. A release is a person's doing, so it belongs to no sweep. */
export type SweepReason = 'activation' | 're-evaluation';

export interface PolicyAction {
  id: string;
  policyId: string;
  /**
   * The policy's name AT THE TIME. Stamped rather than resolved on read, so
   * renaming a policy cannot rewrite what the log says happened.
   */
  policyName: string;
  identityId: string;
  outcome: PolicyActionOutcome;
  /** Set on `failed` and `skipped`; absent otherwise. */
  reason?: PolicyActionReason;
  /** A person's own words, and only ever theirs — carried on a release. */
  note?: string;
  /**
   * Who is answerable: whoever ACTIVATED the rule, not whoever drafted it.
   * Activation is the separately-permissioned decision (`policy.activate`), and
   * an Analyst who drafts a rule cannot authorize it to enforce. Stamped for the
   * same reason as `policyName` — a policy reactivated by someone else must not
   * retroactively reassign responsibility for what already happened.
   */
  accountable: string;
  /** Groups the rows one sweep produced. Absent on a release. */
  sweepId?: string;
  sweepReason?: SweepReason;
  /** The action a release reverses. */
  reversesId?: string;
  at: string;
} // append-only

export type SessionStepKind = 'prompt' | 'tool-call' | 'model-response';

export interface SessionStep {
  id: string;
  kind: SessionStepKind;
  at: string;
  summary: string;
  detail: string;
  anomaly: boolean;
}

export type SessionStatus = 'open' | 'reviewed' | 'quarantined';

export interface AgentSession {
  id: string;
  identityId: string;
  startedAt: string;
  endedAt?: string;
  riskScore: number;
  anomalyCount: number;
  steps: SessionStep[];
  provenance: { model: string; origin: string; credentialRef: string };
  status: SessionStatus;
}

// ASSUMPTION: 6-phase lifecycle naming (Rotation and cascade-revocation mechanics).
export type RotationPhase = 'prepare' | 'issue' | 'propagate' | 'verify' | 'revoke' | 'confirm';
export const ROTATION_PHASES: RotationPhase[] = [
  'prepare',
  'issue',
  'propagate',
  'verify',
  'revoke',
  'confirm',
];

export interface RotationJob {
  id: string;
  identityId: string;
  mode: 'standard' | 'emergency';
  phase: RotationPhase;
  phaseProgress: number; // 0..1 within the current phase
  startedAt: string;
  cascade: { identityId: string; action: 'revoke' | 'reissue'; status: string }[];
}

export interface RotationHistoryEntry {
  id: string;
  identityId: string;
  mode: 'standard' | 'emergency';
  completedAt: string;
  outcome: 'success' | 'rolled-back';
  actor: string;
}

export interface ReachNode {
  id: string;
  identityId: string;
  label: string;
  kind: 'origin' | 'direct' | 'transitive' | 'cascade';
}
export interface ReachEdge {
  from: string;
  to: string;
  kind: 'direct' | 'transitive' | 'cascade';
}
export interface BlastRadius {
  originIdentityId: string;
  /** The drawn subset of the reachable set — capped for legibility, see `graph`. */
  nodes: ReachNode[];
  edges: ReachEdge[];
  /** True reach, counted over the whole walk — never the drawn subset. */
  summary: { direct: number; transitive: number; cascade: number };
  /** How much of the reachable set the graph draws, so the cap is never silent. */
  graph: { drawn: number; total: number };
  estimatedContainment: string; // display string, e.g. "~12 min" // ASSUMPTION: Resilience-owned
}

/**
 * Tenant-wide monitoring baseline. Anomaly detection is only at full strength once
 * an identity's behavioural baseline is established, and the FRS requires the UI to
 * say which state it is in rather than imply full coverage.
 * // ASSUMPTION: baseline derivation + window length are Architect-owned; the UI
 * // displays this value and never computes it.
 */
export interface MonitoringBaseline {
  state: 'learning' | 'established';
  /** Identities whose baseline is still forming. */
  learning: number;
  /** Identities under monitoring. */
  monitored: number;
  /** Length of the baseline window, in days. */
  windowDays: number;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
  detail?: string;
} // append-only

export interface NotificationItem {
  id: string;
  at: string;
  severity: RiskBand | 'info';
  title: string;
  read: boolean;
  href?: string;
}

export interface CloudConnection {
  cloud: Cloud;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  counts?: Record<NhiType, number>;
}

/* --------------------------------------------------- users, tenants, groups */
// Add-on: organization registration & administration. All auth/SSO/MFA/invitation
// behaviour is simulated upstream; these types model what the UI displays.

// No separate "expired" status: a lapsed validity window maps to `suspended`.
// `suspended-idp` is Entra's doing, not an admin's — the distinction matters
// because only Entra can lift it.
export type UserStatus = 'active' | 'suspended' | 'suspended-idp' | 'deleted';

/** Who owns this account. Entra owns everyone except the registered Tenant Owner. */
export type UserSource = 'entra' | 'local';
export type AuthMethod = 'sso' | 'password';

/** ISO date strings; an absent field means no bound. */
export interface ValidityWindow {
  start?: string;
  expiry?: string;
}

export type SsoProvider = 'entra' | 'okta' | 'none';

export const SSO_PROVIDER_LABELS: Record<SsoProvider, string> = {
  entra: 'Microsoft Entra ID',
  okta: 'Okta',
  none: 'None',
};

/**
 * A certificate's readable summary. Parsed upstream — the UI never decodes x509,
 * it only displays what it is handed (see the mock's ASSUMPTION tag).
 */
export interface CertSummary {
  subject: string;
  thumbprint: string;
  expiresAt: string;
}

/** What Acrivault trusts for sign-in. Null fields mean "not supplied yet". */
export interface SamlConfig {
  entityId: string | null;
  ssoUrl: string | null;
  certificate: string | null;
  cert: CertSummary | null;
  savedAt: string | null;
  /** Set by a real assertion. Until then the configuration is a claim, not a fact. */
  lastSignInAt: string | null;
}

/** How Entra provisions people in. */
export interface ScimConfig {
  tokenIssuedAt: string | null;
  /** Set the first time Entra calls the endpoint — this is what proves the token works. */
  lastSyncAt: string | null;
  usersReceived: number;
}

export interface Tenant {
  id: string;
  name: string;
  allowedDomains: string[]; // SSO-allowed email domains
  status: 'provisioning' | 'active' | 'failed';
  sso: { provider: SsoProvider };
  saml: SamlConfig;
  scim: ScimConfig;
  /** Password sign-in for accounts Entra does not manage. The way back in. */
  passwordFallback: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  name: string; // read-only, sourced from the IdP
  email: string; // read-only, sourced from the IdP
  /** Null until an admin assigns one. Entra sends people, not permissions. */
  role: Role | null;
  status: UserStatus;
  source: UserSource;
  authMethod: AuthMethod;
  validity?: ValidityWindow;
  lastLogin?: string;
  /** When the account appeared in Acrivault — a SCIM push, or registration. */
  addedAt: string;
}

// Wave 2 concept fixtures (concept fidelity only; no recovery internals implied).
export interface RecoveryRehearsal {
  id: string;
  at: string;
  scope: string;
  outcome: 'passed' | 'partial' | 'failed';
  timeToUsableMin: number;
}

export interface CopilotSuggestion {
  id: string;
  title: string;
  rationale: string;
  severity: RiskBand;
  identityId: string;
}
