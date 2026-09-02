import { Link } from 'react-router-dom';
import { CloudOff, Cloud as CloudIcon } from 'lucide-react';
import { useSourceHealth } from './queries';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { Skeleton } from '@/components/ui/Skeleton';

const SHELL =
  'hidden h-8 items-center gap-1.5 rounded-[var(--r-pill)] border px-2.5 lg:inline-flex text-[length:var(--fs-small)] transition-colors';
const NEUTRAL = 'border-border bg-surface text-text-tertiary hover:text-text';
const WARNING = 'border-[color-mix(in_srgb,var(--warning)_45%,var(--border))] bg-warn-bg text-warn-fg';

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

  // Loading and error both leave `query.data` undefined — a bare `if (!data)` can't
  // tell them apart, so it hid the chip on error too, and this indicator going dark
  // is a worse failure than any degraded reading it could show. Held pill footprint
  // first, so the top bar doesn't reflow once real data (or an error) lands.
  if (query.isPending) {
    return (
      // A div, not a span: Skeleton renders a div, which is not phrasing content.
      // SHELL's inline-flex controls the layout, so the tag is free to be correct.
      <div className={cn(SHELL, NEUTRAL)} aria-hidden="true">
        <CloudIcon className="h-3.5 w-3.5 shrink-0" />
        <Skeleton className="h-3 w-24" />
      </div>
    );
  }

  if (query.isError) {
    // Rendered, not hidden: a coverage indicator that disappears the moment it can't
    // confirm coverage recreates the exact audit finding it exists to close — a gap
    // nobody notices because nothing on screen says there is one.
    return (
      <Link to="/settings/sources" className={cn(SHELL, WARNING)}>
        <CloudOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Coverage unknown</span>
      </Link>
    );
  }

  const health = query.data;
  const degraded = health.degraded.length > 0;

  return (
    <Link to="/settings/sources" className={cn(SHELL, degraded ? WARNING : NEUTRAL)}>
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
