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

/**
 * What put an identity into quarantine. The state is reachable three ways — a
 * Govern policy action, an admin acting from the identity panel, and a session
 * review — and a terminal state with no named producer is not auditable.
 */
export type QuarantineSource =
  | { kind: 'policy'; policyId: string }
  | { kind: 'user'; userId: string }
  | { kind: 'session'; sessionId: string };

export interface QuarantineRecord {
  at: string;
  by: QuarantineSource;
}

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
  /** Present only while `status` is 'quarantined'. */
  quarantine?: QuarantineRecord;
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

/** Privilege a tool call ran with. */
export type ToolScope = 'read' | 'write' | 'admin';
export const TOOL_SCOPES: ToolScope[] = ['read', 'write', 'admin'];

/**
 * What the detection engine concluded about a step.
 *
 * DEVIATION FROM SPEC 11.4: the FRS models `event_type` as one enum —
 * `prompt_received / tool_call / model_response / anomaly / blocked` — which cannot
 * express a blocked *tool call*: picking `blocked` loses what kind of step it was, and
 * the timeline needs both. Kind and verdict are kept as separate axes here. The spec's
 * five values are all still representable; they are just two fields instead of one.
 *
 * `scoring` is FR-005's exception flow: a very recent step the engine has not scored
 * yet must not render as confirmed-clean.
 */
export type StepStatus = 'normal' | 'anomaly' | 'blocked' | 'scoring';

/** A step the analyst has to weigh — anomalous or held. Drives the Flagged column. */
export const FLAGGED_STATUSES: StepStatus[] = ['anomaly', 'blocked'];
export const isFlaggedStep = (step: SessionStep): boolean =>
  FLAGGED_STATUSES.includes(step.status);

