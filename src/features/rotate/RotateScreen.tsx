import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Lock, RefreshCw, ShieldAlert } from 'lucide-react';
import { useRotationCandidates, useRotations, useStartRotation } from './queries';
import { PhaseTrack } from './PhaseTrack';
import { StartRotationDialog } from './StartRotationDialog';
import type { RotationData } from '@/mocks/api';
import type { RotationHistoryEntry, RotationJob } from '@/mocks/types';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { useCan } from '@/components/ui/Can';
import { dateTime, pluralize, relativeTime } from '@/lib/format';
import { toast } from '@/stores/toast';

function JobCard({ job, onOpen }: { job: RotationJob & { identityName: string }; onOpen: () => void }) {
  return (
    <Card>
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-[length:var(--fs-small)] font-medium text-text">{job.identityName}</span>
          <Badge tone={job.mode === 'emergency' ? 'critical' : 'neutral'} className="capitalize">{job.mode}</Badge>
        </div>
        <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 text-[length:var(--fs-small)] text-accent-text hover:underline">
          Details <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <CardBody className="pt-4">
        <PhaseTrack phase={job.phase} phaseProgress={job.phaseProgress} />
        <div className="mt-3 flex items-center justify-between text-[length:var(--fs-micro)] text-text-tertiary">
          <span>Started {relativeTime(job.startedAt)}</span>
          {job.cascade.length > 0 && <span>{pluralize(job.cascade.length, 'dependent identity', 'dependent identities')}</span>}
        </div>
      </CardBody>
    </Card>
  );
}

function HistoryTable({ history }: { history: (RotationHistoryEntry & { identityName: string })[] }) {
  return (
    <Card>
      <CardHeader
        title="Rotation history"
        description="Append-only — entries are never edited or deleted."
        action={<Badge tone="neutral" icon={<Lock className="h-3 w-3" />}>Immutable</Badge>}
      />
      <ScrollableTable label="Rotation history">
        <table className="w-full text-left text-[length:var(--fs-small)]">
          <thead>
            <tr className="border-y border-border text-text-tertiary">
              <th scope="col" className="px-4 py-2 font-medium">Completed</th>
              <th scope="col" className="px-4 py-2 font-medium">Identity</th>
              <th scope="col" className="px-4 py-2 font-medium">Mode</th>
              <th scope="col" className="px-4 py-2 font-medium">Outcome</th>
              <th scope="col" className="px-4 py-2 font-medium">Actor</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-b border-border last:border-b-0">
                <td className="tnum px-4 py-2 text-text-secondary">{dateTime(h.completedAt)}</td>
                <td className="px-4 py-2 text-text">{h.identityName}</td>
                <td className="px-4 py-2 capitalize text-text-secondary">{h.mode}</td>
                <td className="px-4 py-2">
                  <Badge tone={h.outcome === 'success' ? 'success' : 'warning'}>
                    {h.outcome === 'success' ? 'Success' : 'Rolled back'}
                  </Badge>
                </td>
                <td className="px-4 py-2 font-mono text-text-tertiary">{h.actor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>
    </Card>
  );
}

export function RotateScreen() {
  const query = useRotations();
  const navigate = useNavigate();
  const candidates = useRotationCandidates();
  const start = useStartRotation();
  const [tab, setTab] = useState('active');
  const [dialog, setDialog] = useState<null | 'standard' | 'emergency'>(null);

  const canStandard = useCan('rotate.standard');
  const canRequest = useCan('rotate.request');
  const canEmergency = useCan('rotate.emergency');

  const startLabel = canStandard ? 'Start rotation' : 'Request rotation';

  const confirmStart = (mode: 'standard' | 'emergency') => (identityId: string) => {
    start.mutate(
      { identityId, mode },
      {
        onSuccess: () => {
          setDialog(null);
          toast(
            mode === 'emergency'
              ? 'Emergency rotation started'
              : canStandard
                ? 'Rotation started'
                : 'Rotation requested',
            { tone: mode === 'emergency' ? 'critical' : 'success' },
          );
        },
      },
    );
  };

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/rotate')}
        description="Zero-downtime credential rotation across the six-phase lifecycle. Mechanics are illustrative in Wave 1."
        actions={
          <div className="flex items-center gap-2">
            {(canStandard || canRequest) && (
              <Button size="sm" variant="secondary" leadingIcon={<RefreshCw className="h-4 w-4" />} onClick={() => setDialog('standard')}>
                {startLabel}
              </Button>
            )}
            {canEmergency && (
              <Button size="sm" variant="danger" leadingIcon={<ShieldAlert className="h-4 w-4" />} onClick={() => setDialog('emergency')}>
                Emergency
              </Button>
            )}
          </div>
        }
      />

      {!canStandard && !canRequest && !canEmergency && (
        <div className="mb-4">
          <RoleRestricted note="Your role can view rotation status and history but not start a rotation." />
        </div>
      )}

      <QueryBoundary
        query={query}
        loadingFallback={<Skeleton className="h-64" />}
        // Never "empty" — history is still reachable even with no active jobs.
        isEmpty={() => false}
      >
        {(data: RotationData) => (
          <Tabs
            value={tab}
            onValueChange={setTab}
            tabs={[
              { value: 'active', label: `Active (${data.active.length})` },
              { value: 'history', label: `History (${data.history.length})` },
            ]}
          >
            <TabPanel value="active">
              {data.active.length === 0 ? (
                <Card>
                  <EmptyState
                    icon={<RefreshCw className="h-5 w-5" />}
                    headline="No active rotations"
                    guidance="Start a rotation above, or review completed rotations in the History tab."
                  />
                </Card>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {data.active.map((job) => (
                    <JobCard key={job.id} job={job} onOpen={() => navigate(`/rotate/${job.id}`)} />
                  ))}
                </div>
              )}
            </TabPanel>
            <TabPanel value="history">
              <HistoryTable history={data.history} />
            </TabPanel>
          </Tabs>
        )}
      </QueryBoundary>

      <StartRotationDialog
        open={dialog === 'standard'}
        onOpenChange={(o) => !o && setDialog(null)}
        mode="standard"
        candidates={candidates.data ?? []}
        pending={start.isPending}
        onConfirm={confirmStart('standard')}
      />
      <StartRotationDialog
        open={dialog === 'emergency'}
        onOpenChange={(o) => !o && setDialog(null)}
        mode="emergency"
        candidates={candidates.data ?? []}
        pending={start.isPending}
        onConfirm={confirmStart('emergency')}
      />
    </div>
  );
}
