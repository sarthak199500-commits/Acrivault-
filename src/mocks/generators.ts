// Seeded fixture generation. A seeded RNG makes every run identical and keeps
// counts stable. Each generator that fabricates an upstream-derived value carries
// an // ASSUMPTION note; see the assumptions log in the README.

import {
  CLOUDS,
  CLOUD_LABELS,
  NHI_TYPES,
  SSO_PROVIDER_LABELS,
  type AgentSession,
  type Alert,
  type AttributeConflict,
  type AuditEntry,
  type Cloud,
  type CloudConnection,
  type Identity,
  type IdentityStatus,
  type Invitation,
  type NhiType,
  type NotificationItem,
  type Policy,
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
import { sessionRisk } from '@/lib/sessionRisk';
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
    // minutes. Both are normal shapes — the risk score is what tells them apart.
    const bursty = rng.bool(0.25);
    let anomalyCount = 0;
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
      const anomaly = rng.bool(0.12);
      if (anomaly) anomalyCount++;
      const call = kind === 'tool-call' ? rng.pick(TOOL_CALLS) : null;
      steps.push({
        id: `stp_${i}_${s}`,
        kind,
        at: new Date(cursor).toISOString(),
        summary: s === 0 ? SPAWN_PROMPT[spawnKind] : call ? call.summary : rng.pick(OTHER_SUMMARIES[kind as 'prompt' | 'model-response']),
        detail: call
          ? `Invoked with scope ${call.scope}; latency ${rng.int(20, 900)}ms.`
          : 'Captured payload available in the full trace (synthetic).',
        anomaly,
        ...(call ? { scope: call.scope } : {}),
      });
      cursor += bursty ? rng.int(700, 6000) : rng.int(4000, 90000);
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

    // Derived from the session's own evidence, with the agent's score as a bounded
    // prior. Was `agent.riskScore` verbatim, which made every session of an agent
    // score identically and ranked clean sessions above anomalous ones.
    const risk = sessionRisk(steps, agent.riskScore);

    sessions.push({
      id: `ses_${i.toString(36).padStart(5, '0')}`,
      identityId: agent.id,
      startedAt: start.toISOString(),
      endedAt: new Date(cursor).toISOString(),
      riskScore: risk.score,
      riskFactors: risk.factors,
      anomalyCount,
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
      name: 'Block dormant OAuth tokens',
      status: 'suspended',
      tokens: [
        { kind: 'when', subject: 'type', operator: 'is', value: 'oauth-token' },
        { kind: 'and', subject: 'governanceStatus', operator: 'is', value: 'ungoverned' },
        { kind: 'then', subject: 'action', operator: 'set', value: 'block' },
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
  const actions: ReadonlyArray<[string, () => string]> = [
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

export function generateConnections(identities: Identity[]): CloudConnection[] {
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
  return CLOUDS.map((cloud) => ({
    cloud,
    status: 'connected' as const,
    counts: byCloud[cloud],
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
const HOUR = 3600000;
const DAY = 86400000;

export function generateTenant(now: Date): Tenant {
  return {
    id: TENANT_ID,
    name: 'Acme Corp',
    allowedDomains: ['acme.com'],
    status: 'active',
    sso: { provider: 'entra', configured: true },
    createdAt: iso(now, 420 * DAY),
  };
}

// Seed users covering every role and every status, so the user list shows all
// states out of the box. usr_1 (Alex Kim) is the signed-in actor — a Tenant
// Admin, so the default view exercises the admin surface without being the
// protected Owner. usr_0 (Noor Haddad) is the tenant's single Tenant Owner,
// seeded separately so the Owner-protection guard is demonstrable.
// A second Tenant Admin (Dana) exists so rank-gating is demonstrable distinctly
// from the never-act-on-self rule.
export function generateUsers(now: Date): User[] {
  const base = { tenantId: TENANT_ID } as const;
  return [
    { ...base, id: 'usr_0', name: 'Noor Haddad', email: 'noor.haddad@acme.com', role: 'tenant-owner', status: 'active', authMethod: 'sso', lastLogin: iso(now, 6 * HOUR) },
    { ...base, id: 'usr_1', name: 'Alex Kim', email: 'alex.kim@acme.com', role: 'tenant-admin', status: 'active', authMethod: 'sso', lastLogin: iso(now, 2 * HOUR) },
    { ...base, id: 'usr_2', name: 'Dana Brooks', email: 'dana.brooks@acme.com', role: 'tenant-admin', status: 'active', authMethod: 'sso', lastLogin: iso(now, 1 * DAY) },
    { ...base, id: 'usr_3', name: 'Jordan Rivera', email: 'jordan.rivera@acme.com', role: 'security-admin', status: 'active', authMethod: 'sso', lastLogin: iso(now, 5 * HOUR) },
    { ...base, id: 'usr_4', name: 'Morgan Ellis', email: 'morgan.ellis@acme.com', role: 'security-admin', status: 'suspended', authMethod: 'sso', lastLogin: iso(now, 20 * DAY) },
    { ...base, id: 'usr_5', name: 'Priya Nair', email: 'priya.nair@acme.com', role: 'analyst', status: 'active', authMethod: 'sso', lastLogin: iso(now, 3 * HOUR) },
    { ...base, id: 'usr_6', name: 'Sam Lee', email: 'sam.lee@acme.com', role: 'analyst', status: 'active', authMethod: 'password', lastLogin: iso(now, 2 * DAY) },
    { ...base, id: 'usr_7', name: 'Chris Vaughn', email: 'chris.vaughn@acme.com', role: 'viewer', status: 'active', authMethod: 'sso', lastLogin: iso(now, 8 * DAY) },
    { ...base, id: 'usr_8', name: 'Robin Park', email: 'robin.park@acme.com', role: 'analyst', status: 'pending', authMethod: 'sso', invitedAt: iso(now, 1 * DAY), invitedBy: 'usr_1' },
    { ...base, id: 'usr_9', name: 'Taylor Quinn', email: 'taylor.quinn@acme.com', role: 'viewer', status: 'suspended', authMethod: 'sso', validity: { expiry: iso(now, 3 * DAY) }, lastLogin: iso(now, 30 * DAY) },
    { ...base, id: 'usr_10', name: 'Jamie Fox', email: 'jamie.fox@acme.com', role: 'security-admin', status: 'invited', authMethod: 'sso', invitedAt: iso(now, 3 * HOUR), invitedBy: 'usr_1' },
  ];
}

// Seeded invitations with KNOWN tokens so the Accept Invitation screen can resolve
// each state directly: /accept-invite/<token>. See the README demo links.
export function generateInvitations(now: Date): Invitation[] {
  const mk = (
    token: string,
    email: string,
    role: Invitation['role'],
    status: Invitation['status'],
    sentDaysAgo: number,
    expiresDaysFromNow: number,
  ): Invitation => ({
    token,
    tenantId: TENANT_ID,
    email,
    role,
    authMethod: 'sso',
    status,
    sentAt: iso(now, sentDaysAgo * DAY),
    expiresAt: new Date(now.getTime() + expiresDaysFromNow * DAY).toISOString(),
  });
  return [
    mk('acme-demo-001', 'newhire@acme.com', 'analyst', 'pending', 1, 6),
    mk('acme-expired-002', 'late.applicant@acme.com', 'viewer', 'expired', 10, -3),
    mk('acme-accepted-003', 'priya.nair@acme.com', 'analyst', 'accepted', 40, -33),
    mk('acme-revoked-004', 'former.contractor@acme.com', 'viewer', 'revoked', 5, 2),
    // Match the seeded pending/invited users so Resend Invitation has a target.
    mk('inv-robin', 'robin.park@acme.com', 'analyst', 'pending', 1, 6),
    mk('inv-jamie', 'jamie.fox@acme.com', 'security-admin', 'pending', 0.125, 7),
  ];
}
