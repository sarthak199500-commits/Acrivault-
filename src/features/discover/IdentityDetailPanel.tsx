import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import {
  ArrowRight,
  GitBranch,
  GitCompareArrows,
  Link2,
  ListChecks,
  RefreshCw,
  ShieldX,
  Unlink,
  UserPlus,
} from 'lucide-react';
import { useAssignOwner, useIdentity, useRequestRotations } from './queries';
import { CLOUD_LABELS, NHI_TYPE_LABELS, type Identity } from '@/mocks/types';
import { NOW } from '@/mocks/dataset';
import { Drawer } from '@/components/ui/Drawer';
import { RiskPill } from '@/components/ui/RiskPill';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Sparkline } from '@/components/ui/Sparkline';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { ProviderMark } from '@/components/ui/ProviderMark';
import { NhiTypeIcon } from '@/components/ui/NhiTypeIcon';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonText, Skeleton } from '@/components/ui/Skeleton';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { useCan } from '@/components/ui/Can';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { riskBand } from '@/lib/risk';
import { errorInfo } from '@/lib/apiError';
import { dateTime, pluralize, relativeDays } from '@/lib/format';
import { toast } from '@/stores/toast';
import { useUiStore } from '@/stores/ui';

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="eyebrow">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function DetailBody({
  identity,
  canAssignOwner,
  onAssignOwner,
}: {
  identity: Identity;
  canAssignOwner: boolean;
  onAssignOwner: () => void;
}) {
  const band = riskBand(identity.riskScore);
  const series = identity.riskSeries.map((p) => p.score);

  return (
    <div>
      {/* Header summary */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <RiskPill score={identity.riskScore} />
        {identity.orphaned && (
          <Badge tone="critical" icon={<Unlink className="h-3 w-3" />}>Orphaned</Badge>
        )}
        {identity.conflicts.length > 0 && (
          <Badge tone="warning" icon={<GitCompareArrows className="h-3 w-3" />}>
            {pluralize(identity.conflicts.length, 'conflict')}
          </Badge>
        )}
        <span className="inline-flex items-center gap-1.5 text-[length:var(--fs-small)] text-text-secondary">
          <NhiTypeIcon type={identity.type} className="h-4 w-4 text-text-tertiary" />
          {NHI_TYPE_LABELS[identity.type]}
        </span>
      </div>

      {identity.orphaned && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--critical)_40%,var(--border))] bg-crit-bg/40 px-3 py-2 text-[length:var(--fs-small)] text-crit-fg">
          <span>{identity.orphanReason ? `Orphaned: ${identity.orphanReason}` : 'Orphaned — no owner assigned.'}</span>
          {canAssignOwner && (
            <Button
              size="sm"
              variant="secondary"
              className="shrink-0"
              leadingIcon={<UserPlus className="h-3.5 w-3.5" />}
              onClick={onAssignOwner}
            >
              Assign owner
            </Button>
          )}
        </div>
      )}

      <Section title="Overview">
        <KeyValueList
          items={[
            { label: 'Owner', value: identity.owner ?? '—' },
            { label: 'Risk score', value: <span className="tnum">{identity.riskScore}</span>, derived: true },
            { label: 'Risk band', value: band.label, derived: true },
            { label: 'Correlated', value: identity.correlated ? `Yes · ${identity.sources.length} sources` : 'Single source', derived: true },
            { label: 'First seen', value: dateTime(identity.createdAt) },
            { label: 'Last seen', value: relativeDays(identity.lastSeen, NOW) },
          ]}
        />
      </Section>

      <Section title="Risk over time">
        <div className="rounded-[var(--r-md)] border border-border bg-surface-2 p-3">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="tnum text-[length:var(--fs-h1)] font-semibold text-text">{identity.riskScore}</span>
            <span className="text-[length:var(--fs-micro)] text-text-tertiary">last 14 days · precomputed</span>
          </div>
          <Sparkline values={series} width={300} height={56} stroke={band.cssVar} ariaLabel="Risk score over the last 14 days" />
        </div>
      </Section>

      <Section title={`Correlated sources · ${identity.sources.length}`}>
        <div className="space-y-2">
          {identity.sources.map((source) => (
            <div key={source.externalId} className="rounded-[var(--r-md)] border border-border bg-surface-2 p-3">
              {/* The real brand mark, as on onboarding's connector cards — naming the
                  provider is the primary job here and there's room for the logo. The
                  name stays in text beside it, so the mark is never the only carrier
                  of meaning. */}
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-[length:var(--fs-small)] font-medium text-text">
                  <ProviderMark cloud={source.cloud} /> {CLOUD_LABELS[source.cloud]}
                </span>
                <span className="font-mono text-[length:var(--fs-micro)] text-text-tertiary">{source.externalId}</span>
              </div>
              <KeyValueList
                items={Object.entries(source.attributes).map(([k, v]) => ({ label: k, value: v, mono: true }))}
              />
            </div>
          ))}
        </div>
      </Section>

      {identity.conflicts.length > 0 && (
        <Section title="Attribute conflicts">
          <div className="space-y-2">
            {identity.conflicts.map((c) => (
              <div key={c.attribute} className="rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--warning)_45%,var(--border))] bg-warn-bg/30 p-3">
                <div className="mb-1.5 text-[length:var(--fs-small)] font-medium text-warn-fg">{c.attribute}</div>
                <div className="space-y-1">
                  {c.values.map((v) => (
                    <div key={v.cloud} className="flex items-center justify-between text-[length:var(--fs-small)]">
                      <span className="inline-flex items-center gap-1.5 text-text-secondary">
                        <ProviderMark cloud={v.cloud} /> {CLOUD_LABELS[v.cloud]}
                      </span>
                      <span className="font-mono text-text">{v.value}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[length:var(--fs-micro)] text-text-tertiary">
                  Surfaced, never merged. Each source is authoritative for its own value.
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section
        title={`Relationships · ${identity.relationships.length}`}
        action={
          identity.relationships.length > 0 ? (
            <Link
              to={`/resilience/blast-radius?origin=${identity.id}`}
              className="inline-flex items-center gap-1 text-[length:var(--fs-small)] text-text-tertiary hover:text-accent-text"
            >
              <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
              View blast radius
            </Link>
          ) : undefined
        }
      >
        {identity.relationships.length === 0 ? (
          <p className="text-[length:var(--fs-small)] text-text-tertiary">No known relationships.</p>
        ) : (
          <ul className="space-y-1">
            {identity.relationships.slice(0, 8).map((rel, i) => (
              <li key={i} className="flex items-center justify-between rounded-[var(--r-sm)] border border-border bg-surface px-2.5 py-1.5">
                <span className="inline-flex items-center gap-2 text-[length:var(--fs-small)]">
                  <Link2 className="h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" />
                  <span className="text-text-secondary">{rel.kind}</span>
                  <span className="font-mono text-text">{rel.identityId}</span>
                </span>
                <Link
                  to={`/discover/${rel.identityId}`}
                  className="text-text-tertiary hover:text-accent-text"
                  aria-label={`Open ${rel.identityId}`}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function DetailFooter({
  identity,
  canAssignOwner,
  onAssignOwner,
}: {
  identity: Identity;
  canAssignOwner: boolean;
  onAssignOwner: () => void;
}) {
  const canRotateStd = useCan('rotate.standard');
  const canRequest = useCan('rotate.request');
  const canQuarantine = useCan('session.quarantine');
  // Recommend: an Analyst proposes the quarantine for an admin to carry out.
  const canRecommendQuarantine = useCan('session.quarantineRecommend');
  const canGovern = useCan('policy.create');
  const showSessions = identity.type === 'ai-agent';
  const anyControl =
    canRotateStd ||
    canRequest ||
    canQuarantine ||
    canRecommendQuarantine ||
    canAssignOwner ||
    canGovern ||
    showSessions;
  const rotate = useRequestRotations();
  const [confirmQuarantine, setConfirmQuarantine] = useState(false);

  const startRotation = (verb: 'started' | 'requested') =>
    rotate.mutate([identity.id], {
      onSuccess: () =>
        toast(`Rotation ${verb} for ${identity.name}`, {
          tone: 'success',
          description: 'Queued — track it on the Rotate screen. Synthetic — no upstream state changes.',
        }),
      onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
    });

  if (!anyControl) {
    return <RoleRestricted note="Your role can view this identity but not act on it." />;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canRotateStd ? (
        <Button
          size="sm"
          leadingIcon={<RefreshCw className="h-3.5 w-3.5" />}
          loading={rotate.isPending}
          onClick={() => startRotation('started')}
        >
          Rotate
        </Button>
      ) : canRequest ? (
        <Button
          size="sm"
          variant="secondary"
          leadingIcon={<RefreshCw className="h-3.5 w-3.5" />}
          loading={rotate.isPending}
          onClick={() => startRotation('requested')}
        >
          Request rotation
        </Button>
      ) : null}
      {canAssignOwner && (
        <Button
          size="sm"
          variant="secondary"
          leadingIcon={<UserPlus className="h-3.5 w-3.5" />}
          onClick={onAssignOwner}
        >
          {identity.owner ? 'Change owner' : 'Assign owner'}
        </Button>
      )}
      {canGovern && (
        <Link to="/govern" className={buttonClasses('ghost', 'sm')}>
          <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
          Govern
        </Link>
      )}
      {showSessions && (
        <Link to="/intelligence" className={buttonClasses('ghost', 'sm')}>
          View sessions
        </Link>
      )}
      {canQuarantine ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-[var(--crit-fg)]"
          leadingIcon={<ShieldX className="h-3.5 w-3.5" />}
          onClick={() => setConfirmQuarantine(true)}
        >
          Quarantine
        </Button>
      ) : canRecommendQuarantine ? (
        <Button
          size="sm"
          variant="ghost"
          leadingIcon={<ShieldX className="h-3.5 w-3.5" />}
          onClick={() => setConfirmQuarantine(true)}
        >
          Recommend quarantine
        </Button>
      ) : null}
      <ConfirmDialog
        open={confirmQuarantine}
        onOpenChange={setConfirmQuarantine}
        title={
          canQuarantine
            ? `Quarantine ${identity.name}?`
            : `Recommend quarantining ${identity.name}?`
        }
        description={
          canQuarantine
            ? 'The identity keeps existing but is blocked from acting until released. Synthetic — no upstream state changes.'
            : 'Your role can propose this but not carry it out. An admin reviews the recommendation and decides. Synthetic — no upstream state changes.'
        }
        confirmLabel={canQuarantine ? 'Quarantine' : 'Send recommendation'}
        confirmVariant={canQuarantine ? 'danger' : 'primary'}
        onConfirm={() => {
          setConfirmQuarantine(false);
          if (canQuarantine) {
            toast(`${identity.name} quarantined`, { tone: 'critical' });
          } else {
            toast(`Quarantine recommended for ${identity.name}`, {
              tone: 'success',
              description: 'Sent to an admin for approval.',
            });
          }
        }}
      />
    </div>
  );
}

function AssignOwnerDialog({
  identity,
  open,
  onOpenChange,
}: {
  identity: Identity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const assign = useAssignOwner();
  const [value, setValue] = useState(identity.owner ?? '');

  // Reseed the field each time the dialog opens (owner may have changed since).
  useEffect(() => {
    if (open) setValue(identity.owner ?? '');
  }, [open, identity.owner]);

  const save = () => {
    const owner = value.trim();
    if (!owner) return;
    assign.mutate(
      { id: identity.id, owner },
      {
        onSuccess: () => {
          onOpenChange(false);
          toast(`Owner assigned for ${identity.name}`, {
            tone: 'success',
            description: `Now owned by ${owner}.`,
          });
        },
        onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={identity.owner ? 'Change owner' : 'Assign owner'}
      description="Set the team or person accountable for this identity. Assigning an owner clears the orphaned state."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={assign.isPending}>
            Cancel
          </Button>
          <Button onClick={save} loading={assign.isPending} disabled={!value.trim()}>
            Save
          </Button>
        </>
      }
    >
      <Input
        label="Owner"
        placeholder="team-or-person@acme.com"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        hint="Use a team alias where possible, not an individual."
      />
    </Dialog>
  );
}

export function IdentityDetailPanel() {
  const { identityId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const query = useIdentity(identityId);
  const canAssignOwner = useCan('identity.assignOwner');
  const [assignOpen, setAssignOpen] = useState(false);

  // The dev Scenario Switcher can force loading / error / empty on this panel.
  // Mirror QueryBoundary's precedence (forced loading → forced error → real
  // pending → real error → forced-empty/no-data → populated) and its DEV gate so
  // the synthetic states are tree-shaken from production and only a real query
  // can drive them there.
  const forcedState = useUiStore((s) => s.scenario.state);
  const forced = import.meta.env.DEV ? forcedState : undefined;
  const data = query.data;
  const showLoading = forced === 'loading' || (forced !== 'error' && query.isPending);
  const showError = !showLoading && (forced === 'error' || query.isError);
  const showEmpty = !showLoading && !showError && (forced === 'empty' || !data);

  const close = () => navigate({ pathname: '/discover', search: location.search });

  const title =
    !showLoading && !showError && !showEmpty && data ? (
      <span className="break-all font-mono text-[length:var(--fs-h2)]">{data.name}</span>
    ) : (
      'Identity'
    );

  return (
    <Drawer open onOpenChange={(o) => !o && close()} closeOnOutsideClick={false} title={title} description="Identity detail · derived fields are labeled">
      {showLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <SkeletonText lines={6} />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : showError ? (
        <ErrorState
          message="We couldn't load this identity."
          detail={forced === 'error' ? "scenario.state = 'error'" : undefined}
          onRetry={() => query.refetch()}
        />
      ) : showEmpty ? (
        <EmptyState headline="Identity not found" guidance="This id doesn't match a known identity." />
      ) : data ? (
        <>
          <DetailBody
            identity={data}
            canAssignOwner={canAssignOwner}
            onAssignOwner={() => setAssignOpen(true)}
          />
          <div className="mt-4 border-t border-border pt-4">
            <DetailFooter
              identity={data}
              canAssignOwner={canAssignOwner}
              onAssignOwner={() => setAssignOpen(true)}
            />
          </div>
          {canAssignOwner && (
            <AssignOwnerDialog identity={data} open={assignOpen} onOpenChange={setAssignOpen} />
          )}
        </>
      ) : null}
    </Drawer>
  );
}
