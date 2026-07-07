import { Lock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ROLE_LABELS } from '@/lib/permissions';
import { useUiStore } from '@/stores/ui';

/**
 * The standard restricted presentation: a quiet note shown where a role may see
 * a section but not act, instead of a dead control.
 */
export function RoleRestricted({
  note,
  inline = false,
  className,
}: {
  note?: string;
  inline?: boolean;
  className?: string;
}) {
  const role = useUiStore((s) => s.role);
  const message = note ?? `${ROLE_LABELS[role]} has read-only access here.`;
  if (inline) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-[length:var(--fs-small)] text-text-tertiary', className)}>
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        {message}
      </span>
    );
  }
  return (
    <div
      role="note"
      className={cn(
        'flex items-center gap-2 rounded-[var(--r-md)] border border-dashed border-border bg-surface-2 px-3 py-2',
        'text-[length:var(--fs-small)] text-text-tertiary',
        className,
      )}
    >
      <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
