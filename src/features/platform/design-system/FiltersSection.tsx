import { useState } from 'react';
import { Checkbox } from '@/components/ui/Checkbox';
import { FilterMenu } from '@/components/ui/FilterMenu';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ProviderBadge, PROVIDER_COLOR } from '@/components/ui/ProviderBadge';
import { RiskPill } from '@/components/ui/RiskPill';
import { NhiTypeIcon } from '@/components/ui/NhiTypeIcon';
import { NHI_TYPES, NHI_TYPE_LABELS, CLOUDS, CLOUD_LABELS } from '@/mocks/types';
import { DocCard, Section } from './doc-primitives';

export function FiltersSection() {
  const [demoFilter, setDemoFilter] = useState<string[]>(['ai-agent']);
  const [demoView, setDemoView] = useState<'table' | 'graph'>('table');

  return (
    <Section
      id="filters"
      title="Filters & views"
      description="The shared filtering and view-switching patterns used across data screens."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <DocCard
          title="FilterMenu"
          description="Multi-select facet dropdown with counts — closed and open."
          usage="The standard facet control on data screens (Type, Provider, Severity); shows live counts and a clear-all."
          a11y="Popover with a labeled multi-select; the trigger announces how many are selected and the panel stays open while toggling."
        >
          <div className="flex flex-wrap items-start gap-x-10 gap-y-5">
            <div className="flex flex-col items-start gap-2">
              <span className="eyebrow">Closed</span>
              <div className="flex flex-wrap items-start gap-2">
                <FilterMenu
                  label="Type"
                  options={NHI_TYPES.map((t) => ({
                    value: t,
                    label: NHI_TYPE_LABELS[t],
                    count: (t.length * 7) % 40,
                    swatch: <NhiTypeIcon type={t} className="h-3.5 w-3.5 text-text-tertiary" />,
                  }))}
                  selected={demoFilter}
                  onToggle={(v) =>
                    setDemoFilter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
                  }
                  onClear={() => setDemoFilter([])}
                />
                <FilterMenu
                  label="Source"
                  options={CLOUDS.map((c) => ({
                    value: c,
                    label: CLOUD_LABELS[c],
                    swatch: <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: PROVIDER_COLOR[c] }} aria-hidden="true" />,
                  }))}
                  selected={[]}
                  onToggle={() => undefined}
                />
              </div>
            </div>
            <div className="flex flex-col items-start gap-2">
              <span className="eyebrow">Open</span>
              {/* Static replica of the open FilterMenu panel (the live panel is portaled). */}
              <div className="w-60 rounded-[var(--r-md)] border border-border-strong bg-surface-2 p-1.5 shadow-[var(--shadow-md)]">
                <div className="flex items-center justify-between px-1.5 pb-1.5">
                  <span className="eyebrow">Type</span>
                  <span className="text-[length:var(--fs-micro)] font-medium text-accent-text">Clear</span>
                </div>
                <ul className="space-y-0.5">
                  {NHI_TYPES.slice(0, 4).map((t, i) => (
                    <li key={t}>
                      <span className={`flex items-center gap-2.5 rounded-[var(--r-sm)] px-1.5 py-1.5 ${i === 0 ? 'bg-surface-hover' : ''}`}>
                        <Checkbox checked={i < 2} aria-label={NHI_TYPE_LABELS[t]} />
                        <NhiTypeIcon type={t} className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                        <span className="min-w-0 flex-1 truncate text-[length:var(--fs-small)] text-text">{NHI_TYPE_LABELS[t]}</span>
                        <span className="tnum text-[length:var(--fs-micro)] text-text-tertiary">{(t.length * 7) % 40}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </DocCard>

        <DocCard
          title="SegmentedControl"
          description="Switch between a few mutually-exclusive views."
          bodyClassName="flex flex-wrap items-center gap-3"
          usage="Use for 2–3 exclusive views such as Table / Graph; prefer Tabs for richer panels."
          a11y="role=group with aria-pressed per segment; selection is never conveyed by color alone."
        >
          <SegmentedControl
            ariaLabel="Demo view"
            value={demoView}
            onChange={setDemoView}
            options={[
              { value: 'table', label: 'Table' },
              { value: 'graph', label: 'Graph' },
            ]}
          />
        </DocCard>

        <DocCard
          title="ProviderBadge"
          description="Categorical cloud-provider marker."
          bodyClassName="flex flex-wrap items-center gap-2"
          usage="Marks an identity's source provider; a colored dot paired with the provider name."
          a11y="The provider name carries the meaning — the dot is supportive, not the only signal."
        >
          {CLOUDS.map((c) => (
            <ProviderBadge key={c} cloud={c} />
          ))}
        </DocCard>

        <DocCard
          title="RiskPill · band direction"
          description="A 0–100 score mapped to a 5-band scale with a direction glyph."
          bodyClassName="flex flex-wrap items-center gap-2"
          usage="The one place color encodes meaning. Shows the band and an up / steady / down glyph for the trend."
          a11y="The band label and arrow glyph convey level without relying on color."
        >
          {[92, 72, 50, 28, 8].map((s) => (
            <RiskPill key={s} score={s} />
          ))}
        </DocCard>
      </div>
    </Section>
  );
}
