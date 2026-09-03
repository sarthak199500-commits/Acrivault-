// Seeded fixture generation. A seeded RNG makes every run identical and keeps
// counts stable. Each generator that fabricates an upstream-derived value carries
// an // ASSUMPTION note; see the assumptions log in the README.

import {
  ACTION_OBJECT,
  CLOUDS,
  CLOUD_LABELS,
  NHI_TYPES,
  SSO_PROVIDER_LABELS,
  type AgentSession,
  type Alert,
  type AttributeConflict,
  type AuditAction,
  type AuditEntry,
  type Cloud,
  type CloudConnection,
  type Identity,
  type IdentityStatus,
  type NhiType,
  type NotificationItem,
  type Policy,
  type PolicyAction,
  type PolicyActionReason,
  type PolicyToken,
  type RotationHistoryEntry,
  type RotationJob,
  type SessionReviewState,
  type SessionSpawnKind,
  type SessionStep,
  type SourceInstance,
  type Tenant,
  type ToolScope,
  type User,
} from './types';
import { riskBand } from '@/lib/risk';
import { can } from '@/lib/permissions';
import { generatedCode, matchesPolicy, plainEnglish } from './policy';

/* ----------------------------------------------------------------- seeded RNG */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class Rng {
  private next: () => number;
  constructor(seed: number) {
    this.next = mulberry32(seed);
  }
  float(): number {
    return this.next();
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  bool(prob = 0.5): boolean {
    return this.next() < prob;
  }
  /** Weighted pick: weights align by index with items. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
}

/* --------------------------------------------------------------------- pools */

const AGENT_NAMES = [
  'orchestrator', 'support-copilot', 'data-pipeline', 'code-reviewer', 'invoice-agent',
  'fraud-sentinel', 'research-assistant', 'ops-autopilot', 'recommendation', 'triage-bot',
  'summarizer', 'onboarding-agent', 'forecast-engine', 'sales-copilot', 'qa-runner',
];
const SERVICE_NAMES = [
  'billing', 'auth', 'notifications', 'analytics', 'ingest', 'scheduler', 'gateway',
  'reporting', 'sync', 'webhook', 'backup', 'metrics', 'search-index', 'media-encoder',
];
const KEY_NAMES = ['ci', 'deploy', 'partner', 'mobile', 'webhook', 'export', 'telemetry', 'admin-cli'];
const OWNERS = [
  'platform-team', 'data-eng', 'sre', 'security', 'growth', 'payments', 'unassigned', 'ml-infra',
];
const MODELS = ['claude-opus-4.6', 'claude-sonnet-4.5', 'gpt-4o', 'gemini-2.0', 'mistral-large'];
const REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-south-1', 'eu-central-1'];

function typePrefix(type: NhiType): string {
  switch (type) {
    case 'ai-agent': return 'agent';
    case 'service-account': return 'svc';
    case 'api-key': return 'key';
    case 'oauth-token': return 'oauth';
    case 'workload-identity': return 'wl';
  }
}

function namePool(type: NhiType): string[] {
  switch (type) {
    case 'ai-agent': return AGENT_NAMES;
    case 'service-account': return SERVICE_NAMES;
    case 'api-key': return KEY_NAMES;
    case 'oauth-token': return SERVICE_NAMES;
    case 'workload-identity': return SERVICE_NAMES;
  }
}

/* ----------------------------------------------------- per-source attributes */

function sourceAttributes(rng: Rng, cloud: Cloud, type: NhiType): Record<string, string> {
  const region = rng.pick(REGIONS);
  const base: Record<string, string> = {
    region,
    createdBy: rng.pick(['terraform', 'console', 'sdk', 'cli']),
  };
  if (cloud === 'aws') {
    base.arn = `arn:aws:iam::${rng.int(100000000000, 999999999999)}:role/${typePrefix(type)}-${rng.int(1000, 9999)}`;
    base.accountId = String(rng.int(100000000000, 999999999999));
  } else if (cloud === 'gcp') {
    base.serviceAccount = `${typePrefix(type)}-${rng.int(1000, 9999)}@proj-${rng.int(10, 99)}.iam.gserviceaccount.com`;
    base.project = `proj-${rng.int(10, 99)}`;
  } else {
    base.objectId = `${rng.int(10000000, 99999999)}-${rng.int(1000, 9999)}`;
    base.tenant = `tenant-${rng.int(10, 99)}`;
  }
  return base;
}

/* ---------------------------------------------------------- one identity */

function makeRiskSeries(rng: Rng, finalScore: number, end: Date): { t: string; score: number }[] {
  const points = 14;
  const series: { t: string; score: number }[] = [];
  let score = Math.max(0, Math.min(100, finalScore - rng.int(-10, 20)));
  for (let i = points - 1; i >= 0; i--) {
    const t = new Date(end.getTime() - i * 86400000).toISOString();
    score = Math.max(0, Math.min(100, score + rng.int(-6, 6)));
    if (i === 0) score = finalScore;
    series.push({ t, score });
  }
  return series;
}

function makeIdentity(rng: Rng, index: number, now: Date): Identity {
  // Distribution calibrated to a mid-market 2026 estimate: service accounts and
  // API keys dominate, AI agents are a small but fast-growing slice (~3%, i.e.
  // 40-60 at the default 1,500). Was [34, 26, 18, 14, 8], which put AI agents at
  // 31% of the estimate — an AI-native vendor's aspiration, not a customer's
  // current reality, and the first thing a buyer would call unrealistic.
  // ASSUMPTION: type classification for the per-type breakdown is upstream.
  const type = rng.weighted<NhiType>(NHI_TYPES, [3, 40, 27, 18, 12]);
  const pool = namePool(type);
  const name = `${typePrefix(type)}-${rng.pick(pool)}-${String(index).padStart(5, '0')}`;

  // Correlated across 1..3 clouds. AI agents and service accounts correlate more.
  const sourceCount = rng.weighted([1, 2, 3], type === 'ai-agent' ? [3, 4, 3] : [6, 3, 1]);
  const chosenClouds: Cloud[] = [];
  const cloudPool = [...CLOUDS];
  for (let i = 0; i < sourceCount; i++) {
    const idx = rng.int(0, cloudPool.length - 1);
    chosenClouds.push(cloudPool.splice(idx, 1)[0]);
  }

  const createdAt = new Date(now.getTime() - rng.int(5, 720) * 86400000);
  const sources: SourceInstance[] = chosenClouds.map((cloud) => ({
    cloud,
    externalId: `${cloud}:${typePrefix(type)}:${rng.int(100000, 999999)}`,
    attributes: sourceAttributes(rng, cloud, type),
    lastSeen: new Date(now.getTime() - rng.int(0, 30) * 86400000).toISOString(),
  }));
  const lastSeen = sources
    .map((s) => s.lastSeen)
    .sort()
    .reverse()[0];

  // Risk: long tail, with critical kept genuinely rare (~1.6%, i.e. 18-25 at the
  // default 1,500). Was 8% critical, which combined with the orphan bump below
  // produced ~13% criticals — a population no mid-market tenant would recognise,
  // and one that makes "critical" meaningless as a triage signal.
  // ASSUMPTION: risk-score derivation upstream.
  const roll = rng.float();
  let riskScore: number;
  if (roll < 0.016) riskScore = rng.int(80, 100);
  else if (roll < 0.1) riskScore = rng.int(60, 79);
  else if (roll < 0.32) riskScore = rng.int(40, 59);
  else if (roll < 0.68) riskScore = rng.int(20, 39);
  else riskScore = rng.int(0, 19);

  // Orphaned: a meaningful slice, skewed higher risk. // ASSUMPTION: orphan detection upstream.
  const orphaned = rng.bool(0.12) || (riskScore > 75 && rng.bool(0.25));
  const orphanReason = orphaned
    ? rng.pick(['No owner assigned', 'No legitimate use in 90 days', 'Creator account deactivated'])
    : undefined;
  // Orphans are elevated but capped below the critical threshold (was 55..95, which
  // manufactured most of the critical population as a side effect). An orphan is a
  // hygiene problem; it becomes critical only on its own score.
  if (orphaned) riskScore = Math.max(riskScore, rng.int(55, 79));

  // Cross-source attribute conflicts, surfaced never merged.
  const conflicts: AttributeConflict[] = [];
  if (sources.length > 1 && rng.bool(0.18)) {
    const attr = rng.pick(['region', 'owner', 'environment']);
    conflicts.push({
      attribute: attr,
      values: sources.map((s) => ({
        cloud: s.cloud,
        value: attr === 'region' ? rng.pick(REGIONS) : rng.pick(['prod', 'staging', 'dev']),
      })),
    });
  }

  const governanceStatus = orphaned
    ? 'ungoverned'
    : rng.weighted(['governed', 'drift', 'ungoverned'] as const, [6, 2, 2]);

  const owner = orphaned && rng.bool(0.7) ? undefined : rng.pick(OWNERS);

  // Lifecycle status (derived, display-only): quarantined tracks contained
  // high-risk orphans; inactive tracks identities not seen in weeks; else active.
  //
  // Containment is a decision, not a threshold: a high-risk orphan is a *candidate*
  // and something — a policy or an analyst — has to act on it, so only a minority
  // are actually contained. (Was `orphaned && riskScore >= 85`, which relied on the
  // old orphan bump reaching 95; with orphans now capped at 79 that rule quarantined
  // almost nothing.)
  // ASSUMPTION: status derivation, and the containment action behind it, are upstream.
  const daysSinceSeen = (now.getTime() - new Date(lastSeen).getTime()) / 86400000;
  const contained = orphaned && riskScore >= 70 && rng.bool(0.25);
  const status: IdentityStatus = contained
    ? 'quarantined'
    : daysSinceSeen >= 24
      ? 'inactive'
      : 'active';

  return {
    id: `idn_${index.toString(36).padStart(6, '0')}`,
    name,
    type,
    sources,
    correlated: sources.length > 1,
    orphaned,
    orphanReason,
    conflicts,
    riskScore,
    riskBand: riskBand(riskScore).band,
    governanceStatus,
    status,
    owner,
    relationships: [], // filled in a second pass once ids exist
    riskSeries: makeRiskSeries(rng, riskScore, now),
    createdAt: createdAt.toISOString(),
    lastSeen,
  };
}

/* ------------------------------------------------------ the identity set */

export function generateIdentities(seed: number, size: number, now: Date): Identity[] {
  const rng = new Rng(seed);
  const identities: Identity[] = [];
  for (let i = 0; i < size; i++) {
    identities.push(makeIdentity(rng, i, now));
  }
  // Second pass: wire relationships so Blast Radius has something to walk.
  //
  // The distribution is deliberately long-tailed. Most identities touch a handful
  // of others, but a few hubs — a shared CI key, a central orchestrator agent —
  // reach far more. Blast Radius exists for exactly those: a uniformly thin graph
  // never produces the high-reach identity whose scale the FRS asks us to make clear.
  const relRng = new Rng(seed ^ 0x9e3779b9);
  const HUB_RATE = 0.02;
  for (const identity of identities) {
    const links = relRng.bool(HUB_RATE)
      ? relRng.int(14, 34)
      : relRng.weighted([0, 1, 2, 3, 5], [3, 4, 3, 2, 1]);
    const linked = new Set<string>([identity.id]);
    for (let i = 0; i < links; i++) {
      const other = identities[relRng.int(0, identities.length - 1)];
      if (linked.has(other.id)) continue;
      linked.add(other.id);
      identity.relationships.push({
        identityId: other.id,
        kind: relRng.pick(['assumes', 'shares-credential', 'invokes', 'delegates-to']),
      });
    }
  }
  return identities;
}

/* ----------------------------------------------------------------- alerts */

const ALERT_TEMPLATES: { title: string; description: string; next: string }[] = [
  {
    title: 'Anomalous tool-call burst',
    description: 'Agent issued 40x its baseline volume of privileged tool calls in 5 minutes.',
    next: 'Open the session replay and review the flagged steps.',
  },
  {
    title: 'Credential used from new origin',
    description: 'API key authenticated from an IP range never seen in the established baseline.',
    next: 'Confirm with the owner, then request a standard rotation.',
  },
  {
    title: 'Orphaned identity reactivated',
    description: 'A credential with no owner resumed activity after 96 days dormant.',
    next: 'Assign an owner or schedule emergency rotation.',
  },
  {
    title: 'Privilege escalation attempt',
    description: 'Workload identity requested a role outside its governed policy set.',
    next: 'Review the policy and the blast radius before acting.',
  },
  {
    title: 'Cross-cloud correlation drift',
    description: 'Correlated sources now disagree on environment; possible takeover.',
    next: 'Inspect the attribute conflict on the identity detail.',
  },
];

export function generateAlerts(identities: Identity[], seed: number, now: Date): Alert[] {
  const rng = new Rng(seed ^ 0x1234567);
  const candidates = identities.filter((i) => i.riskScore >= 55 || i.orphaned);
  const alerts: Alert[] = [];
  const count = Math.min(candidates.length, Math.max(8, Math.floor(identities.length * 0.03)));
  for (let i = 0; i < count; i++) {
    const identity = rng.pick(candidates);
    const tpl = rng.pick(ALERT_TEMPLATES);
    const learning = rng.bool(0.25);
    const severity = riskBand(identity.riskScore).band;
    alerts.push({
      id: `alr_${i.toString(36).padStart(5, '0')}`,
      identityId: identity.id,
      severity: severity === 'minimal' ? 'low' : severity,
      title: tpl.title,
      description: tpl.description,
      recommendedNextStep: tpl.next,
      baseline: learning ? 'learning' : 'established',
      baselineProgress: learning ? { day: rng.int(2, 13), of: 14 } : undefined,
      status: rng.weighted(['open', 'acknowledged', 'resolved'] as const, [6, 2, 2]),
      createdAt: new Date(now.getTime() - rng.int(0, 14) * 86400000 - rng.int(0, 86400000)).toISOString(),
    });
  }
  return alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* -------------------------------------------------------------- sessions */

/**
 * Tool calls carry the privilege they ran with. Scope is a property of the call, not
 * an independent roll: `delete_object` is never a read, and session risk keys off the
 * highest scope reached, so a mismatch here would score the session wrong.
 */
const TOOL_CALLS: { summary: string; scope: ToolScope }[] = [
  { summary: 'list_objects(bucket)', scope: 'read' },
  { summary: 'query_db(customers)', scope: 'read' },
  { summary: 'fetch_secret(ref)', scope: 'read' },
  { summary: 'send_email(...)', scope: 'write' },
  { summary: 'update_record(invoice)', scope: 'write' },
  { summary: 'assume_role(target)', scope: 'admin' },
  { summary: 'delete_object(...)', scope: 'admin' },
];

const OTHER_SUMMARIES: Record<'prompt' | 'model-response', string[]> = {
  prompt: ['Follow-up instruction received', 'Clarification requested by caller', 'Retry after tool error'],
  'model-response': ['Planned 3-step workflow', 'Summarized findings', 'Requested confirmation', 'Returned final answer'],
};

/** The opening prompt states how the session began, so it agrees with `spawnedBy`. */
const SPAWN_PROMPT: Record<SessionSpawnKind, string> = {
  human: 'User asked to reconcile invoices',
  schedule: 'Scheduled trigger fired',
  agent: 'Upstream agent delegated task',
};

/**
 * FR-005 requires the *reason* inline, not just a mark. Reasons are drawn to match the
 * step: a privilege reason only lands on an admin-scoped call.
 * // ASSUMPTION: the reason strings. The anomaly taxonomy is Architect-owned and still
 * // open — see the Monitor conformance notes — so these are illustrative wording, not
 * // a committed enum.
 */
const ANOMALY_REASONS = {
  any: ['Never accessed before', 'Outside baseline for this identity', 'First use from this region'],
  privileged: ['Privilege escalation not seen in baseline', 'Volume 40x the established baseline'],
};

/** Hard-deny rules that can hold a step (FR-006). */
const DENY_RULES = [
  'POL-14 — deny destructive calls on production storage',
  'POL-07 — deny role assumption outside the agent’s home account',
  'POL-22 — deny outbound mail from unattended agents',
];

export function generateSessions(identities: Identity[], seed: number, now: Date): AgentSession[] {
  const rng = new Rng(seed ^ 0x55aa55);
  const agents = identities.filter((i) => i.type === 'ai-agent');
  const sessions: AgentSession[] = [];
  // Sessions per agent, not a fraction of the agent population: an agent is
  // long-running and accumulates many sessions over a week, so the session count
  // scales with agents rather than being bounded by them. (Was
  // `min(agents, max(10, agents * 0.2))`, which capped the feed at one session per
  // agent — after the type recalibration cut AI agents to ~4% of the population
  // that left the feed at 11 rows.)
  const count = agents.length === 0 ? 0 : Math.max(10, Math.round(agents.length * 1.5));
  for (let i = 0; i < count; i++) {
    const agent = rng.pick(agents);
    const stepCount = rng.int(5, 14);
    const steps: SessionStep[] = [];
    const start = new Date(now.getTime() - rng.int(0, 7) * 86400000 - rng.int(0, 86400000));
    const spawnKind = rng.weighted<SessionSpawnKind>(['human', 'schedule', 'agent'], [4, 4, 3]);
    // A burst session fires its calls seconds apart; a routine one paces them over
    // minutes. Both are normal shapes — what the steps did is what tells them apart.
    const bursty = rng.bool(0.25);
    let anomalyCount = 0;
    let blockedCount = 0;
    // Monotonic cursor. This was `start + s * rng.int(2000, 45000)`, which redrew the
    // interval every step and let step 4 land before step 3 — the timeline claimed an
    // order its own timestamps contradicted.
    let cursor = start.getTime();
    for (let s = 0; s < stepCount; s++) {
      // The first step is always the prompt that opened the session.
      const kind =
        s === 0
          ? ('prompt' as const)
          : rng.weighted<SessionStep['kind']>(['prompt', 'tool-call', 'model-response'], [1, 6, 4]);
      const call = kind === 'tool-call' ? rng.pick(TOOL_CALLS) : null;
      const privileged = call ? call.scope !== 'read' : false;

      // A hard-deny rule can only hold a state-changing call, and at most one per
      // session — a held action is the loudest thing on the screen and loses that
      // meaning if it is common.
      const blocked = privileged && blockedCount === 0 && rng.bool(0.06);
      const anomaly = !blocked && rng.bool(0.12);
      if (anomaly) anomalyCount++;
      if (blocked) blockedCount++;

      const reasonPool = privileged
        ? [...ANOMALY_REASONS.any, ...ANOMALY_REASONS.privileged]
        : ANOMALY_REASONS.any;

      steps.push({
        id: `stp_${i}_${s}`,
        stepNo: s + 1,
        kind,
        at: new Date(cursor).toISOString(),
        summary: s === 0 ? SPAWN_PROMPT[spawnKind] : call ? call.summary : rng.pick(OTHER_SUMMARIES[kind as 'prompt' | 'model-response']),
        detail: call
          ? `Invoked with scope ${call.scope}; latency ${rng.int(20, 900)}ms.`
          : 'Captured payload available in the full trace (synthetic).',
        status: blocked ? 'blocked' : anomaly ? 'anomaly' : 'normal',
        ...(anomaly ? { anomalyReason: rng.pick(reasonPool) } : {}),
        // ~1 in 5 matched rules land on a source with no hold primitive, so the feed
        // carries FR-006's exception case and not only its happy path.
        ...(blocked ? { blockedByRule: rng.pick(DENY_RULES), holdEnforced: rng.bool(0.8) } : {}),
        ...(call ? { scope: call.scope } : {}),
      });
      cursor += bursty ? rng.int(700, 6000) : rng.int(4000, 90000);
    }

    // FR-005 exception: a step the engine has not scored yet must not read as clean.
    // Only the tail of a session that ended in the last few minutes is still pending.
    const last = steps[steps.length - 1];
    if (last.status === 'normal' && now.getTime() - cursor < 12 * 60000) {
      last.status = 'scoring';
    }

    const otherAgents = agents.filter((a) => a.id !== agent.id);
    const spawnedBy = {
      kind: spawnKind,
      label:
        spawnKind === 'agent'
          ? (otherAgents.length > 0 ? rng.pick(otherAgents) : agent).name
          : spawnKind === 'human'
            ? `${rng.pick(['j.okafor', 'r.mehta', 's.novak', 'a.lindqvist'])}@tenant.example`
            : `cron: ${rng.pick(['hourly-reconcile', 'nightly-sweep', '15m-poll'])}`,
    };

    sessions.push({
      id: `ses_${i.toString(36).padStart(5, '0')}`,
      identityId: agent.id,
      startedAt: start.toISOString(),
      endedAt: new Date(cursor).toISOString(),
      anomalyCount,
      blockedCount,
      steps,
      provenance: {
        model: rng.pick(MODELS),
        region: rng.pick(REGIONS),
        spawnedBy,
        credentials: agent.sources.length > 0 ? agent.sources.map((src) => src.externalId) : ['unknown'],
      },
      reviewState: rng.weighted<SessionReviewState>(['open', 'reviewed'], [7, 3]),
    });
  }
  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/* --------------------------------------------------------------- policies */

export function generatePolicies(identities: Identity[], seed: number, now: Date): Policy[] {
  const rng = new Rng(seed ^ 0xc0ffee);
  const defs: { name: string; tokens: PolicyToken[]; status: Policy['status'] }[] = [
    {
      name: 'Quarantine orphaned AI agents',
      status: 'active',
      tokens: [
        { kind: 'when', subject: 'type', operator: 'is', value: 'ai-agent' },
        { kind: 'and', subject: 'orphaned', operator: 'is', value: 'true' },
        { kind: 'then', subject: 'action', operator: 'set', value: 'quarantine' },
      ],
    },
    {
      name: 'Rotate high-risk API keys weekly',
      status: 'tested',
      tokens: [
        { kind: 'when', subject: 'type', operator: 'is', value: 'api-key' },
        { kind: 'and', subject: 'riskScore', operator: 'gte', value: '60' },
        { kind: 'then', subject: 'rotate', operator: 'every', value: '7d' },
      ],
    },
    {
      name: 'Flag cross-cloud conflicts',
      status: 'draft',
      tokens: [
        { kind: 'when', subject: 'conflicts', operator: 'gt', value: '0' },
        { kind: 'then', subject: 'action', operator: 'set', value: 'review' },
      ],
    },
    {
      // Was 'block' until that action left the vocabulary — it had no target state
      // and nothing distinguished it from quarantine. Kept Suspended: it is the
      // only seed exercising that status in the list's facet counts.
      name: 'Quarantine dormant OAuth tokens',
      status: 'suspended',
      tokens: [
        { kind: 'when', subject: 'type', operator: 'is', value: 'oauth-token' },
        { kind: 'and', subject: 'governanceStatus', operator: 'is', value: 'ungoverned' },
        { kind: 'then', subject: 'action', operator: 'set', value: 'quarantine' },
      ],
    },
    {
      name: 'Legacy workload sweep',
      status: 'archived',
      tokens: [
        { kind: 'when', subject: 'type', operator: 'is', value: 'workload-identity' },
        { kind: 'then', subject: 'action', operator: 'set', value: 'review' },
      ],
    },
  ];
  // affectedCount is computed against the dataset so it reconciles with the inventory.
  return defs.map((d, i) => {
    const updatedAt = new Date(now.getTime() - rng.int(0, 30) * 86400000).toISOString();
    // Anything past Draft has, by definition, passed a dry-run of its current rule —
    // so a seeded Active/Suspended policy can be reactivated without a re-test (FR-005).
    const tested = d.status !== 'draft';
    return {
      id: `pol_${i.toString(36).padStart(4, '0')}`,
      name: d.name,
      tokens: d.tokens,
      plainEnglish: plainEnglish(d.tokens),
      generatedCode: generatedCode(d.name, d.tokens),
      affectedCount: identities.filter((idn) => matchesPolicy(idn, d.tokens)).length,
      status: d.status,
      updatedAt,
      ...(tested ? { lastTestedAt: updatedAt, testedTokens: d.tokens.map((t) => ({ ...t })) } : {}),
      ...(d.status === 'active' || d.status === 'suspended' ? { activatedAt: updatedAt } : {}),
    };
  });
}

/* --------------------------------------------------------- policy actions */

/**
 * How many rows one seeded sweep produces. A real sweep acts on every match, but
 * the fixture scales to 50k identities and a row per match would swamp the tab.
 * The sweep header counts the rows that exist rather than the live match count,
 * so what the summary says and what the list shows always agree.
 */
const SWEEP_ROWS = 18;

/**
 * A failure cause that is a property of the cloud rather than of the identity, so
 * failures cluster the way real ones do and "N share the same cause" is true.
 */
function failureFor(cloud: Cloud): PolicyActionReason {
  if (cloud === 'gcp') return 'connector-permission';
  if (cloud === 'aws') return 'identity-gone';
  return 'provider-error';
}

/**
 * Actions left behind by policies that have enforced. Only a quarantine policy
 * produces any: review and alert mark rather than act, and rotate is out of scope.
 * A Suspended policy keeps its history — it enforced before it was stopped.
 */
export function generatePolicyActions(
  identities: Identity[],
  policies: Policy[],
  users: User[],
  seed: number,
  now: Date,
): PolicyAction[] {
  const rng = new Rng(seed ^ 0xac7104);
  const accountable = users[0]?.email ?? 'system';
  const releaser = users[1]?.email ?? accountable;
  const out: PolicyAction[] = [];
  let seq = 0;
  const nextId = () => `pac_${(seq++).toString(36).padStart(5, '0')}`;

  const enforcing = policies.filter(
    (p) =>
      (p.status === 'active' || p.status === 'suspended') &&
      p.tokens.some((t) => t.kind === 'then' && t.subject === 'action' && t.value === 'quarantine'),
  );

  for (const policy of enforcing) {
    const matched = identities.filter((i) => matchesPolicy(i, policy.tokens));
    if (matched.length === 0) continue;

    const activatedMs = new Date(policy.activatedAt ?? policy.updatedAt).getTime();
    const sweepId = `swp_${policy.id}_a`;
    const quarantined: PolicyAction[] = [];

    // The activation sweep: everything matching the moment the rule went live.
    for (const identity of matched.slice(0, SWEEP_ROWS)) {
      const base = {
        id: nextId(),
        policyId: policy.id,
        policyName: policy.name,
        identityId: identity.id,
        accountable,
        sweepId,
        sweepReason: 'activation' as const,
        at: new Date(activatedMs + rng.int(0, 90) * 1000).toISOString(),
      };
      // An identity already in that state is a skip, not a failure — the guard
      // worked. Derived from the seeded status so the log reconciles with the
      // inventory rather than asserting something the identity contradicts.
      if (identity.status === 'quarantined') {
        out.push({ ...base, outcome: 'skipped', reason: 'already-quarantined' });
        continue;
      }
      if (rng.bool(0.12)) {
        out.push({ ...base, outcome: 'failed', reason: failureFor(identity.sources[0]?.cloud ?? 'aws') });
        continue;
      }
      const action: PolicyAction = { ...base, outcome: 'quarantined' };
      out.push(action);
      quarantined.push(action);
    }

    // One later re-evaluation, for policies still enforcing.
    if (policy.status === 'active' && matched.length > SWEEP_ROWS) {
      out.push({
        id: nextId(),
        policyId: policy.id,
        policyName: policy.name,
        identityId: matched[SWEEP_ROWS].id,
        outcome: 'quarantined',
        accountable,
        sweepId: `swp_${policy.id}_r`,
        sweepReason: 're-evaluation',
        at: new Date(now.getTime() - rng.int(5, 240) * 60000).toISOString(),
      });
    }

    // A reversal or two. These are the most useful rows on the screen — a
    // quarantine a person undid is the signal that the rule itself is wrong.
    for (const reversed of quarantined.slice(0, rng.int(1, 2))) {
      out.push({
        id: nextId(),
        policyId: policy.id,
        policyName: policy.name,
        identityId: reversed.identityId,
        outcome: 'released',
        note: 'Still in active use — released pending a rule change.',
        accountable: releaser,
        reversesId: reversed.id,
        at: new Date(new Date(reversed.at).getTime() + rng.int(20, 180) * 60000).toISOString(),
      });
    }
  }

  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/* ------------------------------------------------------ rotation jobs */

export function generateRotations(
  identities: Identity[],
  seed: number,
  now: Date,
): { active: RotationJob[]; history: RotationHistoryEntry[] } {
  const rng = new Rng(seed ^ 0x707a7e);
  const highRisk = identities.filter((i) => i.riskScore >= 60);
  const phases = ['prepare', 'issue', 'propagate', 'verify', 'revoke', 'confirm'] as const;

  const active: RotationJob[] = [];
  const activeCount = Math.min(highRisk.length, rng.int(2, 5));
  for (let i = 0; i < activeCount; i++) {
    const identity = rng.pick(highRisk);
    const cascadeCount = rng.int(0, 4);
    active.push({
      id: `rot_${i.toString(36).padStart(4, '0')}`,
      identityId: identity.id,
      mode: rng.bool(0.25) ? 'emergency' : 'standard',
      phase: rng.pick(phases),
      phaseProgress: rng.float(),
      startedAt: new Date(now.getTime() - rng.int(1, 90) * 60000).toISOString(),
      cascade: Array.from({ length: cascadeCount }, () => {
        const dep = rng.pick(identities);
        return {
          identityId: dep.id,
          action: rng.bool() ? ('revoke' as const) : ('reissue' as const),
          status: rng.pick(['pending', 'in-progress', 'done']),
        };
      }),
    });
  }

  const history: RotationHistoryEntry[] = [];
  for (let i = 0; i < 24; i++) {
    const identity = rng.pick(identities);
    history.push({
      id: `rhx_${i.toString(36).padStart(4, '0')}`,
      identityId: identity.id,
      mode: rng.bool(0.2) ? 'emergency' : 'standard',
      completedAt: new Date(now.getTime() - rng.int(1, 120) * 86400000).toISOString(),
      outcome: rng.bool(0.92) ? 'success' : 'rolled-back',
      actor: rng.pick(['alex.kim@acme.test', 'jordan.r@acme.test', 'system']),
    });
  }
  history.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  return { active, history };
}

/* ------------------------------------------ audit, notifications, etc. */

export function generateAudit(
  identities: Identity[],
  policies: Policy[],
  users: User[],
  tenant: Tenant,
  seed: number,
  now: Date,
): AuditEntry[] {
  const rng = new Rng(seed ^ 0xa0d17);
  const actors = ['alex.kim@acme.test', 'jordan.r@acme.test', 'sam.lee@acme.test', 'system'];

  // Sessions belong to AI agents, so a session entry names one — falling back to
  // the wider population at scales too small to contain any agent.
  const agents = identities.filter((i) => i.type === 'ai-agent');
  const sessionSubjects = agents.length > 0 ? agents : identities;
  const ssoTarget = `${tenant.name} — SSO (${SSO_PROVIDER_LABELS[tenant.sso.provider]})`;

  // Each action names what it acted on in the vocabulary the live appendAudit
  // paths use — an identity or policy name, a user's email, a cloud, the tenant —
  // never an internal id. A seeded row and a row the user just generated have to
  // be indistinguishable in kind, and an identity id is meaningless against a
  // role change or an SSO edit in any case.
  const actions: ReadonlyArray<[AuditAction, () => string]> = [
    ['acknowledged alert', () => rng.pick(identities).name],
    ['resolved alert', () => rng.pick(identities).name],
    ['activated policy', () => rng.pick(policies).name],
    ['requested rotation', () => rng.pick(identities).name],
    ['executed emergency rotation', () => rng.pick(identities).name],
    // Same verbs the live mutations write (api.ts), so seeded history and new entries
    // read as one trail. "quarantined session" was the old wording from when quarantine
    // was a session-level flag; it now contains the agent.
    ['reviewed agent session', () => rng.pick(sessionSubjects).name],
    ['quarantined agent', () => rng.pick(sessionSubjects).name],
    ['connected cloud', () => CLOUD_LABELS[rng.pick(CLOUDS)]],
    ['updated SSO config', () => ssoTarget],
    ['changed user role', () => rng.pick(users).email],
  ];

  // Strictly descending in time. The log is append-only, tamper-evident evidence
  // (FRS §3.10) and live entries are unshifted onto the front, so the seeded tail
  // has to already read newest-first. (Was `now - i * rng.int(1, 6) * HOUR`, which
  // scaled a fresh random multiplier by i and so wandered forwards and backwards.)
  let at = now.getTime() - rng.int(5, 55) * 60000;
  const entries: AuditEntry[] = [];
  for (let i = 0; i < 60; i++) {
    const [action, target] = rng.pick(actions);
    entries.push({
      id: `aud_${i.toString(36).padStart(4, '0')}`,
      at: new Date(at).toISOString(),
      actor: rng.pick(actors),
      action,
      // Same derivation as the live appendAudit path, so a seeded row and a row
      // the user just generated fall under the same object filter.
      object: ACTION_OBJECT[action],
      target: target(),
      detail: rng.bool(0.4) ? 'Synthetic event for demonstration.' : undefined,
    });
    at -= rng.int(1, 6) * 3600000;
  }
  return entries;
}

export function generateNotifications(seed: number, now: Date): NotificationItem[] {
  const rng = new Rng(seed ^ 0x404140);
  const titles = [
    'New critical alert on an AI agent',
    'Rotation completed successfully',
    'Policy activated by an admin',
    'Orphaned identity detected',
    'Baseline established for monitoring',
  ];
  return Array.from({ length: 12 }, (_, i) => ({
    id: `ntf_${i.toString(36).padStart(4, '0')}`,
    at: new Date(now.getTime() - i * rng.int(1, 10) * 3600000).toISOString(),
    severity: rng.weighted(['critical', 'high', 'medium', 'info'] as const, [2, 3, 3, 4]),
    title: rng.pick(titles),
    read: rng.bool(0.5),
    href: rng.bool(0.6) ? '/monitor' : undefined,
  }));
}

export function generateConnections(identities: Identity[], now: Date): CloudConnection[] {
  const byCloud: Record<Cloud, Record<NhiType, number>> = {
    aws: emptyCounts(),
    gcp: emptyCounts(),
    azure: emptyCounts(),
  };
  for (const identity of identities) {
    for (const source of identity.sources) {
      byCloud[source.cloud][identity.type] += 1;
    }
  }
  // Staggered sync ages, so the coverage chip has a real oldest-sync to report.
  const ageMinutes: Record<Cloud, number> = { aws: 6, gcp: 11, azure: 4 };
  return CLOUDS.map((cloud) => ({
    cloud,
    status: 'connected' as const,
    counts: byCloud[cloud],
    lastSyncAt: new Date(now.getTime() - ageMinutes[cloud] * 60000).toISOString(),
  }));
}

function emptyCounts(): Record<NhiType, number> {
  return {
    'ai-agent': 0,
    'service-account': 0,
    'api-key': 0,
    'oauth-token': 0,
    'workload-identity': 0,
  };
}

/* ------------------------------------------------ Wave 2 concept fixtures */

export function generateRehearsals(seed: number, now: Date): import('./types').RecoveryRehearsal[] {
  const rng = new Rng(seed ^ 0x5ee5);
  const scopes = ['AWS prod service accounts', 'All AI agents', 'OAuth tokens (EU)', 'Payments workload identities', 'Critical-risk set'];
  return Array.from({ length: 8 }, (_, i) => ({
    id: `reh_${i.toString(36).padStart(4, '0')}`,
    at: new Date(now.getTime() - rng.int(1, 90) * 86400000).toISOString(),
    scope: rng.pick(scopes),
    outcome: rng.weighted(['passed', 'partial', 'failed'] as const, [6, 3, 1]),
    timeToUsableMin: rng.int(8, 72),
  })).sort((a, b) => b.at.localeCompare(a.at));
}

export function generateCopilotSuggestions(
  identities: Identity[],
  _seed: number,
): import('./types').CopilotSuggestion[] {
  const templates = [
    { title: 'Rotate this credential', rationale: 'Risk score climbed into the critical band over the last 3 days.' },
    { title: 'Assign an owner', rationale: 'Orphaned identity with recent activity — assign accountability before it drifts further.' },
    { title: 'Quarantine this agent', rationale: 'Anomalous tool-call pattern resembles a known exfiltration sequence.' },
    { title: 'Resolve the attribute conflict', rationale: 'Sources disagree on environment; reconcile before enforcing policy.' },
    { title: 'Tighten the governing policy', rationale: 'Identity sits just outside an active policy that would otherwise cover it.' },
  ];
  const candidates = identities.filter((i) => i.riskScore >= 70 || i.orphaned).slice(0, 5);
  return candidates.map((idn, i) => {
    const t = templates[i % templates.length];
    return {
      id: `cop_${i.toString(36).padStart(4, '0')}`,
      title: t.title,
      rationale: t.rationale,
      severity: riskBand(idn.riskScore).band,
      identityId: idn.id,
    };
  });
}

/* --------------------------------------- tenant, groups, users, invitations */
// Add-on seed. Synthetic only. The current tenant is Acme Corp on acme.com with
// Entra ID configured; globex.com is held as an already-registered domain so the
// registration "domain already taken" error is demonstrable (see api.ts).

export const TENANT_ID = 'tnt_acme';

function iso(now: Date, msAgo: number): string {
  return new Date(now.getTime() - msAgo).toISOString();
}
const MINUTE = 60000;
const HOUR = 3600000;
const DAY = 86400000;

export function generateTenant(now: Date): Tenant {
  return {
    id: TENANT_ID,
    name: 'Acme Corp',
    allowedDomains: ['acme.com'],
    status: 'active',
    sso: { provider: 'entra' },
    // Seeded fully connected, with a healthy certificate. Shorten CERT_DAYS to
    // land inside CERT_WARN_DAYS and the setup screen's `attention` state appears.
    saml: {
      entityId: 'https://sts.windows.net/818437a1-5008-44d7-bb45-1da663f1308d/',
      ssoUrl: 'https://login.microsoftonline.com/818437a1-5008-44d7-bb45-1da663f1308d/saml2',
      certificate: SEED_CERT,
      // ASSUMPTION: x509 is decoded upstream; these are the values that come back.
      cert: {
        subject: 'CN=Microsoft Azure Federated SSO Certificate',
        thumbprint: '3A9F 2B41 7C08 D5E6 1F93 4A70 B2C8 6D11 5E0F 92A3',
        expiresAt: new Date(now.getTime() + CERT_DAYS * DAY).toISOString(),
      },
      savedAt: iso(now, 11 * DAY),
      // Minutes-old values read against real time, not the hour-floored NOW the
      // rest of the seed uses: floored, "6 minutes ago" drifts up to an hour and
      // a healthy connection renders as a neglected one.
      lastSignInAt: iso(new Date(), 6 * MINUTE),
    },
    scim: {
      tokenIssuedAt: iso(now, 10 * DAY),
      lastSyncAt: iso(new Date(), 4 * MINUTE),
      usersReceived: 11,
    },
    passwordFallback: true,
    createdAt: iso(now, 420 * DAY),
  };
}

/** Days of certificate life left in the seed. */
const CERT_DAYS = 195;

const SEED_CERT = [
  '-----BEGIN CERTIFICATE-----',
  'MIIC8DCCAdigAwIBAgIQRJGmR4o4PptMEDvXzn8OzjANBgkqhkiG9w0BAQsFADA0',
  'MTIwMAYDVQQDEyINaWNyb3NvZnQgQXp1cmUgRmVkZXJhdGVkIFNTTyBDZXJ0aWZp',
  'Y2F0ZTAeFw0yNjA0MTgwOTIxNDNaFw0yNzAzMTQwOTIxNDNaMDQxMjAwBgNVBAMT',
  'KU1pY3Jvc29mdCBBenVyZSBGZWRlcmF0ZWQgU1NPIENlcnRpZmljYXRlMIIBIjAN',
  'BgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwO70bajDcPjS0EtPCIQTX5qI3eOt',
  '2omAE+Nww2bh594eS0rJ/JEY8cU0pZU5SCPwwN8glpoLcj+pviC1wif7Hyi2vFw0',
  '-----END CERTIFICATE-----',
].join('\n');

// Seed users covering every role and every status, so the user list shows all
// states out of the box. usr_1 (Alex Kim) is the signed-in actor — a Tenant
// Admin, so the default view exercises the admin surface without being the
// protected Owner. usr_0 (Noor Haddad) is the tenant's single Tenant Owner and
// the ONLY account Entra does not manage: registration created it, it signs in
// with a password, and it is the way back in if federation ever breaks.
// Two users arrive from Entra with no role yet, which is the triage the Manage
// Users screen is built around.
export function generateUsers(now: Date): User[] {
  const base = { tenantId: TENANT_ID } as const;
  const entra = { source: 'entra', authMethod: 'sso' } as const;
  return [
    { ...base, id: 'usr_0', name: 'Noor Haddad', email: 'noor.haddad@acme.com', role: 'tenant-owner', status: 'active', source: 'local', authMethod: 'password', addedAt: iso(now, 420 * DAY), lastLogin: iso(now, 6 * HOUR) },
    { ...base, ...entra, id: 'usr_1', name: 'Alex Kim', email: 'alex.kim@acme.com', role: 'tenant-admin', status: 'active', addedAt: iso(now, 400 * DAY), lastLogin: iso(now, 2 * HOUR) },
    { ...base, ...entra, id: 'usr_2', name: 'Dana Brooks', email: 'dana.brooks@acme.com', role: 'tenant-admin', status: 'active', addedAt: iso(now, 380 * DAY), lastLogin: iso(now, 1 * DAY) },
    { ...base, ...entra, id: 'usr_3', name: 'Jordan Rivera', email: 'jordan.rivera@acme.com', role: 'security-admin', status: 'active', addedAt: iso(now, 300 * DAY), lastLogin: iso(now, 5 * HOUR) },
    { ...base, ...entra, id: 'usr_4', name: 'Morgan Ellis', email: 'morgan.ellis@acme.com', role: 'security-admin', status: 'suspended', addedAt: iso(now, 280 * DAY), lastLogin: iso(now, 20 * DAY) },
    { ...base, ...entra, id: 'usr_5', name: 'Priya Nair', email: 'priya.nair@acme.com', role: 'analyst', status: 'active', addedAt: iso(now, 210 * DAY), lastLogin: iso(now, 3 * HOUR) },
    { ...base, ...entra, id: 'usr_6', name: 'Sam Lee', email: 'sam.lee@acme.com', role: 'analyst', status: 'active', addedAt: iso(now, 180 * DAY), lastLogin: iso(now, 2 * DAY) },
    { ...base, ...entra, id: 'usr_7', name: 'Chris Vaughn', email: 'chris.vaughn@acme.com', role: 'viewer', status: 'active', addedAt: iso(now, 120 * DAY), lastLogin: iso(now, 8 * DAY) },
    { ...base, ...entra, id: 'usr_8', name: 'Robin Park', email: 'robin.park@acme.com', role: null, status: 'active', addedAt: iso(now, 1 * DAY) },
    { ...base, ...entra, id: 'usr_9', name: 'Taylor Quinn', email: 'taylor.quinn@acme.com', role: 'viewer', status: 'suspended', addedAt: iso(now, 95 * DAY), validity: { expiry: iso(now, 3 * DAY) }, lastLogin: iso(now, 30 * DAY) },
    { ...base, ...entra, id: 'usr_10', name: 'Jamie Fox', email: 'jamie.fox@acme.com', role: null, status: 'active', addedAt: iso(now, 3 * HOUR) },
    { ...base, ...entra, id: 'usr_11', name: 'Lea Brandt', email: 'lea.brandt@acme.com', role: 'viewer', status: 'suspended-idp', addedAt: iso(now, 150 * DAY), lastLogin: iso(now, 12 * DAY) },
  ];
}

/* ------------------------------------------------------- quarantine provenance */

/**
 * Attach a producer to every quarantined identity. Runs as a post-pass, called
 * from `dataset.ts` after policies, users and sessions all exist — containment
 * is decided in `makeIdentity` (an orphaned, high-risk identity, by dice roll)
 * before any of the things that could have named it are built.
 *
 * Each candidate producer is constrained to one that could plausibly have done
 * it, not picked uniformly at random:
 *  - `policy`  — only an ACTIVE or SUSPENDED rule (matching
 *    generatePolicyActions's own `enforcing` filter: a draft has never run,
 *    a tested one hasn't gone live, and an archived one no longer applies)
 *    whose OWN action is quarantine AND whose conditions actually match this
 *    identity. No fallback to "any quarantine policy" — a rule that never
 *    enforced, or doesn't match, could not have produced this, and naming
 *    one anyway would be worse than naming none.
 *  - `user`    — only an active account holding `session.quarantine`; a
 *    suspended admin couldn't have acted, and Analysts can only recommend.
 *  - `session` — only one of the IDENTITY'S OWN sessions, and only when it has
 *    one (an agent). A session review cannot explain a service account's
 *    containment, and linking to a stranger's session would be a broken story.
 *
 * The preferred kind cycles by index so the fixture demonstrates all three
 * producers rather than whichever the dice favours, falling through to the
 * next-preferred kind when this identity can't support it.
 */
export function attachQuarantineProvenance(
  identities: Identity[],
  policies: Policy[],
  users: User[],
  sessions: AgentSession[],
  seed: number,
  now: Date,
): void {
  const rng = new Rng(seed ^ 0x51a7e5);
  const quarantined = identities.filter((i) => i.status === 'quarantined');
  if (quarantined.length === 0) return;

  // Only a policy that has actually enforced could have produced this --
  // matches generatePolicyActions's own `enforcing` filter above.
  const quarantinePolicies = policies.filter(
    (p) =>
      (p.status === 'active' || p.status === 'suspended') &&
      p.tokens.some((t) => t.kind === 'then' && t.subject === 'action' && t.value === 'quarantine'),
  );
  const admins = users.filter(
    (u) => u.status === 'active' && u.role !== null && can(u.role, 'session.quarantine'),
  );
  const sessionsByIdentity = new Map<string, AgentSession[]>();
  for (const session of sessions) {
    const list = sessionsByIdentity.get(session.identityId);
    if (list) list.push(session);
    else sessionsByIdentity.set(session.identityId, [session]);
  }

  const ORDERS: Record<number, readonly ('policy' | 'session' | 'user')[]> = {
    0: ['policy', 'session', 'user'],
    1: ['user', 'policy', 'session'],
    2: ['session', 'user', 'policy'],
  };

  quarantined.forEach((identity, i) => {
    const at = new Date(now.getTime() - rng.int(1, 240) * 3600000).toISOString();
    const ownSessions = sessionsByIdentity.get(identity.id) ?? [];
    // No fallback to "any quarantine policy": a policy whose own conditions do
    // not match this identity could not have quarantined it, and naming one
    // anyway is worse than naming none -- it reads as authoritative and isn't.
    // The ORDERS loop below already falls through to the next kind when this
    // is empty, same as it does for session.
    const eligiblePolicies = quarantinePolicies.filter((p) => matchesPolicy(identity, p.tokens));

    for (const kind of ORDERS[i % 3]) {
      if (kind === 'session' && ownSessions.length > 0) {
        identity.quarantine = { at, by: { kind: 'session', sessionId: rng.pick(ownSessions).id } };
        return;
      }
      if (kind === 'policy' && eligiblePolicies.length > 0) {
        identity.quarantine = { at, by: { kind: 'policy', policyId: rng.pick(eligiblePolicies).id } };
        return;
      }
      if (kind === 'user' && admins.length > 0) {
        identity.quarantine = { at, by: { kind: 'user', userId: rng.pick(admins).id } };
        return;
      }
    }
    // Every pool this identity was eligible for was empty (a degenerate fixture,
    // e.g. no users at all) — name whoever exists rather than leave it silent.
    identity.quarantine = { at, by: { kind: 'user', userId: users[0]?.id ?? 'usr_0' } };
  });

  promoteSessionReviewCandidate(identities, quarantined, sessionsByIdentity, rng, now);
}

/**
 * Categorically different work from the main loop above: that loop attaches a
 * producer to identities ALREADY decided to be quarantined; this one decides
 * to quarantine one that wasn't.
 *
 * At the default seed/size, containment (`makeIdentity`'s dice roll) never lands
 * on an ai-agent, so `session` never gets a legitimate candidate in the main
 * loop -- a session review can only explain the agent whose session it is, and
 * no quarantined identity has any. Rather than loosen that rule (linking a
 * service account's containment to a stranger's session would be a broken
 * story), this promotes one real ai-agent that already has a session of its
 * own, so the fixture -- and the screen it feeds -- demonstrates all three paths.
 */
function promoteSessionReviewCandidate(
  identities: Identity[],
  quarantined: Identity[],
  sessionsByIdentity: Map<string, AgentSession[]>,
  rng: Rng,
  now: Date,
): void {
  const hasSessionProducer = quarantined.some((i) => i.quarantine?.by.kind === 'session');
  if (hasSessionProducer) return;

  // Restricted to ACTIVE candidates (not merely "not already quarantined"):
  // an inactive identity's `lastSeen` is weeks stale by definition, and flipping
  // it straight to quarantined would claim it was contained days ago while its
  // own lastSeen says it hadn't been seen in a month. An active one needs no
  // such reconciling.
  const candidates = identities.flatMap((i) => {
    if (i.type !== 'ai-agent' || i.status !== 'active') return [];
    const own = sessionsByIdentity.get(i.id);
    return own && own.length > 0 ? [[i, own] as const] : [];
  });
  if (candidates.length === 0) return;

  const [promoted, ownSessions] = rng.pick(candidates);
  // Containment (`makeIdentity`, above) is `orphaned && riskScore >= 70` --
  // every naturally-quarantined identity satisfies it, so a promoted one must
  // too, or it becomes the one contained identity in the dataset that isn't a
  // high-risk orphan. Reachable in the UI: IdentityDetailPanel renders the
  // Orphaned badge and RiskPill straight off these fields.
  promoted.orphaned = true;
  promoted.orphanReason = rng.pick([
    'No owner assigned',
    'No legitimate use in 90 days',
    'Creator account deactivated',
  ]);
  // Orphans are capped below the critical threshold elsewhere in this file
  // (see makeIdentity) -- matched here rather than reaching for 80-100.
  promoted.riskScore = rng.int(70, 79);
  // Never hand-write the band: derive it the same way makeIdentity does, so a
  // future change to the band thresholds can't leave this fixture behind.
  promoted.riskBand = riskBand(promoted.riskScore).band;
  promoted.status = 'quarantined';
  promoted.quarantine = {
    at: new Date(now.getTime() - rng.int(1, 240) * 3600000).toISOString(),
    by: { kind: 'session', sessionId: rng.pick(ownSessions).id },
  };
}

