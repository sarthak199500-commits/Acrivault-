import { useState, type ReactNode } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import {
  ArrowRight,
  GitCompareArrows,
  Link2,
  RefreshCw,
  ShieldX,
  Unlink,
} from 'lucide-react';
import { useIdentity, useRequestRotations } from './queries';
import { CLOUD_LABELS, NHI_TYPE_LABELS, type Identity } from '@/mocks/types';
import { NOW } from '@/mocks/dataset';
import { Drawer } from '@/components/ui/Drawer';
import { RiskPill } from '@/components/ui/RiskPill';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Sparkline } from '@/components/ui/Sparkline';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { CloudGlyph } from '@/components/ui/CloudGlyph';
import { NhiTypeIcon } from '@/components/ui/NhiTypeIcon';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonText, Skeleton } from '@/components/ui/Skeleton';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { useCan } from '@/components/ui/Can';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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

function DetailBody({ identity }: { identity: Identity }) {
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

      {identity.orphaned && identity.orphanReason && (
        <div className="mb-5 rounded-[var(--r-md)] border border-[color-mix(in_srgb,var(--critical)_40%,var(--border))] bg-crit-bg/40 px-3 py-2 text-[length:var(--fs-small)] text-crit-fg">
          Orphaned: {identity.orphanReason}
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
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-[length:var(--fs-small)] font-medium text-text">
                  <CloudGlyph cloud={source.cloud} /> {CLOUD_LABELS[source.cloud]}
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
                        <CloudGlyph cloud={v.cloud} /> {CLOUD_LABELS[v.cloud]}
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

      <Section title={`Relationships · ${identity.relationships.length}`}>
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

function DetailFooter({ identity }: { identity: Identity }) {
  const canRotateStd = useCan('rotate.standard');
  const canRequest = useCan('rotate.request');
  const canQuarantine = useCan('session.quarantine');
  const anyAction = canRotateStd || canRequest || canQuarantine;
  const rotate = useRequestRotations();
  const [confirmQuarantine, setConfirmQuarantine] = useState(false);

  const startRotation = (verb: 'started' | 'requested') =>
    rotate.mutate([identity.id], {
      onSuccess: () =>
        toast(`Rotation ${verb} for ${identity.name}`, {
          tone: 'success',
          description: 'Queued — track it on the Rotate screen.',
        }),
      onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
    });

  if (!anyAction) {
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
      {identity.type === 'ai-agent' && (
        <Link to="/intelligence" className={buttonClasses('ghost', 'sm')}>
          View sessions
        </Link>
      )}
      {canQuarantine && (
        <Button
          size="sm"
          variant="ghost"
          className="text-[var(--crit-fg)]"
          leadingIcon={<ShieldX className="h-3.5 w-3.5" />}
          onClick={() => setConfirmQuarantine(true)}
        >
          Quarantine
        </Button>
      )}
      <ConfirmDialog
        open={confirmQuarantine}
        onOpenChange={setConfirmQuarantine}
        title={`Quarantine ${identity.name}?`}
        description="The identity keeps existing but is blocked from acting until released. Synthetic — no upstream state changes."
        confirmLabel="Quarantine"
        confirmVariant="danger"
        onConfirm={() => {
          setConfirmQuarantine(false);
          toast(`${identity.name} quarantined`, { tone: 'critical' });
        }}
      />
    </div>
  );
}

export function IdentityDetailPanel() {
  const { identityId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const query = useIdentity(identityId);

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
          <DetailBody identity={data} />
          <div className="mt-4 border-t border-border pt-4">
            <DetailFooter identity={data} />
          </div>
        </>
      ) : null}
    </Drawer>
  );
}
