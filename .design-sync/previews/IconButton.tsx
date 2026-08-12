import type { ReactNode } from 'react';
import { IconButton } from 'acrivault';
import { RefreshCw, Trash2, Settings2, Copy, MoreHorizontal, Download } from 'lucide-react';

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

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        flex: '0 0 auto',
        minWidth: 108,
      }}
    >
      {children}
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

/** The two variants. `ghost` is the default and disappears into the surface
 *  until hovered; `secondary` carries its own border for standalone use. */
export function Variants() {
  return (
    <Frame>
      <Cell label="ghost (default)">
        <IconButton label="Rotate credential"><RefreshCw className="h-4 w-4" /></IconButton>
      </Cell>
      <Cell label="secondary">
        <IconButton label="Revoke access" variant="secondary"><Trash2 className="h-4 w-4" /></IconButton>
      </Cell>
    </Frame>
  );
}

/** Both sizes, in both variants. `sm` (32px) is for dense table rows, `md`
 *  (36px) matches the height of a `md` Button. */
export function Sizes() {
  return (
    <Frame>
      <Cell label="sm · ghost">
        <IconButton label="Copy key ID" size="sm"><Copy className="h-3.5 w-3.5" /></IconButton>
      </Cell>
      <Cell label="md · ghost">
        <IconButton label="Copy key ID" size="md"><Copy className="h-4 w-4" /></IconButton>
      </Cell>
      <Cell label="sm · secondary">
        <IconButton label="Settings" size="sm" variant="secondary"><Settings2 className="h-3.5 w-3.5" /></IconButton>
      </Cell>
      <Cell label="md · secondary">
        <IconButton label="Settings" size="md" variant="secondary"><Settings2 className="h-4 w-4" /></IconButton>
      </Cell>
    </Frame>
  );
}

/** Disabled drops opacity and blocks the pointer — used while a rotation job is
 *  already in flight. */
export function Disabled() {
  return (
    <Frame>
      <Cell label="ghost">
        <IconButton label="Rotate credential" disabled><RefreshCw className="h-4 w-4" /></IconButton>
      </Cell>
      <Cell label="secondary">
        <IconButton label="Revoke access" variant="secondary" disabled><Trash2 className="h-4 w-4" /></IconButton>
      </Cell>
    </Frame>
  );
}

/** The component's real home: a trailing action cluster on an identity row,
 *  where a labelled Button per action would not fit. */
export function RowToolbar() {
  return (
    <Frame>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minWidth: 400,
          padding: '10px 12px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          background: 'var(--surface)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 'var(--fs-small)', color: 'var(--text-primary)' }}>payments-api@acrivault</div>
          <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>AKIA4RTQ2XN9PLZC · rotated 84 days ago</div>
        </div>
        <IconButton label="Copy key ID" size="sm"><Copy className="h-3.5 w-3.5" /></IconButton>
        <IconButton label="Download audit log" size="sm"><Download className="h-3.5 w-3.5" /></IconButton>
        <IconButton label="Rotate credential" size="sm"><RefreshCw className="h-3.5 w-3.5" /></IconButton>
        <IconButton label="More actions" size="sm"><MoreHorizontal className="h-3.5 w-3.5" /></IconButton>
      </div>
    </Frame>
  );
}
