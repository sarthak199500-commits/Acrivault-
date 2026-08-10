---
category: Navigation
---

A horizontal progress indicator for a short, strictly linear flow — onboarding (Connect → Scan → Review), a rotation wizard, a guided remediation. Use it when the number of steps is known up front, small (roughly three to five), and the user cannot skip ahead.

`current` is a zero-based index: steps before it render done (filled, checked), the step at it renders current (accent ring), steps after it render upcoming (muted). `currentComplete` marks the active step finished without advancing — the state where a scan has completed but its results are still on screen and the user has not yet pressed Continue.

Stepper is a status display, not a navigation control: its steps are not clickable. When the user may genuinely move between sections in any order, use Tabs instead. For the six-phase credential rotation lifecycle specifically, the product uses the dedicated PhaseTrack rather than a generic Stepper.

The list is an ordered list labelled "Step N of M" and the active step carries `aria-current="step"`; with `currentComplete` an sr-only "(complete)" is appended, so that state is not conveyed by the check glyph alone.

