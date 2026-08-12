import type { ReactNode } from 'react';
import { SignalZero, ShieldCheck } from 'lucide-react';
import type { MonitoringBaseline } from '@/mocks/types';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { count, pluralize } from '@/lib/format';
import { cn } from '@/lib/cn';

type Tone = 'calm' | 'alert';

/**
 * A radar mid-scan, drawn only while baselines are still forming.
 *
 * The motion is the signal, so it has to stop: at full coverage the caller swaps this
 * for a static shield rather than sweeping forever. A sweep is also the right shape for
 * the timescale — a baseline takes days, and a spinner would promise it finishes in a
 * moment.
 *
 * Reduced motion needs no branch here. globals.css clamps animation-duration under
 * [data-reduced-motion] and prefers-reduced-motion, and because the keyframe is a full
 * turn the wedge parks at its start angle — frozen mid-scan, not hidden.
 */
function RadarSweep({ tone }: { tone: Tone }) {
  const ink = tone === 'alert' ? 'var(--warn-fg)' : 'var(--accent-text)';
  const ring = tone === 'alert' ? 'color-mix(in srgb, var(--warning) 40%, transparent)' : 'var(--accent)';
  const dish = tone === 'alert' ? 'var(--surface-2)' : 'var(--accent-tint)';
  return (
    <svg viewBox="0 0 64 64" className="h-9 w-9 shrink-0" aria-hidden="true">
      <circle cx="32" cy="32" r="27" fill={dish} />
      <circle cx="32" cy="32" r="27" fill="none" stroke={ring} strokeWidth={2} />
      <circle cx="32" cy="32" r="15" fill="none" stroke={ring} strokeWidth={1.5} />
      <g
        style={{
          transformOrigin: '32px 32px',
          animation: 'acv-radar-sweep 3.2s linear infinite',
        }}
      >
        <path d="M32 32 L32 5 A27 27 0 0 1 55 19 Z" fill={ink} opacity={0.5} />
        <path d="M32 32 L32 5" stroke={ink} strokeWidth={2.5} />
      </g>
      <circle cx="32" cy="32" r={3} fill={ink} />
    </svg>
  );
}

/**
 * Coverage as two lines: the number, then the denominator folded into its own label.
 *
 * A fraction is one unbreakable unit — the slash is a legal wrap point, so any slot
 * narrower than the whole thing splits it and orphans the denominator. Stacking removes
 * that risk structurally: only the top line grows with tenant size, and it has the full
 * slot to itself. The slot is fixed so the text beside it keeps one left edge no matter
 * how many digits the tenant has.
 */
function CoverageStat({
  established,
  monitored,
  tone,
}: {
  established: number;
  monitored: number;
  tone: Tone;
}) {
  return (
    <div
      className={cn(
        'w-[126px] shrink-0 border-r pr-3.5',
        tone === 'alert' ? 'border-[color-mix(in_srgb,var(--warning)_40%,transparent)]' : 'border-border',
      )}
    >
      <div
        className={cn(
          'tnum whitespace-nowrap text-[length:var(--fs-h1)] font-semibold leading-tight',
          tone === 'alert' ? 'text-warn-fg' : 'text-text',
        )}
      >
        {count(established)}
      </div>
      <div
        className={cn(
          'tnum whitespace-nowrap text-[length:var(--fs-micro)]',
          tone === 'alert' ? 'text-warn-fg' : 'text-text-tertiary',
        )}
      >
        of {count(monitored)} monitored
      </div>
    </div>
  );
}

