import type { ReactNode } from 'react';
import { Switch } from 'acrivault';

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 96 }}>
      <div style={{ display: 'flex', height: 20, alignItems: 'center' }}>{children}</div>
      <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{label}</span>
    </div>
  );
}

/** On/off and both disabled states. Checked fills the track with `--accent`;
 *  unchecked uses `--surface-2` with a strong border, so the two never rely on
 *  colour alone — the thumb position carries the state too. */
export function States() {
  return (
    <Frame>
      <Cell label="Off">
        <Switch checked={false} onCheckedChange={() => {}} ariaLabel="Auto-rotation off" />
      </Cell>
      <Cell label="On">
        <Switch checked onCheckedChange={() => {}} ariaLabel="Auto-rotation on" />
      </Cell>
      <Cell label="Disabled off">
        <Switch checked={false} disabled onCheckedChange={() => {}} ariaLabel="Auto-rotation unavailable" />
      </Cell>
      <Cell label="Disabled on">
        <Switch checked disabled onCheckedChange={() => {}} ariaLabel="Auto-rotation locked on" />
      </Cell>
    </Frame>
  );
}

/** The settings-row composition: name, one line of consequence, switch on the
 *  right. This is where Switch belongs — a setting that applies immediately,
 *  with no Save button anywhere on the screen. */
export function SettingsRows() {
  const rows = [
    { id: 'auto-rotate', title: 'Automatic rotation', desc: 'Rotate keys on their policy schedule without approval.', on: true },
    { id: 'unused-alerts', title: 'Dormant identity alerts', desc: 'Notify owners when a credential goes 30 days unused.', on: true },
    { id: 'break-glass', title: 'Break-glass access', desc: 'Requires an enterprise plan.', on: false, disabled: true },
  ];
  return (
    <Frame>
      <div
        style={{
          minWidth: 420,
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          background: 'var(--surface)',
          overflow: 'hidden',
        }}
      >
        {rows.map((r, i) => (
          <div
            key={r.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '12px 14px',
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              opacity: r.disabled ? 0.6 : 1,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--fs-small)', fontWeight: 500, color: 'var(--text-primary)' }}>{r.title}</div>
              <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{r.desc}</div>
            </div>
            <Switch checked={r.on} disabled={r.disabled} onCheckedChange={() => {}} ariaLabel={r.title} />
          </div>
        ))}
      </div>
    </Frame>
  );
}
