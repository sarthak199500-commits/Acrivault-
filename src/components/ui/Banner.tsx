import { type ReactNode } from 'react';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

export type BannerTone = 'info' | 'warning' | 'critical';

const TONES: Record<BannerTone, { cls: string; icon: typeof Info }> = {
  info: { cls: 'border-[color-mix(in_srgb,var(--info)_45%,var(--border))] bg-info-bg text-info-fg', icon: Info },
  warning: { cls: 'border-[color-mix(in_srgb,var(--warning)_45%,var(--border))] bg-warn-bg text-warn-fg', icon: AlertTriangle },
  critical: { cls: 'border-[color-mix(in_srgb,var(--critical)_45%,var(--border))] bg-crit-bg text-crit-fg', icon: ShieldAlert },
};

/** A page-level message. For section/form-level messages use InlineAlert. */
export function Banner({
  tone = 'info',
  icon,
  action,
  className,
  children,
}: {
  tone?: BannerTone;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <div
      role={tone === 'critical' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-[var(--r-md)] border px-3.5 py-2.5', t.cls, className)}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">{icon ?? <Icon className="h-4 w-4" />}</span>
      <div className="min-w-0 flex-1 text-[length:var(--fs-small)]">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
