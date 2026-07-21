import { useState, type ReactNode } from 'react';
import {
  Ban,
  CheckCircle2,
  FilterX,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
  UserPlus,
  Users as UsersIcon,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { useCan } from '@/components/ui/Can';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { canActOnUser, ROLE_LABELS } from '@/lib/permissions';
import { activeTenantAdminCount } from '@/mocks/api';
import type { User } from '@/mocks/types';
import { relativeTime } from '@/lib/format';
import { displayName, isProfilePending } from '@/lib/user';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';
import { NOW } from '@/mocks/dataset';
import {
  useActivateUser,
  useDeleteUser,
  useResendInvite,
  useSuspendUser,
  useUsers,
} from './queries';
import { InviteUserDialog } from './InviteUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { UsersToolbar } from './UsersToolbar';
import { useUsersFilters } from './useUsersFilters';

type ConfirmKind = 'suspend' | 'activate' | 'delete';

function lastActivity(user: User): string {
  if (user.lastLogin) return relativeTime(user.lastLogin, NOW);
  if (user.invitedAt) return `Invited ${relativeTime(user.invitedAt, NOW)}`;
  return '—';
}

export function UsersScreen() {
  const users = useUsers();
  const forced = useUiStore((s) => s.scenario.state);
  const actorRole = useUiStore((s) => s.role);
  const actorId = useAuthStore((s) => s.userId);
  const filters = useUsersFilters();

  const canInvite = useCan('users.invite');
  const canEdit = useCan('users.edit');
  const canSuspend = useCan('users.suspend');
  const canDelete = useCan('users.delete');
  const showRowActions = canEdit || canSuspend || canDelete;

  const resend = useResendInvite();
  const suspend = useSuspendUser();
  const activate = useActivateUser();
  const del = useDeleteUser();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; user: User } | null>(null);

  const onResend = async (user: User) => {
    try {
      await resend.mutateAsync(user.id);
      toast(`Invitation re-sent to ${user.email}.`, { tone: 'success' });
    } catch (err) {
      toast(errorInfo(err).message, { tone: 'critical' });
    }
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const { kind, user } = confirm;
    try {
      if (kind === 'suspend') {
        await suspend.mutateAsync(user.id);
        toast(`${displayName(user)} was suspended.`, { tone: 'warning' });
      } else if (kind === 'activate') {
        await activate.mutateAsync(user.id);
        toast(`${displayName(user)} was reactivated.`, { tone: 'success' });
      } else {
        await del.mutateAsync(user.id);
        toast(`${displayName(user)} was deleted.`);
      }
      setConfirm(null);
    } catch (err) {
      toast(errorInfo(err).message, { tone: 'critical' });
    }
  };

  const confirmPending = suspend.isPending || activate.isPending || del.isPending;

  /* ----------------------------------------------------------- table body */
  const list = users.data ?? [];
  // Last-active-Tenant-Admin guards must consider the whole org, so this stays
  // on the full list — never the filtered view.
  const activeTaCount = activeTenantAdminCount(list);
  const loading = forced === 'loading' || users.isPending;
  const errored = forced !== 'loading' && (forced === 'error' || users.isError);
  const empty = !loading && !errored && (forced === 'empty' || list.length === 0);

  // Client-side search + Role/Status filtering over the loaded list.
  const { search, roles, statuses } = filters.filter;
  const q = search.trim().toLowerCase();
  const filteredList = list.filter((u) => {
    if (roles.length && !roles.includes(u.role)) return false;
    if (statuses.length && !statuses.includes(u.status)) return false;
    if (q && !`${u.name} ${displayName(u)} ${u.email}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const showToolbar = !loading && !errored && !empty;
  const noMatches = showToolbar && filteredList.length === 0;

  let body: ReactNode;
  if (loading) {
    body = <SkeletonTableRows rows={6} cols={6} />;
  } else if (errored) {
    body = (
      <div className="p-4">
        <Banner
          tone="critical"
          action={
            <Button variant="secondary" size="sm" onClick={() => void users.refetch()}>
              Retry
            </Button>
          }
        >
          Failed to load users. Please refresh the page.
        </Banner>
      </div>
    );
  } else if (empty) {
    body = (
      <EmptyState
        icon={<UsersIcon className="h-5 w-5" />}
        headline="No users yet"
        guidance="Your organization has no users yet. Click ‘Invite User’ to get started."
        action={
          canInvite ? (
            <Button leadingIcon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
              Invite User
            </Button>
          ) : undefined
        }
      />
    );
  } else if (noMatches) {
    body = (
      <EmptyState
        icon={<FilterX className="h-5 w-5" />}
        headline="No users match these filters"
        guidance="Try a different search, remove a filter, or clear them all."
        action={
          <Button variant="secondary" onClick={filters.clearAll}>
            Clear filters
          </Button>
        }
      />
    );
  } else {
    body = (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[length:var(--fs-small)]">
          <thead>
            <tr className="border-b border-border text-text-tertiary">
              <th scope="col" className="px-4 py-2.5 font-medium">Name</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Email</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Role</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Last login</th>
              {showRowActions && (
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredList.map((u) => {
              const isSelf = u.id === actorId;
              const canAct = canActOnUser(actorRole, actorId, u.role, u.id);
              // Cannot suspend/delete the last active Tenant Admin (incl. yourself).
              const lastTa = u.role === 'tenant-admin' && u.status === 'active' && activeTaCount <= 1;
              const pending = u.status === 'pending' || u.status === 'invited';
              return (
                // Row click is a redundant pointer shortcut to Edit (matches the
                // row-click pattern on Inventory/Monitor/Sessions); the Actions
                // menu remains the keyboard-accessible path to the same dialog.
                <tr
                  key={u.id}
                  onClick={
                    canAct
                      ? (e) => {
                          if ((e.target as HTMLElement).closest('button, a, input, [role="menu"], [role="menuitem"]')) return;
                          setEditTarget(u);
                        }
                      : undefined
                  }
                  className={
                    'border-b border-border last:border-b-0 hover:bg-surface-hover' + (canAct ? ' cursor-pointer' : '')
                  }
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={displayName(u)} size="sm" />
                      <span className="font-medium text-text">
                        {isProfilePending(u) ? (
                          <span
                            className="font-normal italic text-text-secondary"
                            title="Profile name is set from the identity provider on first sign-in."
                          >
                            {displayName(u)}
                          </span>
                        ) : (
                          u.name
                        )}
                        {isSelf && <span className="ml-1.5 text-[length:var(--fs-micro)] text-text-tertiary">(you)</span>}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-text-secondary">{u.email}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-2.5 tnum text-text-secondary">{lastActivity(u)}</td>
                  {showRowActions && (
                    <td className="px-4 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <IconButton label={`Actions for ${displayName(u)}`} size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </IconButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {!canAct && (
                            <DropdownMenuLabel>
                              {isSelf ? 'You can’t manage your own account' : 'Requires a higher role'}
                            </DropdownMenuLabel>
                          )}
                          {canAct && lastTa && (
                            <DropdownMenuLabel>Last active Tenant Admin — assign another first</DropdownMenuLabel>
                          )}
                          <DropdownMenuItem disabled={!canAct} onSelect={() => setEditTarget(u)}>
                            <span className="inline-flex items-center gap-2">
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                            </span>
                          </DropdownMenuItem>
                          {pending && (
                            <DropdownMenuItem disabled={!canAct || resend.isPending} onSelect={() => void onResend(u)}>
                              <span className="inline-flex items-center gap-2">
                                <Send className="h-3.5 w-3.5" aria-hidden="true" /> Resend invitation
                              </span>
                            </DropdownMenuItem>
                          )}
                          {u.status === 'suspended' ? (
                            <DropdownMenuItem disabled={!canAct} onSelect={() => setConfirm({ kind: 'activate', user: u })}>
                              <span className="inline-flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Activate
                              </span>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              disabled={!canAct || lastTa}
                              title={
                                lastTa
                                  ? 'Cannot suspend the only active Tenant Admin. Assign another Tenant Admin first.'
                                  : undefined
                              }
                              onSelect={() => setConfirm({ kind: 'suspend', user: u })}
                            >
                              <span className="inline-flex items-center gap-2">
                                <Ban className="h-3.5 w-3.5" aria-hidden="true" /> Suspend
                              </span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={!canAct || lastTa}
                            title={
                              lastTa
                                ? 'Cannot delete the only active Tenant Admin. Assign another Tenant Admin first.'
                                : undefined
                            }
                            onSelect={() => setConfirm({ kind: 'delete', user: u })}
                          >
                            <span className="inline-flex items-center gap-2 text-crit-fg">
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div>
      <ScreenHeader
        eyebrow="Platform"
        title="Manage Users"
        description="Everyone in your organization. Invite teammates and manage their access."
        actions={
          canInvite ? (
            <Button size="sm" leadingIcon={<UserPlus className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
              Invite User
            </Button>
          ) : undefined
        }
      />

      {!showRowActions && !canInvite && (
        <div className="mb-4">
          <RoleRestricted note="You have read-only access to the user list." />
        </div>
      )}

      {showToolbar && (
        <div className="mb-3 space-y-2">
          <UsersToolbar filters={filters} users={list} />
          {filters.activeCount > 0 && (
            <p className="text-[length:var(--fs-small)] text-text-secondary">
              Showing <span className="tnum">{filteredList.length}</span> of{' '}
              <span className="tnum">{list.length}</span> {list.length === 1 ? 'user' : 'users'}
            </p>
          )}
        </div>
      )}

      <Card>{body}</Card>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <EditUserDialog open={editTarget !== null} onOpenChange={(o) => !o && setEditTarget(null)} user={editTarget} />

      <ConfirmDialog
        open={confirm?.kind === 'suspend'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Suspend user"
        description={
          confirm
            ? `Are you sure you want to suspend ${displayName(confirm.user)}? They will lose access immediately.`
            : undefined
        }
        confirmLabel="Confirm suspend"
        pending={confirmPending}
        onConfirm={runConfirm}
      />
      <ConfirmDialog
        open={confirm?.kind === 'activate'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Reactivate user"
        description={
          confirm
            ? `Reactivate ${displayName(confirm.user)}? They will regain access immediately.`
            : undefined
        }
        confirmLabel="Confirm reactivate"
        pending={confirmPending}
        onConfirm={runConfirm}
      />
      <ConfirmDialog
        open={confirm?.kind === 'delete'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Delete user"
        description={
          confirm
            ? `Are you sure you want to delete ${displayName(confirm.user)}? This action is permanent and cannot be undone. All their activity logs will remain in the audit trail.`
            : undefined
        }
        confirmLabel="Permanently delete"
        confirmVariant="danger"
        pending={confirmPending}
        onConfirm={runConfirm}
      />
    </div>
  );
}
