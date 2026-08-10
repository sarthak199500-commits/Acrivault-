---
category: Controls
---

An immediate on/off setting. Use it only where the toggle takes effect the moment it moves — settings panels, feature flags, notification preferences — and where the screen has no Save button to commit it.

Inside a form that is submitted as a unit, use Checkbox instead. The distinction matters: a Switch that silently waits for a Save is a broken promise about when the change lands.

Pass `ariaLabel` — note the camelCase prop name, not the standard `aria-label`. Pair it with a visible title and one line of consequence, so the user knows what changes before they flip it.

The state is carried by both the track fill and the thumb position, never by colour alone. Disabled drops to 50% opacity — pair it with a reason ("Requires an enterprise plan") rather than leaving a dead control on the page.
