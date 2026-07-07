import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, UserRound } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/permissions';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { announce } from '@/lib/a11y';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

export function AccountMenu() {
  const navigate = useNavigate();
  const role = useUiStore((s) => s.role);
  const signOut = useAuthStore((s) => s.signOut);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-2 text-text-secondary hover:bg-surface-hover hover:text-text"
        >
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Signed in (synthetic)</DropdownMenuLabel>
        <div className="px-2.5 pb-2">
          <div className="text-[length:var(--fs-small)] text-text">Alex Kim</div>
          <div className="text-[length:var(--fs-micro)] text-text-tertiary">{ROLE_LABELS[role]}</div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/settings')}>
          <span className="inline-flex items-center gap-2">
            <Settings className="h-3.5 w-3.5" aria-hidden="true" /> Settings
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/audit')}>
          <span className="inline-flex items-center gap-2">
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" /> Audit log
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/settings/users')}>
          <span className="inline-flex items-center gap-2">
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" /> Manage users
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            signOut();
            announce('Signed out');
            navigate('/login');
          }}
        >
          <span className="inline-flex items-center gap-2">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Sign out
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
