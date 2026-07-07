import { useId } from 'react';
import { cn } from '@/lib/cn';
import type { ValidityWindow } from '@/mocks/types';

/** Returns a validation message when the window is invalid, else null. */
export function validityWindowError(v: ValidityWindow | undefined): string | null {
  if (v?.start && v?.expiry && v.expiry < v.start) {
    return 'Expiry date must be after the start date.';
  }
  return null;
}

const dateField =
  'h-9 rounded-[var(--r-sm)] border border-border-strong bg-surface px-2.5 text-[length:var(--fs-body)] text-text outline-none ' +
  'focus:border-accent focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * An optional access window: a start and expiry date. Empty means no window.
 * Validates that expiry is after start. // ASSUMPTION: enforcement is upstream;
 * the UI displays and respects the window.
 */
export function ValidityWindowField({
  value,
  onChange,
  disabled,
}: {
  value: ValidityWindow | undefined;
  onChange: (next: ValidityWindow | undefined) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const start = value?.start ? value.start.slice(0, 10) : '';
  const expiry = value?.expiry ? value.expiry.slice(0, 10) : '';
  const error = validityWindowError(value);

  const update = (patch: Partial<ValidityWindow>) => {
    const next: ValidityWindow = {
      start: patch.start !== undefined ? patch.start || undefined : value?.start,
      expiry: patch.expiry !== undefined ? patch.expiry || undefined : value?.expiry,
    };
    onChange(next.start || next.expiry ? next : undefined);
  };

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-[length:var(--fs-small)] font-medium text-text-secondary">
        Access window <span className="font-normal text-text-tertiary">(optional)</span>
      </legend>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${id}-start`} className="text-[length:var(--fs-small)] text-text-tertiary">
          From
        </label>
        <input
          id={`${id}-start`}
          type="date"
          value={start}
          disabled={disabled}
          onChange={(e) => update({ start: e.target.value })}
          className={cn(dateField, 'tnum')}
        />
        <label htmlFor={`${id}-expiry`} className="text-[length:var(--fs-small)] text-text-tertiary">
          to
        </label>
        <input
          id={`${id}-expiry`}
          type="date"
          value={expiry}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => update({ expiry: e.target.value })}
          className={cn(dateField, 'tnum', error && '!border-[var(--critical)]')}
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[length:var(--fs-small)] text-[var(--crit-fg)]">
          {error}
        </p>
      )}
    </fieldset>
  );
}
