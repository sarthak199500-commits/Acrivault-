import { useEffect } from 'react';
import { CommandPalette } from 'acrivault';

/* CommandPalette has no `open` prop — it opens on Ctrl/Cmd-K or the documented
 * `acv:open-command-palette` window event (the same event the top-bar search
 * button dispatches). Firing that on mount renders the open palette; with an
 * empty query it lists the screen shortcuts (SCREEN_RESULTS). It reads the router
 * (useNavigate) and react-query, both supplied by the shared providers.
 *
 * cardMode "single" + a 760x560 viewport (config) give the portaled dialog room. */
function OpenPalette() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('acv:open-command-palette'));
  }, []);
  return <CommandPalette />;
}

/** The palette open at its default (empty-query) state — the search field and the
 *  quick-navigation screen list. Typing ≥2 chars adds live identity matches. */
export function Default() {
  return <OpenPalette />;
}
