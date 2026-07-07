import { useEffect, useId, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

export interface CodeInputProps {
  /** Number of digits. Default 6. */
  length?: number;
  value: string;
  onChange: (value: string) => void;
  /** Called when all digits are entered. */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  /** Accessible name for the whole group, e.g. "Verification code". */
  label: string;
  hideLabel?: boolean;
  /** Focus the first box on mount. */
  autoFocusFirst?: boolean;
  /** When this value changes, move focus back to the first box — e.g. after the
   *  caller clears the code on an invalid/expired submission so the user can retype. */
  refocusSignal?: number;
}

/**
 * A segmented one-time-code input for verification and MFA. Keyboard- and
 * paste-friendly: typing advances, Backspace retreats, arrows move, and pasting a
 * full code fills every box. Validity is announced politely; never color-only.
 */
export function CodeInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
  error,
  label,
  hideLabel,
  autoFocusFirst,
  refocusSignal,
}: CodeInputProps) {
  const groupId = useId();
  const errorId = `${groupId}-error`;
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const focusBox = (i: number) => {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))];
    el?.focus();
    el?.select();
  };

  // Move focus to the first box whenever the caller bumps `refocusSignal` (skip the
  // initial mount, where `autoFocusFirst` already governs focus).
  const mounted = useRef(false);
  useEffect(() => {
    if (refocusSignal === undefined) return;
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    refs.current[0]?.focus();
    refs.current[0]?.select();
  }, [refocusSignal]);

  const setAt = (i: number, char: string) => {
    const next = digits.slice();
    next[i] = char;
    const joined = next.join('').slice(0, length);
    onChange(joined);
    if (joined.length === length && !joined.includes('') && next.every((d) => d !== '')) {
      onComplete?.(joined);
    }
  };

  const handleInput = (i: number, raw: string) => {
    const char = raw.replace(/\D/g, '').slice(-1);
    if (!char) {
      setAt(i, '');
      return;
    }
    setAt(i, char);
    if (i < length - 1) focusBox(i + 1);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        setAt(i, '');
      } else if (i > 0) {
        focusBox(i - 1);
        setAt(i - 1, '');
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft') {
      focusBox(i - 1);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      focusBox(i + 1);
      e.preventDefault();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    if (pasted.length === length) onComplete?.(pasted);
    focusBox(Math.min(pasted.length, length - 1));
  };

  return (
    <div role="group" aria-labelledby={`${groupId}-label`} aria-describedby={error ? errorId : undefined}>
      <span id={`${groupId}-label`} className={cn('mb-1.5 block text-[length:var(--fs-small)] font-medium text-text-secondary', hideLabel && 'sr-only')}>
        {label}
      </span>
      <div className="flex gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus={autoFocusFirst && i === 0}
            aria-label={`${label}, digit ${i + 1} of ${length}`}
            aria-invalid={error ? true : undefined}
            maxLength={1}
            className={cn(
              'tnum h-12 w-10 rounded-[var(--r-sm)] border bg-surface text-center text-[length:var(--fs-h1)] font-semibold text-text',
              'outline-none transition-colors',
              'focus:border-accent focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-[var(--critical)]' : 'border-border-strong',
            )}
          />
        ))}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-2 text-[length:var(--fs-small)] text-[var(--crit-fg)]">
          {error}
        </p>
      )}
    </div>
  );
}
