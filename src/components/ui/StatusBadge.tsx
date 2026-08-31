import type { UserStatus } from '@/mocks/types';
import { Badge, type BadgeTone } from './Badge';

// User status is NOT risk: keep it calm. Active is a soft positive, both suspended
// states a muted warning, Deleted neutral. The critical color stays reserved for
// risk elsewhere. Never color-only — the label carries it.
//
// `suspended-idp` is separated from `suspended` because only Entra can lift it:
// an admin who tries to reactivate that person needs to go to Entra, not here.
const MAP: Record<UserStatus, { tone: BadgeTone; label: string }> = {
  active: { tone: 'success', label: 'Active' },
  suspended: { tone: 'warning', label: 'Suspended' },
  'suspended-idp': { tone: 'neutral', label: 'Suspended in Entra' },
  deleted: { tone: 'neutral', label: 'Deleted' },
};

/**
 * `needsRole` outranks an otherwise-active status: someone Entra provisioned who
 * has no role can sign in and see nothing, which is the more useful thing to say.
 */
export function StatusBadge({ status, needsRole = false }: { status: UserStatus; needsRole?: boolean }) {
  const { tone, label } =
    needsRole && status === 'active' ? { tone: 'warning' as BadgeTone, label: 'Needs role' } : MAP[status];
  return (
    <Badge tone={tone}>
      <span
        aria-hidden="true"
        className="mr-0.5 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80"
      />
      {label}
    </Badge>
  );
}
