// Async, fallible mock API. Treated as if it were a real backend: every call
// returns a Promise, applies configurable latency, and can reject when the
// scenario forces an error. Reads/writes go through the single dataset so counts
// reconcile by construction.

import { currentScenario, tenantHasData } from '@/stores/ui';
import { currentActor } from '@/stores/auth';
import {
  conflictsCount,
  getDataset,
  orphanedCount,
  riskBreakdown,
  typeBreakdown,
} from './dataset';
import { riskBand } from '@/lib/risk';
import { can, canActOnUser, canAssignRole, ROLE_LABELS, type Capability, type Role } from '@/lib/permissions';
import { matchesPolicy } from './policy';
import type {
  Alert,
  AgentSession,
  AuditEntry,
  BlastRadius,
  Cloud,
  CloudConnection,
  GovernanceStatus,
  Identity,
  IdentityStatus,
  Invitation,
  NhiType,
  NotificationItem,
  Policy,
  PolicyToken,
  ReachEdge,
  ReachNode,
  RiskBand,
  RotationHistoryEntry,
  RotationJob,
  Tenant,
  User,
  UserStatus,
  ValidityWindow,
} from './types';

/* ------------------------------------------------------------- async plumbing */

export class MockApiError extends Error {
  /** A stable code so UIs can branch on the failure without parsing copy. */
  code?: string;
  constructor(message = 'The request could not be completed.', code?: string) {
    super(message);
    this.name = 'MockApiError';
    this.code = code;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolve a value after the scenario latency, or reject if the scenario forces an error. */
async function respond<T>(value: T | (() => T)): Promise<T> {
  const scenario = currentScenario();
  await delay(scenario.latencyMs);
  if (scenario.state === 'error') {
    throw new MockApiError('Synthetic failure forced by the scenario switcher.');
  }
  return typeof value === 'function' ? (value as () => T)() : value;
}

function isEmptyForced(): boolean {
  // A brand-new tenant has no data until onboarding's scan runs; the dev Scenario
  // Switcher can also force the empty state.
  return currentScenario().state === 'empty' || !tenantHasData();
}

/* ----------------------------------------------------------------- dashboard */

/** A priority alert with its affected identity resolved for inline display. */
export interface OverviewAlert extends Alert {
  identityName?: string;
  identityType?: NhiType;
}

export interface OverviewData {
  total: number;
  typeBreakdown: { type: NhiType; count: number }[];
  riskBreakdown: Record<RiskBand, number>;
  orphaned: number;
  conflicts: number;
  /** Count of identities whose governance has drifted (for the drift KPI). */
  governanceDrift: number;
  activity: { t: string; discovered: number; alerts: number }[];
  topAlerts: OverviewAlert[];
}

export function getOverview(): Promise<OverviewData> {
  return respond(() => {
    if (isEmptyForced()) {
      return {
        total: 0,
        typeBreakdown: typeBreakdown([]),
        riskBreakdown: riskBreakdown([]),
        orphaned: 0,
        conflicts: 0,
        governanceDrift: 0,
        activity: [],
        topAlerts: [],
      };
    }
    const { identities, alerts, identityById } = getDataset();
    // Activity series: synthetic 14-day discovery + alert volume. // ASSUMPTION: derived upstream.
    const activity = Array.from({ length: 14 }, (_, i) => {
      const day = 13 - i;
      const t = new Date(Date.now() - day * 86400000).toISOString();
      const base = Math.floor(identities.length / 80);
      return {
        t,
        discovered: base + ((i * 7 + 11) % 17),
        alerts: ((i * 3 + 2) % 9) + 1,
      };
    });
    return {
      total: identities.length,
      typeBreakdown: typeBreakdown(identities),
      riskBreakdown: riskBreakdown(identities),
      orphaned: orphanedCount(identities),
      conflicts: conflictsCount(identities),
      governanceDrift: identities.filter((i) => i.governanceStatus === 'drift').length,
      activity,
      topAlerts: alerts
        .filter((a) => a.status === 'open')
        .sort((a, b) => bandRank(b.severity) - bandRank(a.severity))
        .slice(0, 6)
        .map((a) => {
          const identity = identityById.get(a.identityId);
          return { ...a, identityName: identity?.name, identityType: identity?.type };
        }),
    };
  });
}

function bandRank(band: RiskBand): number {
  return { critical: 5, high: 4, medium: 3, low: 2, minimal: 1 }[band];
}

/* ----------------------------------------------------------------- identities */

export interface IdentityFilter {
  search?: string;
  types?: NhiType[];
  bands?: RiskBand[];
  clouds?: Cloud[];
  governance?: GovernanceStatus[];
  statuses?: IdentityStatus[];
  orphanedOnly?: boolean;
  conflictsOnly?: boolean;
}

export interface IdentitySort {
  id: 'name' | 'type' | 'risk' | 'governance' | 'owner' | 'lastSeen';
  desc: boolean;
}

export interface IdentityListParams {
  filter?: IdentityFilter;
  sort?: IdentitySort;
  offset?: number;
  limit?: number;
}

export interface IdentityFacetCounts {
  total: number;
  byType: Record<NhiType, number>;
  byBand: Record<RiskBand, number>;
  byCloud: Record<Cloud, number>;
  byStatus: Record<IdentityStatus, number>;
  orphaned: number;
  conflicts: number;
}

export interface IdentityListResult {
  rows: Identity[];
  total: number;
  counts: IdentityFacetCounts;
}

function matchesExcept(
  identity: Identity,
  filter: IdentityFilter,
  skip: keyof IdentityFilter | null,
): boolean {
  if (skip !== 'search' && filter.search) {
    const q = filter.search.toLowerCase();
    const hay = `${identity.name} ${identity.owner ?? ''} ${identity.sources
      .map((s) => s.externalId)
      .join(' ')}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (skip !== 'types' && filter.types?.length && !filter.types.includes(identity.type)) return false;
  if (skip !== 'bands' && filter.bands?.length && !filter.bands.includes(identity.riskBand)) return false;
  if (skip !== 'clouds' && filter.clouds?.length) {
    const clouds = filter.clouds;
    if (!identity.sources.some((s) => clouds.includes(s.cloud))) return false;
  }
  if (
    skip !== 'governance' &&
    filter.governance?.length &&
    !filter.governance.includes(identity.governanceStatus)
  )
    return false;
  if (skip !== 'statuses' && filter.statuses?.length && !filter.statuses.includes(identity.status))
    return false;
  if (skip !== 'orphanedOnly' && filter.orphanedOnly && !identity.orphaned) return false;
  if (skip !== 'conflictsOnly' && filter.conflictsOnly && identity.conflicts.length === 0) return false;
  return true;
}

function applyFilter(identities: Identity[], filter: IdentityFilter): Identity[] {
  return identities.filter((i) => matchesExcept(i, filter, null));
}

function sortIdentities(rows: Identity[], sort: IdentitySort): Identity[] {
  const dir = sort.desc ? -1 : 1;
  const sorted = [...rows].sort((a, b) => {
    switch (sort.id) {
      case 'risk':
        return (a.riskScore - b.riskScore) * dir;
      case 'type':
        return a.type.localeCompare(b.type) * dir;
      case 'governance':
        return a.governanceStatus.localeCompare(b.governanceStatus) * dir;
      case 'owner':
        return (a.owner ?? '').localeCompare(b.owner ?? '') * dir;
      case 'lastSeen':
        return a.lastSeen.localeCompare(b.lastSeen) * dir;
      case 'name':
      default:
        return a.name.localeCompare(b.name) * dir;
    }
  });
  return sorted;
}

function facetCounts(identities: Identity[], filter: IdentityFilter): IdentityFacetCounts {
  const byType = emptyTypeCounts();
  const byBand: Record<RiskBand, number> = { critical: 0, high: 0, medium: 0, low: 0, minimal: 0 };
  const byCloud = emptyCloudCounts();
  const byStatus = emptyStatusCounts();
  // Each facet is counted over the set filtered by every OTHER active facet.
  for (const identity of identities) {
    if (matchesExcept(identity, filter, 'types')) byType[identity.type] += 1;
    if (matchesExcept(identity, filter, 'bands')) byBand[identity.riskBand] += 1;
    if (matchesExcept(identity, filter, 'statuses')) byStatus[identity.status] += 1;
    if (matchesExcept(identity, filter, 'clouds')) {
      // An identity can span clouds; count it under each of its source providers.
      for (const cloud of new Set(identity.sources.map((s) => s.cloud))) byCloud[cloud] += 1;
    }
  }
  let orphaned = 0;
  let conflicts = 0;
  let total = 0;
  for (const identity of identities) {
    if (matchesExcept(identity, filter, 'orphanedOnly') && identity.orphaned) orphaned += 1;
    if (matchesExcept(identity, filter, 'conflictsOnly') && identity.conflicts.length > 0) conflicts += 1;
    if (matchesExcept(identity, filter, null)) total += 1;
  }
  return { total, byType, byBand, byCloud, byStatus, orphaned, conflicts };
}

function emptyTypeCounts(): Record<NhiType, number> {
  return {
    'ai-agent': 0,
    'service-account': 0,
    'api-key': 0,
    'oauth-token': 0,
    'workload-identity': 0,
  };
}

function emptyCloudCounts(): Record<Cloud, number> {
  return { aws: 0, gcp: 0, azure: 0 };
}

function emptyStatusCounts(): Record<IdentityStatus, number> {
  return { active: 0, inactive: 0, quarantined: 0 };
}

export function listIdentities(params: IdentityListParams = {}): Promise<IdentityListResult> {
  return respond(() => {
    if (isEmptyForced()) {
      return {
        rows: [],
        total: 0,
        counts: {
          total: 0,
          byType: emptyTypeCounts(),
          byBand: { critical: 0, high: 0, medium: 0, low: 0, minimal: 0 },
          byCloud: emptyCloudCounts(),
          byStatus: emptyStatusCounts(),
          orphaned: 0,
          conflicts: 0,
        },
      };
    }
    const { identities } = getDataset();
    const filter = params.filter ?? {};
    const filtered = applyFilter(identities, filter);
    const sorted = params.sort ? sortIdentities(filtered, params.sort) : filtered;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 100;
    const rows = sorted.slice(offset, offset + limit);
    return { rows, total: sorted.length, counts: facetCounts(identities, filter) };
  });
}

export function getIdentity(id: string): Promise<Identity | null> {
  return respond(() => getDataset().identityById.get(id) ?? null);
}

/**
 * Assign or change an identity's owner (role-gated: `identity.assignOwner`).
 * Assigning an owner to an orphaned identity resolves the orphaned state.
 * // ASSUMPTION: the owner write and orphan resolution are modeled here for the
 * mock; upstream is the real system of record for governance changes.
 */
export function assignOwner(identityId: string, owner: string): Promise<Identity> {
  return respond(() => {
    const identity = getDataset().identityById.get(identityId);
    if (!identity) throw new MockApiError('Identity not found.', 'NOT_FOUND');
    assertActorCan('identity.assignOwner');
    const trimmed = owner.trim();
    if (!trimmed) throw new MockApiError('An owner is required.', 'INVALID_OWNER');
    identity.owner = trimmed;
    if (identity.orphaned) {
      identity.orphaned = false;
      identity.orphanReason = undefined;
    }
    appendAudit('assigned owner', identity.name, `Owner set to ${trimmed}.`);
    return { ...identity };
  });
}

/* --------------------------------------------------------------------- alerts */

export function listAlerts(severity?: RiskBand): Promise<Alert[]> {
  return respond(() => {
    if (isEmptyForced()) return [];
    let rows = getDataset().alerts.filter((a) => a.status !== 'resolved');
    if (severity) rows = rows.filter((a) => a.severity === severity);
    return rows;
  });
}

export function getAlert(id: string): Promise<Alert | null> {
  return respond(() => getDataset().alerts.find((a) => a.id === id) ?? null);
}

export function acknowledgeAlert(id: string): Promise<Alert> {
  return respond(() => {
    const alert = getDataset().alerts.find((a) => a.id === id);
    if (!alert) throw new MockApiError('Alert not found.');
    alert.status = 'acknowledged';
    return { ...alert };
  });
}

export function resolveAlert(id: string): Promise<Alert> {
  return respond(() => {
    const alert = getDataset().alerts.find((a) => a.id === id);
    if (!alert) throw new MockApiError('Alert not found.');
    alert.status = 'resolved';
    return { ...alert };
  });
}

/* ------------------------------------------------------------------- policies */

export function listPolicies(): Promise<Policy[]> {
  return respond(() => (isEmptyForced() ? [] : [...getDataset().policies]));
}

export function getPolicy(id: string): Promise<Policy | null> {
  return respond(() => getDataset().policies.find((p) => p.id === id) ?? null);
}

export interface PolicyEvalResult {
  affected: number;
  total: number;
  sample: { id: string; name: string; riskScore: number }[];
}

/**
 * Evaluate a rule's WHEN/AND tokens against the dataset and report how many
 * identities match, plus a small sample. Display only — the UI never enforces.
 */
export function evaluatePolicy(tokens: PolicyToken[]): Promise<PolicyEvalResult> {
  return respond(() => {
    const { identities } = getDataset();
    const matched = identities.filter((i) => matchesPolicy(i, tokens));
    return {
      affected: matched.length,
      total: identities.length,
      sample: matched.slice(0, 6).map((i) => ({ id: i.id, name: i.name, riskScore: i.riskScore })),
    };
  });
}

export interface PolicySaveInput {
  id?: string;
  name: string;
  tokens: PolicyToken[];
  plainEnglish: string;
  generatedCode: string;
  status: Policy['status'];
}

/** Create or update a policy in the in-memory store; affected count is recomputed. */
export function savePolicy(input: PolicySaveInput): Promise<Policy> {
  return respond(() => {
    const { policies, identities } = getDataset();
    const affectedCount = identities.filter((i) => matchesPolicy(i, input.tokens)).length;
    const existing = input.id ? policies.find((p) => p.id === input.id) : undefined;
    if (existing) {
      existing.name = input.name;
      existing.tokens = input.tokens;
      existing.plainEnglish = input.plainEnglish;
      existing.generatedCode = input.generatedCode;
      existing.status = input.status;
      existing.affectedCount = affectedCount;
      existing.updatedAt = new Date().toISOString();
      return { ...existing };
    }
    const created: Policy = {
      id: `pol_${Math.random().toString(36).slice(2, 8)}`,
      name: input.name,
      tokens: input.tokens,
      plainEnglish: input.plainEnglish,
      generatedCode: input.generatedCode,
      affectedCount,
      status: input.status,
      updatedAt: new Date().toISOString(),
    };
    policies.unshift(created);
    return { ...created };
  });
}

export function activatePolicy(id: string): Promise<Policy> {
  return respond(() => {
    const policy = getDataset().policies.find((p) => p.id === id);
    if (!policy) throw new MockApiError('Policy not found.');
    policy.status = 'active';
    policy.updatedAt = new Date().toISOString();
    return { ...policy };
  });
}

/* ------------------------------------------------------------------- sessions */

/** Session joined with its agent identity's display name (raw ids are not UI labels). */
export type AgentSessionWithIdentity = AgentSession & { identityName: string };

function withIdentityName(session: AgentSession): AgentSessionWithIdentity {
  return {
    ...session,
    identityName: getDataset().identityById.get(session.identityId)?.name ?? session.identityId,
  };
}

export function listSessions(): Promise<AgentSessionWithIdentity[]> {
  return respond(() => (isEmptyForced() ? [] : getDataset().sessions.map(withIdentityName)));
}

export function getSession(id: string): Promise<AgentSessionWithIdentity | null> {
  return respond(() => {
    const session = getDataset().sessions.find((s) => s.id === id);
    return session ? withIdentityName(session) : null;
  });
}

export function markSessionReviewed(id: string): Promise<AgentSession> {
  return respond(() => {
    const session = getDataset().sessions.find((s) => s.id === id);
    if (!session) throw new MockApiError('Session not found.');
    session.status = 'reviewed';
    return { ...session };
  });
}

export function quarantineSession(id: string): Promise<AgentSession> {
  return respond(() => {
    const session = getDataset().sessions.find((s) => s.id === id);
    if (!session) throw new MockApiError('Session not found.');
    session.status = 'quarantined';
    return { ...session };
  });
}

/* --------------------------------------------------------------- blast radius */

export interface BlastOrigin {
  id: string;
  name: string;
  type: NhiType;
  riskScore: number;
  reach: number;
}

/** A curated set of identities that have relationships, for the blast-radius picker. */
export function listBlastOrigins(limit = 40): Promise<BlastOrigin[]> {
  return respond(() => {
    if (isEmptyForced()) return [];
    const { identities } = getDataset();
    return identities
      .filter((i) => i.relationships.length > 0)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit)
      .map((i) => ({ id: i.id, name: i.name, type: i.type, riskScore: i.riskScore, reach: i.relationships.length }));
  });
}

export function getBlastRadius(originId: string): Promise<BlastRadius | null> {
  return respond(() => {
    const { identityById } = getDataset();
    const origin = identityById.get(originId);
    if (!origin) return null;

    const nodes: ReachNode[] = [
      { id: origin.id, identityId: origin.id, label: origin.name, kind: 'origin' },
    ];
    const edges: ReachEdge[] = [];
    const seen = new Set<string>([origin.id]);

    // Direct: first-hop relationships. // ASSUMPTION: reachability is Resilience-core.
    const direct = origin.relationships.slice(0, 6);
    for (const rel of direct) {
      const t = identityById.get(rel.identityId);
      if (!t || seen.has(t.id)) continue;
      seen.add(t.id);
      nodes.push({ id: t.id, identityId: t.id, label: t.name, kind: 'direct' });
      edges.push({ from: origin.id, to: t.id, kind: 'direct' });

      // Transitive: second hop.
      for (const rel2 of t.relationships.slice(0, 2)) {
        const t2 = identityById.get(rel2.identityId);
        if (!t2 || seen.has(t2.id)) continue;
        seen.add(t2.id);
        const kind = t2.orphaned || t2.riskScore > 70 ? 'cascade' : 'transitive';
        nodes.push({ id: t2.id, identityId: t2.id, label: t2.name, kind });
        edges.push({ from: t.id, to: t2.id, kind });
      }
    }

    const summary = {
      direct: nodes.filter((n) => n.kind === 'direct').length,
      transitive: nodes.filter((n) => n.kind === 'transitive').length,
      cascade: nodes.filter((n) => n.kind === 'cascade').length,
    };
    const totalReach = summary.direct + summary.transitive + summary.cascade;
    return {
      originIdentityId: origin.id,
      nodes,
      edges,
      summary,
      // ASSUMPTION: estimated containment is a Resilience-owned display value.
      estimatedContainment: `~${Math.max(4, Math.round(totalReach * 1.5 + 4))} min`,
    };
  });
}

/* ------------------------------------------------------------------- rotation */

export interface RotationData {
  active: (RotationJob & { identityName: string })[];
  history: (RotationHistoryEntry & { identityName: string })[];
}

/** Job/history entries joined with the identity's display name (raw ids are not UI labels). */
function withRotationIdentityName<T extends { identityId: string }>(entry: T): T & { identityName: string } {
  return {
    ...entry,
    identityName: getDataset().identityById.get(entry.identityId)?.name ?? entry.identityId,
  };
}

export function listRotations(): Promise<RotationData> {
  return respond(() => {
    if (isEmptyForced()) return { active: [], history: [] };
    const { rotations } = getDataset();
    return {
      active: rotations.active.map(withRotationIdentityName),
      history: rotations.history.map(withRotationIdentityName),
    };
  });
}

export interface RotationCandidate {
  id: string;
  name: string;
  type: NhiType;
  riskScore: number;
}

/** High-risk identities offered as rotation targets. */
export function listRotationCandidates(limit = 40): Promise<RotationCandidate[]> {
  return respond(() => {
    const { identities } = getDataset();
    return identities
      .filter((i) => i.riskScore >= 55)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit)
      .map((i) => ({ id: i.id, name: i.name, type: i.type, riskScore: i.riskScore }));
  });
}

export function getRotationJob(id: string): Promise<(RotationJob & { identityName: string }) | null> {
  return respond(() => {
    const job = getDataset().rotations.active.find((j) => j.id === id);
    return job ? withRotationIdentityName(job) : null;
  });
}

export function requestRotation(identityId: string, mode: 'standard' | 'emergency'): Promise<RotationJob> {
  return respond(() => {
    const job: RotationJob = {
      id: `rot_${Math.random().toString(36).slice(2, 8)}`,
      identityId,
      mode,
      phase: 'prepare',
      phaseProgress: 0,
      startedAt: new Date().toISOString(),
      cascade: [],
    };
    getDataset().rotations.active.unshift(job);
    return { ...job };
  });
}

/* ---------------------------------------------------- platform / connections */

export function getConnections(): Promise<CloudConnection[]> {
  return respond(() => getDataset().connections.map((c) => ({ ...c })));
}

export function listAudit(search?: string): Promise<AuditEntry[]> {
  return respond(() => {
    if (isEmptyForced()) return [];
    let rows = getDataset().audit;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (a) => a.action.toLowerCase().includes(q) || a.actor.toLowerCase().includes(q),
      );
    }
    return [...rows];
  });
}

export function listNotifications(): Promise<NotificationItem[]> {
  return respond(() => (isEmptyForced() ? [] : [...getDataset().notifications]));
}

export function markNotificationRead(id: string): Promise<NotificationItem> {
  return respond(() => {
    const item = getDataset().notifications.find((n) => n.id === id);
    if (!item) throw new MockApiError('Notification not found.');
    item.read = true;
    return { ...item };
  });
}

export function listRehearsals(): Promise<import('./types').RecoveryRehearsal[]> {
  return respond(() => (isEmptyForced() ? [] : [...getDataset().rehearsals]));
}

export function listCopilotSuggestions(): Promise<import('./types').CopilotSuggestion[]> {
  return respond(() => (isEmptyForced() ? [] : [...getDataset().copilot]));
}

export function listUsers(): Promise<User[]> {
  return respond(() => getDataset().users.filter((u) => u.status !== 'deleted').map((u) => ({ ...u })));
}

export function updateUserRole(id: string, role: Role): Promise<User> {
  return respond(() => {
    const user = getDataset().users.find((u) => u.id === id);
    if (!user) throw new MockApiError('User not found.');
    user.role = role;
    appendAudit('changed user role', user.email, `Role set to ${ROLE_LABELS[role]}.`);
    return { ...user };
  });
}

/* =========================================================================
 * Add-on: organization registration & administration.
 *
 * There is no backend. Every auth, SSO, MFA, email-verification, invitation,
 * and tenant-provisioning behaviour below is SIMULATED against the in-memory
 * store. The UI renders the screens and drives the state machine; it never
 * implements authentication, authorization, MFA cryptography, or IdP
 * integration — those are upstream and Architect-owned. // ASSUMPTION (every op)
 * ========================================================================= */

/** Fixed synthetic codes a reviewer can always use. */
export const VERIFICATION_CODE = '123456';
export const MFA_CODE = '123456';

/** Personal email domains rejected during registration and invitation. */
export const PERSONAL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
  'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'live.com', 'msn.com',
];

/** Lowercased domain part of an email, or '' if none. */
export function domainOf(email: string): string {
  return email.trim().toLowerCase().split('@')[1] ?? '';
}

/** Domains already claimed by another tenant (for the "already registered" error). */
const OTHER_REGISTERED_DOMAINS = ['globex.com'];

/** Latency-only settle for auth/admin ops, whose failures come from scenario.auth. */
async function settle(): Promise<void> {
  await delay(currentScenario().latencyMs);
}

function authScenario() {
  return currentScenario().auth;
}

function emailOf(raw: string): { email: string; domain: string } {
  const email = raw.trim().toLowerCase();
  const domain = email.split('@')[1] ?? '';
  return { email, domain };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Append an immutable audit entry attributed to the current actor. */
function appendAudit(action: string, target: string, detail?: string): void {
  const { id } = currentActor();
  const ds = getDataset();
  const actor = ds.users.find((u) => u.id === id)?.email ?? 'system';
  ds.audit.unshift({
    id: `aud_${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    actor,
    action,
    target,
    detail,
  });
}

/* ----------------------------------------------------------- registration */

export interface RequestAccessResult {
  email: string;
  domain: string;
}

/** Validate a work email and "issue" a verification challenge. */
export async function requestAccess(rawEmail: string): Promise<RequestAccessResult> {
  await settle();
  const { email, domain } = emailOf(rawEmail);
  if (!isValidEmail(email)) {
    throw new MockApiError('Please enter a valid email address.', 'INVALID_EMAIL');
  }
  if (PERSONAL_DOMAINS.includes(domain)) {
    throw new MockApiError(
      'Please use your work email address. Personal email domains are not accepted.',
      'PERSONAL_DOMAIN',
    );
  }
  const claimed = [...getDataset().tenant.allowedDomains, ...OTHER_REGISTERED_DOMAINS];
  if (claimed.includes(domain)) {
    throw new MockApiError(
      'This organization is already registered. Please contact your administrator or log in directly.',
      'DOMAIN_REGISTERED',
    );
  }
  if (authScenario() === 'email-outage') {
    throw new MockApiError(
      'We are having trouble sending the verification email. Please try again in a few minutes.',
      'EMAIL_OUTAGE',
    );
  }
  return { email, domain };
}

/** Verify the emailed code. `123456` succeeds; scenarios force expired / outage. */
export async function verifyCode(code: string): Promise<{ ok: true }> {
  await settle();
  if (authScenario() === 'email-outage') {
    throw new MockApiError(
      'We are having trouble sending the verification email. Please try again in a few minutes.',
      'EMAIL_OUTAGE',
    );
  }
  if (authScenario() === 'code-expired') {
    throw new MockApiError(
      'This code has expired. A new code has been sent to your email.',
      'CODE_EXPIRED',
    );
  }
  if (code.trim() !== VERIFICATION_CODE) {
    throw new MockApiError('Invalid verification code. Please try again.', 'INVALID_CODE');
  }
  return { ok: true };
}

/** Re-send the verification code (resets the validity window in the UI). */
export async function resendCode(): Promise<{ ok: true }> {
  await settle();
  if (authScenario() === 'email-outage') {
    throw new MockApiError(
      'We are having trouble sending the verification email. Please try again in a few minutes.',
      'EMAIL_OUTAGE',
    );
  }
  return { ok: true };
}

export interface LegalDocs {
  tos: string;
  dpa: string;
}

/** Fetch the legal documents shown on the Terms screen. */
export async function getLegalDocs(): Promise<LegalDocs> {
  await settle();
  if (authScenario() === 'legal-docs-failed') {
    throw new MockApiError(
      'Unable to load legal documents. Please refresh the page or try again later.',
      'DOCS_FAILED',
    );
  }
  return {
    tos:
      'Acrivault Terms of Service (synthetic).\n\nThese demonstration terms describe the ' +
      'rights and responsibilities of using Acrivault. They are placeholder copy for the ' +
      'design build and carry no legal effect. By accepting, you acknowledge this is a ' +
      'synthetic environment with no real data and no real obligations.',
    dpa:
      'Acrivault Data Processing Agreement (synthetic).\n\nThis placeholder DPA outlines how ' +
      'a customer (controller) and Acrivault (processor) would handle personal data, including ' +
      'sub-processors, security measures, and data-subject rights. It is illustrative only.',
  };
}

export interface ProvisionResult {
  tenant: Tenant;
  user: User;
}

/** Accept the legal terms, provision the tenant, and create the first Tenant Admin. */
export async function acceptLegal(
  consents: { tos: boolean; dpa: boolean },
  rawEmail: string,
): Promise<ProvisionResult> {
  await settle();
  if (!consents.tos || !consents.dpa) {
    throw new MockApiError('Both agreements are required to continue.', 'CONSENTS_REQUIRED');
  }
  if (authScenario() === 'provisioning-failed') {
    throw new MockApiError(
      'We could not provision your organization. Please contact support@acrivault.example and reference this attempt.',
      'PROVISIONING_FAILED',
    );
  }
  const { email, domain } = emailOf(rawEmail);
  // Synthetic, not persisted into the live Acme tenant.
  const tenant: Tenant = {
    id: `tnt_${Math.random().toString(36).slice(2, 8)}`,
    name: domain ? domain.split('.')[0].replace(/^\w/, (c) => c.toUpperCase()) : 'New organization',
    allowedDomains: domain ? [domain] : [],
    status: 'active',
    sso: { provider: 'none', configured: false },
    createdAt: new Date().toISOString(),
  };
  const user: User = {
    id: `usr_${Math.random().toString(36).slice(2, 8)}`,
    tenantId: tenant.id,
    name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    email,
    role: 'tenant-admin',
    status: 'pending',
    authMethod: 'sso',
    invitedAt: new Date().toISOString(),
  };
  return { tenant, user };
}

/* -------------------------------------------------------------------- SSO */

/** Begin the IdP redirect. No real OAuth — returns the provider label. */
export async function ssoStart(provider: 'entra' | 'okta'): Promise<{ provider: string }> {
  await settle();
  return { provider };
}

/** Return from the IdP as authenticated. */
export async function ssoReturn(): Promise<{ ok: true }> {
  await settle();
  return { ok: true };
}

/* -------------------------------------------------------------------- MFA */

export interface MfaEnrollment {
  secret: string;
  otpauthLabel: string;
  /** A generated placeholder QR (decorative SVG, not a real otpauth URI). */
  qrSvg: string;
}

export async function mfaEnroll(): Promise<MfaEnrollment> {
  await settle();
  const secret = Array.from({ length: 16 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[Math.floor(Math.random() * 32)],
  ).join('');
  return { secret, otpauthLabel: 'Acrivault (synthetic)', qrSvg: placeholderQr(secret) };
}

export async function mfaVerify(code: string): Promise<{ ok: true }> {
  await settle();
  if (code.trim() !== MFA_CODE) {
    throw new MockApiError('Invalid authentication code. Please try again.', 'INVALID_CODE');
  }
  return { ok: true };
}

/** A deterministic decorative QR-like grid from a seed string. Not scannable. */
function placeholderQr(seed: string): string {
  const n = 21;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return h / 4294967296;
  };
  const cells: string[] = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const finder =
        (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
      if (finder || rnd() > 0.5) {
        cells.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
      }
    }
  }
  return `<svg viewBox="0 0 ${n} ${n}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" fill="currentColor">${cells.join('')}</svg>`;
}

/* ------------------------------------------------------------------ login */

/** Password-fallback sign-in. Routes upstream; MFA is enforced afterwards. */
export async function login(rawEmail: string, password: string): Promise<{ user: User }> {
  await settle();
  const { email } = emailOf(rawEmail);
  if (!isValidEmail(email) || !password) {
    throw new MockApiError('Invalid email or password.', 'INVALID_CREDENTIALS');
  }
  const user = getDataset().users.find((u) => u.email === email);
  if (!user || user.status === 'deleted') {
    throw new MockApiError('Invalid email or password.', 'INVALID_CREDENTIALS');
  }
  if (user.status === 'suspended') {
    // A lapsed validity window also surfaces here (expiry maps to suspended).
    const lapsed = user.validity?.expiry && new Date(user.validity.expiry) < new Date();
    throw new MockApiError(
      lapsed
        ? 'Your access window has ended. Please contact an administrator.'
        : 'Your access has been removed. Please contact an administrator.',
      'ACCOUNT_SUSPENDED',
    );
  }
  return { user: { ...user } };
}

export async function forgotPassword(_rawEmail: string): Promise<{ ok: true }> {
  await settle();
  // Always a neutral confirmation, regardless of whether the account exists.
  return { ok: true };
}

export async function resetPassword(token: string, password: string): Promise<{ ok: true }> {
  await settle();
  if (token === 'expired' || token === 'acme-expired-002') {
    throw new MockApiError(
      'This password reset link has expired. Please request a new one.',
      'EXPIRED_TOKEN',
    );
  }
  if (password.length < 12) {
    throw new MockApiError('Password must be at least 12 characters.', 'WEAK_PASSWORD');
  }
  return { ok: true };
}

/* ------------------------------------------------------------- invitations */

export async function resolveInvite(token: string): Promise<Invitation> {
  await settle();
  const invite = getDataset().invitations.find((i) => i.token === token);
  if (!invite) {
    throw new MockApiError('This invitation link is invalid.', 'INVALID_TOKEN');
  }
  if (invite.status === 'revoked') {
    throw new MockApiError('This invitation has been revoked.', 'REVOKED_TOKEN');
  }
  if (invite.status === 'expired') {
    throw new MockApiError('This invitation has expired.', 'EXPIRED_TOKEN');
  }
  if (invite.status === 'accepted') {
    throw new MockApiError('You are already a member. Please log in.', 'ALREADY_ACCEPTED');
  }
  return { ...invite };
}

/** Accept an invitation: invitation → accepted, the user → active. */
export async function acceptInvite(token: string): Promise<{ ok: true }> {
  await settle();
  const ds = getDataset();
  const invite = ds.invitations.find((i) => i.token === token);
  if (!invite || invite.status !== 'pending') {
    throw new MockApiError('This invitation can no longer be accepted.', 'INVALID_TOKEN');
  }
  invite.status = 'accepted';
  const user = ds.users.find((u) => u.email === invite.email);
  if (user) {
    user.status = 'active';
    user.lastLogin = new Date().toISOString();
  }
  return { ok: true };
}

/* --------------------------------------------------------- administration */

export function getTenant(): Promise<Tenant> {
  return respond(() => ({ ...getDataset().tenant }));
}

export function getUser(id: string): Promise<User | null> {
  return respond(() => {
    const u = getDataset().users.find((x) => x.id === id && x.status !== 'deleted');
    return u ? { ...u } : null;
  });
}

export interface InvitePayload {
  email: string;
  role: Role;
  validity?: ValidityWindow;
}

export interface InviteResult {
  user: User;
  /** True when the user was created but the invitation email could not be sent. */
  emailFailed: boolean;
}

function assertActorCanAssign(role: Role): void {
  const actor = currentActor();
  if (!canAssignRole(actor.role, role)) {
    throw new MockApiError(
      `You cannot assign the ${ROLE_LABELS[role]} role.`,
      'RANK_VIOLATION',
    );
  }
}

export async function inviteUser(payload: InvitePayload): Promise<InviteResult> {
  await settle();
  if (authScenario() === 'api-failure') {
    throw new MockApiError('Could not create user. Please try again later.', 'API_FAILURE');
  }
  const { email, domain } = emailOf(payload.email);
  if (!isValidEmail(email)) {
    throw new MockApiError('Please enter a valid email address.', 'INVALID_EMAIL');
  }
  if (PERSONAL_DOMAINS.includes(domain)) {
    throw new MockApiError(
      'Please use a work email address. Personal email domains are not accepted.',
      'PERSONAL_DOMAIN',
    );
  }
  const ds = getDataset();
  if (!ds.tenant.allowedDomains.includes(domain)) {
    throw new MockApiError(
      `This email domain is not configured for your organization's SSO. Please use a domain like @${ds.tenant.allowedDomains[0] ?? 'yourcompany.com'}.`,
      'DOMAIN_MISMATCH',
    );
  }
  const existing = ds.users.find((u) => u.email === email && u.status !== 'deleted');
  if (existing) {
    throw new MockApiError(
      'A user with this email already exists in your organization.',
      existing.status === 'pending' || existing.status === 'invited' ? 'DUPLICATE_PENDING' : 'DUPLICATE_USER',
    );
  }
  // The mock enforces capability + rank server-side (UI gating is UX only).
  assertActorCan('users.invite');
  assertActorCanAssign(payload.role);

  const now = new Date().toISOString();
  const user: User = {
    id: `usr_${Math.random().toString(36).slice(2, 8)}`,
    tenantId: ds.tenant.id,
    name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    email,
    role: payload.role,
    status: 'invited',
    authMethod: ds.tenant.sso.configured ? 'sso' : 'password',
    validity: payload.validity,
    invitedAt: now,
    invitedBy: currentActor().id,
  };
  ds.users.push(user);
  ds.invitations.push({
    token: `inv-${Math.random().toString(36).slice(2, 8)}`,
    tenantId: ds.tenant.id,
    email,
    role: payload.role,
    validity: payload.validity,
    authMethod: user.authMethod,
    status: 'pending',
    sentAt: now,
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  });
  appendAudit('invited user', email, `Invited as ${ROLE_LABELS[payload.role]}.`);

  const emailFailed = authScenario() === 'invite-email-failed';
  return { user: { ...user }, emailFailed };
}

export async function resendInvite(id: string): Promise<{ ok: true }> {
  await settle();
  const user = getDataset().users.find((u) => u.id === id);
  if (!user) throw new MockApiError('User not found.', 'NOT_FOUND');
  if (user.status !== 'pending' && user.status !== 'invited') {
    throw new MockApiError('This user has already accepted their invitation.', 'NOT_PENDING');
  }
  if (authScenario() === 'email-outage' || authScenario() === 'invite-email-failed') {
    throw new MockApiError('Could not resend invitation. Please try again.', 'EMAIL_FAILED');
  }
  appendAudit('resent invitation', user.email);
  return { ok: true };
}

export interface UserPatch {
  role?: Role;
  validity?: ValidityWindow;
}

function assertActorCanActOn(user: User): void {
  const actor = currentActor();
  if (!canActOnUser(actor.role, actor.id, user.role, user.id)) {
    throw new MockApiError('You do not have permission to manage this user.', 'RANK_VIOLATION');
  }
}

/** Capability gate — only roles holding the capability may run the action (e.g. only Tenant Admin manages users). */
function assertActorCan(capability: Capability): void {
  if (!can(currentActor().role, capability)) {
    throw new MockApiError('You do not have permission for this action.', 'FORBIDDEN');
  }
}

/** Guard: never suspend, delete, or demote the last active Tenant Admin (incl. yourself). */
function assertNotLastActiveTenantAdmin(user: User, action: 'suspend' | 'remove' | 'change the role of'): void {
  if (user.role !== 'tenant-admin') return;
  const activeAdmins = getDataset().users.filter(
    (u) => u.role === 'tenant-admin' && u.status === 'active',
  );
  const targetIsLast = activeAdmins.length <= 1 && activeAdmins.some((u) => u.id === user.id);
  if (targetIsLast) {
    throw new MockApiError(
      `You cannot ${action} the last active Tenant Admin. Assign another Tenant Admin first.`,
      'LAST_TENANT_ADMIN',
    );
  }
}

/** Count of Tenant Admins who can still sign in — used by the UI to mirror the guard. */
export function activeTenantAdminCount(users: User[]): number {
  return users.filter((u) => u.role === 'tenant-admin' && u.status === 'active').length;
}

export async function editUser(id: string, patch: UserPatch): Promise<User> {
  await settle();
  if (authScenario() === 'api-failure') {
    throw new MockApiError('Could not save changes. Please try again later.', 'API_FAILURE');
  }
  const user = getDataset().users.find((u) => u.id === id);
  if (!user) throw new MockApiError('User not found.', 'NOT_FOUND');
  assertActorCan('users.edit');
  assertActorCanActOn(user);
  if (patch.role && patch.role !== user.role) {
    assertActorCanAssign(patch.role);
    if (user.role === 'tenant-admin' && patch.role !== 'tenant-admin') {
      assertNotLastActiveTenantAdmin(user, 'change the role of');
    }
    user.role = patch.role;
  }
  if (patch.validity !== undefined) user.validity = patch.validity;
  appendAudit('edited user', user.email);
  return { ...user };
}

export async function suspendUser(id: string): Promise<User> {
  assertActorCan('users.suspend');
  return setUserStatus(id, 'suspended', 'suspended user');
}

export async function activateUser(id: string): Promise<User> {
  assertActorCan('users.suspend');
  return setUserStatus(id, 'active', 'reactivated user');
}

async function setUserStatus(id: string, status: UserStatus, action: string): Promise<User> {
  await settle();
  if (authScenario() === 'api-failure') {
    throw new MockApiError('Could not update the user. Please try again later.', 'API_FAILURE');
  }
  const user = getDataset().users.find((u) => u.id === id);
  if (!user) throw new MockApiError('User not found.', 'NOT_FOUND');
  assertActorCanActOn(user);
  if (status === 'suspended') assertNotLastActiveTenantAdmin(user, 'suspend');
  user.status = status;
  appendAudit(action, user.email);
  return { ...user };
}

/** Remove the user from the tenant. Their audit entries remain in place. */
export async function deleteUser(id: string): Promise<{ ok: true }> {
  await settle();
  if (authScenario() === 'api-failure') {
    throw new MockApiError('Could not delete the user. Please try again later.', 'API_FAILURE');
  }
  const user = getDataset().users.find((u) => u.id === id);
  if (!user) throw new MockApiError('User not found.', 'NOT_FOUND');
  assertActorCan('users.delete');
  assertActorCanActOn(user);
  assertNotLastActiveTenantAdmin(user, 'remove');
  user.status = 'deleted';
  appendAudit('deleted user', user.email, 'Activity logs retained in the audit trail.');
  return { ok: true };
}

/** Re-export for screens that need to map a fresh score to a band consistently. */
export { riskBand };
