import type { SessionRiskFactor, SessionStep, ToolScope } from '@/mocks/types';

export type { SessionRiskFactor };

/**
 * Session risk, derived from what happened *in the session*.
 *
 * This exists because session risk used to be `identity.riskScore` copied verbatim,
 * which made the pill on the session list anti-correlated with the evidence printed
 * beside it: a three-anomaly session read "Medium 55" while a zero-anomaly session on
 * a busier agent read "High 62", and every session of one agent carried one score. On
 * a triage list the score is the primary scan cue, so it has to move with the session.
 *
 * Four terms, weighted to sum to at most 100. Anomalies dominate because they are the
 * thing the screen is for; the identity's own risk is kept as a bounded prior — it says
 * whose agent this is, never what this run did.
 *
 * // ASSUMPTION: term weights and thresholds. The FRS specifies that sessions carry a
 * // risk and that anomalies are distinct, but not how the score is derived — that sits
 * // with the same Architect-owned anomaly taxonomy as the Monitor baseline work.
 */
const WEIGHTS = {
  anomaly: 50,
  privilege: 25,
  burst: 10,
  prior: 15,
} as const;

/** Any anomaly at all is most of the way to the anomaly term; density carries the rest. */
const ANOMALY_FLOOR = 0.45;
/** Density at which the anomaly term saturates — roughly one flagged step in three. */
const DENSITY_CEILING = 0.3;
/** Privileged calls per minute at which the burst term saturates. */
const BURST_CEILING = 6;
/** Sessions shorter than this are treated as this long, so a burst can't divide by ~0. */
const MIN_SPAN_MINUTES = 0.5;

const SCOPE_WEIGHT: Record<ToolScope, number> = { admin: 1, write: 0.55, read: 0.2 };
/** Scopes that can change state upstream — the ones a burst actually matters for. */
const PRIVILEGED_SCOPES: ToolScope[] = ['write', 'admin'];

export interface SessionRisk {
  score: number;
  factors: SessionRiskFactor[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function spanMinutes(steps: SessionStep[]): number {
  if (steps.length < 2) return MIN_SPAN_MINUTES;
  const times = steps.map((s) => new Date(s.at).getTime());
  const ms = Math.max(...times) - Math.min(...times);
  return Math.max(MIN_SPAN_MINUTES, ms / 60000);
}

/** Score one session's steps, with the owning identity's risk as a bounded prior. */
export function sessionRisk(steps: SessionStep[], identityRiskScore: number): SessionRisk {
  const anomalies = steps.filter((s) => s.anomaly).length;
  const density = steps.length > 0 ? anomalies / steps.length : 0;
  const anomalyTerm =
    anomalies === 0 ? 0 : ANOMALY_FLOOR + (1 - ANOMALY_FLOOR) * clamp01(density / DENSITY_CEILING);

  const calls = steps.filter((s) => s.kind === 'tool-call' && s.scope);
  const topScope = calls.reduce<ToolScope | null>(
    (top, s) => (!top || SCOPE_WEIGHT[s.scope as ToolScope] > SCOPE_WEIGHT[top] ? (s.scope as ToolScope) : top),
    null,
  );
  const privilegeTerm = topScope ? SCOPE_WEIGHT[topScope] : 0;

  const privilegedCalls = calls.filter((s) => PRIVILEGED_SCOPES.includes(s.scope as ToolScope)).length;
  const perMinute = privilegedCalls / spanMinutes(steps);
  const burstTerm = privilegedCalls > 0 ? clamp01(perMinute / BURST_CEILING) : 0;

  const priorTerm = clamp01(identityRiskScore / 100);

  const factors: SessionRiskFactor[] = [
    {
      label: 'Anomalous steps',
      points: anomalyTerm * WEIGHTS.anomaly,
      detail:
        anomalies === 0
          ? 'No step deviated from the established behavior.'
          : `${anomalies} of ${steps.length} steps flagged (${Math.round(density * 100)}% of the session).`,
    },
    {
      label: 'Privilege used',
      points: privilegeTerm * WEIGHTS.privilege,
      detail: topScope
        ? `Highest tool-call scope was ${topScope}.`
        : 'No tool calls in this session.',
    },
    {
      label: 'Call burst',
      points: burstTerm * WEIGHTS.burst,
      detail:
        privilegedCalls === 0
          ? 'No state-changing calls.'
          : `${privilegedCalls} state-changing calls at ${perMinute.toFixed(1)}/min.`,
    },
    {
      label: 'Identity risk',
      points: priorTerm * WEIGHTS.prior,
      detail: `The agent itself scores ${Math.round(identityRiskScore)} — carried as a prior, capped at ${WEIGHTS.prior} points.`,
    },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.points, 0));
  return { score: Math.max(0, Math.min(100, score)), factors };
}
