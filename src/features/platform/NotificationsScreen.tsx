import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellOff, Check, SlidersHorizontal, Undo2 } from 'lucide-react';
import { useMarkAllNotificationsRead, useNotifications, useSetNotificationRead } from './queries';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_CHIP,
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationCategory,
  type NotificationItem,
} from '@/mocks/types';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTableRows } from '@/components/ui/Skeleton';
import { buttonClasses } from '@/components/ui/Button';
import { relativeTime } from '@/lib/format';
import { announce } from '@/lib/a11y';
import { cn } from '@/lib/cn';
import { severityTone } from '@/lib/tones';
import { toast } from '@/stores/toast';
import { errorInfo } from '@/lib/apiError';

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'minimal', 'info'] as const;

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'Any severity' },
  ...SEVERITIES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })),
];

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Any category' },
  ...NOTIFICATION_CATEGORIES.map((c) => ({ value: c, label: NOTIFICATION_CATEGORY_LABELS[c] })),
];

const READ_OPTIONS = [
  { value: 'all', label: 'Read and unread' },
  { value: 'unread', label: 'Unread only' },
  { value: 'read', label: 'Read only' },
];

/**
 * Where a notification's link goes, named after the destination it actually
 * reaches.
 *
 * Every row used to offer a link labelled "View", so a screen reader user heard
 * six identical links on one screen and could not tell them apart (WCAG 2.4.4).
 * Naming the destination also keeps the label honest: the rotation and policy
 * links land on their list screens, not on a single job or policy.
 */
function linkLabel(href: string): string {
  if (href.startsWith('/discover/')) return 'View identity';
  if (href.startsWith('/monitor')) return 'View alerts';
  if (href.startsWith('/rotate')) return 'View rotations';
  if (href.startsWith('/govern')) return 'View policies';
  return 'View';
}

