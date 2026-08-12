import { useState } from 'react';
import type { ReactNode } from 'react';
import { FilterPill } from 'acrivault';
import { Bot, KeyRound } from 'lucide-react';

function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {children}
    </div>
  );
}

/** Selected vs unselected — the selected pill takes the accent tint and a check;
 *  the count sits in a tabular chip. This is interactive: the first pill toggles. */
export function States() {
  const [on, setOn] = useState(true);
  return (
    <Frame>
      <FilterPill label="AI agents" count={128} selected={on} onClick={() => setOn((v) => !v)} />
      <FilterPill label="Service accounts" count={412} />
      <FilterPill label="API keys" count={87} icon={<KeyRound className="h-3.5 w-3.5" />} />
      <FilterPill label="Archived" count={0} disabled />
    </Frame>
  );
}

/** A severity filter row — how pills cluster as a quick toggle bar above a table. */
export function FilterBar() {
  return (
    <Frame>
      <FilterPill label="All" count={624} selected />
      <FilterPill label="Critical" count={12} icon={<Bot className="h-3.5 w-3.5" />} />
      <FilterPill label="High" count={38} />
      <FilterPill label="Medium" count={91} />
      <FilterPill label="Low" count={483} />
    </Frame>
  );
}
