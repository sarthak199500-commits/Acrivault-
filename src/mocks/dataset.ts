// The single seeded source of truth. Every screen reads selectors over THIS
// dataset, which is why counts reconcile by construction. A seeded RNG keeps the
// population identical across runs. Default size is small for fast loads; scale up
// with ?scale=50000 (or localStorage 'acrivault.scale') to hit the perf target.

import {
  generateAlerts,
  generateAudit,
  generateConnections,
  generateCopilotSuggestions,
  generateIdentities,
  generateInvitations,
  generateNotifications,
  generatePolicies,
  generateRehearsals,
  generateRotations,
  generateSessions,
  generateTenant,
  generateUsers,
} from './generators';
import {
  NHI_TYPES,
  type Identity,
  type Invitation,
  type NhiType,
  type RiskBand,
  type Tenant,
  type User,
} from './types';

const SEED = 20260101;
const DEFAULT_SIZE = 1500;
const MAX_SIZE = 50000;

// A fixed "now" so relative times and the dataset stay deterministic across runs.
export const NOW = new Date('2026-06-25T12:00:00.000Z');

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
  sessions: ReturnType<typeof generateSessions>;
  policies: ReturnType<typeof generatePolicies>;
  rotations: ReturnType<typeof generateRotations>;
  audit: ReturnType<typeof generateAudit>;
  notifications: ReturnType<typeof generateNotifications>;
  connections: ReturnType<typeof generateConnections>;
  rehearsals: ReturnType<typeof generateRehearsals>;
  copilot: ReturnType<typeof generateCopilotSuggestions>;
  // Add-on: organization registration & administration (mutable in-memory store).
  tenant: Tenant;
  users: User[];
  invitations: Invitation[];
}

function build(): Dataset {
  const size = resolveSize();
  const identities = generateIdentities(SEED, size, NOW);
  const identityById = new Map(identities.map((i) => [i.id, i]));
  const users = generateUsers(NOW);
  return {
    size,
    identities,
    identityById,
    alerts: generateAlerts(identities, SEED, NOW),
    sessions: generateSessions(identities, SEED, NOW),
    policies: generatePolicies(identities, SEED, NOW),
    rotations: generateRotations(identities, SEED, NOW),
    audit: generateAudit(SEED, NOW),
    notifications: generateNotifications(SEED, NOW),
    connections: generateConnections(identities),
    rehearsals: generateRehearsals(SEED, NOW),
    copilot: generateCopilotSuggestions(identities, SEED),
    tenant: generateTenant(NOW),
    users,
    invitations: generateInvitations(NOW),
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

export function orphanedCount(identities: Identity[]): number {
  return identities.reduce((n, i) => n + (i.orphaned ? 1 : 0), 0);
}

export function conflictsCount(identities: Identity[]): number {
  return identities.reduce((n, i) => n + (i.conflicts.length > 0 ? 1 : 0), 0);
}
