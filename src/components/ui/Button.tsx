import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const VARIANTS: Record<ButtonVariant, string> = {
  // Default bg is darkened from the brand accent so white text clears AA (4.5:1);
  // hover brightens back to the brand green.
  primary:
    'bg-[color-mix(in_srgb,var(--accent)_86%,black)] text-white hover:bg-accent active:bg-accent-press border border-transparent',
  secondary:
    'bg-surface-2 text-text border border-border-strong hover:bg-surface-hover active:bg-surface',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text border border-transparent',
  danger:
    'bg-[color-mix(in_srgb,var(--critical)_82%,black)] text-white hover:brightness-110 active:brightness-95 border border-transparent',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[length:var(--fs-small)] gap-1.5 rounded-[var(--r-sm)]',
  md: 'h-9 px-4 text-[length:var(--fs-body)] gap-2 rounded-[var(--r-sm)]',
};

/** Shared class string so a Link can be styled identically to a Button. */
// Disabled: a legible muted treatment (readable label on a neutral surface) instead
// of a dimmed variant colour. Placed after the variants so it wins the :disabled vs
// :hover specificity tie; the disabled:hover overrides keep it stable on hover.
const DISABLED =
  'disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-2 disabled:text-text-tertiary disabled:shadow-none disabled:hover:bg-surface-2 disabled:hover:text-text-tertiary';

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string): string {
  return cn(
    'relative inline-flex items-center justify-center font-medium select-none',
    'transition-colors duration-[var(--dur-1)] ease-[var(--ease-standard)]',
    VARIANTS[variant],
    SIZES[size],
    DISABLED,
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, leadingIcon, trailingIcon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      // Keep width stable while loading by overlaying the spinner.
      className={cn(
        'relative inline-flex items-center justify-center font-medium select-none',
        'transition-colors duration-[var(--dur-1)] ease-[var(--ease-standard)]',
        VARIANTS[variant],
        SIZES[size],
        DISABLED,
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <Loader2
          className="absolute h-4 w-4 animate-spin"
          aria-hidden="true"
        />
      )}
      <span className={cn('inline-flex items-center', SIZES[size].includes('gap-2') ? 'gap-2' : 'gap-1.5', loading && 'opacity-0')}>
        {leadingIcon && <span className="inline-flex shrink-0" aria-hidden="true">{leadingIcon}</span>}
        {children}
        {trailingIcon && <span className="inline-flex shrink-0" aria-hidden="true">{trailingIcon}</span>}
      </span>
    </button>
  );
});