function Row({
  tone = 'calm',
  glyph,
  stat,
  title,
  body,
  action,
}: {
  tone?: Tone;
  glyph: ReactNode;
  stat?: ReactNode;
  title: ReactNode;
  body: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card
      className={cn(
        'mb-4',
        tone === 'alert' && 'border-[color-mix(in_srgb,var(--warning)_45%,var(--border))] bg-warn-bg',
      )}
    >
      {/* Wraps below ~800px so the action drops under the copy instead of squeezing it. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        {glyph}
        {stat}
        <div className="min-w-[16rem] flex-1">
          <div
            className={cn(
              'text-[length:var(--fs-small)] font-medium',
              tone === 'alert' ? 'text-warn-fg' : 'text-text',
            )}
          >
            {title}
          </div>
          <p
            className={cn(
              'mt-0.5 text-[length:var(--fs-micro)]',
              tone === 'alert' ? 'text-warn-fg' : 'text-text-secondary',
            )}
          >
            {body}
          </p>
        </div>
        {action}
      </div>
    </Card>
  );
}

function ActionLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 whitespace-nowrap text-[length:var(--fs-small)] text-accent-text hover:underline"
    >
      {children}
    </button>
  );
}

/**
 * How much of the estate monitoring can actually see (FRS 3.7: communicate 'learning'
 * vs 'established' rather than implying full coverage).
 *
 * It leads with the count that can be acted on, not a percentage: at 99% every
 * proportional shape — bar, ring, meter — is indistinguishable from 100%, so a bar here
 * spent the most space carrying the least signal while painting a healthy state amber.
 *
 * The strip renders alongside an empty feed as well as a populated one. An empty feed is
 * where coverage matters most: 'no open alerts' over partial coverage is not all-clear,
 * it means most of the estate is unobserved.
 */
export function BaselineStrip({
  baseline,
  loading,
  failed,
  affectedAlerts,
  onShowAffected,
  onRetry,
}: {
  baseline: MonitoringBaseline | undefined;
  loading: boolean;
  failed: boolean;
  /** Open alerts raised while their identity's baseline was still forming. */
  affectedAlerts: number;
  onShowAffected: () => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <Card className="mb-4">
        <div className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="w-[126px] shrink-0 border-r border-border pr-3.5">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="mt-1.5 h-2.5 w-24" />
          </div>
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="mt-2 h-2.5 w-3/4" />
          </div>
        </div>
      </Card>
    );
  }

  // Say coverage is unknown. Implying a settled baseline we cannot confirm is the one
  // thing this strip exists to prevent, so it never falls back to a reassuring default.
  if (failed || !baseline) {
    return (
      <Row
        glyph={
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2">
            <SignalZero className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
          </span>
        }
        stat={
          <div className="w-[126px] shrink-0 border-r border-border pr-3.5">
            <div className="text-[length:var(--fs-h1)] font-semibold leading-tight text-text-tertiary">—</div>
            <div className="text-[length:var(--fs-micro)] text-text-tertiary">coverage unknown</div>
          </div>
        }
        title="Baseline coverage unavailable"
        body="Treat the alerts below as unqualified until this loads."
        action={<ActionLink onClick={onRetry}>Retry</ActionLink>}
      />
    );
  }

  // Nothing onboarded yet: the screen's own empty state covers it, and "0 of 0" is noise.
  if (baseline.monitored === 0) return null;

  const established = Math.max(0, baseline.monitored - baseline.learning);

  // No baseline anywhere. The only state that raises its voice, because here an empty
  // feed reads as safety when it actually means detection is not running yet.
  if (established === 0) {
    return (
      <Row
        tone="alert"
        glyph={<RadarSweep tone="alert" />}
        stat={<CoverageStat established={0} monitored={baseline.monitored} tone="alert" />}
        title={`No baseline yet — the first completes in ${baseline.windowDays} days`}
        body="An empty alert feed does not mean nothing is wrong. Anomaly detection is not active yet."
      />
    );
  }

  if (baseline.state === 'established') {
    return (
      <Row
        glyph={
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--success)_16%,transparent)]">
            <ShieldCheck className="h-[18px] w-[18px] text-[var(--success)]" aria-hidden="true" />
          </span>
        }
        stat={<CoverageStat established={established} monitored={baseline.monitored} tone="calm" />}
        title="Baseline established"
        body="Every alert below reflects a real deviation from settled normal behavior."
      />
    );
  }

  return (
    <Row
      glyph={<RadarSweep tone="calm" />}
      stat={<CoverageStat established={established} monitored={baseline.monitored} tone="calm" />}
      title="Learning normal behaviour"
      body={
        affectedAlerts > 0
          ? `${pluralize(baseline.learning, 'identity', 'identities')} ${baseline.learning === 1 ? 'is' : 'are'} still forming a ${baseline.windowDays}-day baseline, so their alerts may be incomplete.`
          : `${pluralize(baseline.learning, 'identity', 'identities')} ${baseline.learning === 1 ? 'is' : 'are'} still forming a ${baseline.windowDays}-day baseline. ${baseline.learning === 1 ? 'It has' : 'None has'} raised an alert yet.`
      }
      // Hidden at zero on purpose: identities commonly learn without raising anything,
      // and a link promising alerts that filters to an empty feed is a dead end.
      action={
        affectedAlerts > 0 ? (
          <ActionLink onClick={onShowAffected}>
            Show {count(affectedAlerts)} {affectedAlerts === 1 ? 'alert' : 'alerts'} →
          </ActionLink>
        ) : undefined
      }
    />
  );
}
