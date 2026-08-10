---
category: Controls
---

A filterable single-select: the same job as Select, but with a search field above the options. Use it once the list is long enough or unfamiliar enough that typing beats scrolling — clouds, owners, accounts, regions.

The two are visually near-identical when closed; the double chevron rather than a single caret is the only tell, so do not mix them arbitrarily on one screen. Under roughly six stable options, Select is the lighter choice.

The preview cards show only the closed trigger — the filter input and option list live in a Popover that mounts on interaction. Open, the panel matches the trigger width (min 224px): a search row with a magnifier icon on top, then the options, the active one on `surface-hover` with an accent check on the selected value, and a plain "No matches." row when the filter eliminates everything.

Note the prop names differ from Select's: `onChange`, not `onValueChange`. Width comes from `className` rather than from content, and over-long labels truncate — size the trigger to the list you are filtering. Pass `ariaLabel`; the trigger is a `role="combobox"` button and the label is what names it.
