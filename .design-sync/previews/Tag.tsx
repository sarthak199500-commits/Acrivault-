import type { ReactNode } from 'react';
import { Tag, NhiTypeIcon } from 'acrivault';
import { GitBranch, Lock, Users } from 'lucide-react';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      {children}
    </div>
  );
}

/** Quiet metadata labels. Tag is deliberately colourless — it carries facts,
 *  never severity. */
export function Default() {
  return (
    <Frame>
      <Tag>governed</Tag>
      <Tag>owner: platform-team</Tag>
      <Tag>env: production</Tag>
      <Tag>rotation: 90d</Tag>
    </Frame>
  );
}

/** The `icon` slot takes a lucide glyph or an NhiTypeIcon; the icon renders in
 *  the tertiary text tone so the label still leads. */
export function WithIcon() {
  return (
    <Frame>
      <Tag icon={<NhiTypeIcon type="api-key" className="h-3 w-3" />}>API key</Tag>
      <Tag icon={<NhiTypeIcon type="ai-agent" className="h-3 w-3" />}>AI agent</Tag>
      <Tag icon={<Users className="h-3 w-3" />}>platform-team</Tag>
      <Tag icon={<Lock className="h-3 w-3" />}>least-privilege</Tag>
      <Tag icon={<GitBranch className="h-3 w-3" />}>terraform-managed</Tag>
    </Frame>
  );
}

/** A metadata strip under an identity title — how tags cluster in detail panels. */
export function MetadataStrip() {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 460 }}>
      <span style={{ fontSize: 'var(--fs-h2)', fontWeight: 600, color: 'var(--text)' }}>payments-api@acrivault</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <Tag icon={<NhiTypeIcon type="service-account" className="h-3 w-3" />}>Service account</Tag>
        <Tag>governed</Tag>
        <Tag>owner: platform-team</Tag>
        <Tag>arn:aws:iam::402913857761:role/billing-worker</Tag>
      </div>
    </div>
  );
}
