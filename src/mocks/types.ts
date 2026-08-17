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

export type SessionStepKind = 'prompt' | 'tool-call' | 'model-response';

/** Privilege a tool call ran with. Drives the privilege term of session risk. */
export type ToolScope = 'read' | 'write' | 'admin';
export const TOOL_SCOPES: ToolScope[] = ['read', 'write', 'admin'];

export interface SessionStep {
  id: string;
  kind: SessionStepKind;
  /** Steps are chronological: `at` never moves backwards across the array. */
  at: string;
  summary: string;
  detail: string;
  anomaly: boolean;
  /** Tool calls only — the scope the call was invoked with. */
  scope?: ToolScope;
}

/**
 * Whether a human has looked at this session. Deliberately NOT the place quarantine
 * lives: quarantine blocks the *agent*, so it belongs on the identity
 * (`Identity.status`). The two used to share one field, which made a
 * quarantined-but-unreviewed session unrepresentable and left an agent's other
 * sessions reading "open" after it had been contained.
 */
export type SessionReviewState = 'open' | 'reviewed';

/** What spawned a session — the lineage FRS 3.5 asks provenance to answer. */
export type SessionSpawnKind = 'human' | 'schedule' | 'agent';
export const SPAWN_KIND_LABELS: Record<SessionSpawnKind, string> = {
  human: 'Human user',
  schedule: 'Scheduled trigger',
  agent: 'Upstream agent',
};

export interface SessionProvenance {
  model: string;
  /** Where it ran. */
  region: string;
  /** What started it. */
  spawnedBy: { kind: SessionSpawnKind; label: string };
  /** Every credential the session authenticated with, not just the first. */
  credentials: string[];
}

/** One weighted contribution to a session's risk score. See lib/sessionRisk.ts. */
export interface SessionRiskFactor {
  label: string;
  /** Points contributed to the 0..100 score. Factors sum to the score. */
  points: number;
  /** Plain-English reason, shown so an analyst can explain the number. */
  detail: string;
}

export interface AgentSession {
  id: string;
  identityId: string;
  startedAt: string;
  endedAt: string;
  /** Derived from this session's own evidence — see lib/sessionRisk.ts. */
  riskScore: number;
  /** The breakdown behind `riskScore`, so the UI can show why, not just how much. */
  riskFactors: SessionRiskFactor[];
  anomalyCount: number;
  steps: SessionStep[];
  provenance: SessionProvenance;
  reviewState: SessionReviewState;
  reviewedAt?: string;
  /** Set when an Analyst proposes a quarantine for an admin to carry out. */
  quarantineRecommendedAt?: string;
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
export type UserStatus = 'invited' | 'pending' | 'active' | 'suspended' | 'deleted';
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

export interface Tenant {
  id: string;
  name: string;
  allowedDomains: string[]; // SSO-allowed email domains
  status: 'provisioning' | 'active' | 'failed';
  sso: { provider: SsoProvider; configured: boolean };
  createdAt: string;
}

export interface User {
  id: string;
  tenantId: string;
  name: string; // read-only, sourced from the IdP
  email: string; // read-only, sourced from the IdP
  role: Role;
  status: UserStatus;
  authMethod: AuthMethod;
  validity?: ValidityWindow;
  lastLogin?: string;
  invitedAt?: string;
  invitedBy?: string;
}

export interface Invitation {
  token: string;
  tenantId: string;
  email: string;
  role: Role;
  validity?: ValidityWindow;
  authMethod: AuthMethod;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  sentAt: string;
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
