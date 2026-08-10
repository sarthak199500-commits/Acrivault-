import type { ReactNode } from 'react';
import { Checkbox } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        borderRadius: 'var(--r-md)',
        padding: 20,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: 20,
      }}
    >
      {children}
    </div>
  );
}

/* The showcase labels each state under the control; inlined here rather than
 * importing the design-system page's StateMatrix helper. */
function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 92 }}>
      <div style={{ display: 'flex', height: 20, alignItems: 'center' }}>{children}</div>
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{label}</span>
    </div>
  );
}

/** The three checked states plus disabled — the component's whole surface.
 *  `indeterminate` swaps the tick for a minus and marks a partial selection. */
export function States() {
  return (
    <Frame>
      <Cell label="Unchecked">
        <Checkbox checked={false} onCheckedChange={() => {}} aria-label="Unchecked" />
      </Cell>
      <Cell label="Checked">
        <Checkbox checked onCheckedChange={() => {}} aria-label="Checked" />
      </Cell>
      <Cell label="Indeterminate">
        <Checkbox checked="indeterminate" onCheckedChange={() => {}} aria-label="Indeterminate" />
      </Cell>
      <Cell label="Disabled">
        <Checkbox checked={false} disabled onCheckedChange={() => {}} aria-label="Disabled unchecked" />
      </Cell>
      <Cell label="Disabled checked">
        <Checkbox checked disabled onCheckedChange={() => {}} aria-label="Disabled checked" />
      </Cell>
    </Frame>
  );
}

/** The control ships without a label element, so forms pair it with their own
 *  `<label>` — here a scope picker on a rotation policy. */
export function WithLabels() {
  const scopes = [
    { id: 'scope-s3', label: 's3:GetObject', checked: true },
    { id: 'scope-put', label: 's3:PutObject', checked: true },
    { id: 'scope-kms', label: 'kms:Decrypt', checked: false },
    { id: 'scope-iam', label: 'iam:PassRole', checked: false },
  ];
  return (
    <Frame>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 'var(--fs-small)', fontWeight: 500, color: 'var(--text-secondary)' }}>
          Permissions to carry over
        </span>
        {scopes.map((s) => (
          <label
            key={s.id}
            htmlFor={s.id}
            style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--fs-small)', color: 'var(--text-primary)' }}
          >
            <Checkbox id={s.id} checked={s.checked} onCheckedChange={() => {}} />
            <span style={{ fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}>{s.label}</span>
          </label>
        ))}
      </div>
    </Frame>
  );
}

/** Table row selection — the header checkbox goes indeterminate when only some
 *  rows are selected. */
export function TableSelection() {
  const rows = [
    { id: 'row-payments', name: 'payments-api@acrivault', provider: 'AWS', selected: true },
    { id: 'row-etl', name: 'etl-loader@acrivault', provider: 'GCP', selected: true },
    { id: 'row-backup', name: 'backup-agent@acrivault', provider: 'Azure', selected: false },
  ];
  return (
    <Frame>
      <div
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
          minWidth: 360,
          background: 'var(--surface)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-2)',
          }}
        >
          <Checkbox checked="indeterminate" onCheckedChange={() => {}} aria-label="Select all identities" />
          <span style={{ fontSize: 'var(--fs-micro)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
            2 of 3 selected
          </span>
        </div>
        {rows.map((r) => (
          <div
            key={r.id}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderTop: '1px solid var(--border)' }}
          >
            <Checkbox checked={r.selected} onCheckedChange={() => {}} aria-label={`Select ${r.name}`} />
            <span style={{ flex: 1, fontSize: 'var(--fs-small)', color: 'var(--text-primary)' }}>{r.name}</span>
            <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{r.provider}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}
