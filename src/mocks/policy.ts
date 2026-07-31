// Policy grammar, plain-English generation, generated code, and evaluation.
// ASSUMPTION: the policy grammar, the plain-English generation, the generated code,
// and enforcement are Architect-owned. Everything here is illustrative and the UI
// only displays its outputs — it does not enforce policy.

import {
  CLOUD_LABELS,
  NHI_TYPE_LABELS,
  type Cloud,
  type GovernanceStatus,
  type Identity,
  type NhiType,
  type PolicyToken,
} from './types';

export type ValueType = 'enum' | 'number' | 'text';

/**
 * How many values the subject can hold on ONE identity. This is the fact the
 * grammar was missing, and without it a rule builder cannot tell a contradiction
 * from a query that simply matches nothing today.
 *
 * - `single` — exactly one value (an identity has one type, one risk score, one
 *   governance status, one owner). Two conditions on the same single-valued
 *   subject must be jointly satisfiable or the rule can NEVER match.
 * - `multi` — a set. Only `cloud`: `identity.sources` is an array, so
 *   "exists in AWS AND exists in GCP" is the cross-cloud correlation query the
 *   product exists for, never a conflict. Contradiction checks must skip these.
 */
export type Cardinality = 'single' | 'multi';

export interface SubjectDef {
  id: string;
  label: string;
  valueType: ValueType;
  cardinality: Cardinality;
  /**
   * Inclusive integer bounds for numeric subjects, so a condition asking outside
   * the possible range ("risk score at least 101") is reported rather than
   * silently matching nothing. Omit `max` where there is no natural ceiling.
   */
  domain?: { min: number; max?: number };
  operators: { value: string; label: string }[];
  options?: { value: string; label: string }[];
  defaultOperator: string;
  defaultValue: string;
}

const typeOptions = (Object.keys(NHI_TYPE_LABELS) as NhiType[]).map((t) => ({
  value: t,
  label: NHI_TYPE_LABELS[t],
}));
const cloudOptions = (Object.keys(CLOUD_LABELS) as Cloud[]).map((c) => ({
  value: c,
  label: CLOUD_LABELS[c],
}));
const govOptions: { value: GovernanceStatus; label: string }[] = [
  { value: 'governed', label: 'governed' },
  { value: 'ungoverned', label: 'ungoverned' },
  { value: 'drift', label: 'in drift' },
];

/** Condition subjects (the WHEN / AND left-hand side). */
export const SUBJECTS: SubjectDef[] = [
  {
    id: 'type',
    label: 'Type',
    valueType: 'enum',
    cardinality: 'single',
    operators: [
      { value: 'is', label: 'is' },
      { value: 'is-not', label: 'is not' },
    ],
    options: typeOptions,
    defaultOperator: 'is',
    defaultValue: 'ai-agent',
  },
  {
    id: 'riskScore',
    label: 'Risk score',
    valueType: 'number',
    cardinality: 'single',
    // Scores are precomputed upstream on a 0..100 scale and clamped there.
    domain: { min: 0, max: 100 },
    operators: [
      { value: 'gte', label: 'is at least' },
      { value: 'lte', label: 'is at most' },
      { value: 'gt', label: 'is above' },
      { value: 'lt', label: 'is below' },
    ],
    defaultOperator: 'gte',
    defaultValue: '60',
  },
  {
    id: 'orphaned',
    label: 'Orphaned',
    valueType: 'enum',
    cardinality: 'single',
    operators: [{ value: 'is', label: 'is' }],
    options: [
      { value: 'true', label: 'true' },
      { value: 'false', label: 'false' },
    ],
    defaultOperator: 'is',
    defaultValue: 'true',
  },
  {
    id: 'conflicts',
    label: 'Attribute conflicts',
    valueType: 'number',
    cardinality: 'single',
    // A count, so never negative. No ceiling asserted: how many attributes can
    // disagree is an upstream property, not something this grammar should cap.
    domain: { min: 0 },
    operators: [
      { value: 'gt', label: 'more than' },
      { value: 'eq', label: 'exactly' },
    ],
    defaultOperator: 'gt',
    defaultValue: '0',
  },
  {
    id: 'governanceStatus',
    label: 'Governance',
    valueType: 'enum',
    cardinality: 'single',
    operators: [
      { value: 'is', label: 'is' },
      { value: 'is-not', label: 'is not' },
    ],
    options: govOptions,
    defaultOperator: 'is',
    defaultValue: 'ungoverned',
  },
  {
    id: 'cloud',
    label: 'Source',
    valueType: 'enum',
    // The one multi-valued subject: an identity is correlated across several
    // sources, so repeating this condition intersects them ("in AWS *and* GCP").
    cardinality: 'multi',
    operators: [{ value: 'includes', label: 'exists in' }],
    options: cloudOptions,
    defaultOperator: 'includes',
    defaultValue: 'aws',
  },
  {
    id: 'owner',
    label: 'Owner',
    valueType: 'text',
    cardinality: 'single',
    operators: [
      { value: 'is', label: 'is' },
      { value: 'is-not', label: 'is not' },
      { value: 'empty', label: 'is unassigned' },
    ],
    defaultOperator: 'empty',
    defaultValue: '',
  },
];

