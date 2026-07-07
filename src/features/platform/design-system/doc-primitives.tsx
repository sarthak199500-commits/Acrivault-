import { type ReactNode } from 'react';
import { Accessibility } from 'lucide-react';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { Button, type ButtonVariant } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RAMP_STOPS } from './foundations-data';

/* ----------------------------------------------------------------- helpers */

export function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-3">
        <h2 className="text-[length:var(--fs-h1)] font-semibold leading-[var(--lh-h1)] text-text">{title}</h2>
        {description && <p className="mt-0.5 text-[length:var(--fs-small)] text-text-secondary">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** A labeled component specimen with a consistent frame. */
export function Spec({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <Card>
      <CardHeader title={label} />
      <CardBody className={className ?? 'flex flex-wrap items-center gap-3'}>{children}</CardBody>
    </Card>
  );
}

/* ------------------------------------------ doc scaffolding (states + notes) */

export type DocStatus = 'stable' | 'experimental' | 'deprecated';

export const STATUS_TONE: Record<DocStatus, { tone: 'success' | 'warning' | 'critical'; label: string }> = {
  stable: { tone: 'success', label: 'Stable' },
  experimental: { tone: 'warning', label: 'Experimental' },
  deprecated: { tone: 'critical', label: 'Deprecated' },
};

export function StatusTag({ status }: { status: DocStatus }) {
  const { tone, label } = STATUS_TONE[status];
  return <Badge tone={tone}>{label}</Badge>;
}

/** A documented component card: header (+ status) over a usage / accessibility note. */
export function DocCard({
  title,
  description,
  status = 'stable',
  usage,
  a11y,
  bodyClassName,
  className,
  children,
}: {
  title: string;
  description?: string;
  status?: DocStatus;
  usage?: ReactNode;
  a11y?: ReactNode;
  bodyClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader title={title} description={description} action={<StatusTag status={status} />} />
      <CardBody className={bodyClassName ?? 'flex flex-col gap-5'}>{children}</CardBody>
      {(usage || a11y) && (
        <CardFooter className="flex-col items-start gap-1.5">
          {usage && (
            <p className="text-[length:var(--fs-small)] text-text-secondary">
              <span className="font-medium text-text">Usage. </span>
              {usage}
            </p>
          )}
          {a11y && (
            <p className="inline-flex items-start gap-1.5 text-[length:var(--fs-small)] text-text-tertiary">
              <Accessibility className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{a11y}</span>
            </p>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

export type StateCell = { label: string; node: ReactNode; note?: string };

/** A labeled grid of a component's interaction states (default / hover / focus / …). */
export function StateMatrix({ cells }: { cells: StateCell[] }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-4">
      {cells.map((c) => (
        <div key={c.label} className="flex min-w-[84px] flex-col items-start gap-2">
          <span className="eyebrow">{c.label}</span>
          <div className="flex min-h-9 items-center">{c.node}</div>
          {c.note && (
            <span className="max-w-[150px] text-[length:var(--fs-micro)] leading-[var(--lh-micro)] text-text-tertiary">
              {c.note}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** Static class reproducing the app-wide :focus-visible ring, for the focus specimen. */
export const FOCUS_RING = 'outline outline-2 outline-offset-2 outline-[var(--accent)]';

/** Per-variant classes that statically reproduce the real hover / active tokens. */
export const BTN_FORCE: Record<ButtonVariant, { hover: string; active: string }> = {
  primary: { hover: '!bg-accent', active: '!bg-accent-press' },
  secondary: { hover: '!bg-surface-hover', active: '!bg-surface' },
  ghost: { hover: '!bg-surface-hover !text-text', active: '!bg-surface-hover' },
  danger: { hover: '!brightness-110', active: '!brightness-95' },
};

/** The full default → hover → focus → active → disabled → loading row for one variant. */
export function ButtonStates({ variant, label }: { variant: ButtonVariant; label: string }) {
  const f = BTN_FORCE[variant];
  return (
    <div>
      <span className="mb-2 block text-[length:var(--fs-small)] font-medium text-text-secondary">{label}</span>
      <StateMatrix
        cells={[
          { label: 'Default', node: <Button variant={variant}>Button</Button> },
          { label: 'Hover', node: <Button variant={variant} className={f.hover}>Button</Button> },
          { label: 'Focus', node: <Button variant={variant} className={FOCUS_RING}>Button</Button> },
          { label: 'Active', node: <Button variant={variant} className={f.active}>Button</Button> },
          { label: 'Disabled', node: <Button variant={variant} disabled>Button</Button> },
          { label: 'Loading', node: <Button variant={variant} loading>Button</Button> },
        ]}
      />
    </div>
  );
}

export function Swatch({ name, varName }: { name: string; varName: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-8 w-8 rounded-[var(--r-sm)] border border-border" style={{ background: `var(${varName})` }} aria-hidden="true" />
      <span className="font-mono text-[length:var(--fs-micro)] text-text-secondary">{name}</span>
    </div>
  );
}

export function Ramp({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[length:var(--fs-small)] text-text">{label}</span>
        <span className="font-mono text-[length:var(--fs-micro)] text-text-tertiary">--{name}-50 … 900</span>
      </div>
      <div className="flex overflow-hidden rounded-[var(--r-sm)] border border-border">
        {RAMP_STOPS.map((stop) => (
          <div key={stop} className="flex-1" title={`--${name}-${stop}`}>
            <div className="h-10" style={{ background: `var(--${name}-${stop})` }} />
            <div className="bg-surface py-0.5 text-center font-mono text-[10px] text-text-tertiary">{stop}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TokenRow({ token, value, children }: { token: string; value: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 font-mono text-[length:var(--fs-micro)] text-text-tertiary">{token}</span>
      {children}
      <span className="tnum ml-auto text-[length:var(--fs-micro)] text-text-tertiary">{value}</span>
    </div>
  );
}
