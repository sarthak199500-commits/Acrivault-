---
category: Controls
---

A paired start/expiry date field for an optional access window, used on the invite and edit-user flows. It is a composed field rather than a primitive: it owns its own legend ("Access window (optional)"), both date inputs, and its validation message.

There is no label prop, so it cannot be retitled — if a screen needs different wording, it needs a different field. Use two Inputs only if you need bounds this component does not model.

`undefined` and a pair of empty strings both mean "no window": access does not expire. Either bound can stand alone — a start with no expiry is scheduled but permanent, an expiry with no start begins immediately. A lapsed window maps to the Suspended user status; there is deliberately no separate Expired state.

The one rule it enforces itself is expiry-after-start, which marks the expiry input critical and announces via `role="alert"`. Export `validityWindowError` to run the same check before submit rather than reimplementing it. Dates use the browser-native picker, so the open calendar is the OS control and cannot be themed.