export interface ActionDef {
  id: string;
  label: string;
  operators: { value: string; label: string }[];
  options: { value: string; label: string }[];
  defaultOperator: string;
  defaultValue: string;
}

/** THEN actions. */
export const ACTIONS: ActionDef[] = [
  {
    id: 'action',
    label: 'Action',
    operators: [{ value: 'set', label: '' }],
    options: [
      { value: 'quarantine', label: 'quarantine' },
      { value: 'review', label: 'flag for review' },
      { value: 'alert', label: 'raise an alert' },
      { value: 'block', label: 'block' },
    ],
    defaultOperator: 'set',
    defaultValue: 'quarantine',
  },
  {
    id: 'rotate',
    label: 'Rotate',
    operators: [{ value: 'every', label: 'every' }],
    options: [
      { value: '24h', label: '24 hours' },
      { value: '7d', label: '7 days' },
      { value: '30d', label: '30 days' },
    ],
    defaultOperator: 'every',
    defaultValue: '7d',
  },
];

export function subjectDef(id: string): SubjectDef | undefined {
  return SUBJECTS.find((s) => s.id === id);
}
export function actionDef(id: string): ActionDef | undefined {
  return ACTIONS.find((a) => a.id === id);
}

function optionLabel(options: { value: string; label: string }[] | undefined, value: string): string {
  return options?.find((o) => o.value === value)?.label ?? value;
}

/* --------------------------------------------------------- plain English */

function conditionPhrase(token: PolicyToken): string {
  const def = subjectDef(token.subject);
  const v = token.value;
  switch (token.subject) {
    case 'type':
      return `${token.operator === 'is-not' ? 'is not' : 'is'} ${article(optionLabel(def?.options, v))}`;
    case 'riskScore': {
      const op = { gte: 'is at least', lte: 'is at most', gt: 'is above', lt: 'is below' }[token.operator] ?? token.operator;
      return `risk score ${op} ${v}`;
    }
    case 'orphaned':
      return v === 'true' ? 'is orphaned' : 'is not orphaned';
    case 'conflicts':
      if (token.operator === 'eq' && v === '0') return 'has no attribute conflicts';
      return `has ${token.operator === 'gt' ? 'more than' : 'exactly'} ${v} attribute conflict${v === '1' ? '' : 's'}`;
    case 'governanceStatus':
      return `${token.operator === 'is-not' ? 'is not' : 'is'} ${optionLabel(def?.options, v)}`;
    case 'cloud':
      return `exists in ${optionLabel(def?.options, v)}`;
    case 'owner':
      if (token.operator === 'empty') return 'has no owner';
      return `${token.operator === 'is-not' ? 'is not' : 'is'} owned by ${v || '—'}`;
    default:
      return `${token.subject} ${token.operator} ${v}`;
  }
}

