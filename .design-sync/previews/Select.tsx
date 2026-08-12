import type { ReactNode } from 'react';
import { Select } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based.
 *
 * Every cell here shows the *closed* trigger. Radix portals the option list and
 * only mounts it on user interaction, so a static capture can never show the
 * open panel — see the doc for what the open state looks like. */
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

const NHI_TYPES = [
  { value: 'ai-agent', label: 'AI Agent' },
  { value: 'service-account', label: 'Service Account' },
  { value: 'api-key', label: 'API Key' },
  { value: 'oauth-token', label: 'OAuth Token' },
  { value: 'workload-identity', label: 'Workload Identity' },
];

/** The closed trigger with a value selected — how Select spends almost all of
 *  its life. Width comes from the widest option, not from the container. */
export function Default() {
  return (
    <Frame>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 'var(--fs-small)', fontWeight: 500, color: 'var(--text-secondary)' }}>Identity type</span>
        <Select value="service-account" onValueChange={() => {}} ariaLabel="Identity type" options={NHI_TYPES} />
      </div>
    </Frame>
  );
}

/** With no matching value the trigger falls back to `placeholder`, rendered in
 *  tertiary text so an unset filter is distinguishable from a chosen one. */
export function Placeholder() {
  return (
    <Frame>
      <Cell label="Value selected">
        <Select value="api-key" onValueChange={() => {}} ariaLabel="Identity type" options={NHI_TYPES} />
      </Cell>
      <Cell label="No value — placeholder">
        <Select value="" onValueChange={() => {}} ariaLabel="Identity type filter" placeholder="Any type…" options={NHI_TYPES} />
      </Cell>
    </Frame>
  );
}

/** Both sizes. `sm` (32px) belongs in a filter bar; `md` (36px) is the default
 *  and lines up with a `md` Input. */
export function Sizes() {
  return (
    <Frame>
      <Cell label="sm">
        <Select value="ai-agent" onValueChange={() => {}} size="sm" ariaLabel="Identity type, small" options={NHI_TYPES} />
      </Cell>
      <Cell label="md (default)">
        <Select value="ai-agent" onValueChange={() => {}} ariaLabel="Identity type, medium" options={NHI_TYPES} />
      </Cell>
    </Frame>
  );
}

/** Disabled dims the trigger to 50% and blocks the pointer — used when the
 *  field is fixed by a policy the current user cannot change. */
export function Disabled() {
  return (
    <Frame>
      <Cell label="Enabled">
        <Select value="oauth-token" onValueChange={() => {}} ariaLabel="Identity type" options={NHI_TYPES} />
      </Cell>
      <Cell label="Disabled">
        <Select value="oauth-token" onValueChange={() => {}} disabled ariaLabel="Identity type, locked by policy" options={NHI_TYPES} />
      </Cell>
    </Frame>
  );
}
