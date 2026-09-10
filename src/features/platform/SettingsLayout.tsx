import { NavLink, Outlet } from 'react-router-dom';
import { SETTINGS_NAV } from '@/app/nav';
import { cn } from '@/lib/cn';

/**
 * The shell every settings pane renders inside.
 *
 * Settings was a wall of seven cards, each linking out to a route that then
 * hand-rolled its own way back — one said "Back to feed", one said "Back to
 * users" and went to the user list, and two offered nothing at all. A persistent
 * grouped sub-nav replaces all of that: the selected item says where you are and
 * every sibling is one click away.
 *
 * It deliberately renders NO h1. Each pane supplies its own ScreenHeader, which
 * carries `id="main-heading"` for the route announcer, so the app keeps exactly
 * one h1 per route. A breadcrumb would also be redundant here — the eyebrow
 * already reads "Platform · Settings" and the highlighted item names the pane.
 */
export function SettingsLayout() {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      {/*
        Desktop: a grouped column. Mobile: the same groups laid out in one
        horizontally scrolling row, headings kept, so all seven panes are one
        swipe away instead of ~300px of nav above the content.
      */}
      <nav
        aria-label="Settings"
        className={cn(
          'flex shrink-0 gap-5 overflow-x-auto pb-1',
          'lg:block lg:w-52 lg:gap-0 lg:overflow-visible lg:pb-0',
        )}
      >
        {SETTINGS_NAV.map((group) => (
          <div key={group.category} className="shrink-0 lg:mb-4 lg:shrink lg:last:mb-0">
            {/*
              A div, not a heading. These are navigation group labels, and the
              sub-nav renders BEFORE the pane's h1 — as headings they put an h2
              above the h1 and inverted the document outline. `aria-labelledby`
              names the group from any element, so the groups keep their
              accessible names and the outline stays the pane's own.
            */}
            <div
              id={`settings-cat-${group.category}`}
              className="eyebrow mb-1.5 px-2 whitespace-nowrap"
            >
              {group.category}
            </div>
            <ul
              aria-labelledby={`settings-cat-${group.category}`}
              className="flex gap-1 lg:block lg:space-y-0.5"
            >
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 whitespace-nowrap rounded-[var(--r-sm)] px-2 py-2',
                        'text-[length:var(--fs-small)] transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]',
                        // The 3px spine is the app's "this one" marker (see the
                        // notification feed and SessionListScreen), but only on
                        // the desktop column — on a horizontal row a LEFT spine
                        // points at nothing.
                        'lg:border-l-[3px] lg:pl-2',
                        isActive
                          ? 'bg-accent-tint font-medium text-accent-text lg:border-l-[var(--accent)]'
                          : 'text-text-secondary hover:bg-surface-hover hover:text-text lg:border-l-transparent',
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
