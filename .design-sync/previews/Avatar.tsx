import type { ReactNode } from 'react';
import { Avatar, NhiTypeIcon } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
      {children}
    </div>
  );
}

/** All three sizes, initials derived from the name (first two words, uppercased). */
export function Sizes() {
  return (
    <Frame>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Avatar name="Jordan Rivera" size={size} />
          <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{size}</span>
        </div>
      ))}
    </Frame>
  );
}

/** `status` pins a StatusDot to the bottom-right, ringed by the surface colour
 *  so it stays legible against the avatar edge. */
export function WithStatus() {
  return (
    <Frame>
      <Avatar name="Jordan Rivera" size="lg" status="ok" />
      <Avatar name="Sam Lee" size="lg" status="warn" />
      <Avatar name="Alex Kim" size="lg" status="crit" />
      <Avatar name="Riley Chen" size="lg" status="neutral" />
    </Frame>
  );
}

/** The `icon` form represents a non-human identity — agents and service accounts
 *  have no initials, so the type glyph stands in for them. */
export function NonHumanIdentity() {
  return (
    <Frame>
      <Avatar icon={<NhiTypeIcon type="ai-agent" className="h-4 w-4" />} status="crit" />
      <Avatar icon={<NhiTypeIcon type="service-account" className="h-4 w-4" />} status="ok" />
      <Avatar icon={<NhiTypeIcon type="api-key" className="h-4 w-4" />} status="warn" />
      <Avatar icon={<NhiTypeIcon type="oauth-token" className="h-4 w-4" />} />
      <Avatar icon={<NhiTypeIcon type="workload-identity" className="h-4 w-4" />} />
    </Frame>
  );
}

/** In a user list — the avatar is decorative, the adjacent name carries identity. */
export function InUserList() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
      {[
        { name: 'Jordan Rivera', mail: 'jordan.rivera@acrivault.io', status: 'ok' as const },
        { name: 'Sam Lee', mail: 'sam.lee@acrivault.io', status: 'neutral' as const },
        { name: 'Alex Kim', mail: 'alex.kim@acrivault.io', status: 'warn' as const },
      ].map((u) => (
        <div key={u.mail} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={u.name} size="sm" status={u.status} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 'var(--fs-small)', color: 'var(--text)' }}>{u.name}</span>
            <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{u.mail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
