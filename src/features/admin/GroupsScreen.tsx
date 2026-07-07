import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderPlus, Users as UsersIcon } from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Banner } from '@/components/ui/Banner';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { useCan } from '@/components/ui/Can';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import type { Group } from '@/mocks/types';
import { count as fmtCount } from '@/lib/format';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';
import { useCreateGroup, useGroups } from './queries';

function CreateGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateGroup();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setError(undefined);
    }
  }, [open]);

  const submit = async () => {
    setError(undefined);
    try {
      await create.mutateAsync({ name, description });
      toast(`Group “${name.trim()}” created.`, { tone: 'success' });
      onOpenChange(false);
    } catch (err) {
      setError(errorInfo(err).message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title="Create group"
      description="Groups bundle users for assignment. Membership is managed when you invite or edit a user."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={create.isPending} disabled={!name.trim()}>
            Create group
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Input label="Group name" value={name} onChange={(e) => setName(e.target.value)} error={error} placeholder="e.g. Incident Response" />
        <Textarea label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={140} showCount placeholder="What is this group for?" />
      </div>
    </Dialog>
  );
}

export function GroupsScreen() {
  const groups = useGroups();
  const canManage = useCan('groups.manage');
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <ScreenHeader
        eyebrow="Platform"
        title="Groups"
        description="Bundle users for assignment. A minimal surface — membership is set on the user."
        actions={
          <>
            <Link to="/settings/users" className={buttonClasses('ghost', 'sm')}>
              Users
            </Link>
            {canManage && (
              <Button size="sm" leadingIcon={<FolderPlus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                Create group
              </Button>
            )}
          </>
        }
      />

      {/* ASSUMPTION: group semantics beyond assignment and creation are open (BA-owned). */}
      <Banner tone="info" className="mb-4">
        Group management is intentionally minimal in this build. Deeper semantics (nested groups,
        group-level policy) are an open question.
      </Banner>

      {!canManage && (
        <div className="mb-4">
          <RoleRestricted note="You can view groups. Creating and managing groups requires a Security Admin." />
        </div>
      )}

      <Card>
        <QueryBoundary
          query={groups}
          loadingFallback={<SkeletonTableRows rows={3} cols={3} />}
          isEmpty={(d) => d.length === 0}
          empty={
            <EmptyState
              icon={<UsersIcon className="h-5 w-5" />}
              headline="No groups configured"
              guidance="Create a group to bundle users for assignment."
              action={
                canManage ? (
                  <Button leadingIcon={<FolderPlus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
                    Create group
                  </Button>
                ) : undefined
              }
            />
          }
        >
          {(list: Group[]) => (
            <ul className="divide-y divide-border">
              {list.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-text">{g.name}</p>
                    {g.description && (
                      <p className="truncate text-[length:var(--fs-small)] text-text-secondary">{g.description}</p>
                    )}
                  </div>
                  <span className="tnum shrink-0 text-[length:var(--fs-small)] text-text-tertiary">
                    {fmtCount(g.memberCount)} {g.memberCount === 1 ? 'member' : 'members'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </QueryBoundary>
      </Card>

      <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
