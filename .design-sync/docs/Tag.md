---
category: Status
---

A quiet, neutral chip for **metadata that has no state and no severity** — owner,
environment, governance label, identity type, rotation window, ARNs.

Tag is intentionally colourless. That is its whole job: it keeps the resting console
near-monochrome so that the one coloured thing on screen is genuinely the risky one.
If you find yourself wanting a coloured Tag, you want a different component —
`RiskPill` for severity, `StatusBadge` for user lifecycle state, or `Badge` when you
need a tone-carrying chip for some other domain.

The optional `icon` slot renders in the tertiary text tone so the label still leads.
Tags are not interactive; use `FilterPill` for a toggleable facet chip with a count.
