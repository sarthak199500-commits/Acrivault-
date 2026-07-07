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

export interface SubjectDef {
  id: string;
  label: string;
  valueType: ValueType;
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
    label: 'Cloud',
    valueType: 'enum',
    operators: [{ value: 'includes', label: 'exists in' }],
    options: cloudOptions,
    defaultOperator: 'includes',
    defaultValue: 'aws',
  },
  {
    id: 'owner',
    label: 'Owner',
    valueType: 'text',
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
      if (Number.isNaN(n)) return true;
      const s = identity.riskScore;
      return { gte: s >= n, lte: s <= n, gt: s > n, lt: s < n }[token.operator] ?? false;
    }
    case 'orphaned':
      return identity.orphaned === (v === 'true');
    case 'conflicts': {
      const n = Number(v);
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

/** A fresh starter rule for the builder. */
export function defaultTokens(): PolicyToken[] {
  return [
    { kind: 'when', subject: 'type', operator: 'is', value: 'ai-agent' },
    { kind: 'then', subject: 'action', operator: 'set', value: 'review' },
  ];
}
