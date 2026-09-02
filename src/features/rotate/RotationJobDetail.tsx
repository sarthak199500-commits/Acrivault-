import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, GitBranch } from 'lucide-react';
import { useRotationJob } from './queries';
import { PhaseTrack, PHASE_LABEL } from './PhaseTrack';
import { ROTATION_PHASES, type RotationJob, type RotationPhase } from '@/mocks/types';
import { detailEyebrow } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Banner } from '@/components/ui/Banner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useUiStore } from '@/stores/ui';
import { pluralize, relativeTime } from '@/lib/format';

function Detail({ job }: { job: RotationJob }) {
  const reducedMotion = useUiStore((s) => s.reducedMotion);
  const [phase, setPhase] = useState<RotationPhase>(job.phase);
  const [progress, setProgress] = useState(job.phaseProgress);

  // Illustrative: gently advance the lifecycle so the track is seen progressing.
  // ASSUMPTION: real rotation mechanics are Architect-owned.
  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 1) {
          setPhase((cur) => {
            const i = ROTATION_PHASES.indexOf(cur);
            return i < ROTATION_PHASES.length - 1 ? ROTATION_PHASES[i + 1] : cur;
          });
          return 0;
        }
        return Math.min(1, p + 0.34);
      });
    }, 2200);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  const atEnd = phase === 'confirm' && progress >= 1;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Lifecycle"
          description={atEnd ? 'Rotation complete.' : `Currently in the ${PHASE_LABEL[phase]} phase.`}
        />
        <CardBody className="pt-6">
          <PhaseTrack phase={phase} phaseProgress={progress} />
        </CardBody>
      </Card>

      <Banner tone="info">
        Zero-downtime rotation issues and propagates a new credential before revoking the old one, so dependents never see an outage.
      </Banner>

      <Card>
        <CardHeader
          title="Cascade revocation"
          description="Dependent identities and the action each will receive."
          action={<Badge tone="neutral" icon={<GitBranch className="h-3 w-3" />}>{pluralize(job.cascade.length, 'dependent')}</Badge>}
        />
        {job.cascade.length === 0 ? (
          <CardBody><p className="text-[length:var(--fs-small)] text-text-tertiary">No dependent identities — nothing to cascade.</p></CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[length:var(--fs-small)]">
              <thead>
                <tr className="border-y border-border text-text-tertiary">
                  <th scope="col" className="px-4 py-2 font-medium">Identity</th>
                  <th scope="col" className="px-4 py-2 font-medium">Action</th>
                  <th scope="col" className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {job.cascade.map((c, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    <td className="px-4 py-2">
                      <Link to={`/discover/${c.identityId}`} className="font-mono text-accent-text hover:underline">{c.identityId}</Link>
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={c.action === 'revoke' ? 'critical' : 'info'} className="capitalize">{c.action}</Badge>
                    </td>
                    <td className="px-4 py-2 capitalize text-text-secondary">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function RotationJobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const query = useRotationJob(jobId);

  return (
    <div>
      <ScreenHeader
        eyebrow={detailEyebrow('/rotate')}
        title={query.data ? query.data.identityName : 'Rotation job'}
        description={query.data ? `Started ${relativeTime(query.data.startedAt)}` : undefined}
        actions={
          <Button variant="ghost" size="sm" leadingIcon={<ChevronLeft className="h-4 w-4" />} onClick={() => navigate('/rotate')}>
            All rotations
          </Button>
        }
      />
      {query.isPending ? (
        <Skeleton className="h-64" />
      ) : query.isError ? (
        <ErrorState message="We couldn't load this job." onRetry={() => query.refetch()} />
      ) : !query.data ? (
        <EmptyState headline="Rotation job not found" guidance="This job may have completed. Check the History tab." />
      ) : (
        <Detail job={query.data} />
      )}
    </div>
  );
}
