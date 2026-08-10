---
category: Feedback
---

The failed-request state for a whole view or panel: a critical-tinted warning
tile, one plain sentence about what could not be loaded, a retry, and an
optional collapsed technical detail.

Use ErrorState only when something genuinely failed. If the request succeeded
and simply returned nothing, use `EmptyState` — an empty tenant is not an
error, and dressing it as one erodes trust in the real alarms. The other
sibling is `Banner`: a critical Banner is right when the view still renders and
one part of it is degraded (the directory failed but the page is usable),
whereas ErrorState *replaces* the content region entirely.

Write `message` as a plain sentence about what the user was trying to see —
"We couldn't load this identity." — never a status code or an exception. The
raw technical string belongs in `detail`, which renders a quiet "Technical
detail" disclosure next to the retry button; it is collapsed on mount and
expands to a monospaced block. Omitting `onRetry` removes the button entirely,
which is the honest choice when retrying cannot help (an expired recording, a
deleted record).

Like EmptyState it centres itself and brings its own vertical padding, so it
drops straight into a `Card`. `QueryBoundary` renders it automatically on
`query.isError`, wiring `detail` to the error message and `onRetry` to
`refetch` — prefer that over hand-rolling the branch.
