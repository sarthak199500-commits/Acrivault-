import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, PanelLeftClose, PanelLeftOpen, Search, Database, X } from 'lucide-react';
import { APPROVALS_ROUTE, NAV, screenIdentity } from './nav';
import { usePendingApprovalCount } from '@/features/act/queries';
import { cn } from '@/lib/cn';
import { announce, focusById } from '@/lib/a11y';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { DensityToggle } from '@/components/ui/DensityToggle';
import { RoleSwitcher } from '@/components/ui/RoleSwitcher';
import { IconButton } from '@/components/ui/IconButton';
import { Badge } from '@/components/ui/Badge';
import { Logo } from '@/components/ui/Logo';
import { ScenarioSwitcher } from './ScenarioSwitcher';
import { NotificationsBell } from './NotificationsBell';
import { CoverageChip } from '@/features/platform/CoverageChip';
import { AccountMenu } from './AccountMenu';
import { Toaster } from '@/components/ui/Toaster';
import { CommandPalette } from '@/components/ui/CommandPalette';

function titleForPath(pathname: string): string {
  return screenIdentity(pathname).title;
}

/** Announce route changes politely and move focus to the main heading. */
function RouteAnnouncer() {
  const location = useLocation();
  useEffect(() => {
    const title = titleForPath(location.pathname);
    document.title = `${title} · Acrivault`;
    announce(`${title} screen`);
    focusById('main-heading');
    const main = document.getElementById('main-content');
    if (main) main.scrollTop = 0;
  }, [location.pathname]);
  return null;
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn('flex h-[var(--topbar-h)] items-center px-3', collapsed && 'justify-center px-2')}>
      {collapsed ? (
        <Logo variant="mark" className="h-7" />
      ) : (
        <Logo variant="horizontal" className="text-nav-text-strong" />
      )}
    </div>
  );
}

/**
 * Live pending-approval count on the Act > Approvals rail item.
 *
 * Point 7's guarantee — that a proposed containment waits on a second pair of
 * hands — is worth nothing if you have to navigate to the queue to discover
 * anything is waiting in it. Shares the screen's own query, so the number and
 * the list it summarises can never disagree.
 *
 * Its own component because the count comes from a hook: rendered inline in
 * SideNav's map it would be a conditional hook call.
 */
function ApprovalsNavCount({ collapsed }: { collapsed: boolean }) {
  const pending = usePendingApprovalCount();
  if (pending === 0) return null;

  // Collapsed, there is no label to sit beside — a corner dot is all that fits,
  // so the figure moves into text only a screen reader hears. It still has to be
  // announced: the rail is where the waiting work is discovered.
  if (collapsed) {
    return (
      <>
        <span
          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--warning)]"
          aria-hidden="true"
        />
        <span className="sr-only">, {pending} awaiting a decision</span>
      </>
    );
  }
  return (
    <span className="tnum ml-auto inline-flex h-4 min-w-4 items-center justify-center rounded-[var(--r-pill)] bg-warn-bg px-1.5 text-[length:var(--fs-micro)] font-semibold text-warn-fg">
      {pending}
      <span className="sr-only"> awaiting a decision</span>
    </span>
  );
}

