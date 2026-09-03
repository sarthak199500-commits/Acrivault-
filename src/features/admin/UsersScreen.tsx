import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ban,
  CheckCircle2,
  FilterX,
  History,
  KeyRound,
  Lock,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users as UsersIcon,
} from 'lucide-react';
import { screenHeaderProps } from '@/app/nav';
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
import { Tooltip } from '@/components/ui/Tooltip';
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
import { relativeTime, timeAgo } from '@/lib/format';
import { displayName, isIdpManaged, needsRole } from '@/lib/user';
import { isSignInFederated, samlStatus, scimStatus } from '@/lib/sso';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';
import { NOW } from '@/mocks/dataset';
import {
  useActivateUser,
  useDeleteUser,
  useSuspendUser,
  useSyncUsers,
  useTenant,
  useUsers,
} from './queries';
import { AssignRolesDialog } from './AssignRolesDialog';
import { EditUserDialog } from './EditUserDialog';
import { UsersToolbar } from './UsersToolbar';
import { useUsersFilters } from './useUsersFilters';

type ConfirmKind = 'suspend' | 'activate' | 'delete';

function lastActivity(user: User): string {
  if (user.lastLogin) return relativeTime(user.lastLogin, NOW);
  return 'Never signed in';
}

/** What a sync actually did. Silence is a result too, and worth saying out loud. */
function syncSummary(r: { added: number; updated: number; suspended: number }): string {
  const parts = [
    r.added ? `${r.added} added` : null,
    r.updated ? `${r.updated} updated` : null,
    r.suspended ? `${r.suspended} suspended` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Everything was already up to date';
}

export function UsersScreen() {
  const users = useUsers();
  const tenant = useTenant();
  const forced = useUiStore((s) => s.scenario.state);
  const actorRole = useUiStore((s) => s.role);
  const actorId = useAuthStore((s) => s.userId);
  const filters = useUsersFilters();
  const navigate = useNavigate();

  const canEdit = useCan('users.edit');
  const canSuspend = useCan('users.suspend');
  const canDelete = useCan('users.delete');
  /**
   * Whether the reader can change anything about a user. This is what the
   * read-only banner means, and it is the only thing it should key off.
   */
  const canModifyUsers = canEdit || canSuspend || canDelete;
  // Reading the log is a view capability every role that reaches this screen
  // holds, so the row menu is never empty — not even for the Auditor.
  const canViewAudit = useCan('audit.view');
  /**
   * Whether to draw the row menu at all: true when it would hold at least one
   * item the reader can actually use.
   *
   * Deliberately NOT the same predicate as canModifyUsers. Collapsing the two
   * is exactly what hid the audit trail from the Auditor — the one role whose
   * job is reading evidence — because every mutating capability is Tenant Admin
   * and above. Each item below carries its own capability gate instead, so a
   * read-only reader gets a menu of what they can do rather than dead controls.
   */
  const showRowMenu = canModifyUsers || canViewAudit;

  const sync = useSyncUsers();
  const suspend = useSuspendUser();
  const activate = useActivateUser();
  const del = useDeleteUser();

  const [assignTargets, setAssignTargets] = useState<User[] | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; user: User } | null>(null);

  const onSync = async () => {
    try {
      const result = await sync.mutateAsync();
      toast('Synced with Microsoft Entra ID', {
        tone: 'success',
        description: syncSummary(result),
      });
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

  // Seeded logins are relative to NOW; the sync clock is moved by this screen, so
  // it reads against real time or a fresh sync would render in the future.
  const realNow = new Date();
  const federated = tenant.data ? isSignInFederated(tenant.data.saml, realNow) : false;
  // Entra holds a token, so a sync can mean something. Before that, there is
  // nothing on the other end of the button.
  const provisioned = tenant.data ? scimStatus(tenant.data.scim) !== 'not-started' : false;
  // When the certificate lapses, every Entra account is locked out — and this is
  // the screen an admin comes to asking why nobody can sign in. Saying it here is
  // the most useful route into the SSO screen there is.
  const signInBroken = tenant.data ? samlStatus(tenant.data.saml, realNow) === 'failing' : false;
  const lastSync = tenant.data?.scim.lastSyncAt;
  // First run: the tenant exists but Entra has never sent anyone. The list is
  // never truly empty — registration always leaves the Tenant Owner in it — so
  // this, not `empty`, is the state a new tenant actually lands in.
  const firstRun = !loading && !errored && list.length > 0 && list.every((u) => !isIdpManaged(u));
  // The work the screen exists to surface: Entra let these people in, but until
  // someone gives them a role they sign in and see nothing.
  const roleless = list.filter(needsRole);

  // Client-side search + Role/Status filtering over the loaded list.
  const { search, roles, statuses } = filters.filter;
  const q = search.trim().toLowerCase();
  const filteredList = list.filter((u) => {
    if (roles.length && !roles.includes(u.role ?? 'none')) return false;
    if (statuses.length && !statuses.includes(u.status)) return false;
    if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q)) return false;
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
    // Before federation there is no way for anyone to arrive, so the empty state
    // points at the thing that actually unblocks it rather than at an Add button.
    body = (
      <EmptyState
        icon={<UsersIcon className="h-5 w-5" />}
        headline="No one’s here yet"
        guidance={
          federated
            ? 'Assign people to the Acrivault application in Entra and they’ll appear here on the next sync.'
            : 'Connect Microsoft Entra ID and your team arrives on its own. You’ll give them roles from here.'
        }
        action={
          federated ? (
            <Button
              leadingIcon={<RefreshCw className="h-4 w-4" />}
              loading={sync.isPending}
              onClick={() => void onSync()}
            >
              Sync now
            </Button>
          ) : (
            <Link to="/settings/sso">
              <Button leadingIcon={<KeyRound className="h-4 w-4" />}>Connect Microsoft Entra ID</Button>
            </Link>
          )
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
              <th scope="col" className="px-4 py-2.5 font-medium">
                Name
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Email
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Role
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Last login
              </th>
              {showRowMenu && (
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
              const lastTa =
                u.role === 'tenant-admin' && u.status === 'active' && activeTaCount <= 1;
              const unassigned = needsRole(u);
              // Entra owns deactivation, so an admin cannot reactivate what Entra suspended.
              const idpSuspended = u.status === 'suspended-idp';
              return (
                // Row click is a redundant pointer shortcut to Edit (matches the
                // row-click pattern on Inventory/Monitor/Sessions); the Actions
                // menu remains the keyboard-accessible path to the same dialog.
                <tr
                  key={u.id}
                  onClick={
                    canAct
                      ? (e) => {
                          if (
                            (e.target as HTMLElement).closest(
                              'button, a, input, [role="menu"], [role="menuitem"]',
                            )
                          )
                            return;
                          setEditTarget(u);
                        }
                      : undefined
                  }
                  className={
                    'border-b border-border last:border-b-0 hover:bg-surface-hover' +
                    (canAct ? ' cursor-pointer' : '')
                  }
                >
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={displayName(u)} size="sm" />
                      <span className="font-medium text-text">
                        {displayName(u)}
                        {isSelf && (
                          <span className="ml-1.5 text-[length:var(--fs-micro)] text-text-tertiary">
                            (you)
                          </span>
                        )}
                      </span>
                      {!isIdpManaged(u) && (
                        <Tooltip content="Acrivault manages this account, not Entra. It signs in with a password — the way back in if federation breaks.">
                          <span className="inline-flex items-center gap-1 rounded-[var(--r-xs)] border border-border bg-surface-2 px-1.5 py-0.5 text-[length:var(--fs-micro)] text-text-tertiary">
                            <Lock className="h-3 w-3" aria-hidden="true" />
                            Local
                          </span>
                        </Tooltip>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-text-secondary">{u.email}</td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {u.role ? (
                      ROLE_LABELS[u.role]
                    ) : canEdit && canAct ? (
                      <Button size="sm" variant="secondary" onClick={() => setAssignTargets([u])}>
                        Assign
                      </Button>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={u.status} needsRole={unassigned} />
                  </td>
                  <td className="px-4 py-2.5 tnum text-text-secondary">{lastActivity(u)}</td>
                  {showRowMenu && (
                    <td className="px-4 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <IconButton label={`Actions for ${displayName(u)}`} size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </IconButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {/* Both labels explain why a mutating item is withheld by
                              RANK. They are meaningless to a reader who holds no
                              mutating capability at all — nothing is being refused
                              there, so canModifyUsers gates them. */}
                          {canModifyUsers && !canAct && (
                            <DropdownMenuLabel>
                              {isSelf
                                ? 'You can’t manage your own account'
                                : 'Requires a higher role'}
                            </DropdownMenuLabel>
                          )}
                          {canModifyUsers && canAct && lastTa && (
                            <DropdownMenuLabel>
                              Last active Tenant Admin — assign another first
                            </DropdownMenuLabel>
                          )}
                          {/* Role assignment travels with users.edit, matching the
                              bulk "Assign roles" control below. */}
                          {canEdit && unassigned && (
                            <DropdownMenuItem
                              disabled={!canAct}
                              onSelect={() => setAssignTargets([u])}
                            >
                              <span className="inline-flex items-center gap-2">
                                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Assign a
                                role
                              </span>
                            </DropdownMenuItem>
                          )}
                          {canEdit && (
                            <DropdownMenuItem disabled={!canAct} onSelect={() => setEditTarget(u)}>
                              <span className="inline-flex items-center gap-2">
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                              </span>
                            </DropdownMenuItem>
                          )}
                          {/* Gated on audit.view, not canAct: reading the log is a
                              view capability, and the trail of someone you cannot
                              act on is exactly what an investigation needs. This is
                              the item that keeps the menu worth opening for a
                              read-only role. The email is the search term because
                              every user entry names the person in `target`.
                              onSelect + navigate, not asChild + Link: the local
                              DropdownMenuItem does not forward asChild to Radix, so
                              a nested anchor would render outside the menu's
                              keyboard handling. */}
                          {canViewAudit && (
                            <DropdownMenuItem
                              onSelect={() =>
                                navigate(
                                  `/audit?object=user&target=${encodeURIComponent(u.email)}`,
                                )
                              }
                            >
                              <span className="inline-flex items-center gap-2">
                                <History className="h-3.5 w-3.5" aria-hidden="true" /> View audit
                                trail
                              </span>
                            </DropdownMenuItem>
                          )}
                          {canSuspend &&
                            (idpSuspended ? (
                              <DropdownMenuLabel>Reactivate this person in Entra</DropdownMenuLabel>
                            ) : u.status === 'suspended' ? (
                              <DropdownMenuItem
                                disabled={!canAct}
                                onSelect={() => setConfirm({ kind: 'activate', user: u })}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{' '}
                                  Activate
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
                            ))}
                          {/* Separator travels with Delete: on its own above an
                              empty region it would draw a rule under nothing. */}
                          {canDelete && (
                            <>
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
                            </>
                          )}
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
        {...screenHeaderProps('/settings/users')}
        description="Microsoft Entra ID decides who’s here. You decide what they can do."
        actions={
          <div className="flex items-start gap-2">
            {/* Plain words only, and named for the thing rather than the protocol:
                "Single sign-on" covers just the sign-in half, and provisioning is
                the half that actually fills this table. Every CTA on this screen
                uses the same vocabulary — Entra, set up, finish, sync. */}
            <Link to="/settings/sso">
              <Button variant="ghost" size="sm" leadingIcon={<KeyRound className="h-4 w-4" />}>
                Entra settings
              </Button>
            </Link>
            {canEdit && provisioned ? (
              // Sync is maintenance, not the job. It reports what it did rather than
              // leaving the admin to diff the table themselves.
              <div className="text-right">
                <Button
                  size="sm"
                  variant="secondary"
                  leadingIcon={<RefreshCw className="h-4 w-4" />}
                  loading={sync.isPending}
                  onClick={() => void onSync()}
                >
                  Sync now
                </Button>
                <p className="mt-1 text-[length:var(--fs-micro)] text-text-tertiary">
                  {sync.data
                    ? syncSummary(sync.data)
                    : lastSync
                      ? `Synced ${timeAgo(lastSync, realNow)}`
                      : 'Never synced'}
                </p>
              </div>
            ) : null}
          </div>
        }
      />

      {signInBroken && (
        <Banner
          tone="critical"
          className="mb-4"
          action={
            <Link to="/settings/sso" className="shrink-0">
              <Button size="sm" variant="secondary">
                Fix sign-in
              </Button>
            </Link>
          }
        >
          <span className="font-medium">Nobody from Entra can sign in</span> The certificate
          Acrivault trusts has expired. Roll it in Entra, then paste the new one in.
        </Banner>
      )}

      {/* Keyed off the capability the sentence actually claims, not off whether a
          menu is drawn. The row menu now renders for every role (it carries the
          audit-trail link), so keying this off that would have deleted the
          banner for the very readers it is written for. */}
      {!canModifyUsers && (
        <div className="mb-4">
          <RoleRestricted action="modify users" remedy="Tenant Admin" />
        </div>
      )}

      {firstRun && (
        // Three different reasons nobody is here, three different next actions.
        // A single "no users" message would send the admin to the wrong place.
        <Banner
          tone="info"
          className="mb-4"
          action={
            !federated ? (
              <Link to="/settings/sso" className="shrink-0">
                <Button
                  size="sm"
                  variant="secondary"
                  leadingIcon={<KeyRound className="h-4 w-4" />}
                >
                  Connect Microsoft Entra ID
                </Button>
              </Link>
            ) : !provisioned ? (
              <Link to="/settings/sso" className="shrink-0">
                <Button size="sm" variant="secondary">
                  Finish Entra setup
                </Button>
              </Link>
            ) : canEdit ? (
              <Button
                size="sm"
                variant="secondary"
                leadingIcon={<RefreshCw className="h-4 w-4" />}
                loading={sync.isPending}
                onClick={() => void onSync()}
              >
                Sync now
              </Button>
            ) : undefined
          }
        >
          <span className="font-medium">
            {list.length === 1 ? 'It’s just you so far' : 'Nobody has arrived from Entra yet'}
          </span>{' '}
          {!federated
            ? 'Connect Microsoft Entra ID and your team arrives on its own — you’ll give them roles from here.'
            : !provisioned
              ? 'Sign-in works, but Entra isn’t provisioning yet. Finish step 2 and your team appears without invitations.'
              : 'Entra is connected but hasn’t sent anyone. Assign people to the Acrivault application in Entra, then sync.'}
        </Banner>
      )}

      {roleless.length > 0 && canEdit && (
        <Banner
          tone="warning"
          className="mb-4"
          action={
            <Button size="sm" variant="secondary" onClick={() => setAssignTargets(roleless)}>
              Assign roles
            </Button>
          }
        >
          <span className="font-medium">
            {roleless.length === 1
              ? '1 person doesn’t have a role yet'
              : `${roleless.length} people don’t have a role yet`}
          </span>{' '}
          Entra let them in. Until you assign a role they can sign in but see nothing.
        </Banner>
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

      {showToolbar && (
        <p className="mt-2 flex items-center gap-1.5 text-[length:var(--fs-micro)] text-text-tertiary">
          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
          Names, emails, and who exists come from Entra. Roles and access windows are yours.
        </p>
      )}

      <AssignRolesDialog
        open={assignTargets !== null}
        onOpenChange={(o) => !o && setAssignTargets(null)}
        candidates={assignTargets ?? []}
      />
      <EditUserDialog
        open={editTarget !== null}
        onOpenChange={(o) => !o && setEditTarget(null)}
        user={editTarget}
      />

      <ConfirmDialog
        open={confirm?.kind === 'suspend'}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Suspend user"
        description={
          confirm
            ? `Are you sure you want to suspend ${displayName(confirm.user)}? They will lose access immediately. Entra still lists them, so a later sync will not bring their access back.`
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
            ? `Are you sure you want to delete ${displayName(confirm.user)}? Their activity stays in the audit trail. If Entra still assigns them to Acrivault, the next sync will add them back with no role.`
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
