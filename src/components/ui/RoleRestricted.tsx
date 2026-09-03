import { Lock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ROLE_SHORT } from '@/lib/permissions';
import { useUiStore } from '@/stores/ui';

/**
 * The standard restricted presentation: a quiet note shown where a role may see
 * a section but not act, instead of a dead control.
 *
 * A restriction that names neither its cause nor its cure leaves the reader
 * stuck — they cannot tell whether the product is broken, whether they are
 * signed in as the wrong person, or who to go and ask. `action` and `remedy`
 * produce the whole sentence: "Read-only. Your role (Auditor) cannot modify
 * users. Contact a Tenant Admin." Both are optional, and `note` still overrides
 * everything where one-off wording reads better.
 */
export function RoleRestricted({
  note,
  action,
  remedy,
  inline = false,
  className,
}: {
  /** Complete replacement sentence. Overrides `action` and `remedy`. */
  note?: string;
  /** What the reader cannot do here, as a verb phrase, e.g. "modify users". */
  action?: string;
  /**
   * Who can lift it, e.g. "Tenant Admin". Omit where no single role does — a
   * remedy that sends the reader to the wrong person is worse than none.
   */
  remedy?: string;
  inline?: boolean;
  className?: string;
}) {
  const role = useUiStore((s) => s.role);
  // ROLE_SHORT, not ROLE_LABELS: the viewer's full label is the compound
  // 'Read-only / Auditor', which does not read inside a parenthetical and
  // repeats itself in the generic sentence below.
  const roleName = ROLE_SHORT[role];
  const message =
    note ??
    (action
      ? `Read-only. Your role (${roleName}) cannot ${action}.${remedy ? ` Contact a ${remedy}.` : ''}`
      : `${roleName} has read-only access here.`);

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
