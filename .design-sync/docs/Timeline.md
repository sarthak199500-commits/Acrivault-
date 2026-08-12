---
category: Navigation
---

A vertical rail of ordered events, connected by a spine: agent session replay, credential rotation phases, audit history. Use it when the sequence itself carries meaning — what happened, in what order, and where it went wrong.

Tones are the whole point of the component. `done` is a filled accent node, `active` an accent tint for the step in progress or under inspection, `default` a neutral node for steps not yet reached, and `anomaly` a critical-red node that flags a suspicious step without breaking the vertical rhythm. Give every item an `icon` and a short `meta` (sequence number, timestamp, or percentage); the rail reads poorly with titles alone.

Timeline is vertical, unbounded in length, and can be interactive; Stepper is horizontal, fixed at a handful of steps, and never clickable. Use Stepper for a wizard the user is walking through now, Timeline for a record of what already happened.

Passing `onSelect` turns rows into real buttons with focus rings, and the `selected` row keeps the hover surface plus `aria-current` — the Session Replay pattern where picking a step drives a detail pane. Without `onSelect` the rows render as plain list items, so do not add click handlers to the children yourself.

