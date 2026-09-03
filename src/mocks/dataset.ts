// The single seeded source of truth. Every screen reads selectors over THIS
// dataset, which is why counts reconcile by construction. A seeded RNG keeps the
// population identical across runs. Default size is small for fast loads; scale up
// with ?scale=50000 (or localStorage 'acrivault.scale') to hit the perf target.

import {
  attachQuarantineProvenance,
  generateAlerts,
  generateApprovals,
  generateAudit,
  generateConnections,
  generateCopilotSuggestions,
  generateIdentities,
  generateNotifications,
  generatePolicies,
  generatePolicyActions,
  generateRehearsals,
  generateRotations,
  generateSessions,
  generateTenant,
  generateUsers,
} from './generators';
import {
  NHI_TYPES,
  type Identity,
  type NhiType,
  type RiskBand,
  type Tenant,
  type User,
} from './types';

const SEED = 20260101;
const DEFAULT_SIZE = 1500;
const MAX_SIZE = 50000;

/**
 * "Now" for the synthetic dataset, anchored to the top of the current hour.
 *
 * SEED — not this value — is what keeps the data deterministic: ids, names, types,
 * risk scores and relationships are identical across runs. Only timestamps move,
 * and they have to: relative times and the Monitor feed's recency buckets are read
 * against the real clock, so a pinned date silently rots. Once it drifts a month,
 * every alert reads "last month", the Today / Earlier-this-week buckets stop
 * rendering, and a live alert feed looks abandoned.
 */
export const NOW = new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000);

function resolveSize(): number {
  let size = DEFAULT_SIZE;
  if (typeof window !== 'undefined') {
    const param = new URLSearchParams(window.location.search).get('scale');
    const stored = window.localStorage.getItem('acrivault.scale');
    const raw = param ?? stored;
    if (raw) {
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n > 0) size = n;
    }
  }
  return Math.min(MAX_SIZE, Math.max(10, size));
}

export interface Dataset {
  size: number;
  identities: Identity[];
  identityById: Map<string, Identity>;
  alerts: ReturnType<typeof generateAlerts>;
  /** Pending propose-and-approve queue (Act > Approvals). Mutable: decisions land here. */
  approvals: ReturnType<typeof generateApprovals>;
  sessions: ReturnType<typeof generateSessions>;
  policies: ReturnType<typeof generatePolicies>;
  policyActions: ReturnType<typeof generatePolicyActions>;
  rotations: ReturnType<typeof generateRotations>;
  audit: ReturnType<typeof generateAudit>;
  notifications: ReturnType<typeof generateNotifications>;
  connections: ReturnType<typeof generateConnections>;
  rehearsals: ReturnType<typeof generateRehearsals>;
  copilot: ReturnType<typeof generateCopilotSuggestions>;
  // Add-on: organization registration & administration (mutable in-memory store).
  tenant: Tenant;
  users: User[];
}

function build(): Dataset {
  const size = resolveSize();
  const identities = generateIdentities(SEED, size, NOW);
  const identityById = new Map(identities.map((i) => [i.id, i]));
  const users = generateUsers(NOW);
  // Audit targets name real entities, so the things it names are built first.
  const policies = generatePolicies(identities, SEED, NOW);
  const tenant = generateTenant(NOW);
  const sessions = generateSessions(identities, SEED, NOW);
  // Post-pass: policies, users and sessions all exist now, so a quarantined
  // identity can finally be given a producer (see attachQuarantineProvenance).
  attachQuarantineProvenance(identities, policies, users, sessions, SEED, NOW);
  // Strictly AFTER the post-pass, which PROMOTES one active ai-agent to
  // quarantined. Seeded before it, an approval could name that identity and the
  // queue would open with a request to contain something already contained.
  const approvals = generateApprovals(identities, users, SEED, NOW);
  return {
    size,
    identities,
    identityById,
    alerts: generateAlerts(identities, SEED, NOW),
    approvals,
    sessions,
    policies,
    policyActions: generatePolicyActions(identities, policies, users, SEED, NOW),
    rotations: generateRotations(identities, SEED, NOW),
    audit: generateAudit(identities, policies, users, tenant, SEED, NOW),
    notifications: generateNotifications(SEED, NOW),
    connections: generateConnections(identities, NOW),
    rehearsals: generateRehearsals(SEED, NOW),
    copilot: generateCopilotSuggestions(identities, SEED),
    tenant,
    users,
  };
}

let _dataset: Dataset | null = null;

/** The lazily-built, memoized dataset singleton. */
export function getDataset(): Dataset {
  if (!_dataset) _dataset = build();
  return _dataset;
}

/* ------------------------------------------------------ reconciling selectors */

export interface TypeBreakdown {
  type: NhiType;
  count: number;
}

/** Per-type counts over the deduplicated, correlated set. */
export function typeBreakdown(identities: Identity[]): TypeBreakdown[] {
  const counts = new Map<NhiType, number>(NHI_TYPES.map((t) => [t, 0]));
  for (const identity of identities) {
    counts.set(identity.type, (counts.get(identity.type) ?? 0) + 1);
  }
  return NHI_TYPES.map((type) => ({ type, count: counts.get(type) ?? 0 }));
}

/**
 * Per-type discovery targets revealed by the onboarding scan. Derived from the
 * SAME seeded dataset the dashboard reports over (and so scale-aware via
 * `?scale=`), guaranteeing the onboarding total reconciles with the dashboard
 * total — the one number a deduplication product can never get wrong.
 */
export function discoveryScanTargets(): Record<NhiType, number> {
  const out = {} as Record<NhiType, number>;
  for (const { type, count } of typeBreakdown(getDataset().identities)) out[type] = count;
  return out;
}

export function riskBreakdown(identities: Identity[]): Record<RiskBand, number> {
  const out: Record<RiskBand, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    minimal: 0,
  };
  for (const identity of identities) out[identity.riskBand] += 1;
  return out;
}

/**
 * Total raw source instances across every cloud, before correlation. The
 * deduplication ratio a customer buys the product for is
 * `1 - identities.length / sourceInstanceCount(identities)`.
 */
export function sourceInstanceCount(identities: Identity[]): number {
  return identities.reduce((n, i) => n + i.sources.length, 0);
}

export function orphanedCount(identities: Identity[]): number {
  return identities.reduce((n, i) => n + (i.orphaned ? 1 : 0), 0);
}

export function conflictsCount(identities: Identity[]): number {
  return identities.reduce((n, i) => n + (i.conflicts.length > 0 ? 1 : 0), 0);
}
