import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Database } from 'lucide-react';
import { announce, focusById } from '@/lib/a11y';
import { Badge } from '@/components/ui/Badge';
import { Logo } from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { ScenarioSwitcher } from './ScenarioSwitcher';
import { EXTRA_TITLES } from './nav';

function titleForAuthPath(pathname: string): string {
  if (EXTRA_TITLES[pathname]) return EXTRA_TITLES[pathname];
  // Match the longest configured prefix (e.g. /reset-password/:token).
  const prefix = Object.keys(EXTRA_TITLES)
    .filter((p) => pathname.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return prefix ? EXTRA_TITLES[prefix] : 'Acrivault';
}

function AuthRouteAnnouncer() {
  const location = useLocation();
  useEffect(() => {
    const title = titleForAuthPath(location.pathname);
    document.title = `${title} · Acrivault`;
    announce(`${title} screen`);
    focusById('main-heading');
  }, [location.pathname]);
  return null;
}

function Brand() {
  return (
    <div className="flex justify-center">
      <Logo variant="stacked" className="w-28" />
    </div>
  );
}

/**
 * The centered layout for registration and authentication, outside the app shell.
 * Logo, a single card, the synthetic-data indicator, and the theme toggle.
 */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <a href="#main-heading" className="skip-link">
        Skip to content
      </a>
      <header className="flex items-center justify-end gap-2 px-4 py-3">
        <Badge tone="info" icon={<Database className="h-3 w-3" />}>
          Synthetic data
        </Badge>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <Brand />
          </div>
          <AuthRouteAnnouncer />
          <Outlet />
          <p className="mt-6 text-center text-[length:var(--fs-micro)] text-text-tertiary">
            Synthetic environment · no real credentials are processed
          </p>
        </div>
      </main>

      <ScenarioSwitcher />
    </div>
  );
}
