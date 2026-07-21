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

export type PolicyStatus = 'draft' | 'tested' | 'active';

export interface Policy {
  id: string;
  name: string;
  tokens: PolicyToken[];
  plainEnglish: string; // generated preview
  generatedCode: string; // read-only, illustrative // ASSUMPTION: grammar Architect-owned
  affectedCount: number; // precomputed
  status: PolicyStatus;
  updatedAt: string;
}

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
  nodes: ReachNode[];
  edges: ReachEdge[];
  summary: { direct: number; transitive: number; cascade: number };
  estimatedContainment: string; // display string, e.g. "~12 min" // ASSUMPTION: Resilience-owned
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

export interface Group {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  memberCount: number;
}

export interface User {
  id: string;
  tenantId: string;
  name: string; // read-only, sourced from the IdP
  email: string; // read-only, sourced from the IdP
  role: Role;
  status: UserStatus;
  groups: string[]; // group ids
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
  groups: string[];
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
