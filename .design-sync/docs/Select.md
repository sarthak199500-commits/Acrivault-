---
category: Controls
---

A themed Radix Select for choosing one value from a short, fixed set — identity type, role, provider. Use it when the options are few enough to scan without filtering; switch to Combobox once the user would rather type than scroll.

Prefer RadioGroup when the options carry consequences worth reading before choosing, and SegmentedControl when the choice switches a view rather than setting a value.

The preview cards can only show the closed trigger: Radix portals the option list and mounts it on interaction, so it never appears in a static capture. When open, the panel is a `surface-2` popover under the trigger, at least as wide as it, with the selected row in primary text and an accent check on the right; the highlighted row takes `surface-hover`. Full keyboard navigation and typeahead come from Radix.

`value` must match an option's `value` or the trigger falls back to `placeholder` in tertiary text — which is how an unset filter reads. Pass `ariaLabel`, since the trigger shows only the current value and never says what is being chosen. `sm` (32px) is for filter bars; `md` (36px) is the default and aligns with an Input.
