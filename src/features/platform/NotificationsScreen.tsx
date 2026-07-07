import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, Check } from 'lucide-react';
import { useMarkNotificationRead, useNotifications } from './queries';
import type { NotificationItem } from '@/mocks/types';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { StatusDot } from '@/components/ui/StatusDot';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';
import { severityTone } from '@/lib/tones';

const PREFS = [
  { id: 'critical', label: 'Critical alerts', desc: 'Notify me on critical-severity alerts.' },
  { id: 'rotations', label: 'Rotation outcomes', desc: 'Notify me when a rotation completes or rolls back.' },
  { id: 'policy', label: 'Policy changes', desc: 'Notify me when a policy is activated.' },
  { id: 'digest', label: 'Weekly digest', desc: 'A weekly summary of identity risk.' },
];

function Feed({ items }: { items: NotificationItem[] }) {
  const markRead = useMarkNotificationRead();
  return (
    <div>
      {items.map((n) => (
        <div key={n.id} className={cn('flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0', !n.read && 'bg-accent-tint/20')}>
          <span className="mt-1.5"><StatusDot tone={n.read ? 'neutral' : 'info'} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge tone={severityTone(n.severity)} className="capitalize">{n.severity}</Badge>
              <span className={cn('truncate text-[length:var(--fs-small)]', n.read ? 'text-text-secondary' : 'font-medium text-text')}>{n.title}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[length:var(--fs-micro)] text-text-tertiary">
              <span>{relativeTime(n.at)}</span>
              {n.href && <Link to={n.href} className="text-accent-text hover:underline">View</Link>}
            </div>
          </div>
          {!n.read && (
            <button
              type="button"
              onClick={() => markRead.mutate(n.id)}
              className="inline-flex shrink-0 items-center gap-1 text-[length:var(--fs-micro)] text-text-tertiary hover:text-text"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Mark read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function NotificationsScreen() {
  const query = useNotifications();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ critical: true, rotations: true, policy: false, digest: true });

  return (
    <div>
      <ScreenHeader eyebrow="Platform" title="Notifications" description="Your notification preferences and recent activity." />

      <div className="grid gap-4 lg:grid-cols-[1fr_var(--rail-w)] lg:items-start">
        <Card>
          <CardHeader title="Recent" />
          <QueryBoundary
            query={query}
            loadingFallback={<SkeletonTableRows rows={6} cols={2} />}
            isEmpty={(d) => d.length === 0}
            empty={<EmptyState icon={<BellOff className="h-5 w-5" />} headline="No notifications" guidance="You're all caught up." />}
          >
            {(items) => <Feed items={items} />}
          </QueryBoundary>
        </Card>

        <Card>
          <CardHeader title="Preferences" action={<Bell className="h-4 w-4 text-text-tertiary" aria-hidden="true" />} />
          <CardBody className="space-y-3">
            {PREFS.map((p) => (
              <label key={p.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-[length:var(--fs-small)] text-text">{p.label}</span>
                  <span className="block text-[length:var(--fs-micro)] text-text-tertiary">{p.desc}</span>
                </span>
                <Switch checked={!!prefs[p.id]} onCheckedChange={(v) => setPrefs((s) => ({ ...s, [p.id]: v }))} ariaLabel={p.label} />
              </label>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