function actionPhrase(token: PolicyToken): string {
  if (token.subject === 'rotate') {
    return `rotate it every ${optionLabel(actionDef('rotate')?.options, token.value)}`;
  }
  switch (token.value) {
    case 'quarantine':
      return 'quarantine it';
    case 'review':
      return 'flag it for review';
    case 'alert':
      return 'raise an alert';
    case 'block':
      return 'block it';
    default:
      return token.value;
  }
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`;
}

/** Restate a rule as a sentence. */
export function plainEnglish(tokens: PolicyToken[]): string {
  const conditions = tokens.filter((t) => t.kind === 'when' || t.kind === 'and');
  const action = tokens.find((t) => t.kind === 'then');
  if (conditions.length === 0) return 'This rule has no conditions yet.';
  const condText = conditions.map(conditionPhrase).join(', and ');
  const actText = action ? actionPhrase(action) : 'take no action';
  return `When an identity ${condText}, then ${actText}.`;
}

/* ----------------------------------------------------------- generated code */

export function generatedCode(name: string, tokens: PolicyToken[]): string {
  const lines = [`policy ${JSON.stringify(name || 'untitled')} {`];
  for (const t of tokens) {
    lines.push(`  ${t.kind.toUpperCase().padEnd(4)} ${t.subject} ${t.operator} ${JSON.stringify(t.value)}`);
  }
  lines.push('}');
  return lines.join('\n');
}

/* --------------------------------------------------------------- evaluation */

function matchesCondition(identity: Identity, token: PolicyToken): boolean {
  const v = token.value;
  switch (token.subject) {
    case 'type':
      return token.operator === 'is-not' ? identity.type !== v : identity.type === v;
    case 'riskScore': {
      const n = Number(v);
      // Fail CLOSED on a malformed or empty value. This used to `return true`,
      // which made a half-typed condition match the entire population — so an
      // unfinished rule reported every identity as affected, a number plausible
      // enough to be believed. On a policy that can quarantine or block, an
      // incomplete condition must never widen the match set. `lintRule` reports
      // the empty value separately so the reason is visible, not just the zero.
      if (!v.trim() || Number.isNaN(n)) return false;
      const s = identity.riskScore;
      return { gte: s >= n, lte: s <= n, gt: s > n, lt: s < n }[token.operator] ?? false;
    }
    case 'orphaned':
      return identity.orphaned === (v === 'true');
    case 'conflicts': {
      const n = Number(v);
      // Fail closed on an empty/malformed count, as for riskScore above.
      if (!v.trim() || Number.isNaN(n)) return false;
      const c = identity.conflicts.length;
      return token.operator === 'eq' ? c === n : c > n;
    }
    case 'governanceStatus':
      return token.operator === 'is-not'
        ? identity.governanceStatus !== v
        : identity.governanceStatus === v;
    case 'cloud':
      return identity.sources.some((s) => s.cloud === v);
    case 'owner':
      if (token.operator === 'empty') return !identity.owner;
      // Fail closed on a blank name, as for the numeric subjects above. Without
      // this, `is not ""` held for every identity, so an unfinished condition
      // widened the rule to the entire population instead of narrowing it.
      if (!v.trim()) return false;
      return token.operator === 'is-not' ? identity.owner !== v : identity.owner === v;
    default:
      return false;
  }
}

/** Does an identity satisfy all WHEN/AND conditions of a rule? */
export function matchesPolicy(identity: Identity, tokens: PolicyToken[]): boolean {
  const conditions = tokens.filter((t) => t.kind === 'when' || t.kind === 'and');
  if (conditions.length === 0) return false;
  return conditions.every((c) => matchesCondition(identity, c));
}

/* ------------------------------------------------------------------ linting */

/**
 * Why a rule is wrong, as opposed to merely unpopular.
 *
 * - `unsatisfiable` — no identity can EVER satisfy it, on any dataset. A bare
 *   "0 affected" cannot express this: it looks identical to a sound rule that
 *   happens to match nobody today.
 * - `redundant` — the condition does not change what the rule matches. Removing
 *   it leaves an equivalent rule.
 * - `incomplete` — the condition has no usable value yet, so it matches nothing
 *   until one is supplied.
 */
export type DiagnosticSeverity = 'unsatisfiable' | 'redundant' | 'incomplete';

export interface Diagnostic {
  severity: DiagnosticSeverity;
  /** Index into the rule's CONDITION list (WHEN/AND only), as the builder renders it. */
  index: number;
  /**
   * Other conditions implicated in the same problem. A contradiction is ONE finding
   * about a set of conditions, not one per condition — emitting it per row repeated
   * the same sentence and offered two identical "remove" links with no way to tell
   * which to click. Those rows still render as broken; only `index` carries the text.
   */
  relatedIndices?: number[];
  message: string;
  /** A mechanical repair — the full token list with this condition removed. */
  fix?: { label: string; tokens: PolicyToken[] };
}

/** Every condition a diagnostic implicates — the one it is attached to, plus its related rows. */
export function diagnosticCovers(diagnostic: Diagnostic, conditionIndex: number): boolean {
  return diagnostic.index === conditionIndex || (diagnostic.relatedIndices?.includes(conditionIndex) ?? false);
}

/** Human-readable reference to other conditions, 1-based as the builder numbers them. */
function conditionList(indices: number[]): string {
  const nums = indices.map((i) => i + 1);
  if (nums.length === 1) return `condition ${nums[0]}`;
  if (nums.length === 2) return `conditions ${nums[0]} and ${nums[1]}`;
  return `conditions ${nums.slice(0, -1).join(', ')} and ${nums[nums.length - 1]}`;
}

/** Positions of the WHEN/AND tokens within the full token list. */
function conditionPositions(tokens: PolicyToken[]): number[] {
  const out: number[] = [];
  tokens.forEach((t, i) => {
    if (t.kind === 'when' || t.kind === 'and') out.push(i);
  });
  return out;
}

/** Drop one condition and re-normalize kinds so the first is always WHEN. */
export function withoutCondition(tokens: PolicyToken[], conditionIndex: number): PolicyToken[] {
  const target = conditionPositions(tokens)[conditionIndex];
  if (target === undefined) return tokens;
  let first = true;
  return tokens
    .filter((_, i) => i !== target)
    .map((t) => {
      if (t.kind === 'then') return t;
      const kind = first ? ('when' as const) : ('and' as const);
      first = false;
      return { ...t, kind };
    });
}

/* Numeric conditions become inclusive integer intervals, so contradiction and
 * redundancy are one calculation rather than a pile of operator special cases.
 * Both numeric subjects (risk score, conflict count) are integers, which makes
 * `gt n` exactly `>= n+1`. */
interface Interval {
  lo: number;
  hi: number;
}
const OPEN: Interval = { lo: Number.NEGATIVE_INFINITY, hi: Number.POSITIVE_INFINITY };

function intervalOf(token: PolicyToken): Interval | null {
  const raw = token.value.trim();
  const n = Number(raw);
  if (!raw || Number.isNaN(n)) return null;
  switch (token.operator) {
    case 'gte': return { lo: n, hi: OPEN.hi };
    case 'gt': return { lo: n + 1, hi: OPEN.hi };
    case 'lte': return { lo: OPEN.lo, hi: n };
    case 'lt': return { lo: OPEN.lo, hi: n - 1 };
    case 'eq': return { lo: n, hi: n };
    default: return OPEN;
  }
}

function meet(a: Interval, b: Interval): Interval {
  return { lo: Math.max(a.lo, b.lo), hi: Math.min(a.hi, b.hi) };
}
const empty = (i: Interval): boolean => i.lo > i.hi;
const sameInterval = (a: Interval, b: Interval): boolean => a.lo === b.lo && a.hi === b.hi;

function domainInterval(def: SubjectDef): Interval {
  return {
    lo: def.domain?.min ?? OPEN.lo,
    hi: def.domain?.max ?? OPEN.hi,
  };
}

/** Values an enum subject may still take, given every condition on it. */
function allowedEnumValues(conditions: PolicyToken[], def: SubjectDef): Set<string> {
  let allowed = new Set((def.options ?? []).map((o) => o.value));
  for (const t of conditions) {
    if (t.operator === 'is-not') allowed.delete(t.value);
    else allowed = new Set([...allowed].filter((v) => v === t.value));
  }
  return allowed;
}

const sameSet = (a: Set<string>, b: Set<string>): boolean =>
  a.size === b.size && [...a].every((v) => b.has(v));

/**
 * Report contradictions, redundancies, and incomplete conditions in a rule.
 *
 * Conditions are ANDed (see `matchesPolicy`), so any two that cannot hold at once
 * make the whole rule dead. Pure and dataset-independent by design: `unsatisfiable`
 * means impossible in principle, which is exactly the claim an affected-count of
 * zero cannot make.
 *
 * Redundancy is decided structurally rather than by enumerating operator pairs: a
 * condition is redundant precisely when removing it leaves the satisfying set
 * unchanged. That catches "at least 60 AND at least 50" without a rule for it.
 */
export function lintRule(tokens: PolicyToken[]): Diagnostic[] {
  const positions = conditionPositions(tokens);
  const conditions = positions.map((p) => tokens[p]);
  const out: Diagnostic[] = [];

  const removeFix = (index: number) => ({
    label: 'Remove this condition',
    tokens: withoutCondition(tokens, index),
  });

  // Group condition indices by subject.
  const groups = new Map<string, number[]>();
  conditions.forEach((t, i) => {
    const list = groups.get(t.subject) ?? [];
    list.push(i);
    groups.set(t.subject, list);
  });

  for (const [subjectId, indices] of groups) {
    const def = subjectDef(subjectId);
    if (!def) continue;
    const at = (i: number) => conditions[i];

    // Exact duplicates are pointless whatever the cardinality.
    const seen = new Map<string, number>();
    const dupes = new Set<number>();
    for (const i of indices) {
      const key = `${at(i).operator}|${at(i).value}`;
      const prior = seen.get(key);
      if (prior !== undefined) {
        dupes.add(i);
        out.push({
          severity: 'redundant',
          index: i,
          message: `Identical to condition ${prior + 1}.`,
          fix: removeFix(i),
        });
      } else {
        seen.set(key, i);
      }
    }

    // Values that are missing entirely — flag and exclude from the logic below,
    // since an absent value implies nothing about satisfiability.
    const blanks = new Set<number>();
    for (const i of indices) {
      const t = at(i);
      if (t.operator === 'empty') continue;
      const needsValue = def.valueType === 'number' || def.valueType === 'text';
      if (needsValue && !t.value.trim()) {
        blanks.add(i);
        out.push({
          severity: 'incomplete',
          index: i,
          message: `${def.label} has no value yet, so this condition matches nothing.`,
        });
      }
    }

    const live = indices.filter((i) => !dupes.has(i) && !blanks.has(i));

    // A multi-valued subject intersects rather than conflicts: "exists in AWS AND
    // exists in GCP" is the correlation query, so no contradiction check applies.
    if (def.cardinality === 'multi' || live.length === 0) continue;

    if (def.valueType === 'number') {
      const domain = domainInterval(def);
      const intervals = new Map(live.map((i) => [i, intervalOf(at(i)) ?? OPEN]));
      // An absent entry would mean `live` and `intervals` disagree; OPEN is the
      // identity for `meet`, so falling back to it cannot change a verdict.
      const iv = (i: number): Interval => intervals.get(i) ?? OPEN;
      const combined = live.reduce((acc, i) => meet(acc, iv(i)), OPEN);

      if (empty(combined)) {
        // One finding for the whole group, attached to the condition that closed the
        // interval. The rows themselves already show the values, so restating them
        // here would only repeat what is on screen.
        const last = live[live.length - 1];
        const others = live.filter((i) => i !== last);
        out.push({
          severity: 'unsatisfiable',
          index: last,
          relatedIndices: others,
          message: `No ${def.label.toLowerCase()} can satisfy this and ${conditionList(others)} at once.`,
          fix: removeFix(last),
        });
        continue;
      }

      // Individually satisfiable, but outside the values the field can hold.
      const withDomain = meet(combined, domain);
      if (empty(withDomain)) {
        const range = def.domain?.max === undefined
          ? `${def.domain?.min ?? 0} or more`
          : `${def.domain?.min}–${def.domain?.max}`;
        for (const i of live) {
          if (empty(meet(iv(i), domain))) {
            out.push({
              severity: 'unsatisfiable',
              index: i,
              message: `${def.label} is only ever ${range}, so this can never match.`,
            });
          }
        }
        continue;
      }

      // Redundant iff dropping it does not change the satisfying interval.
      if (live.length > 1) {
        for (const i of live) {
          const others = live.filter((j) => j !== i).reduce((acc, j) => meet(acc, iv(j)), OPEN);
          if (sameInterval(meet(others, domain), withDomain)) {
            out.push({
              severity: 'redundant',
              index: i,
              message: `Already implied by the other ${def.label.toLowerCase()} conditions — this narrows nothing.`,
              fix: removeFix(i),
            });
          }
        }
      }
      continue;
    }

    if (def.valueType === 'enum') {
      const allowed = allowedEnumValues(live.map(at), def);
      if (allowed.size === 0) {
        const last = live[live.length - 1];
        const others = live.filter((i) => i !== last);
        // Excluding every possible value is a different mistake from asserting two
        // of them, and deserves its own sentence rather than a generic one.
        const allNegated = live.every((i) => at(i).operator === 'is-not');
        out.push({
          severity: 'unsatisfiable',
          index: last,
          relatedIndices: others,
          // The plain-language reason, not just the fact — an identity holding
          // exactly one value is why these cannot co-exist.
          message: allNegated
            ? `Together these rule out every ${def.label.toLowerCase()}, so nothing can match.`
            : `An identity has exactly one ${def.label.toLowerCase()} — this contradicts ${conditionList(others)}.`,
          fix: removeFix(last),
        });
        continue;
      }
      if (live.length > 1) {
        for (const i of live) {
          const others = allowedEnumValues(live.filter((j) => j !== i).map(at), def);
          if (sameSet(others, allowed)) {
            out.push({
              severity: 'redundant',
              index: i,
              message: `Already implied by the other ${def.label.toLowerCase()} conditions — this excludes nothing.`,
              fix: removeFix(i),
            });
          }
        }
      }
      continue;
    }

    // Text (owner): `empty` means no owner at all, so it cannot coexist with a
    // named one; two different names cannot both hold either.
    const emptyIdx = live.filter((i) => at(i).operator === 'empty');
    const isIdx = live.filter((i) => at(i).operator === 'is');
    const isNotIdx = live.filter((i) => at(i).operator === 'is-not');

    if (emptyIdx.length > 0 && isIdx.length > 0) {
      const group = [...emptyIdx, ...isIdx].sort((a, b) => a - b);
      const last = group[group.length - 1];
      const others = group.filter((i) => i !== last);
      out.push({
        severity: 'unsatisfiable',
        index: last,
        relatedIndices: others,
        message: `An identity cannot be unassigned and owned at once — this contradicts ${conditionList(others)}.`,
        fix: removeFix(last),
      });
      continue;
    }
    const distinct = new Set(isIdx.map((i) => at(i).value));
    if (distinct.size > 1) {
      const last = isIdx[isIdx.length - 1];
      const others = isIdx.filter((i) => i !== last);
      out.push({
        severity: 'unsatisfiable',
        index: last,
        relatedIndices: others,
        message: `An identity has one owner — this contradicts ${conditionList(others)}.`,
        fix: removeFix(last),
      });
      continue;
    }
    for (const i of isIdx) {
      const excluded = isNotIdx.filter((j) => at(j).value === at(i).value);
      if (excluded.length > 0) {
        const last = Math.max(i, ...excluded);
        const others = [i, ...excluded].filter((j) => j !== last);
        out.push({
          severity: 'unsatisfiable',
          index: last,
          relatedIndices: others,
          message: `This owner is both required and excluded — this contradicts ${conditionList(others)}.`,
          fix: removeFix(last),
        });
      }
    }
  }

  return out.sort((a, b) => a.index - b.index);
}

/** True when the rule cannot match any identity, on any dataset. */
export function isUnsatisfiable(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some((d) => d.severity === 'unsatisfiable');
}

/** True when a condition is missing a value the operator needs. */
export function isIncomplete(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some((d) => d.severity === 'incomplete');
}

/**
 * Why the affected count is zero — so the tile can distinguish "impossible" from
 * "nothing matches today", which a bare `0` cannot. Returns null when the count
 * is non-zero or the rule is sound and simply matches nobody.
 */
export function zeroReason(tokens: PolicyToken[], diagnostics: Diagnostic[]): string | null {
  if (isUnsatisfiable(diagnostics)) return 'This rule can never match — see the conditions above.';
  if (isIncomplete(diagnostics)) return 'A condition is missing its value.';
  if (tokens.filter((t) => t.kind === 'when' || t.kind === 'and').length === 0) {
    return 'This rule has no conditions.';
  }
  return null;
}

/** A fresh starter rule for the builder. */
export function defaultTokens(): PolicyToken[] {
  return [
    { kind: 'when', subject: 'type', operator: 'is', value: 'ai-agent' },
    { kind: 'then', subject: 'action', operator: 'set', value: 'review' },
  ];
}
