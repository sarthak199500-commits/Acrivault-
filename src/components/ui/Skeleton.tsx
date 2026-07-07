import { cn } from '@/lib/cn';

/** A single shimmering block. Compose these into content-shaped skeletons. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-[var(--r-sm)] bg-surface-2',
        'motion-safe:animate-[acv-skeleton_1.4s_ease-in-out_infinite]',
        className,
      )}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonTableRows({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border" aria-hidden="true">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn('h-3.5', c === 0 ? 'w-1/4' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}
