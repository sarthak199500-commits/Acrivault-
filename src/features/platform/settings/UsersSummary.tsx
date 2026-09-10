import { Users as UsersIcon } from 'lucide-react';
import type { Tenant, User } from '@/mocks/types';
import { count, pluralize } from '@/lib/format';

/**
 * The population this screen administers, in one line.
 *
 * Lived on a Settings card until Settings became panes. It belongs on the Users
 * screen, which is the thing it describes, and it has to name the suspended
 * count: the card it came from showed 12 users and 9 active and never said what
 * the other three were — and suspension is the security-relevant state.
 *
 * The Entra note exists because two numbers on the same screen looked like a
 * contradiction: SCIM reports 11 provisioned against 12 accounts, and nothing
 * said the twelfth predates SSO.
 */
export function UsersSummary({ users, tenant }: { users: User[]; tenant?: Tenant }) {
  const active = users.filter((u) => u.status === 'active').length;
  const suspended = users.filter((u) => u.status.startsWith('suspended')).length;
  const waiting = users.filter((u) => u.role === null && u.status !== 'deleted').length;
  const provisioned = tenant?.scim.usersReceived;
  const local = provisioned === undefined ? 0 : users.length - provisioned;

  return (
    <div className="mb-4 rounded-[var(--r-md)] border border-border bg-surface-2 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[length:var(--fs-small)] text-text-secondary">
        <span className="inline-flex items-center gap-2">
          <UsersIcon className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
          <span className="tnum text-text">{count(users.length)}</span> users
        </span>
        <span>
          <span className="tnum text-text">{count(active)}</span> active
        </span>
        {suspended > 0 && (
          <span>
            <span className="tnum text-warn-fg">{count(suspended)}</span> suspended
          </span>
        )}
        <span>
          <span className="tnum text-text">{count(waiting)}</span> awaiting a role
        </span>
      </div>
      {provisioned !== undefined && local > 0 && (
        <p className="mt-1.5 text-[length:var(--fs-micro)] text-text-tertiary">
          Entra provisions {count(provisioned)};{' '}
          {pluralize(local, 'account was', 'accounts were')} created before SSO.
        </p>
      )}
    </div>
  );
}
