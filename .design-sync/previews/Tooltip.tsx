import type { ReactNode } from 'react';
import { Tooltip, IconButton } from 'acrivault';
import { Info, Copy } from 'lucide-react';

/* Radix Tooltip content lives in a Portal and only mounts while the trigger is
 * hovered/focused, so a still capture shows the triggers, not the bubble. The
 * shared DsPreviewProviders supplies the required TooltipProvider. This card
 * documents the trigger patterns; the caption notes where the content appears. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, color: 'var(--text-primary)' }}>{children}</div>
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>
        Each element is a Tooltip trigger — the bubble surfaces on hover/focus (with the chosen side) and cannot appear in a still. Content is supplementary, never the only path to the info.
      </span>
    </div>
  );
}

/** Realistic triggers: an info affordance, a copy action, and a truncated value
 *  whose full form lives in the tooltip. `side` chooses where the bubble opens. */
export function Triggers() {
  return (
    <Frame>
      <Tooltip content="Score reflects reachability × privilege. Updated hourly." side="top">
        <IconButton label="About the risk score"><Info className="h-4 w-4" /></IconButton>
      </Tooltip>
      <Tooltip content="Copy ARN" side="top">
        <IconButton label="Copy ARN"><Copy className="h-4 w-4" /></IconButton>
      </Tooltip>
      <Tooltip content="arn:aws:iam::402913857761:role/payments-api" side="bottom">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-small)', color: 'var(--text-secondary)', borderBottom: '1px dotted var(--border-strong)', cursor: 'help' }}>
          arn:aws:iam::…:role/payments-api
        </span>
      </Tooltip>
    </Frame>
  );
}
