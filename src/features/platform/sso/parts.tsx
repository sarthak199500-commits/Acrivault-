import { useState, type ReactNode } from 'react';
import { ArrowRight, Check, Copy } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/cn';
import type { StepStatus } from '@/lib/sso';

/**
 * Setting up federation is a two-application task, and almost every mistake comes
 * from losing track of which application a field name belongs to. Every field name
 * on this screen is therefore tagged with its owner: Entra's fields read one way,
 * Acrivault's another. The pairing repeats often enough to pay for the legend.
 */
export function EntraChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-[var(--r-xs)] border border-[color-mix(in_srgb,var(--info)_35%,transparent)] bg-info-bg px-1.5 py-0.5 text-[length:var(--fs-micro)] text-info-fg">
      {children}
    </span>
  );
}

export function AcrivaultChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block whitespace-nowrap rounded-[var(--r-xs)] border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-accent-tint px-1.5 py-0.5 text-[length:var(--fs-micro)] text-accent-text">
      {children}
    </span>
  );
}

/**
 * "Copy this value into that field." The arrow is reserved for moving a value
 * between applications — click paths use a chevron instead, so the two can never
 * be confused for one another.
 */
export function Mapping({ from, to }: { from: ReactNode; to: ReactNode }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {from}
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-accent-text" aria-hidden="true" />
      <span className="sr-only">goes into</span>
      {to}
    </span>
  );
}

/** A click path inside a portal, rendered so it cannot read as a value mapping. */
export function Path({ steps }: { steps: string[] }) {
  return (
    <span>
      {steps.map((s, i) => (
        <span key={s}>
          {i > 0 && (
            <span className="mx-1 text-text-tertiary" aria-hidden="true">
              ›
            </span>
          )}
          {s}
        </span>
      ))}
    </span>
  );
}

const STATUS_TONE: Record<StepStatus, BadgeTone> = {
  'not-started': 'neutral',
  waiting: 'warning',
  connected: 'success',
  attention: 'warning',
  failing: 'critical',
};

/**
 * A step's status is always *observed* — a saved form is a claim, and only Entra
 * exercising the connection turns it green.
 */
export function StepStatusPill({ status, label }: { status: StepStatus; label: string }) {
  return <Badge tone={STATUS_TONE[status]}>{label}</Badge>;
}

/** A read-only value the admin has to move into Entra by hand. */
export function CopyField({ label, value }: { label: ReactNode; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div>
      <div className="mb-1 text-[length:var(--fs-small)] font-medium text-text-secondary">{label}</div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-[var(--r-sm)] border border-border bg-surface-2 px-2.5 py-2 font-mono text-[length:var(--fs-small)] text-text-secondary">
          {value}
        </code>
        <IconButton
          label={copied ? 'Copied' : `Copy ${typeof label === 'string' ? label : 'value'}`}
          onClick={() => void copy()}
        >
          {copied ? (
            <Check className={cn('h-4 w-4', 'text-ok-fg')} />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </IconButton>
      </div>
    </div>
  );
}
