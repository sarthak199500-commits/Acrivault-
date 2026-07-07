import { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

/** A plain sentence, a retry, and an optional quiet technical detail toggle. */
export function ErrorState({
  message = 'Something went wrong while loading this view.',
  detail,
  onRetry,
  className,
}: {
  message?: string;
  detail?: string;
  onRetry?: () => void;
  className?: string;
}) {
  const [showDetail, setShowDetail] = useState(false);
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-12 text-center', className)}>
      <div className="flex h-11 w-11 items-center justify-center rounded-[var(--r-lg)] bg-crit-bg text-crit-fg">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="max-w-sm text-[length:var(--fs-body)] text-text">{message}</p>
      <div className="flex items-center gap-2">
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
        {detail && (
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            aria-expanded={showDetail}
            className="inline-flex items-center gap-1 text-[length:var(--fs-small)] text-text-tertiary hover:text-text-secondary"
          >
            Technical detail
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showDetail && 'rotate-180')} aria-hidden="true" />
          </button>
        )}
      </div>
      {detail && showDetail && (
        <pre className="mt-1 max-w-md overflow-auto rounded-[var(--r-sm)] border border-border bg-surface-2 p-3 text-left font-mono text-[length:var(--fs-micro)] text-text-secondary">
          {detail}
        </pre>
      )}
    </div>
  );
}
