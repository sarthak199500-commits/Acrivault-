import { NavLink, Outlet } from 'react-router-dom';
import { SETTINGS_NAV } from '@/app/nav';
import { cn } from '@/lib/cn';

const TAB = [
  'inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2',
  'text-[length:var(--fs-small)] font-medium outline-none transition-colors',
  'focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]',
].join(' ');

/**
 * The shell every settings pane renders inside.
 *
 * A horizontal tab row, matching the underline bar Policies and Rotate already
 * use. The first attempt at this was a grouped vertical column, which sat
 * directly beside the app's vertical rail and read as two navigations of the
 * same kind — same eyebrows, same icon-and-label rows, same accent spine. One
 * nav on screen, and the panes get the content width back.
 *
 * NavLinks styled as tab triggers rather than Radix Tabs triggers: each pane is
 * a URL, so these have to be real links that honour right-click, middle-click
 * and ctrl-click. Radix would give them button semantics and swallow all three.
 *
 * It renders NO h1 — each pane supplies its own ScreenHeader, which carries
 * `id="main-heading"` for the route announcer. Keeping the h1 in the pane is
 * what lets the announcer say "Notification Preferences screen" instead of
 * "Settings" seven times.
 */
export function SettingsLayout() {
  return (
    <div>
      <nav
        aria-label="Settings"
        className="mb-5 flex items-center overflow-x-auto border-b border-border"
      >
        {SETTINGS_NAV.map((group, i) => (
          <div key={group.category} className="flex items-center">
            {/* A divider, not a heading: the only split worth drawing is yours
                versus the organization's, and one rule says it without
                spending a row on it. */}
            {i > 0 && <span aria-hidden="true" className="mx-2 h-3.5 w-px shrink-0 bg-border" />}
            <ul aria-label={group.category} className="flex items-center gap-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        TAB,
                        // -mb-px pulls the active underline onto the container's
                        // own border rather than sitting a pixel below it.
                        '-mb-px',
                        isActive
                          ? 'border-accent text-text'
                          : 'border-transparent text-text-secondary hover:text-text',
                      )
                    }
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
