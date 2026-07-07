import type { UserStatus } from '@/mocks/types';
import { Badge, type BadgeTone } from './Badge';

// User status is NOT risk: keep it calm. Pending/Invited are quiet, Active is a
// soft positive, Suspended a muted warning, Expired neutral-muted. The critical
// color stays reserved for risk elsewhere. Never color-only — the label carries it.
const MAP: Record<UserStatus, { tone: BadgeTone; label: string }> = {
  invited: { tone: 'neutral', label: 'Invited' },
  pending: { tone: 'neutral', label: 'Pending' },
  active: { tone: 'success', label: 'Active' },
  suspended: { tone: 'warning', label: 'Suspended' },
  deleted: { tone: 'neutral', label: 'Deleted' },
};

export function StatusBadge({ status }: { status: UserStatus }) {
  const { tone, label } = MAP[status];
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
