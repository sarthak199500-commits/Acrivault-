import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { listNotifications } from '@/mocks/api';
import { IconButton } from '@/components/ui/IconButton';

export function NotificationsBell() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['notifications'], queryFn: listNotifications });
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
