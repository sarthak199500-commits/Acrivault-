import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { CLOUDS, CLOUD_LABELS, NHI_TYPES, NHI_TYPE_LABELS, type Cloud as CloudT, type NhiType } from '@/mocks/types';
import { discoveryScanTargets } from '@/mocks/dataset';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/ui/Card';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { StatusDot } from '@/components/ui/StatusDot';
import { PROVIDER_LABEL } from '@/components/ui/ProviderBadge';
import { NhiTypeIcon } from '@/components/ui/NhiTypeIcon';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { useCan } from '@/components/ui/Can';
import { announce } from '@/lib/a11y';
import { count } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/ui';
import { CONNECTION_TONE as CONN_TONE, type ConnectionState as ConnState } from '@/lib/tones';
import { ProviderMark } from '@/components/ui/ProviderMark';

const STEPS = [
  { id: 'connect', label: 'Connect' },
  { id: 'scan', label: 'Scan' },
  { id: 'review', label: 'Review' },
];

// Per-type discovery targets come from `discoveryScanTargets()` — the same seeded
// dataset the dashboard reports over — so the scan total reconciles with the
// dashboard total exactly. ASSUMPTION: real connection/scopes/scan are Architect-owned.

const TRUST_POINTS = ['Read-only access', 'Agentless', 'Nothing installed', 'Nothing changed'];

/** Compact, repeatable read-only reassurance kept visible through Scan and Review. */
function ReadOnlyNote() {
  return (
    <p className="inline-flex items-center gap-1.5 text-[length:var(--fs-micro)] text-text-tertiary">
      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
      Read-only discovery — nothing in your clouds is changed.
    </p>
  );
}

/** Persistent trust reassurance — read-only, agentless, non-invasive — shown on
 *  the Connect step regardless of how many clouds are already connected. */
