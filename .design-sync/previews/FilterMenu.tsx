import { useState } from 'react';
import type { ReactNode } from 'react';
import { FilterMenu, NhiTypeIcon } from 'acrivault';

/* FilterMenu is a Popover multi-select: a labeled trigger with an active-count
 * badge. The panel is portaled and opens on click, so a still capture shows the
 * closed triggers — their resting, in-toolbar appearance. The count badge and the
 * clear affordance are the parts visible without interaction. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>{children}</div>
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>
        Closed triggers — clicking opens a multi-select panel with per-option counts and a clear-all. The badge shows how many are active.
      </span>
    </div>
  );
}

const TYPE_OPTIONS = [
  { value: 'ai-agent', label: 'AI agent', count: 128, swatch: <NhiTypeIcon type="ai-agent" className="h-3.5 w-3.5 text-text-tertiary" /> },
  { value: 'service-account', label: 'Service account', count: 412, swatch: <NhiTypeIcon type="service-account" className="h-3.5 w-3.5 text-text-tertiary" /> },
  { value: 'api-key', label: 'API key', count: 87, swatch: <NhiTypeIcon type="api-key" className="h-3.5 w-3.5 text-text-tertiary" /> },
  { value: 'oauth-token', label: 'OAuth token', count: 54, swatch: <NhiTypeIcon type="oauth-token" className="h-3.5 w-3.5 text-text-tertiary" /> },
];

/** A facet toolbar: one filter with two active (badge shows 2), one with none. */
export function FacetTriggers() {
  const [selected, setSelected] = useState<string[]>(['ai-agent', 'api-key']);
  const toggle = (v: string) =>
    setSelected((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  return (
    <Frame>
      <FilterMenu
        label="Type"
        options={TYPE_OPTIONS}
        selected={selected}
        onToggle={toggle}
        onClear={() => setSelected([])}
      />
      <FilterMenu
        label="Provider"
        options={[
          { value: 'aws', label: 'AWS' },
          { value: 'gcp', label: 'GCP' },
          { value: 'azure', label: 'Azure' },
        ]}
        selected={[]}
        onToggle={() => undefined}
      />
    </Frame>
  );
}
