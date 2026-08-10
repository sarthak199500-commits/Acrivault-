---
category: Status
---

The lifecycle state of a **person or user account** — invited, pending, active,
suspended, deleted. It wraps `Badge` and owns the tone/label mapping, so callers pass
only the raw `status` value and can never introduce an off-palette colour.

Deliberately calm: Active is a soft positive, Suspended a muted warning, and the
critical red is withheld entirely. In Acrivault colour means *risk*, and a suspended
teammate is not a security incident — use `RiskPill` when severity is the message.

Reach for `Badge` directly when you need a status chip for something that is not a
user account and you must choose the tone yourself. Use `Tag` for neutral metadata
that carries no state at all. Each badge pairs a dot with its written label, so the
state never depends on colour alone.