function Row({ item }: { item: NotificationItem }) {
  const setRead = useSetNotificationRead();
  const category = NOTIFICATION_CATEGORY_CHIP[item.category];

  const toggle = () =>
    setRead.mutate(
      { id: item.id, read: !item.read },
      {
        onSuccess: () => announce(item.read ? 'Marked unread' : 'Marked read'),
        onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
      },
    );

  return (
    <li
      className={cn(
        'flex items-start gap-3 border-b border-border border-l-[3px] px-4 py-3 last:border-b-0',
        // A 3px accent spine plus the FULL accent tint, following the flagged-row
        // treatment in SessionListScreen. Unread was previously carried by
        // `bg-accent-tint/20` — one fifth of a tint that is itself only a 16%
        // mix, which landed within a few RGB points of the card behind it. The
        // read rows keep a transparent spine so the text stays aligned.
        item.read ? 'border-l-transparent' : 'border-l-[var(--accent)] bg-accent-tint',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={severityTone(item.severity)} className="capitalize">
            {item.severity}
          </Badge>
          <Badge tone="neutral">{category}</Badge>
          {/* The spine, the tint and the weight are all visual. WCAG 1.4.1 does
              not accept colour as the only channel, so the state is stated
              outright for anyone who cannot see any of them. */}
          {!item.read && <span className="sr-only">Unread.</span>}
          <span
            // `truncate` with no tooltip loses the end of a real title. The
            // seeded strings were short enough to hide it.
            title={item.title}
            className={cn(
              'truncate text-[length:var(--fs-small)]',
              item.read ? 'text-text-secondary' : 'font-medium text-text',
            )}
          >
            {item.title}
          </span>
        </div>
        {/* Secondary, not tertiary, on an unread row: tertiary on the accent
            tint measures ~4.5:1 for 11px text, which is too thin a margin to
            ship on a computed colour — and an unread row should read stronger
            anyway. */}
        <div
          className={cn(
            'mt-0.5 flex items-center gap-2 text-[length:var(--fs-micro)]',
            item.read ? 'text-text-tertiary' : 'text-text-secondary',
          )}
        >
          <span>{relativeTime(item.at)}</span>
          {item.href && (
            <Link
              to={item.href}
              // min-h-6 with a compensating negative margin: as a flex child
              // this link is blockified, so it does not qualify for the inline
              // exception to the 24×24 target minimum (WCAG 2.2, 2.5.8). The
              // padding grows the target without moving the text.
              className="-mx-1 -my-0.5 inline-flex min-h-6 items-center rounded-[var(--r-xs)] px-1 text-accent-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
            >
              {linkLabel(item.href)}
            </Link>
          )}
        </div>
      </div>
      {/*
        A toggle, not a button that disappears once used. The old "Mark read"
        unmounted itself on click, which dropped keyboard focus to <body> and
        threw the reader back to the top of the document on every row they
        cleared. Keeping one control mounted fixes that and gives the screen the
        mark-unread it never had.
      */}
      <button
        type="button"
        onClick={toggle}
        disabled={setRead.isPending}
        aria-label={`${item.read ? 'Mark unread' : 'Mark read'}: ${item.title}`}
        className={cn(
          'inline-flex min-h-7 shrink-0 items-center gap-1 rounded-[var(--r-sm)] border px-2 py-1',
          'text-[length:var(--fs-micro)] transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          item.read
            ? 'border-border text-text-tertiary hover:bg-surface-hover hover:text-text'
            : 'border-border-strong text-text-secondary hover:bg-surface-hover hover:text-text',
        )}
      >
        {item.read ? (
          <>
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> Mark unread
          </>
        ) : (
          <>
            <Check className="h-3.5 w-3.5" aria-hidden="true" /> Mark read
          </>
        )}
      </button>
    </li>
  );
}

export function NotificationsScreen() {
  const query = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const [severity, setSeverity] = useState('all');
  const [category, setCategory] = useState('all');
  const [readState, setReadState] = useState('all');

  // Memoized so the identity is stable: a fresh `[]` on every render would make
  // the filter below recompute whether or not anything changed.
  const all = useMemo(() => query.data ?? [], [query.data]);
  const unread = all.filter((n) => !n.read).length;

  const filtered = useMemo(
    () =>
      all.filter(
        (n) =>
          (severity === 'all' || n.severity === severity) &&
          (category === 'all' || n.category === (category as NotificationCategory)) &&
          (readState === 'all' || (readState === 'unread' ? !n.read : n.read)),
      ),
    [all, severity, category, readState],
  );

  const filtersActive = severity !== 'all' || category !== 'all' || readState !== 'all';
  const clearFilters = () => {
    setSeverity('all');
    setCategory('all');
    setReadState('all');
  };

  const markAllRead = () =>
    markAll.mutate(undefined, {
      onSuccess: () => {
        toast('All notifications marked read', { tone: 'success' });
        announce('All notifications marked read');
      },
      onError: (err) => toast(errorInfo(err).message, { tone: 'critical' }),
    });

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/notifications')}
        description="What Acrivault has raised for you."
        actions={
          <Link to="/settings/notifications" className={buttonClasses('secondary', 'sm')}>
            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Preferences
          </Link>
        }
      />

      <Card>
        <CardHeader
          title="Recent"
          // The count belongs where the reader is looking. It was only ever in
          // the header bell's accessible name.
          description={unread > 0 ? `${unread} unread` : 'You are all caught up.'}
          action={
            unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                disabled={markAll.isPending}
                className={buttonClasses('secondary', 'sm')}
              >
                Mark all read
              </button>
            ) : undefined
          }
        />

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <Select
            value={severity}
            onValueChange={setSeverity}
            options={SEVERITY_OPTIONS}
            ariaLabel="Filter by severity"
            size="sm"
          />
          <Select
            value={category}
            onValueChange={setCategory}
            options={CATEGORY_OPTIONS}
            ariaLabel="Filter by category"
            size="sm"
          />
          <Select
            value={readState}
            onValueChange={setReadState}
            options={READ_OPTIONS}
            ariaLabel="Filter by read state"
            size="sm"
          />
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="min-h-8 rounded-[var(--r-sm)] px-2 text-[length:var(--fs-small)] text-text-tertiary hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]"
            >
              Clear filters
            </button>
          )}
        </div>

        <QueryBoundary
          query={query}
          loadingFallback={<SkeletonTableRows rows={6} cols={2} />}
          isEmpty={(d) => d.length === 0}
          empty={
            <EmptyState
              icon={<BellOff className="h-5 w-5" />}
              headline="No notifications"
              guidance="You are all caught up."
            />
          }
        >
          {() =>
            filtered.length === 0 ? (
              // Distinct from the empty feed above: nothing matches the filter,
              // which is fixed by clearing it, not by waiting for an event.
              <EmptyState
                icon={<BellOff className="h-5 w-5" />}
                headline="No notifications match these filters"
                guidance="Widen the severity, category, or read state to see more."
                action={
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={buttonClasses('secondary', 'sm')}
                  >
                    Clear filters
                  </button>
                }
              />
            ) : (
              // A real list, so a screen reader announces item boundaries and a
              // count. The rows were bare divs: one unbroken stream of severity,
              // title and time with nothing marking where an item ended.
              <ul>
                {filtered.map((n) => (
                  <Row key={n.id} item={n} />
                ))}
              </ul>
            )
          }
        </QueryBoundary>
      </Card>
    </div>
  );
}
