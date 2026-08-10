import type { ReactNode } from 'react';
import { NhiTypeIcon, Tag } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
      {children}
    </div>
  );
}

/* The component renders a bare lucide glyph with no chrome, so every specimen
 * pairs it with its NHI_TYPE_LABELS text — alone it is not identifiable, which
 * is exactly the usage rule this component carries. */
const TYPES = [
  { type: 'ai-agent', label: 'AI Agent' },
  { type: 'service-account', label: 'Service Account' },
  { type: 'api-key', label: 'API Key' },
  { type: 'oauth-token', label: 'OAuth Token' },
  { type: 'workload-identity', label: 'Workload Identity' },
] as const;

/** All five NHI types with their labels. The glyph never travels without one. */
export function AllTypes() {
  return (
    <Frame>
      {TYPES.map((t) => (
        <span key={t.type} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 'var(--fs-small)' }}>
          <NhiTypeIcon type={t.type} className="h-4 w-4 text-text-tertiary" />
          {t.label}
        </span>
      ))}
    </Frame>
  );
}

/** Size and colour come from `className` — the component sets no colour of its
 *  own, so it inherits whatever the surrounding text tone is. */
export function Sizing() {
  return (
    <Frame>
      {(['h-3 w-3', 'h-4 w-4', 'h-5 w-5', 'h-6 w-6'] as const).map((cls) => (
        <div key={cls} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <NhiTypeIcon type="ai-agent" className={`${cls} text-text-secondary`} />
          <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{cls}</span>
        </div>
      ))}
    </Frame>
  );
}

/** Inside a Tag, and leading an inventory row — the two places it actually ships. */
export function InContext() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 440 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Tag icon={<NhiTypeIcon type="ai-agent" className="h-3 w-3" />}>AI Agent</Tag>
        <Tag icon={<NhiTypeIcon type="api-key" className="h-3 w-3" />}>API Key</Tag>
        <Tag icon={<NhiTypeIcon type="workload-identity" className="h-3 w-3" />}>Workload Identity</Tag>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { type: 'ai-agent', id: 'checkout-copilot', sub: '412 sessions this week' },
          { type: 'service-account', id: 'payments-api@acrivault', sub: 'rotated 14 Mar 2026' },
          { type: 'oauth-token', id: 'slack-notifier-token', sub: 'expires in 9 days' },
        ].map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <NhiTypeIcon type={r.type as (typeof TYPES)[number]['type']} className="h-4 w-4 text-text-tertiary" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-small)', color: 'var(--text)' }}>{r.id}</span>
            <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-micro)', color: 'var(--text-tertiary)' }}>{r.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
