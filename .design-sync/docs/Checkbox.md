---
category: Controls
---

Binary or tri-state selection, backed by Radix. Use it inside forms — anywhere the choice is only committed when the surrounding form is submitted — and in table headers and rows for multi-select.

Reach for Switch instead when the setting applies the instant it is toggled and there is no Save button. Reach for RadioGroup when the options are mutually exclusive.

The `indeterminate` state is not a third user-selectable value; it is what a "select all" header renders when only some rows below it are checked, and it swaps the tick glyph for a minus.

The component renders only the 16px box — it has no label element of its own. Wrap it in a `<label htmlFor>` when there is visible text, and pass `aria-label` when there is not (table row checkboxes, "select all"). Disabled drops to 40% opacity and blocks the pointer.
