import { useState } from 'react';
import { StatusDot } from '@/components/ui/StatusDot';
import { Tag } from '@/components/ui/Tag';
import { FilterPill } from '@/components/ui/FilterPill';
import { Avatar } from '@/components/ui/Avatar';
import { KpiTile } from '@/components/ui/KpiTile';
import { Sparkline } from '@/components/ui/Sparkline';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { NhiTypeIcon } from '@/components/ui/NhiTypeIcon';
import { CloudGlyph } from '@/components/ui/CloudGlyph';
import { NHI_TYPES, NHI_TYPE_LABELS, CLOUDS } from '@/mocks/types';
import { DocCard, Section, StateMatrix } from './doc-primitives';

export function StatusSection() {
  const [pill, setPill] = useState(true);

  return (
    <Section id="status" title="Status & data" description="Indicators, metrics, and data display primitives.">
      <div className="grid gap-4">
        <DocCard
          title="Status, tags & filter pills"
          description="Lightweight indicators and a toggleable facet chip."
          bodyClassName="flex flex-col gap-4"
          usage="StatusDot for connection health; Tag for non-risk metadata like owner; FilterPill for a toggleable facet with a count."
          a11y="StatusDot is decorative — always pair it with a text label. FilterPill renders aria-pressed and marks selection with a check, not color alone."
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[length:var(--fs-small)] text-text-secondary"><StatusDot tone="ok" /> Connected</span>
            <span className="inline-flex items-center gap-1.5 text-[length:var(--fs-small)] text-text-secondary"><StatusDot tone="warn" pulse /> Connecting</span>
            <span className="inline-flex items-center gap-1.5 text-[length:var(--fs-small)] text-text-secondary"><StatusDot tone="crit" /> Error</span>
            <span className="mx-1 h-5 w-px bg-border" />
            <Tag>governed</Tag>
            <Tag>owner: platform-team</Tag>
            <Tag icon={<NhiTypeIcon type="api-key" className="h-3 w-3" />}>with icon</Tag>
          </div>
          <StateMatrix
            cells={[
              { label: 'Default', node: <FilterPill label="AI Agent" /> },
              { label: 'With count', node: <FilterPill label="AI Agent" count={412} /> },
              { label: 'With icon', node: <FilterPill label="AI Agent" icon={<NhiTypeIcon type="ai-agent" className="h-3.5 w-3.5" />} /> },
              { label: 'Selected', node: <FilterPill label="AI Agent" count={412} selected /> },
              { label: 'Disabled', node: <FilterPill label="AI Agent" count={412} disabled /> },
              { label: 'Interactive', node: <FilterPill label="Orphaned" count={114} selected={pill} onClick={() => setPill((v) => !v)} /> },
            ]}
          />
        </DocCard>

        <DocCard
          title="Avatar"
          description="Initials or an icon, in three sizes, with an optional status dot."
          usage="Represents a person or a non-human identity; use the icon form for agents and service accounts."
          a11y="Decorative — the adjacent name or label carries identity."
        >
          <StateMatrix
            cells={[
              { label: 'Small', node: <Avatar name="Alex Kim" size="sm" /> },
              { label: 'Medium', node: <Avatar name="Jordan Rivera" /> },
              { label: 'Large', node: <Avatar name="Sam Lee" size="lg" /> },
              { label: 'With status', node: <Avatar name="Sam Lee" size="lg" status="ok" /> },
              { label: 'Icon', node: <Avatar icon={<NhiTypeIcon type="ai-agent" className="h-4 w-4" />} status="crit" /> },
            ]}
          />
        </DocCard>

        <DocCard
          title="KPI tiles & sparkline"
          description="Tiles fill their grid cell; the value sits on a shared baseline."
          bodyClassName="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          usage="Top-of-screen metrics. Delta tone follows direction; deltaInverted flips it where a rise is bad (risk, drift). Pass `to` to make a tile a drill-down link."
        >
          <KpiTile label="AI Agents" value={412} prominent icon={<NhiTypeIcon type="ai-agent" />} sparkline={[3, 5, 4, 6, 7, 6, 8, 9]} delta={12} deltaLabel="up · good" />
          <KpiTile label="Critical risk" value={38} icon={<NhiTypeIcon type="api-key" />} delta={6} deltaInverted deltaLabel="up · inverted" />
          <KpiTile label="Orphaned" value={114} icon={<NhiTypeIcon type="service-account" />} delta={-9} deltaInverted deltaLabel="down · good" />
          <KpiTile label="Service Accounts" value={318} icon={<NhiTypeIcon type="oauth-token" />} to="/design-system" />
          <div className="flex items-center justify-center rounded-[var(--r-lg)] border border-border bg-surface">
            <Sparkline values={[2, 4, 3, 6, 5, 8, 7, 9, 8]} width={120} height={40} />
          </div>
        </DocCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <DocCard
            title="Key/value list"
            description="Derived fields are labeled."
            usage="Compact attribute display in detail panels; flag computed values as derived."
          >
            <KeyValueList
              items={[
                { label: 'Owner', value: 'platform-team' },
                { label: 'Risk band', value: 'High', derived: true },
                { label: 'External id', value: 'aws:agent:402913', mono: true },
              ]}
            />
          </DocCard>
          <CodeBlock label="Generated · read-only" code={'policy "Quarantine orphaned AI agents" {\n  WHEN type is "ai-agent"\n  AND  orphaned is "true"\n  THEN action set "quarantine"\n}'} />
        </div>

        <DocCard
          title="Type & cloud glyphs"
          description="Iconography for the five NHI types and the three cloud providers."
          bodyClassName="flex flex-wrap items-center gap-3"
          usage="Use the type glyph wherever an identity type is shown; the cloud glyph marks a source provider."
        >
          {NHI_TYPES.map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5 text-[length:var(--fs-small)] text-text-secondary">
              <NhiTypeIcon type={t} className="h-4 w-4 text-text-tertiary" /> {NHI_TYPE_LABELS[t]}
            </span>
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          {CLOUDS.map((c) => <CloudGlyph key={c} cloud={c} />)}
        </DocCard>
      </div>
    </Section>
  );
}
