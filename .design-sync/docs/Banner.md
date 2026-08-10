---
category: Feedback
---

A page-level message: a filled, bordered block that sits at the top of a view or
at the top of a dialog body and stays until the situation it describes is
resolved.

Reach for Banner when the message applies to the **whole view** — a failed fetch
for the screen's primary query, a connector that stopped reporting, a build-level
caveat about the feature. Reach for `InlineAlert` instead when the message
belongs to one **section or field** inside the view; InlineAlert has no fill or
border and is deliberately quieter, so a form full of Banners reads as alarm
fatigue. Banner is also not a toast: `Toaster` is for transient confirmation of
something the user just did, Banner is for a condition that persists.

Three tones only — `info`, `warning`, `critical`. There is no success tone,
because a page-level "it worked" is a toast. Each tone carries its own icon and
fill so severity never rests on colour alone; `critical` additionally renders
`role="alert"` (the other tones use `role="status"`) so screen readers interrupt
for it. Pass `action` for a single recovery control — a small secondary button
such as Retry — and keep the body to one or two sentences.
