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
import azureLogo from '@/assets/logos/azure.svg';
import googleCloudLogo from '@/assets/logos/google-cloud.svg';

const PROVIDER_LOGO: Record<'azure' | 'gcp', string> = {
  azure: azureLogo,
  gcp: googleCloudLogo,
};

// AWS has no icon-only brand mark (its official kit only offers the full "aws"
// wordmark + swoosh lockup), so unlike Azure/GCP it's inlined rather than
// imported as an <img>: the text needs to flip white/black per theme, which
// only works via currentColor on markup that lives in the page (mirrors
// Logo.tsx's own wordmark). The orange swoosh keeps its official fixed color —
// it already reads fine on both themes. Path data is verbatim from the
// official lockup; the only edits are that one fill and a tight viewBox
// (0 0 48 48 -> 0 11 48 29, the mark's real content bounds, measured via
// getBBox()) so it isn't tiny inside dead vertical margin at icon size.
function AwsMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 11 48 29" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M13.527,21.529c0,0.597,0.064,1.08,0.176,1.435c0.128,0.355,0.287,0.742,0.511,1.161 c0.08,0.129,0.112,0.258,0.112,0.371c0,0.161-0.096,0.322-0.303,0.484l-1.006,0.677c-0.144,0.097-0.287,0.145-0.415,0.145 c-0.16,0-0.319-0.081-0.479-0.226c-0.224-0.242-0.415-0.5-0.575-0.758c-0.16-0.274-0.319-0.58-0.495-0.951 c-1.245,1.483-2.81,2.225-4.694,2.225c-1.341,0-2.411-0.387-3.193-1.161s-1.181-1.806-1.181-3.096c0-1.37,0.479-2.483,1.453-3.321 s2.267-1.258,3.911-1.258c0.543,0,1.102,0.048,1.692,0.129s1.197,0.21,1.836,0.355v-1.177c0-1.225-0.255-2.08-0.75-2.58 c-0.511-0.5-1.373-0.742-2.602-0.742c-0.559,0-1.133,0.064-1.724,0.21c-0.591,0.145-1.165,0.322-1.724,0.548 c-0.255,0.113-0.447,0.177-0.559,0.21c-0.112,0.032-0.192,0.048-0.255,0.048c-0.224,0-0.335-0.161-0.335-0.5v-0.79 c0-0.258,0.032-0.451,0.112-0.564c0.08-0.113,0.224-0.226,0.447-0.339c0.559-0.29,1.229-0.532,2.012-0.726 c0.782-0.21,1.612-0.306,2.49-0.306c1.9,0,3.289,0.435,4.183,1.306c0.878,0.871,1.325,2.193,1.325,3.966v5.224H13.527z M7.045,23.979c0.527,0,1.07-0.097,1.644-0.29c0.575-0.193,1.086-0.548,1.517-1.032c0.255-0.306,0.447-0.645,0.543-1.032 c0.096-0.387,0.16-0.855,0.16-1.403v-0.677c-0.463-0.113-0.958-0.21-1.469-0.274c-0.511-0.064-1.006-0.097-1.501-0.097 c-1.07,0-1.852,0.21-2.379,0.645s-0.782,1.048-0.782,1.854c0,0.758,0.192,1.322,0.591,1.709 C5.752,23.786,6.311,23.979,7.045,23.979z M19.865,25.721c-0.287,0-0.479-0.048-0.607-0.161c-0.128-0.097-0.239-0.322-0.335-0.629 l-3.752-12.463c-0.096-0.322-0.144-0.532-0.144-0.645c0-0.258,0.128-0.403,0.383-0.403h1.565c0.303,0,0.511,0.048,0.623,0.161 c0.128,0.097,0.223,0.322,0.319,0.629l2.682,10.674l2.49-10.674c0.08-0.322,0.176-0.532,0.303-0.629 c0.128-0.097,0.351-0.161,0.639-0.161h1.277c0.303,0,0.511,0.048,0.639,0.161c0.128,0.097,0.239,0.322,0.303,0.629l2.522,10.803 l2.762-10.803c0.096-0.322,0.208-0.532,0.319-0.629c0.128-0.097,0.335-0.161,0.623-0.161h1.485c0.255,0,0.399,0.129,0.399,0.403 c0,0.081-0.016,0.161-0.032,0.258s-0.048,0.226-0.112,0.403l-3.847,12.463c-0.096,0.322-0.208,0.532-0.335,0.629 s-0.335,0.161-0.607,0.161h-1.373c-0.303,0-0.511-0.048-0.639-0.161c-0.128-0.113-0.239-0.322-0.303-0.645l-2.474-10.4 L22.18,24.915c-0.08,0.322-0.176,0.532-0.303,0.645c-0.128,0.113-0.351,0.161-0.639,0.161H19.865z M40.379,26.156 c-0.83,0-1.66-0.097-2.458-0.29c-0.798-0.193-1.421-0.403-1.836-0.645c-0.255-0.145-0.431-0.306-0.495-0.451 c-0.064-0.145-0.096-0.306-0.096-0.451v-0.822c0-0.339,0.128-0.5,0.367-0.5c0.096,0,0.192,0.016,0.287,0.048 c0.096,0.032,0.239,0.097,0.399,0.161c0.543,0.242,1.133,0.435,1.756,0.564c0.639,0.129,1.261,0.193,1.9,0.193 c1.006,0,1.788-0.177,2.331-0.532c0.543-0.355,0.83-0.871,0.83-1.532c0-0.451-0.144-0.822-0.431-1.129 c-0.287-0.306-0.83-0.58-1.612-0.838l-2.315-0.726c-1.165-0.371-2.027-0.919-2.554-1.645c-0.527-0.709-0.798-1.499-0.798-2.338 c0-0.677,0.144-1.274,0.431-1.79s0.671-0.967,1.149-1.322c0.479-0.371,1.022-0.645,1.66-0.838C39.533,11.081,40.203,11,40.906,11 c0.351,0,0.718,0.016,1.07,0.064c0.367,0.048,0.702,0.113,1.038,0.177c0.319,0.081,0.623,0.161,0.91,0.258s0.511,0.193,0.671,0.29 c0.224,0.129,0.383,0.258,0.479,0.403c0.096,0.129,0.144,0.306,0.144,0.532v0.758c0,0.339-0.128,0.516-0.367,0.516 c-0.128,0-0.335-0.064-0.607-0.193c-0.91-0.419-1.932-0.629-3.065-0.629c-0.91,0-1.628,0.145-2.123,0.451 c-0.495,0.306-0.75,0.774-0.75,1.435c0,0.451,0.16,0.838,0.479,1.145c0.319,0.306,0.91,0.613,1.756,0.887l2.267,0.726 c1.149,0.371,1.98,0.887,2.474,1.548s0.734,1.419,0.734,2.257c0,0.693-0.144,1.322-0.415,1.87 c-0.287,0.548-0.671,1.032-1.165,1.419c-0.495,0.403-1.086,0.693-1.772,0.903C41.943,26.043,41.193,26.156,40.379,26.156z"
      />
      <path
        fill="#f90"
        d="M43.396,33.992c-5.252,3.918-12.883,5.998-19.445,5.998c-9.195,0-17.481-3.434-23.739-9.142 c-0.495-0.451-0.048-1.064,0.543-0.709c6.769,3.966,15.118,6.369,23.755,6.369c5.827,0,12.229-1.225,18.119-3.741 C43.508,32.364,44.258,33.347,43.396,33.992z M45.583,31.477c-0.671-0.871-4.438-0.419-6.146-0.21 c-0.511,0.064-0.591-0.387-0.128-0.726c3.001-2.128,7.934-1.516,8.509-0.806c0.575,0.726-0.16,5.708-2.969,8.094 c-0.431,0.371-0.846,0.177-0.655-0.306C44.833,35.927,46.254,32.331,45.583,31.477z"
      />
    </svg>
  );
}

/** Provider identity icon: the real brand mark for every cloud, sized to match. */
function ProviderMark({ cloud }: { cloud: CloudT }) {
  if (cloud === 'aws') {
    return <AwsMark className="h-4 w-auto shrink-0 text-text" />;
  }
  return <img src={PROVIDER_LOGO[cloud]} alt="" className="h-4 w-4 shrink-0" />;
}

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
