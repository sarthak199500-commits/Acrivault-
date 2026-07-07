import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  /** Hide the label visually but keep it for assistive tech. */
  hideLabel?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, prefix, suffix, hideLabel, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className={cn('mb-1 block text-[length:var(--fs-small)] font-medium text-text-secondary', hideLabel && 'sr-only')}
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex items-center gap-2 rounded-[var(--r-sm)] border bg-surface px-2.5',
          'focus-within:border-accent focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]',
          error ? 'border-[var(--critical)]' : 'border-border-strong',
        )}
      >
        {prefix && <span className="shrink-0 text-text-tertiary" aria-hidden="true">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-9 w-full bg-transparent text-[length:var(--fs-body)] text-text placeholder:text-text-tertiary',
            'outline-none',
            className,
          )}
          {...props}
        />
        {suffix && <span className="shrink-0 text-text-tertiary">{suffix}</span>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1 text-[length:var(--fs-small)] text-[var(--crit-fg)]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1 text-[length:var(--fs-small)] text-text-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
