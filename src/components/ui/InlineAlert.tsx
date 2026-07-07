import { type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

export type InlineAlertTone = 'info' | 'success' | 'warning' | 'critical';

const TONES: Record<InlineAlertTone, { cls: string; icon: typeof Info }> = {
  info: { cls: 'text-info-fg', icon: Info },
  success: { cls: 'text-ok-fg', icon: CheckCircle2 },
  warning: { cls: 'text-warn-fg', icon: AlertTriangle },
  critical: { cls: 'text-crit-fg', icon: ShieldAlert },
};

/**
 * A compact section/form-level message. For page-level messages use Banner.
 * Quieter than Banner: no fill, just an icon + text, suited to sitting inside a form.
 */
export function InlineAlert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: InlineAlertTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <div role={tone === 'critical' ? 'alert' : 'status'} className={cn('flex items-start gap-2', className)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', t.cls)} aria-hidden="true" />
      <div className="min-w-0 text-[length:var(--fs-small)]">
        {title && <span className={cn('font-medium', t.cls)}>{title} </span>}
        {children && <span className="text-text-secondary">{children}</span>}
      </div>
    </div>
  );
}
