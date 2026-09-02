import { Link } from 'react-router-dom';
import { CloudOff, Cloud as CloudIcon } from 'lucide-react';
import { useSourceHealth } from './queries';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';

/**
 * Persistent connector-coverage indicator in the top bar.
 *
 * Every figure in the console is a count over whatever synced. When one source
 * stops reporting, the numbers stay plausible and quietly wrong, so this states
 * coverage and the age of the OLDEST successful sync on every screen rather than
 * waiting for someone to open Sources.
 */
export function CoverageChip() {
  const query = useSourceHealth();
  const health = query.data;
  if (!health) return null;
  const degraded = health.degraded.length > 0;

  return (
    <Link
      to="/settings/sources"
      className={cn(
        'hidden h-8 items-center gap-1.5 rounded-[var(--r-pill)] border px-2.5 lg:inline-flex',
        'text-[length:var(--fs-small)] transition-colors',
        degraded
          ? 'border-[color-mix(in_srgb,var(--warning)_45%,var(--border))] bg-warn-bg text-warn-fg'
          : 'border-border bg-surface text-text-tertiary hover:text-text',
      )}
    >
      {degraded ? (
        <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <CloudIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span className="tnum">
        {health.healthy}/{health.total} sources healthy
      </span>
      {health.oldestSyncAt && (
        <span className="text-text-tertiary">· {relativeTime(health.oldestSyncAt)}</span>
      )}
    </Link>
  );
}
