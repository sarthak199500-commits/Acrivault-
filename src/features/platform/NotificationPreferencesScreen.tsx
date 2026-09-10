import { Link } from 'react-router-dom';
import { Bell, Inbox, Mail, MessageSquare, Webhook } from 'lucide-react';
import {
  useNotificationPrefs,
  useNotificationRouting,
  useUpdateNotificationPrefs,
  useUpdateNotificationRouting,
} from './queries';
import {
  DIGEST_DAY_LABELS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  ROUTING_KIND_LABELS,
  type DigestDay,
  type NotificationCategory,
  type NotificationPrefs,
  type NotificationRouting,
  type RoutingDestination,
  type RoutingDestinationKind,
} from '@/mocks/types';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { buttonClasses } from '@/components/ui/Button';
import { useCan } from '@/components/ui/Can';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';

/** What each category actually covers, in the words of the events that raise it. */
const CATEGORY_DESCRIPTIONS: Record<NotificationCategory, string> = {
  alert: 'Alerts Monitor raises against an identity you can see.',
  rotation: 'When a rotation is started for an identity.',
  policy: 'When a policy is activated or reactivated.',
  quarantine: 'When an agent is contained, and who was told.',
  system: 'Baselines, coverage, and other housekeeping.',
};

const DIGEST_DAY_OPTIONS = ([0, 1, 2, 3, 4, 5, 6] as DigestDay[]).map((d) => ({
  value: String(d),
  label: DIGEST_DAY_LABELS[d],
}));

