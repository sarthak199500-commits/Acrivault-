import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCircle2, LifeBuoy, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { CLOUDS, CLOUD_LABELS, NHI_TYPES, NHI_TYPE_LABELS, type Cloud as CloudT, type NhiType } from '@/mocks/types';
import { discoveryScanTargets, getDataset } from '@/mocks/dataset';
import { screenHeaderProps } from '@/app/nav';
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
import { CloudConnectionDialog } from './CloudConnectionDialog';
import type { FieldValues } from './connectors';
import { HelpRequestDialog } from './HelpRequestDialog';

const STEPS = [
  { id: 'connect', label: 'Connect' },
  { id: 'scan', label: 'Scan' },
  { id: 'review', label: 'Review' },
];

// Per-type discovery targets come from `discoveryScanTargets()` — the same seeded
// dataset the dashboard reports over — so the scan total reconciles with the
// dashboard total exactly. ASSUMPTION: real connection/scopes/scan are Architect-owned.

const TRUST_POINTS = ['Read-only access', 'Agentless', 'Nothing installed', 'Nothing changed'];

/** How long the simulated console handoff takes to report back. */
const HANDOFF_MS = 4000;
/** Before this, "Check now" honestly answers "not finished yet". */
const HANDOFF_MIN_MS = 1500;

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
  onManage,
}: {
  states: Record<CloudT, ConnState>;
  canConnect: boolean;
  onConnect: (cloud: CloudT) => void;
  onManage: (cloud: CloudT) => void;
}) {
  const anyConnected = CLOUDS.some((c) => states[c] === 'connected');

  return (
    <div className="space-y-4">
      <TrustStrip />
      {/* Each cloud is connected from its own card — there is no bulk action, so the
          rule for proceeding is stated here in text instead. */}
      {canConnect && (
        <p className="text-[length:var(--fs-small)] text-text-secondary">
          {anyConnected
            ? 'At least one cloud is connected — continue when you’re ready, or add more.'
            : 'Connect at least one cloud to continue. You can add the others now or later.'}
        </p>
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
                  // `connector.manage` is Tenant Admin and above — permissions.ts
                  // withholds it from Security Admin, so naming that role here was
                  // telling people to ask the one person who cannot help them.
                  <RoleRestricted inline note="Only a Tenant Admin can connect clouds." />
                ) : state === 'connected' ? (
                  // Connecting is reversible, so a connected cloud is not a dead end:
                  // this is the way back in to check health or disconnect.
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => onManage(cloud)}
                    leadingIcon={<Check className="h-4 w-4 text-ok-fg" />}
                    aria-label={`View ${CLOUD_LABELS[cloud]} connection details`}
                  >
                    Connected
                  </Button>
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
  const role = useUiStore((s) => s.role);
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
  const [connValues, setConnValues] = useState<Partial<Record<CloudT, FieldValues>>>({});
  /** Which cloud's dialog is open, and whether it opened to connect or to manage. */
  const [dialog, setDialog] = useState<{ cloud: CloudT; mode: 'connect' | 'manage' } | null>(null);
  const [scanning, setScanning] = useState(false);
  const timers = useRef<number[]>([]);
  /** When each in-flight handoff started, so "Check now" can answer honestly. */
  const handoffs = useRef(new Map<CloudT, number>());
  const [helpOpen, setHelpOpen] = useState(false);
  // Targets mirror the dashboard's seeded per-type counts, so the discovery total
  // and the dashboard total are identical (and both scale with `?scale=`).
  const targets = useMemo(() => discoveryScanTargets(), []);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const anyConnected = Object.values(conn).some((s) => s === 'connected');
  const total = NHI_TYPES.reduce((sum, t) => sum + counts[t], 0);
  // Per-cloud attribution only exists once the scan has run; before that the
  // connection dialog says so rather than showing a confident zero.
  const scanned = total > 0 && !scanning;
  // An identity correlated across two clouds is seen in both, so these counts
  // overlap rather than partition — hence "seen here", not a share of the total.
  const cloudCounts = useMemo(() => {
    if (!scanned) return undefined;
    const out: Record<CloudT, number> = { aws: 0, gcp: 0, azure: 0 };
    for (const identity of getDataset().identities) {
      const clouds = new Set(identity.sources.map((src) => src.cloud));
      for (const cloud of clouds) out[cloud] += 1;
    }
    return out;
  }, [scanned]);

  // The handoff timer lives here, not in the dialog, so closing the dialog mid-setup
  // genuinely keeps the connection running — which is what the dialog copy promises.
  const finish = useCallback((cloud: CloudT) => {
    handoffs.current.delete(cloud);
    setConn((c) => (c[cloud] === 'connecting' ? { ...c, [cloud]: 'connected' } : c));
  }, []);

  const startHandoff = useCallback(
    (cloud: CloudT, values: FieldValues) => {
      setConnValues((v) => ({ ...v, [cloud]: values }));
      setConn((c) => ({ ...c, [cloud]: 'connecting' }));
      handoffs.current.set(cloud, Date.now());
      const t = window.setTimeout(() => finish(cloud), HANDOFF_MS);
      timers.current.push(t);
    },
    [finish],
  );

  const cancelHandoff = useCallback((cloud: CloudT) => {
    handoffs.current.delete(cloud);
    setConn((c) => ({ ...c, [cloud]: 'disconnected' }));
  }, []);

  /** True when the customer's console has had long enough to report back. */
  const checkNow = useCallback(
    (cloud: CloudT) => {
      const started = handoffs.current.get(cloud);
      if (started === undefined || Date.now() - started < HANDOFF_MIN_MS) return false;
      finish(cloud);
      return true;
    },
    [finish],
  );

  const disconnect = useCallback((cloud: CloudT) => {
    handoffs.current.delete(cloud);
    // Discovery stops; identities already found stay put, exactly as the dialog says.
    setConn((c) => ({ ...c, [cloud]: 'disconnected' }));
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

  const helpButton = (
    <Button variant="secondary" size="sm" leadingIcon={<LifeBuoy className="h-4 w-4" />} onClick={() => setHelpOpen(true)}>
      Need help
    </Button>
  );

  // Exactly what "Include my setup details" attaches — enumerated so the checkbox
  // can show it rather than asking anyone to trust a summary.
  const helpContext = [
    { label: 'Screen', value: 'Onboarding & Connect' },
    { label: 'Step', value: STEPS[step].label },
    { label: 'Clouds', value: CLOUDS.map((c) => `${PROVIDER_LABEL[c]} ${conn[c]}`).join(', ') },
    { label: 'Viewing as', value: role },
  ];

  const helpDialog = (
    <HelpRequestDialog open={helpOpen} onOpenChange={setHelpOpen} context={helpContext} />
  );

  // Onboarding is admin-only: a person reaches it only with the Connect capability
  // (Tenant Admin or Security Admin). Everyone else is gated out, not walked through.
  if (!canConnect) {
    return (
      <div className="mx-auto max-w-3xl">
        <ScreenHeader {...screenHeaderProps('/onboarding')} description="Connect your clouds, run a discovery scan, and review what Acrivault found." />
        <Card>
          <CardBody className="space-y-4 pt-5">
            {/* This card has no stepper header to hang the action off, so the button
                is mirrored here — this is the screen that has just told someone they
                cannot proceed, which makes it the worst place to hide help. */}
            <div className="flex items-start justify-between gap-4">
              <RoleRestricted note="Onboarding is available to administrators. Ask a Tenant Admin or Security Admin to connect your clouds." />
              <div className="shrink-0">{helpButton}</div>
            </div>
            <a href="/" className={buttonClasses('secondary', 'sm')} onClick={(e) => { e.preventDefault(); navigate('/'); }}>
              Go to dashboard
            </a>
          </CardBody>
        </Card>
        {helpDialog}
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
      <ScreenHeader {...screenHeaderProps('/onboarding')} description="Connect your clouds, run a discovery scan, and review what Acrivault found." />

      <Card elevated>
        <CardHeader
          title={<Stepper steps={STEPS} current={step} currentComplete={step === 1 && !scanning} />}
          action={helpButton}
        />
        <CardBody className="pt-2">
          {step === 0 && (
            <ConnectStep
              states={conn}
              canConnect={canConnect}
              onConnect={(cloud) => setDialog({ cloud, mode: 'connect' })}
              onManage={(cloud) => setDialog({ cloud, mode: 'manage' })}
            />
          )}
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

      {helpDialog}

      {dialog && (
        <CloudConnectionDialog
          cloud={dialog.cloud}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          mode={dialog.mode}
          status={conn[dialog.cloud]}
          values={connValues[dialog.cloud]}
          identitiesFound={cloudCounts?.[dialog.cloud]}
          onSubmit={(values) => startHandoff(dialog.cloud, values)}
          onCancel={() => cancelHandoff(dialog.cloud)}
          onCheckNow={() => checkNow(dialog.cloud)}
          onDisconnect={() => disconnect(dialog.cloud)}
        />
      )}
    </div>
  );
}