export interface SessionStep {
  id: string;
  /** 1-based ordinal within the session; defines display order (spec 11.4). */
  stepNo: number;
  kind: SessionStepKind;
  /** Steps are chronological: `at` never moves backwards across the array. */
  at: string;
  summary: string;
  detail: string;
  status: StepStatus;
  /** Why the engine flagged it — FR-005 requires the reason inline, not just a mark. */
  anomalyReason?: string;
  /** The hard-deny rule that matched this step (status `blocked`, FR-006). */
  blockedByRule?: string;
  /**
   * Whether the action was actually stopped. FR-006's exception flow: when the upstream
   * system has no hold primitive the rule still matches but the call completes, and the
   * step must read "observed, not blocked" rather than claiming a containment that
   * never happened.
   */
  holdEnforced?: boolean;
  /** Set once an analyst confirms the block or overrides it with justification. */
  blockDecision?: { outcome: 'confirmed' | 'overridden'; justification?: string; at: string };
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

/**
 * A session is FLAGGED or not — it carries no score of its own.
 *
 * There was a derived 0..100 `riskScore` here, computed in the frontend from anomaly
 * density, privilege and burst. It fixed a real defect (the previous field copied
 * `identity.riskScore`, so every session of one agent tied and clean sessions outranked
 * anomalous ones) but replaced it with a worse problem: a number an analyst acts on and
 * that reaches SOC 2 / HITRUST evidence, invented in a UI bundle, unversioned and
 * unreproducible. Spec 11.3 puts RISK_SCORE on the IDENTITY, computed by the detection
 * engine per CR-01 (60% behavioral deviation / 40% policy match, tenant-configurable);
 * spec 10.2 gives the session list `Flagged (Yes/No)`. Ranking now uses the raw facts
 * the engine already produces — see features/intelligence/sessionRanking.ts.
 */
export interface AgentSession {
  id: string;
  identityId: string;
  startedAt: string;
  endedAt: string;
  anomalyCount: number;
  /** Steps held by a hard-deny rule (FR-006), counted separately from anomalies. */
  blockedCount: number;
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

export const AUDIT_OBJECTS = ['identity', 'session', 'policy', 'user', 'cloud', 'tenant'] as const;
export type AuditObject = (typeof AUDIT_OBJECTS)[number];

/**
 * Every action the product writes to the log, as a closed set.
 *
 * A union rather than a string: ACTION_OBJECT below is a Record over it, so the
 * compiler refuses a new action nobody has classified. That is what stops the
 * object filter silently under-reporting — an unclassified action would land in
 * no bucket and simply vanish from a filtered view.
 *
 * Derived from every `appendAudit()` call site in api.ts plus the seeded action
 * tuples in generators.ts. `requested rotation` and `executed emergency
 * rotation` are seed-only today; the live rotation path does not yet write the
 * log, which is why they appear here but not in api.ts.
 */
export const AUDIT_ACTIONS = [
  'acknowledged alert',
  'resolved alert',
  'assigned owner',
  'requested rotation',
  'executed emergency rotation',
  'quarantined agent',
  'recommended agent quarantine',
  'released agent from quarantine',
  'reviewed agent session',
  'confirmed held step',
  'overrode held step',
  'tested policy',
  'activated policy',
  'reactivated policy',
  'suspended policy',
  'archived policy',
  'edited user',
  'deleted user',
  'suspended user',
  'reactivated user',
  'changed user role',
  'assigned role',
  'synced users from Entra',
  'connected cloud',
  'updated SSO config',
  'saved SAML configuration',
  'tested SAML sign-in',
  'issued SCIM token',
  'enabled password sign-in',
  'disabled password sign-in',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * What kind of thing each action acts on. Exhaustive by construction.
 *
 * The held-step decisions and the session review classify as `session` even
 * though their target names an identity: the reader filtering for sessions is
 * looking for what happened inside a session, not for the agent's own record.
 */
export const ACTION_OBJECT: Record<AuditAction, AuditObject> = {
  'acknowledged alert': 'identity',
  'resolved alert': 'identity',
  'assigned owner': 'identity',
  'requested rotation': 'identity',
  'executed emergency rotation': 'identity',
  'quarantined agent': 'identity',
  'recommended agent quarantine': 'identity',
  'released agent from quarantine': 'identity',
  'reviewed agent session': 'session',
  'confirmed held step': 'session',
  'overrode held step': 'session',
  'tested policy': 'policy',
  'activated policy': 'policy',
  'reactivated policy': 'policy',
  'suspended policy': 'policy',
  'archived policy': 'policy',
  'edited user': 'user',
  'deleted user': 'user',
  'suspended user': 'user',
  'reactivated user': 'user',
  'changed user role': 'user',
  'assigned role': 'user',
  'synced users from Entra': 'user',
  'connected cloud': 'cloud',
  'updated SSO config': 'tenant',
  'saved SAML configuration': 'tenant',
  'tested SAML sign-in': 'tenant',
  'issued SCIM token': 'tenant',
  'enabled password sign-in': 'tenant',
  'disabled password sign-in': 'tenant',
};

export const AUDIT_OBJECT_LABELS: Record<AuditObject, string> = {
  identity: 'Identity',
  session: 'Session',
  policy: 'Policy',
  user: 'User',
  cloud: 'Cloud',
  tenant: 'Tenant',
};

/**
 * How long entries are retained before archival.
 * // ASSUMPTION: 12 months is a placeholder chosen to be defensible for the
 * // October SOC 2 Type I date. It is a policy decision with cost and legal
 * // consequences and is pending sign-off. If it is not signed off, ship the
 * // sentence without the figure — the copy is this one constant.
 */
export const AUDIT_RETENTION_LABEL = '12 months';

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: AuditAction;
  /** What kind of thing the action acted on. Derived from `action`. */
  object: AuditObject;
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
  /** ISO timestamp of this source's last SUCCESSFUL sync. Absent if never synced. */
  lastSyncAt?: string;
  /** Present only while `status` is 'error'. */
  error?: { code: string; message: string; since: string };
}

/** A connection's reported instances summed across every NHI type. Absent counts read as 0. */
export function totalFor(connection: CloudConnection): number {
  return connection.counts ? Object.values(connection.counts).reduce((a, b) => a + b, 0) : 0;
}

/**
 * Tenant-wide connector coverage for the persistent chrome indicator. A count of
 * healthy sources plus the age of the OLDEST successful sync — never the newest,
 * which is what would let a partial dataset present itself as fresh.
 */
export interface SourceHealth {
  healthy: number;
  total: number;
  oldestSyncAt?: string;
  degraded: Cloud[];
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
