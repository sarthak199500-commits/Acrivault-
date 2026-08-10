---
category: Status
---

A 2px indicator for live, changing state — connector health, scan progress, session
liveness. It is the smallest signal in the status family and carries no text of its
own.

The dot is `aria-hidden` by design, so **it is never sufficient on its own**: always
render a text label beside it. A dot without a label is inaccessible and, for a
colourblind user, meaningless. `pulse` adds a ping halo for in-flight work and
respects `prefers-reduced-motion`.

Use StatusDot when the state is *live and changing* and you already have a label in
the layout. Use `StatusBadge` instead when the state is a discrete user lifecycle
value and needs to read as a standalone chip. Use `RiskPill` when the thing being
communicated is severity, never a dot.
