import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/features/platform/queries';
import { IconButton } from '@/components/ui/IconButton';

/**
 * The header's unread count.
 *
 * Reads through `useNotifications`, the same hook the feed uses, rather than
 * repeating the query key and fetcher inline. Two hand-written copies of one
 * cache entry is how the badge and the feed came to disagree — and the count
 * being wrong in the persistent chrome is worse than it being wrong anywhere
 * else, because it is the number that decides whether anyone looks.
 */
export function NotificationsBell() {
  const navigate = useNavigate();
  const { data } = useNotifications();
  const unread = data?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="relative">
      <IconButton label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => navigate('/notifications')}>
        <Bell className="h-4 w-4" />
      </IconButton>
      {unread > 0 && (
        <span className="tnum pointer-events-none absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--red-600)] px-1 text-[10px] font-semibold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </div>
  );
}
