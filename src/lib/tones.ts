import type { CloudConnection, Identity, IdentityStatus, RiskBand } from '@/mocks/types';
import type { BadgeTone } from '@/components/ui/Badge';
import type { DotTone } from '@/components/ui/StatusDot';

/*
 * Semantic-state → tone mappings shared by every screen. These are DISPLAY
 * mappings over upstream-computed states (like `riskBand` in lib/risk.ts) —
 * keep hue decisions here so severity reads identically app-wide.
 */

/** Alert/suggestion severity → filled Badge tone. */
export const SEVERITY_TONE: Record<RiskBand, BadgeTone> = {
  critical: 'critical',
  high: 'warning',
  medium: 'warning',
  low: 'info',
  minimal: 'neutral',
};

/**
 * Severity → contrast-tuned foreground for a quiet inline label, where a filled
 * badge would over-encode (e.g. next to a colored risk spine).
 */
export const SEVERITY_FG: Record<RiskBand, string> = {
  critical: 'text-crit-fg',
  high: 'text-warn-fg',
  medium: 'text-warn-fg',
  low: 'text-info-fg',
  minimal: 'text-text-secondary',
};

/** Tolerant severity lookup for feeds that mix bands with 'info' entries. */
export function severityTone(severity: string): BadgeTone {
  if (severity === 'info') return 'info';
  return SEVERITY_TONE[severity as RiskBand] ?? 'neutral';
}

/** Governance status → Badge tone. */
export const GOVERNANCE_TONE: Record<Identity['governanceStatus'], BadgeTone> = {
  governed: 'success',
  drift: 'warning',
  ungoverned: 'neutral',
};

export type ConnectionState = CloudConnection['status'];

/** Cloud-connection state → StatusDot tone. */
export const CONNECTION_TONE: Record<ConnectionState, DotTone> = {
  disconnected: 'neutral',
  connecting: 'warn',
  connected: 'ok',
  error: 'crit',
};

/**
 * Identity lifecycle status → StatusDot tone. Active reads as a healthy/green
 * positive; inactive = stale (amber), quarantined = contained (red).
 */
export const STATUS_TONE: Record<IdentityStatus, DotTone> = {
  active: 'ok',
  inactive: 'warn',
  quarantined: 'crit',
};
