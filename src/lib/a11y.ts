/**
 * Accessibility helpers: a single polite live region announcer used for route
 * changes, async results, scan progress, and toasts.
 */

let liveRegion: HTMLElement | null = null;

function ensureLiveRegion(): HTMLElement {
  if (liveRegion && document.body.contains(liveRegion)) return liveRegion;
  const el = document.createElement('div');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.setAttribute('role', 'status');
  // Visually hidden but available to assistive tech.
  el.style.cssText =
    'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
  document.body.appendChild(el);
  liveRegion = el;
  return el;
}

/** Announce a message politely to assistive technology. */
export function announce(message: string): void {
  if (typeof document === 'undefined') return;
  const region = ensureLiveRegion();
  // Clear then set so repeated identical messages are still read.
  region.textContent = '';
  window.requestAnimationFrame(() => {
    region.textContent = message;
  });
}

/** Move keyboard focus to an element by id (e.g. the main heading on route change). */
export function focusById(id: string): void {
  if (typeof document === 'undefined') return;
  window.requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (!el) return;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  });
}
