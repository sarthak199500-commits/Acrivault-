import { forwardRef, useId, useState, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  /** Show a live character count against maxLength. */
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, hideLabel, showCount, className, id, maxLength, defaultValue, value, onChange, ...props },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const [count, setCount] = useState(String(value ?? defaultValue ?? '').length);
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={fieldId}
          className={cn('mb-1 block text-[length:var(--fs-small)] font-medium text-text-secondary', hideLabel && 'sr-only')}
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) => {
          setCount(e.target.value.length);
          onChange?.(e);
        }}
        className={cn(
          'min-h-20 w-full rounded-[var(--r-sm)] border bg-surface px-2.5 py-2 text-[length:var(--fs-body)] text-text',
          'placeholder:text-text-tertiary outline-none',
          'focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]',
          error ? 'border-[var(--critical)]' : 'border-border-strong',
          className,
        )}
        {...props}
      />
      <div className="mt-1 flex items-center justify-between gap-2">
        {error ? (
          <p id={`${fieldId}-error`} className="text-[length:var(--fs-small)] text-[var(--crit-fg)]">{error}</p>
        ) : hint ? (
          <p id={`${fieldId}-hint`} className="text-[length:var(--fs-small)] text-text-tertiary">{hint}</p>
        ) : (
          <span />
        )}
        {showCount && maxLength && (
          <span className="tnum text-[length:var(--fs-micro)] text-text-tertiary">{count}/{maxLength}</span>
        )}
      </div>
    </div>
  );
});
