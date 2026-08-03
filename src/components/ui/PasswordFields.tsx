import { useEffect, useId, useState } from 'react';
import { Check, Eye, EyeOff, Info, X } from 'lucide-react';
import { Input } from './Input';
import { Tooltip } from './Tooltip';
import { cn } from '@/lib/cn';
import {
  PASSWORD_RULES,
  PASSWORD_STRENGTH_MAX,
  isPasswordValid,
  passwordChecks,
  passwordStrength,
} from '@/lib/password';

/** Meter copy per satisfied-rule count. Index 0 is the empty state. */
const STRENGTH_LABELS = ['', 'Very weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;

/**
 * Segment tint by strength. Below full policy the meter reads as a warning, not a
 * pass — a green bar next to an unmet checklist item would be a mixed signal.
 */
function segmentTone(index: number, strength: number): string {
  if (index >= strength) return 'bg-surface-2';
  return strength === PASSWORD_STRENGTH_MAX ? 'bg-[var(--success)]' : 'bg-[var(--warning)]';
}

/**
 * Live policy checklist. Each row pairs an icon with text, so state is never
 * carried by color alone.
 *
 * Rendered twice: visibly inside the requirements tooltip, and as an sr-only copy
 * wired to the password field via aria-describedby. Tooltip content is supplementary
 * by contract (see Tooltip), and hover is not an interaction a keyboard or
 * screen-reader user should need to discover why their password is rejected — the
 * sr-only copy is the one that carries the rules to assistive tech, so it owns the
 * polite live region and the tooltip copy stays silent.
 */
function PolicyChecklist({
  value,
  id,
  srOnly,
}: {
  value: string;
  id?: string;
  srOnly?: boolean;
}) {
  const checks = passwordChecks(value);
  return (
    <ul
      id={id}
      className={cn(srOnly ? 'sr-only' : 'grid gap-1')}
      aria-live={srOnly ? 'polite' : undefined}
    >
      {PASSWORD_RULES.map((rule) => {
        const met = checks[rule.id];
        return (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-1.5 text-[length:var(--fs-small)]',
              met ? 'text-ok-fg' : 'text-text-tertiary',
            )}
          >
            {met ? (
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{rule.label}</span>
            <span className="sr-only">{met ? '— met' : '— not met'}</span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The inline summary that replaces the always-on checklist: a count plus the
 * tooltip trigger holding the full list. Keeps a live signal of progress on the card
 * without spending five lines on it.
 */
function PolicySummary({ value }: { value: string }) {
  const met = passwordStrength(value);
  const all = met === PASSWORD_STRENGTH_MAX;
  return (
    <Tooltip content={<PolicyChecklist value={value} />}>
      <button
        type="button"
        // A real button so the list is reachable by keyboard and touch, not hover only.
        className="inline-flex items-center gap-1.5 rounded-[var(--r-xs)] text-[length:var(--fs-small)] text-text-tertiary outline-none hover:text-text-secondary focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
      >
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className={cn(all && 'text-ok-fg')}>
          {all ? 'All requirements met' : `${met} of ${PASSWORD_STRENGTH_MAX} requirements met`}
        </span>
      </button>
    </Tooltip>
  );
}

export interface PasswordFieldsProps {
  password: string;
  onPasswordChange: (value: string) => void;
  confirm: string;
  onConfirmChange: (value: string) => void;
  /** Label on the first field. "Create password" when registering, "New password" when resetting. */
  passwordLabel?: string;
  /** Server-side error for the password field (e.g. WEAK_PASSWORD from the API). */
  error?: string;
  disabled?: boolean;
  /**
   * Fires whenever validity changes: true only when the policy passes and the
   * confirmation matches. Callers use it to gate their submit button rather than
   * re-deriving the rules.
   */
  onValidityChange?: (valid: boolean) => void;
  /**
   * Focus the password field on mount. Named like CodeInput's `autoFocusFirst`
   * rather than `autoFocus` so the a11y lint rule stays meaningful at call sites —
   * the exemption belongs here, where the focus target is the sole purpose of the
   * screen, not wherever the component is used.
   */
  autoFocusFirst?: boolean;
}

/**
 * The paired create/confirm password control used everywhere a password is set —
 * registration, invitation acceptance, and reset. Owns the policy checklist,
 * strength meter, reveal toggle, and match state so all three screens enforce an
 * identical policy and read identically.
 */
export function PasswordFields({
  password,
  onPasswordChange,
  confirm,
  onConfirmChange,
  passwordLabel = 'Create password',
  error,
  disabled,
  onValidityChange,
  autoFocusFirst,
}: PasswordFieldsProps) {
  const baseId = useId();
  const checklistId = `${baseId}-policy`;
  const [revealed, setRevealed] = useState(false);

  const strength = passwordStrength(password);
  const policyMet = isPasswordValid(password);
  // Only complain about a mismatch once there is something to compare against —
  // flagging every keystroke of a half-typed confirmation is noise.
  const mismatch = confirm.length > 0 && confirm !== password;
  const valid = policyMet && confirm === password && confirm.length > 0;

  useEffect(() => {
    onValidityChange?.(valid);
  }, [valid, onValidityChange]);

  const revealToggle = (
    <button
      type="button"
      onClick={() => setRevealed((r) => !r)}
      // The fields' own labels carry the context, so this only needs the verb.
      aria-label={revealed ? 'Hide password' : 'Show password'}
      aria-pressed={revealed}
      className="rounded-[var(--r-xs)] text-text-tertiary outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
    >
      {revealed ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Input
          label={passwordLabel}
          type={revealed ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          error={error}
          disabled={disabled}
          suffix={revealToggle}
          aria-describedby={checklistId}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- first field of a single-purpose screen
          autoFocus={autoFocusFirst}
          required
        />

        {/* Meter is decorative; STRENGTH_LABELS carries the same reading as text. */}
        <div className="flex items-center gap-2">
          <ol className="flex flex-1 gap-1" aria-hidden="true">
            {Array.from({ length: PASSWORD_STRENGTH_MAX }, (_, i) => (
              <li
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full motion-safe:transition-colors',
                  segmentTone(i, strength),
                )}
              />
            ))}
          </ol>
          <span
            className={cn(
              'w-[6.5ch] shrink-0 text-right text-[length:var(--fs-micro)]',
              policyMet ? 'text-ok-fg' : 'text-text-tertiary',
            )}
          >
            {STRENGTH_LABELS[strength]}
          </span>
        </div>

        <PolicySummary value={password} />
        <PolicyChecklist value={password} id={checklistId} srOnly />
      </div>

      <Input
        label="Confirm password"
        type={revealed ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder="Re-enter your password"
        value={confirm}
        onChange={(e) => onConfirmChange(e.target.value)}
        error={mismatch ? 'Passwords do not match.' : undefined}
        hint={!mismatch && valid ? 'Passwords match.' : undefined}
        disabled={disabled}
        required
      />
    </div>
  );
}
