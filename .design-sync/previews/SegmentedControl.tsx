import type { ReactNode } from 'react';
import { SegmentedControl } from 'acrivault';
import { Table, Network, LayoutGrid, List } from 'lucide-react';

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
        alignItems: 'center',
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

/** The inventory view switcher, which is where this control actually lives:
 *  two mutually-exclusive renderings of the same data, each with an icon. The
 *  selected segment takes the accent tint and accent text. */
export function Default() {
  return (
    <Frame>
      <SegmentedControl
        ariaLabel="Inventory view"
        value="table"
        onChange={() => {}}
        options={[
          { value: 'table', label: 'Table', icon: <Table className="h-3.5 w-3.5" /> },
          { value: 'graph', label: 'Graph', icon: <Network className="h-3.5 w-3.5" /> },
        ]}
      />
    </Frame>
  );
}

/** The same control with each segment selected in turn — the selection is
 *  carried by the tinted background *and* `aria-pressed`, never by colour alone. */
export function Selection() {
  return (
    <Frame>
      <Cell label="Table selected">
        <SegmentedControl
          ariaLabel="Inventory view, table selected"
          value="table"
          onChange={() => {}}
          options={[
            { value: 'table', label: 'Table', icon: <Table className="h-3.5 w-3.5" /> },
            { value: 'graph', label: 'Graph', icon: <Network className="h-3.5 w-3.5" /> },
          ]}
        />
      </Cell>
      <Cell label="Graph selected">
        <SegmentedControl
          ariaLabel="Inventory view, graph selected"
          value="graph"
          onChange={() => {}}
          options={[
            { value: 'table', label: 'Table', icon: <Table className="h-3.5 w-3.5" /> },
            { value: 'graph', label: 'Graph', icon: <Network className="h-3.5 w-3.5" /> },
          ]}
        />
      </Cell>
    </Frame>
  );
}

/** Both sizes. `sm` (28px) fits a filter bar next to a `sm` Button; `md` (32px)
 *  is the default. */
export function Sizes() {
  return (
    <Frame>
      <Cell label="sm">
        <SegmentedControl
          ariaLabel="Density, small"
          size="sm"
          value="comfortable"
          onChange={() => {}}
          options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
      </Cell>
      <Cell label="md (default)">
        <SegmentedControl
          ariaLabel="Density, medium"
          value="comfortable"
          onChange={() => {}}
          options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
        />
      </Cell>
    </Frame>
  );
}

/** `icon` is optional, and three segments is the practical ceiling — past that
 *  the control outgrows its row and Tabs is the better component. */
export function TextOnlyAndThreeUp() {
  return (
    <Frame>
      <Cell label="Text only">
        <SegmentedControl
          ariaLabel="Risk band filter"
          value="critical"
          onChange={() => {}}
          options={[
            { value: 'all', label: 'All' },
            { value: 'critical', label: 'Critical' },
            { value: 'high', label: 'High' },
          ]}
        />
      </Cell>
      <Cell label="Three segments with icons">
        <SegmentedControl
          ariaLabel="Result layout"
          value="list"
          onChange={() => {}}
          options={[
            { value: 'list', label: 'List', icon: <List className="h-3.5 w-3.5" /> },
            { value: 'grid', label: 'Grid', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
            { value: 'graph', label: 'Graph', icon: <Network className="h-3.5 w-3.5" /> },
          ]}
        />
      </Cell>
    </Frame>
  );
}
