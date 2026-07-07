import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an accessible label, since the button shows only an icon. */
  label: string;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'secondary';
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', variant = 'ghost', className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-[var(--r-sm)] text-text-secondary',
        'transition-colors duration-[var(--dur-1)] ease-[var(--ease-standard)]',
        'hover:bg-surface-hover hover:text-text disabled:opacity-50 disabled:cursor-not-allowed',
        variant === 'secondary' && 'bg-surface-2 border border-border-strong',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