function SideNav({ collapsed }: { collapsed: boolean }) {
  return (
    <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-1.5">
      {NAV.map((group) => (
        <div key={group.layer} className="mb-2 last:mb-0">
          {!collapsed && <div className="px-2 pb-1 eyebrow text-nav-eyebrow">{group.layer}</div>}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-2.5 rounded-[var(--r-sm)] px-2 py-1.5 text-[length:var(--fs-body)]',
                        'transition-colors duration-[var(--dur-1)]',
                        collapsed && 'justify-center',
                        isActive
                          ? 'bg-nav-active text-nav-active-text font-medium'
                          : 'text-nav-text hover:bg-nav-hover hover:text-nav-text-strong',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-nav-active-text" aria-hidden="true" />
                        )}
                        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {item.to === APPROVALS_ROUTE && <ApprovalsNavCount collapsed={collapsed} />}
                        {!collapsed && item.concept && (
                          <Badge tone="neutral" className="ml-auto px-1.5 py-0 text-[length:var(--fs-micro)]">
                            Concept
                          </Badge>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Primary navigation as a left-anchored sheet for viewports below `md`, where the
 * persistent sidebar is hidden. Built on Radix Dialog: focus is trapped, Escape
 * closes, and focus returns to the trigger. It closes itself on route change so a
 * tapped destination doesn't leave the sheet covering the screen.
 */
function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const location = useLocation();
  useEffect(() => {
    onOpenChange(false);
  }, [location.pathname, onOpenChange]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--scrim)] data-[state=open]:motion-safe:animate-[overlay-in_var(--dur-2)_var(--ease-standard)] md:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 left-0 z-[var(--z-modal)] flex flex-col border-r border-nav-border bg-nav shadow-[var(--shadow-xl)]',
            'outline-none focus:outline-none md:hidden',
            'data-[state=open]:motion-safe:animate-[drawer-in-left_var(--dur-3)_var(--ease-emphasized)]',
          )}
          style={{ width: 'var(--sidebar-w)', ['--logo-mark' as string]: 'var(--nav-logo-mark)' }}
        >
          <Dialog.Title className="sr-only">Primary navigation</Dialog.Title>
          <div className="flex items-center justify-between pr-2">
            <Brand collapsed={false} />
            <Dialog.Close asChild>
              <IconButton label="Close navigation" className="text-nav-text hover:bg-nav-hover hover:text-nav-text-strong">
                <X className="h-4 w-4" />
              </IconButton>
            </Dialog.Close>
          </div>
          <div className="h-px bg-nav-border" />
          <SideNav collapsed={false} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function TopBar({
  collapsed,
  onToggleSidebar,
  onOpenMobileNav,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobileNav: () => void;
}) {
  return (
    <header
      className="sticky top-0 z-[var(--z-sticky)] flex h-[var(--topbar-h)] items-center gap-3 border-b border-border bg-bg/80 px-4 backdrop-blur"
    >
      <IconButton
        label="Open navigation"
        onClick={onOpenMobileNav}
        className="md:hidden"
      >
        <Menu className="h-4 w-4" />
      </IconButton>
      <IconButton
        label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={onToggleSidebar}
        className="hidden md:inline-flex"
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </IconButton>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Compact command launcher — reads as "jump to", distinct from any page search. */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('acv:open-command-palette'))}
          aria-label="Open command palette"
          className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-pill)] border border-border bg-surface px-2.5 text-text-tertiary hover:bg-surface-hover hover:text-text"
        >
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden text-[length:var(--fs-small)] lg:inline">Jump to</span>
          <kbd className="hidden rounded-[var(--r-xs)] border border-border bg-surface-2 px-1 text-[length:var(--fs-micro)] text-text-secondary lg:inline">
            Ctrl K
          </kbd>
        </button>
        <CoverageChip />
        <Badge tone="info" icon={<Database className="h-3 w-3" />} className="hidden lg:inline-flex">
          Synthetic data
        </Badge>
        <NotificationsBell />
        <DensityToggle />
        <ThemeToggle />
        <RoleSwitcher />
        <AccountMenu />
      </div>
    </header>
  );
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-bg text-text">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-nav-border bg-nav md:flex',
          'transition-[width] duration-[var(--dur-2)]',
        )}
        style={{
          width: collapsed ? 'var(--sidebar-collapsed-w)' : 'var(--sidebar-w)',
          // Scope the logo mark to the nav shell's variant (brand mid-green on
          // the light theme's forest shell; unchanged on dark).
          ['--logo-mark' as string]: 'var(--nav-logo-mark)',
        }}
      >
        <Brand collapsed={collapsed} />
        <div className="h-px bg-nav-border" />
        <SideNav collapsed={collapsed} />
      </aside>

      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          collapsed={collapsed}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
        >
          <div className="mx-auto w-full max-w-[var(--content-max)] px-4 py-6 md:px-6">
            <RouteAnnouncer />
            <Outlet />
          </div>
        </main>
      </div>

      <ScenarioSwitcher />
      <Toaster />
      <CommandPalette />
    </div>
  );
}