const DIGEST_HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${String(h).padStart(2, '0')}:00`,
}));

const SEVERITY_FLOOR_OPTIONS = [
  { value: 'critical', label: 'Critical only' },
  { value: 'high', label: 'High and above' },
  { value: 'medium', label: 'Medium and above' },
  { value: 'low', label: 'Low and above' },
  { value: 'info', label: 'Everything' },
];

const KIND_ICON: Record<RoutingDestinationKind, typeof Mail> = {
  email: Mail,
  slack: MessageSquare,
  webhook: Webhook,
};

/**
 * The reader's own time zone, resolved rather than stored.
 *
 * A stored zone drifts out of step with the browser and then describes a
 * delivery time nobody actually gets.
 */
function resolvedTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time';
  } catch {
    return 'your local time';
  }
}

function PersonalCard({ prefs }: { prefs: NotificationPrefs }) {
  const update = useUpdateNotificationPrefs();

  const save = (patch: Partial<NotificationPrefs>) =>
    update.mutate(patch, {
      onSuccess: () => toast('Notification preferences saved', { tone: 'success' }),
      onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
    });

  const setChannel = (category: NotificationCategory, channel: 'inApp' | 'email', on: boolean) =>
    save({
      categories: {
        ...prefs.categories,
        [category]: { ...prefs.categories[category], [channel]: on },
      },
    });

  return (
    <Card>
      <CardHeader
        title="Your notifications"
        description="Personal to you. Every role can set these."
        action={<Bell className="h-4 w-4 text-text-tertiary" aria-hidden="true" />}
      />
      <CardBody>
        {/*
          A real table, not a stack of rows: this is a two-axis grid, so the
          category is a row header and each channel a column header. That is
          what lets a screen reader say "Email, Critical alerts, on" instead of
          reading a switch with no idea which column it sits in.
        */}
        <table className="w-full">
          <caption className="sr-only">
            Delivery channels for each notification category
          </caption>
          <thead>
            <tr>
              <th scope="col" className="pb-2 text-left text-[length:var(--fs-micro)] font-normal text-text-tertiary">
                Event
              </th>
              <th scope="col" className="w-20 pb-2 text-center text-[length:var(--fs-micro)] font-normal text-text-tertiary">
                <span className="inline-flex items-center gap-1">
                  <Inbox className="h-3.5 w-3.5" aria-hidden="true" /> In-app
                </span>
              </th>
              <th scope="col" className="w-20 pb-2 text-center text-[length:var(--fs-micro)] font-normal text-text-tertiary">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Email
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_CATEGORIES.map((category) => {
              const label = NOTIFICATION_CATEGORY_LABELS[category];
              const descId = `ntf-pref-${category}-desc`;
              return (
                <tr key={category} className="border-t border-border">
                  <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                    <span className="block text-[length:var(--fs-small)] text-text">{label}</span>
                    <span
                      id={descId}
                      className="block text-[length:var(--fs-micro)] text-text-tertiary"
                    >
                      {CATEGORY_DESCRIPTIONS[category]}
                    </span>
                  </th>
                  <td className="py-2.5 text-center">
                    <Switch
                      checked={prefs.categories[category].inApp}
                      onCheckedChange={(v) => setChannel(category, 'inApp', v)}
                      ariaLabel={`In-app notifications for ${label}`}
                      ariaDescribedBy={descId}
                    />
                  </td>
                  <td className="py-2.5 text-center">
                    <Switch
                      checked={prefs.categories[category].email}
                      onCheckedChange={(v) => setChannel(category, 'email', v)}
                      ariaLabel={`Email notifications for ${label}`}
                      ariaDescribedBy={descId}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-4 border-t border-border pt-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-[length:var(--fs-small)] text-text">Weekly digest</span>
              <span id="ntf-digest-desc" className="block text-[length:var(--fs-micro)] text-text-tertiary">
                A summary of identity risk, sent once a week.
              </span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(prefs.digest.day)}
                onValueChange={(v) => save({ digest: { ...prefs.digest, day: Number(v) as DigestDay } })}
                options={DIGEST_DAY_OPTIONS}
                ariaLabel="Digest day"
                size="sm"
                disabled={!prefs.digest.enabled}
              />
              <Select
                value={String(prefs.digest.hour)}
                onValueChange={(v) => save({ digest: { ...prefs.digest, hour: Number(v) } })}
                options={DIGEST_HOUR_OPTIONS}
                ariaLabel="Digest time"
                size="sm"
                disabled={!prefs.digest.enabled}
              />
              <Switch
                checked={prefs.digest.enabled}
                onCheckedChange={(v) => save({ digest: { ...prefs.digest, enabled: v } })}
                ariaLabel="Weekly digest"
                ariaDescribedBy="ntf-digest-desc"
              />
            </div>
          </div>
          <p className="mt-2 text-[length:var(--fs-micro)] text-text-tertiary">
            Times are {resolvedTimeZone()}, read from this browser.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

function DestinationRow({
  destination,
  canManage,
  onToggle,
}: {
  destination: RoutingDestination;
  canManage: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const Icon = KIND_ICON[destination.kind];
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--r-md)] border border-border bg-surface-2 px-3 py-2">
      <span className="inline-flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
        <span className="min-w-0">
          <span className="block truncate text-[length:var(--fs-small)] text-text" title={destination.target}>
            {destination.target}
          </span>
          <span className="block text-[length:var(--fs-micro)] text-text-tertiary">
            {ROUTING_KIND_LABELS[destination.kind]}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {destination.verified ? (
          <Badge tone="success">Verified</Badge>
        ) : (
          <Badge tone="info">Synthetic</Badge>
        )}
        <Switch
          checked={destination.enabled}
          onCheckedChange={onToggle}
          disabled={!canManage}
          ariaLabel={`Route to ${destination.target}`}
        />
      </span>
    </li>
  );
}

function RoutingCard({ routing }: { routing: NotificationRouting }) {
  const canManage = useCan('notifications.routing');
  const update = useUpdateNotificationRouting();

  const save = (patch: Partial<NotificationRouting>) =>
    update.mutate(patch, {
      onSuccess: () => toast('Tenant routing saved', { tone: 'success' }),
      onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
    });

  return (
    <Card>
      <CardHeader
        title="Tenant routing"
        description="Where the whole organization's alerts go, as distinct from where yours do."
        action={<Badge tone="neutral">Tenant Admin and above</Badge>}
      />
      <CardBody className="space-y-3">
        {/* Named before the controls, so the reason arrives before the dead
            switches rather than after them. */}
        {!canManage && <RoleRestricted action="change tenant routing" remedy="Tenant Admin" />}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <span className="min-w-0">
            <span className="block text-[length:var(--fs-small)] text-text">Route at or above</span>
            <span className="block text-[length:var(--fs-micro)] text-text-tertiary">
              Anything below this severity stays in the app only.
            </span>
          </span>
          <Select
            value={routing.minSeverity}
            onValueChange={(v) => save({ minSeverity: v as NotificationRouting['minSeverity'] })}
            options={SEVERITY_FLOOR_OPTIONS}
            ariaLabel="Minimum severity to route"
            size="sm"
            disabled={!canManage}
          />
        </div>

        <div>
          <div className="mb-2 text-[length:var(--fs-small)] text-text">Destinations</div>
          <ul className="space-y-2">
            {routing.destinations.map((d) => (
              <DestinationRow
                key={d.id}
                destination={d}
                canManage={canManage}
                onToggle={(enabled) =>
                  save({
                    destinations: routing.destinations.map((x) =>
                      x.id === d.id ? { ...x, enabled } : x,
                    ),
                  })
                }
              />
            ))}
          </ul>
          <p className="mt-2 text-[length:var(--fs-micro)] text-text-tertiary">
            Adding or changing an address needs a delivery check and a stored secret, so it runs
            upstream — this screen turns the configured destinations on and off. Every change here
            is written to the{' '}
            {/* Underlined always, not only on hover: inside a block of text the
                accent colour is the sole distinction, which is what axe flags
                as link-in-text-block (WCAG 1.4.1). The feed's links sit in
                their own flex row, not in prose, so they keep hover-only. */}
            <Link to="/audit" className="text-accent-text underline">
              audit log
            </Link>
            .
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

export function NotificationPreferencesScreen() {
  const prefs = useNotificationPrefs();
  const routing = useNotificationRouting();

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/settings/notifications')}
        description="What reaches you, and where it goes."
        actions={
          <Link to="/notifications" className={buttonClasses('secondary', 'sm')}>
            Notification feed
          </Link>
        }
      />

      <div className="grid max-w-3xl gap-4">
        <QueryBoundary
          query={prefs}
          loadingFallback={<SkeletonTableRows rows={6} cols={3} />}
          isEmpty={() => false}
        >
          {(p) => <PersonalCard prefs={p} />}
        </QueryBoundary>

        <QueryBoundary
          query={routing}
          loadingFallback={<SkeletonTableRows rows={4} cols={2} />}
          isEmpty={() => false}
        >
          {(r) => <RoutingCard routing={r} />}
        </QueryBoundary>
      </div>
    </div>
  );
}
