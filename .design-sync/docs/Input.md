---
category: Controls
---

Single-line text entry, and the default form field across the product. It owns its own label, hint, and error markup, so pass `label` rather than rendering one alongside it.

Use Textarea when the answer is more than a line, Select or Combobox when the answer comes from a known set, and CodeInput for one-time verification codes.

`hint` and `error` occupy the same slot: passing `error` replaces the hint, turns the border critical, sets `aria-invalid`, and announces via `role="alert"`. Never pass both and expect both to show.

`prefix` and `suffix` are decorative slots for a leading icon or a trailing unit — the prefix is `aria-hidden`, so it must not carry meaning the label does not already give. Use `hideLabel` for toolbar and filter fields where a visible label would be noise; the label still reaches assistive tech.

The focus ring is `focus-within` on the bordered shell, not on the `<input>`, so a class passed via `className` lands on the inner input and cannot restyle the border. Disabled has no first-class treatment yet — callers currently wrap the field in a reduced opacity.
