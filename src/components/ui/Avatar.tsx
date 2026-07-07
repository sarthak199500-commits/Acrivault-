import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { StatusDot, type DotTone } from './StatusDot';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/** An identity/user avatar showing initials (or an icon), with an optional status dot. */
export function Avatar({
  name,
  icon,
  size = 'md',
  status,
  className,
}: {
  name?: string;
  icon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  status?: DotTone;
  className?: string;
}) {
  const dim = size === 'sm' ? 'h-7 w-7 text-[length:var(--fs-micro)]' : size === 'lg' ? 'h-12 w-12 text-[length:var(--fs-h2)]' : 'h-9 w-9 text-[length:var(--fs-small)]';
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full border border-border bg-surface-2 font-medium text-text-secondary',
          dim,
        )}
        aria-hidden={name ? undefined : true}
      >
        {icon ?? (name ? initials(name) : null)}
      </span>
      {status && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-surface p-0.5">
          <StatusDot tone={status} />
        </span>
      )}
    </span>
  );
}
