import type { ReactNode } from 'react';
import { Combobox } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based.
 *
 * Every cell shows the *closed* trigger. The filter input and option list live
 * in a Popover that only mounts on user interaction, so a static capture cannot
 * show them — see the doc for what the open panel contains. */
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

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, flex: '0 0 auto' }}>
      {children}
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

const CLOUDS = [
  { value: 'aws', label: 'Amazon Web Services' },
  { value: 'gcp', label: 'Google Cloud' },
  { value: 'azure', label: 'Microsoft Azure' },
  { value: 'oci', label: 'Oracle Cloud' },
];

const OWNERS = [
  { value: 'platform', label: 'platform-team' },
  { value: 'billing', label: 'billing-team' },
  { value: 'data', label: 'data-platform' },
  { value: 'sre', label: 'sre-oncall' },
  { value: 'security', label: 'security-eng' },
];

/** The closed trigger with a selection. The double chevron is the tell that
 *  distinguishes a Combobox from a Select's single caret. */
export function Default() {
  return (
    <Frame>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 'var(--fs-small)', fontWeight: 500, color: 'var(--text-secondary)' }}>Cloud provider</span>
        <Combobox value="aws" onChange={() => {}} ariaLabel="Cloud provider" options={CLOUDS} className="w-56" />
      </div>
    </Frame>
  );
}

/** Unset, the trigger shows `placeholder` in tertiary text; set, it shows the
 *  matched option's label in primary text. The colour difference is the only
 *  signal that a filter is active, so the placeholder must read as a prompt. */
export function EmptyAndSelected() {
  return (
    <Frame>
      <Cell label="No selection">
        <Combobox value="" onChange={() => {}} ariaLabel="Owner filter" placeholder="Any owner…" options={OWNERS} className="w-56" />
      </Cell>
      <Cell label="Selected">
        <Combobox value="platform" onChange={() => {}} ariaLabel="Owner filter" placeholder="Any owner…" options={OWNERS} className="w-56" />
      </Cell>
    </Frame>
  );
}

/** The trigger takes its width from `className`, not from its content, and
 *  truncates any label too long to fit. Size it to the list you are filtering. */
export function Widths() {
  return (
    <Frame>
      <Cell label="w-40 — truncates">
        <Combobox value="aws" onChange={() => {}} ariaLabel="Cloud provider, narrow" options={CLOUDS} className="w-40" />
      </Cell>
      <Cell label="w-56 — fits">
        <Combobox value="aws" onChange={() => {}} ariaLabel="Cloud provider, wide" options={CLOUDS} className="w-56" />
      </Cell>
    </Frame>
  );
}
