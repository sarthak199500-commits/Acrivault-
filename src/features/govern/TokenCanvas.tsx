import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { PolicyToken } from '@/mocks/types';
import { ACTIONS, SUBJECTS, actionDef, subjectDef } from '@/mocks/policy';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const SUBJECT_OPTIONS = SUBJECTS.map((s) => ({ value: s.id, label: s.label }));
const ACTION_OPTIONS = ACTIONS.map((a) => ({ value: a.id, label: a.label }));

function KindChip({ kind }: { kind: PolicyToken['kind'] }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-12 shrink-0 items-center justify-center rounded-[var(--r-sm)] text-[length:var(--fs-micro)] font-semibold uppercase tracking-wide',
        kind === 'when' && 'bg-accent-tint text-accent-text',
        kind === 'and' && 'bg-surface-2 text-text-tertiary',
        kind === 'then' && 'bg-info-bg text-info-fg',
      )}
    >
      {kind}
    </span>
  );
}

function ValueControl({
  token,
  onChange,
}: {
  token: PolicyToken;
  onChange: (value: string) => void;
}) {
  const def = subjectDef(token.subject);
  if (token.subject === 'owner' && token.operator === 'empty') {
    return null;
  }
  if (def?.valueType === 'enum' && def.options) {
    return (
      <Select
        value={token.value}
        onValueChange={onChange}
        options={def.options}
        ariaLabel="Value"
        size="sm"
        className="min-w-32"
      />
    );
  }
  return (
    <Input
      hideLabel
      label="Value"
      type={def?.valueType === 'number' ? 'number' : 'text'}
      value={token.value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8"
      placeholder={def?.valueType === 'number' ? '0' : 'value'}
    />
  );
}

function ConditionRow({
  token,
  isFirst,
  isLast,
  onChange,
  onRemove,
  onMove,
  canRemove,
}: {
  token: PolicyToken;
  isFirst: boolean;
  isLast: boolean;
  onChange: (partial: Partial<PolicyToken>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  canRemove: boolean;
}) {
  const def = subjectDef(token.subject);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[var(--r-md)] border border-border bg-surface p-2">
      <KindChip kind={token.kind} />
      <Select
        value={token.subject}
        onValueChange={(subject) => {
          const next = subjectDef(subject);
          if (next) onChange({ subject, operator: next.defaultOperator, value: next.defaultValue });
        }}
        options={SUBJECT_OPTIONS}
        ariaLabel="Condition subject"
        size="sm"
        className="min-w-36"
      />
      <Select
        value={token.operator}
        onValueChange={(operator) => onChange({ operator })}
        options={(def?.operators ?? []).map((o) => ({ value: o.value, label: o.label || '—' }))}
        ariaLabel="Operator"
        size="sm"
        className="min-w-28"
      />
      <ValueControl token={token} onChange={(value) => onChange({ value })} />
      <div className="ml-auto flex items-center gap-0.5">
        <IconButton label="Move up" size="sm" onClick={() => onMove(-1)} disabled={isFirst}>
          <ArrowUp className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="Move down" size="sm" onClick={() => onMove(1)} disabled={isLast}>
          <ArrowDown className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="Remove condition" size="sm" onClick={onRemove} disabled={!canRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

export function TokenCanvas({
  tokens,
  onChange,
  disabled = false,
}: {
  tokens: PolicyToken[];
  onChange: (tokens: PolicyToken[]) => void;
  disabled?: boolean;
}) {
  const conditions = tokens.filter((t) => t.kind === 'when' || t.kind === 'and');
  const action = tokens.find((t) => t.kind === 'then');

  const rebuild = (nextConditions: PolicyToken[], nextAction: PolicyToken | undefined) => {
    const normalized = nextConditions.map((c, i) => ({ ...c, kind: i === 0 ? ('when' as const) : ('and' as const) }));
    onChange(nextAction ? [...normalized, nextAction] : normalized);
  };

  const updateCondition = (index: number, partial: Partial<PolicyToken>) => {
    rebuild(conditions.map((c, i) => (i === index ? { ...c, ...partial } : c)), action);
  };
  const removeCondition = (index: number) => rebuild(conditions.filter((_, i) => i !== index), action);
  const addCondition = () => {
    const subj = SUBJECTS[1];
    rebuild(
      [...conditions, { kind: 'and', subject: subj.id, operator: subj.defaultOperator, value: subj.defaultValue }],
      action,
    );
  };
  const moveCondition = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= conditions.length) return;
    const next = [...conditions];
    [next[index], next[target]] = [next[target], next[index]];
    rebuild(next, action);
  };

  const updateAction = (partial: Partial<PolicyToken>) => {
    if (!action) return;
    rebuild(conditions, { ...action, ...partial });
  };

  return (
    <div className={cn('space-y-3', disabled && 'pointer-events-none opacity-60')}>
      <div className="space-y-2">
        {conditions.map((token, index) => (
          <ConditionRow
            key={index}
            token={token}
            isFirst={index === 0}
            isLast={index === conditions.length - 1}
            canRemove={conditions.length > 1}
            onChange={(partial) => updateCondition(index, partial)}
            onRemove={() => removeCondition(index)}
            onMove={(dir) => moveCondition(index, dir)}
          />
        ))}
        <Button variant="ghost" size="sm" leadingIcon={<Plus className="h-3.5 w-3.5" />} onClick={addCondition}>
          Add condition
        </Button>
      </div>

      {action && (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--r-md)] border border-border bg-surface p-2">
          <KindChip kind="then" />
          <Select
            value={action.subject}
            onValueChange={(subject) => {
              const next = actionDef(subject);
              if (next) updateAction({ subject, operator: next.defaultOperator, value: next.defaultValue });
            }}
            options={ACTION_OPTIONS}
            ariaLabel="Action"
            size="sm"
            className="min-w-32"
          />
          {actionDef(action.subject)?.operators.some((o) => o.label) && (
            <span className="text-[length:var(--fs-small)] text-text-tertiary">
              {actionDef(action.subject)?.operators.find((o) => o.value === action.operator)?.label}
            </span>
          )}
          <Select
            value={action.value}
            onValueChange={(value) => updateAction({ value })}
            options={actionDef(action.subject)?.options ?? []}
            ariaLabel="Action value"
            size="sm"
            className="min-w-36"
          />
        </div>
      )}
    </div>
  );
}