function TrustStrip() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--r-md)] border border-border bg-surface-2 px-3.5 py-2.5">
      <span className="inline-flex items-center gap-2 text-[length:var(--fs-small)] font-medium text-text">
        <ShieldCheck className="h-4 w-4 text-accent-text" aria-hidden="true" />
        Safe by design
      </span>
      <span className="hidden h-4 w-px bg-border sm:inline-block" aria-hidden="true" />
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {TRUST_POINTS.map((p) => (
          <li key={p} className="inline-flex items-center gap-1.5 text-[length:var(--fs-small)] text-text-secondary">
            <Check className="h-3.5 w-3.5 shrink-0 text-ok-fg" aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConnectStep({
  states,
  canConnect,
  onConnect,
}: {
  states: Record<CloudT, ConnState>;
  canConnect: boolean;
  onConnect: (cloud: CloudT) => void;
}) {
  const connectable = CLOUDS.filter((c) => states[c] === 'disconnected' || states[c] === 'error');
  const anyConnecting = CLOUDS.some((c) => states[c] === 'connecting');
  const anyConnected = CLOUDS.some((c) => states[c] === 'connected');

  return (
    <div className="space-y-4">
      <TrustStrip />
      {canConnect && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-[length:var(--fs-small)] text-text-secondary">
            {anyConnected
              ? 'At least one cloud is connected — continue when you’re ready, or add more.'
              : 'Connect at least one cloud to continue. You can add the others now or later.'}
          </p>
          {connectable.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              disabled={anyConnecting}
              onClick={() => connectable.forEach(onConnect)}
            >
              {connectable.length === CLOUDS.length ? 'Connect all' : 'Connect remaining'}
            </Button>
          )}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
      {CLOUDS.map((cloud) => {
        const state = states[cloud];
        return (
          <Card key={cloud} inset className="flex flex-col">
            <CardBody className="flex flex-1 flex-col items-start gap-3 pt-5">
              {/* Short provider label (PROVIDER_LABEL, e.g. "GCP" not "Google Cloud")
                  keeps every card header on one line, so the row can center normally
                  instead of guarding against a wrap. */}
              <div className="flex w-full items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-2 font-medium text-text">
                  <ProviderMark cloud={cloud} />
                  {PROVIDER_LABEL[cloud]}
                </span>
                <span className="inline-flex h-5 shrink-0 items-center gap-1.5 text-[length:var(--fs-small)] text-text-secondary">
                  <StatusDot tone={CONN_TONE[state]} pulse={state === 'connecting'} />
                  <span className="capitalize">{state}</span>
                </span>
              </div>
              <p className="text-[length:var(--fs-small)] text-text-tertiary">
                {state === 'connected'
                  ? 'Connected (read-only). Ready to scan.'
                  : state === 'error'
                    ? 'Couldn’t connect — the credentials were rejected or the required read-only discovery scopes are missing.'
                    : 'Authorize read-only discovery access.'}
              </p>
              <div className="mt-auto w-full pt-1">
                {!canConnect ? (
                  <RoleRestricted inline note="Only a Security Admin can connect clouds." />
                ) : state === 'connected' ? (
                  // A freshly-connected cloud is a confirmation, not an action — no
                  // "Reconnect" button to avoid an accidental, pointless re-auth.
                  <div className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--r-sm)] border border-border bg-surface-2 px-3 py-1.5 text-[length:var(--fs-small)] font-medium text-text-secondary">
                    <Check className="h-4 w-4 shrink-0 text-ok-fg" aria-hidden="true" />
                    Connected
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    loading={state === 'connecting'}
                    onClick={() => onConnect(cloud)}
                    leadingIcon={state === 'error' ? <RefreshCw className="h-4 w-4" /> : undefined}
                    aria-label={`${state === 'error' ? 'Retry connecting' : 'Connect'} ${CLOUD_LABELS[cloud]}`}
                  >
                    {state === 'error' ? 'Retry' : 'Connect'}
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        );
      })}
      </div>
    </div>
  );
}

function ScanStep({
  counts,
  scanning,
  total,
  targets,
}: {
  counts: Record<NhiType, number>;
  scanning: boolean;
  total: number;
  targets: Record<NhiType, number>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[length:var(--fs-small)] text-text-secondary">
          {scanning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden="true" /> Discovering identities…
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-[var(--success)]" aria-hidden="true" /> Scan complete
            </>
          )}
        </span>
        <span className="tnum text-[length:var(--fs-h2)] font-semibold text-text">{count(total)}</span>
      </div>
      <ul className="space-y-2">
        {NHI_TYPES.map((type) => {
          const value = counts[type];
          // While scanning, the bar fills toward each type's target; once complete it
          // becomes a share-of-total bar so the visualization stays meaningful at rest
          // instead of every bar sitting identically full.
          const pct = scanning
            ? targets[type]
              ? (value / targets[type]) * 100
              : 0
            : total
              ? (value / total) * 100
              : 0;
          return (
            <li key={type} className="flex items-center gap-3">
              <span className="flex w-44 items-center gap-2 text-[length:var(--fs-small)] text-text-secondary">
                <NhiTypeIcon type={type} className="h-4 w-4 text-text-tertiary" />
                {NHI_TYPE_LABELS[type]}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full rounded-full bg-accent transition-[width] duration-300"
                  style={{ width: `${Math.min(100, Math.round(pct))}%` }}
                />
              </span>
              <span className="tnum w-12 text-right text-[length:var(--fs-small)] text-text">{count(value)}</span>
            </li>
          );
        })}
      </ul>
      {!scanning && <ReadOnlyNote />}
    </div>
  );
}

function ReviewStep({ counts, total }: { counts: Record<NhiType, number>; total: number }) {
  return (
    <div className="space-y-4">
      <p className="text-[length:var(--fs-body)] text-text-secondary">
        Discovery found <span className="tnum font-semibold text-text">{count(total)}</span> correlated identities.
        AI agents lead — they are the reason Acrivault exists.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {NHI_TYPES.map((type, i) => (
          <div
            key={type}
            className={cn(
              'rounded-[var(--r-md)] border p-3',
              i === 0 ? 'border-border-strong bg-accent-tint' : 'border-border bg-surface-2',
            )}
          >
            <div className="flex items-center gap-2 text-[length:var(--fs-small)] text-text-secondary">
              <NhiTypeIcon type={type} className="h-4 w-4" />
              {NHI_TYPE_LABELS[type]}
            </div>
            <div className="tnum mt-1 text-[length:var(--fs-h1)] font-semibold text-text">{count(counts[type])}</div>
          </div>
        ))}
      </div>
      <ReadOnlyNote />
    </div>
  );
}

export function OnboardingScreen() {
  const navigate = useNavigate();
  const canConnect = useCan('connector.manage');
  const setDiscovered = useUiStore((s) => s.setDiscovered);
  const [step, setStep] = useState(0);
  const [conn, setConn] = useState<Record<CloudT, ConnState>>({
    aws: 'disconnected',
    gcp: 'disconnected',
    azure: 'disconnected',
  });
  const [counts, setCounts] = useState<Record<NhiType, number>>({
    'ai-agent': 0,
    'service-account': 0,
    'api-key': 0,
    'oauth-token': 0,
    'workload-identity': 0,
  });
  const [scanning, setScanning] = useState(false);
  const timers = useRef<number[]>([]);
  // Targets mirror the dashboard's seeded per-type counts, so the discovery total
  // and the dashboard total are identical (and both scale with `?scale=`).
  const targets = useMemo(() => discoveryScanTargets(), []);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const anyConnected = Object.values(conn).some((s) => s === 'connected');
  const total = NHI_TYPES.reduce((sum, t) => sum + counts[t], 0);

  const connect = useCallback((cloud: CloudT) => {
    setConn((c) => ({ ...c, [cloud]: 'connecting' }));
    const t = window.setTimeout(() => {
      // Mostly succeeds; small chance of a simulated error to exercise that state.
      const ok = Math.random() > 0.12;
      setConn((c) => ({ ...c, [cloud]: ok ? 'connected' : 'error' }));
      announce(ok ? `${CLOUD_LABELS[cloud]} connected` : `${CLOUD_LABELS[cloud]} connection failed`);
    }, 1100);
    timers.current.push(t);
  }, []);

  const startScan = useCallback(() => {
    setStep(1);
    setScanning(true);
    announce('Scan started');
    const ticks = 28;
    for (let i = 1; i <= ticks; i++) {
      const t = window.setTimeout(() => {
        setCounts(() => {
          const next = {} as Record<NhiType, number>;
          for (const type of NHI_TYPES) next[type] = Math.round((targets[type] * i) / ticks);
          return next;
        });
        if (i === ticks) {
          setScanning(false);
          // Discovery is done — the tenant now has data; the dashboard populates.
          setDiscovered(true);
          announce('Scan complete');
        }
      }, i * 90);
      timers.current.push(t);
    }
  }, [setDiscovered, targets]);

  // Onboarding is admin-only: a person reaches it only with the Connect capability
  // (Tenant Admin or Security Admin). Everyone else is gated out, not walked through.
  if (!canConnect) {
    return (
      <div className="mx-auto max-w-3xl">
        <ScreenHeader eyebrow="Get started" title="Onboarding & Connect" description="Connect your clouds, run a discovery scan, and review what Acrivault found." />
        <Card>
          <CardBody className="space-y-4 pt-5">
            <RoleRestricted note="Onboarding is available to administrators. Ask a Tenant Admin or Security Admin to connect your clouds." />
            <a href="/" className={buttonClasses('secondary', 'sm')} onClick={(e) => { e.preventDefault(); navigate('/'); }}>
              Go to dashboard
            </a>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Continue is gated until at least one cloud connects. A native disabled <button>
  // emits no pointer events, so the explanatory tooltip lives on an enabled wrapper;
  // the aria-label carries the same reason for assistive tech that skips the title.
  const continueToScan = (
    <Button
      size="sm"
      disabled={!anyConnected}
      aria-label={anyConnected ? undefined : 'Continue to scan. Connect at least one cloud to continue.'}
      onClick={startScan}
    >
      Continue to scan
    </Button>
  );

  return (
    <div className="mx-auto max-w-3xl">
      <ScreenHeader eyebrow="Get started" title="Onboarding & Connect" description="Connect your clouds, run a discovery scan, and review what Acrivault found." />

      <Card elevated>
        <CardHeader title={<Stepper steps={STEPS} current={step} currentComplete={step === 1 && !scanning} />} />
        <CardBody className="pt-2">
          {step === 0 && <ConnectStep states={conn} canConnect={canConnect} onConnect={connect} />}
          {step === 1 && <ScanStep counts={counts} scanning={scanning} total={total} targets={targets} />}
          {step === 2 && <ReviewStep counts={counts} total={total} />}
        </CardBody>
        <CardFooter className="justify-between">
          {step === 0 ? (
            // The first step has no previous step — offer an explicit exit rather
            // than a dead, disabled "Back".
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              Exit setup
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Back
            </Button>
          )}
          {step === 0 &&
            (anyConnected ? (
              continueToScan
            ) : (
              <span title="Connect at least one cloud to continue." className="inline-flex">
                {continueToScan}
              </span>
            ))}
          {step === 1 && (
            <Button size="sm" disabled={scanning} onClick={() => setStep(2)}>
              Review results
            </Button>
          )}
          {step === 2 && (
            <a href="/" className={buttonClasses('primary', 'sm')} onClick={(e) => { e.preventDefault(); navigate('/'); }}>
              Go to dashboard
            </a>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
