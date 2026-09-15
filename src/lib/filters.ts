/**
 * Filter primitives shared across the list screens.
 *
 * `MIN_SEARCH_CHARS` had two copies (Quarantine and the session list) before
 * Approvals needed a third. The value itself is arbitrary; what matters is that
 * every screen starts narrowing at the same keystroke, because a screen that
 * disagreed would look like a search bug rather than a different constant.
 */
export const MIN_SEARCH_CHARS = 2;
